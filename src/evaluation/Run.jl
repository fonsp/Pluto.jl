import REPL: ends_with_semicolon

Base.push!(x::Set{Cell}) = x

"Like @async except it prints errors to the terminal. 👶"
macro asynclog(expr)
	quote
		@async begin
			# because this is being run asynchronously, we need to catch exceptions manually
			try
				$(esc(expr))
			catch ex
				bt = stacktrace(catch_backtrace())
				showerror(stderr, ex, bt)
				rethrow(ex)
			end
		end
	end
end

"Run given cells and all the cells that depend on them, based on the topology information before and after the changes."
function run_reactive!(session::ServerSession, notebook::Notebook, old_topology::NotebookTopology, new_topology::NotebookTopology, cells::Array{Cell,1}; deletion_hook::Function=WorkspaceManager.delete_vars)::TopologicalOrder
	# make sure that we're the only `run_reactive!` being executed - like a semaphor
	take!(notebook.executetoken)

	# save the old topological order - we'll delete variables assigned from it and re-evalutate its cells
	old_order = topological_order(notebook, old_topology, cells)

	old_runnable = old_order.runnable
	to_delete_vars = union!(Set{Symbol}(), (old_topology[cell].assignments for cell in old_runnable)...)
	to_delete_funcs = union!(Set{Vector{Symbol}}(), (keys(old_topology[cell].funcdefs) for cell in old_runnable)...)

	# get the new topological order
	new_order = topological_order(notebook, new_topology, union(cells, keys(old_order.errable)))
	to_run = setdiff(union(new_order.runnable, old_order.runnable), keys(new_order.errable))::Array{Cell,1} # TODO: think if old error cell order matters

	# change the bar on the sides of cells to "running"
	for cell in to_run
		cell.running = true
		putnotebookupdates!(session, notebook, clientupdate_cell_running(notebook, cell))
	end
	for (cell, error) in new_order.errable
		cell.running = false
		relay_reactivity_error!(cell, error)
		putnotebookupdates!(session, notebook, clientupdate_cell_output(notebook, cell))
	end

	# delete new variables that will be defined by a cell
	new_runnable = new_order.runnable
	to_delete_vars = union!(to_delete_vars, (new_topology[cell].assignments for cell in new_runnable)...)
	to_delete_funcs = union!(to_delete_funcs, (keys(new_topology[cell].funcdefs) for cell in new_runnable)...)

	# delete new variables in case a cell errors (then the later cells show an UndefVarError)
	new_errable = keys(new_order.errable)
	to_delete_vars = union!(to_delete_vars, (new_topology[cell].assignments for cell in new_errable)...)
	to_delete_funcs = union!(to_delete_funcs, (keys(new_topology[cell].funcdefs) for cell in new_errable)...)

	to_reimport = union(Set{Expr}(), map(c -> c.module_usings, setdiff(notebook.cells, to_run))...)

	deletion_hook(notebook, to_delete_vars, to_delete_funcs, to_reimport; to_run=to_run) # `deletion_hook` defaults to `WorkspaceManager.delete_vars`

	local any_interrupted = false
	for (i, cell) in enumerate(to_run)
		if any_interrupted
			relay_reactivity_error!(cell, InterruptException())
		else
			run = run_single!(notebook, cell)
			any_interrupted |= run.interrupted
		end
		cell.running = false
		putnotebookupdates!(session, notebook, clientupdate_cell_output(notebook, cell))
	end

	# allow other `run_reactive!` calls to be executed
	put!(notebook.executetoken)
	return new_order
end

"Run a single cell non-reactively, return run information."
function run_single!(notebook::Notebook, cell::Cell)
	run = WorkspaceManager.eval_fetch_in_workspace(notebook, cell.parsedcode, cell.cell_id, ends_with_semicolon(cell.code))
	cell.runtime = run.runtime

	cell.output_repr = run.output_formatted[1]
	cell.repr_mime = run.output_formatted[2]
	cell.errored = run.errored

	return run
	# TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
end

###
# CONVENIENCE FUNCTIONS
###

"Do all the things!"
function update_save_run!(session::ServerSession, notebook::Notebook, cells::Array{Cell,1}; save::Bool=true, run_async::Bool=false, kwargs...)
	update_caches!(notebook, cells)
	old = notebook.topology
	new = notebook.topology = updated_topology(old, notebook, cells)
	save && save_notebook(notebook)
	if run_async
		@asynclog run_reactive!(session, notebook, old, new, cells; kwargs...)
	else
		run_reactive!(session, notebook, old, new, cells; kwargs...)
	end
end

update_save_run!(session::ServerSession, notebook::Notebook, cell::Cell; kwargs...) = update_save_run!(session, notebook, [cell]; kwargs...)
update_run!(args...) = update_save_run!(args...; save=false)