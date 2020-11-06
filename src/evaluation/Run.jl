import REPL: ends_with_semicolon
import .Configuration
import .ExpressionExplorer: FunctionNameSignaturePair

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
function run_reactive!(session::ServerSession, notebook::Notebook, old_topology::NotebookTopology, new_topology::NotebookTopology, cells::Array{Cell,1}; deletion_hook::Function=WorkspaceManager.delete_vars, persist_js_state::Bool=false)::TopologicalOrder
	# make sure that we're the only `run_reactive!` being executed - like a semaphor
	take!(notebook.executetoken)

	# save the old topological order - we'll delete variables assigned from it and re-evalutate its cells
	old_order = topological_order(notebook, old_topology, cells)

	old_runnable = old_order.runnable
	to_delete_vars = union!(Set{Symbol}(), defined_variables(old_topology, old_runnable)...)
	to_delete_funcs = union!(Set{Tuple{UUID,FunctionName}}(), defined_functions(old_topology, old_runnable)...)

	# get the new topological order
	new_order = topological_order(notebook, new_topology, union(cells, keys(old_order.errable)))
	to_run = setdiff(union(new_order.runnable, old_order.runnable), keys(new_order.errable))::Array{Cell,1} # TODO: think if old error cell order matters

	# change the bar on the sides of cells to "queued"
	local listeners = ClientSession[]
	for cell in to_run
		cell.queued = true
		listeners = putnotebookupdates!(session, notebook, clientupdate_cell_queued(notebook, cell); flush=false)		
	end
	for (cell, error) in new_order.errable
		cell.running = false
		relay_reactivity_error!(cell, error)
		listeners = putnotebookupdates!(session, notebook, clientupdate_cell_output(notebook, cell); flush=false)
	end
	flushallclients(session, listeners)


	# delete new variables that will be defined by a cell
	new_runnable = new_order.runnable
	to_delete_vars = union!(to_delete_vars, defined_variables(new_topology, new_runnable)...)
	to_delete_funcs = union!(to_delete_funcs, defined_functions(new_topology, new_runnable)...)

	# delete new variables in case a cell errors (then the later cells show an UndefVarError)
	new_errable = keys(new_order.errable)
	to_delete_vars = union!(to_delete_vars, defined_variables(new_topology, new_errable)...)
	to_delete_funcs = union!(to_delete_funcs, defined_functions(new_topology, new_errable)...)

	to_reimport = union(Set{Expr}(), map(c -> c.module_usings, setdiff(notebook.cells, to_run))...)

	deletion_hook((session, notebook), to_delete_vars, to_delete_funcs, to_reimport; to_run=to_run) # `deletion_hook` defaults to `WorkspaceManager.delete_vars`

	local any_interrupted = false
	for (i, cell) in enumerate(to_run)
		
		cell.queued = false
		cell.running = true
		cell.persist_js_state = persist_js_state || cell ∉ cells
		putnotebookupdates!(session, notebook, clientupdate_cell_output(notebook, cell))

		if any_interrupted
			relay_reactivity_error!(cell, InterruptException())
		else
			run = run_single!((session, notebook), cell)
			any_interrupted |= run.interrupted
		end
		
		cell.running = false
		putnotebookupdates!(session, notebook, clientupdate_cell_output(notebook, cell))
	end

	# allow other `run_reactive!` calls to be executed
	put!(notebook.executetoken)
	return new_order
end

const lazymap = Base.Generator

function defined_variables(topology::NotebookTopology, cells)
	lazymap(cells) do cell
		topology[cell].definitions
	end
end

function defined_functions(topology::NotebookTopology, cells)
	lazymap(cells) do cell
		((cell.cell_id, namesig.name) for namesig in topology[cell].funcdefs_with_signatures)
	end
end

"Run a single cell non-reactively, set its output, return run information."
function run_single!(session_notebook::Union{Tuple{ServerSession,Notebook},WorkspaceManager.Workspace}, cell::Cell)
	run = WorkspaceManager.eval_format_fetch_in_workspace(session_notebook, cell.parsedcode, cell.cell_id, ends_with_semicolon(cell.code))
	set_output!(cell, run)
	return run
end

function set_output!(cell::Cell, run)
	cell.last_run_timestamp = time()
	cell.runtime = run.runtime

	cell.output_repr = run.output_formatted[1]
	cell.repr_mime = run.output_formatted[2]
	cell.errored = run.errored
end

###
# CONVENIENCE FUNCTIONS
###

"Do all the things!"
function update_save_run!(session::ServerSession, notebook::Notebook, cells::Array{Cell,1}; save::Bool=true, run_async::Bool=false, prerender_text::Bool=false, kwargs...)
	update_caches!(notebook, cells)
	old = notebook.topology
	new = notebook.topology = updated_topology(old, notebook, cells)
	save && save_notebook(notebook)
	
	# _assume `prerender_text == false` if you want to skip some details_

	to_run_online = if !prerender_text
		cells
	else
		# this code block will run cells that only contain text offline, i.e. on the server process, before doing anything else
		# this makes the notebook load a lot faster - the front-end does not have to wait for each output, and perform costly reflows whenever one updates
		# "A Workspace on the main process, used to prerender markdown before starting a notebook process for speedy UI."
		original_pwd = pwd()
		offline_workspace = WorkspaceManager.make_workspace(
			(ServerSession(options=Configuration.Options(evaluation=Configuration.EvaluationOptions(workspace_use_distributed=false))),
			notebook)
			)

		to_run_offline = filter(c -> !c.running && is_just_text(new, c) && is_just_text(old, c), cells)
		for cell in to_run_offline
			run_single!(offline_workspace, cell)
		end
		
		cd(original_pwd)
		setdiff(cells, to_run_offline)
	end

	if run_async
		@asynclog run_reactive!(session, notebook, old, new, to_run_online; kwargs...)
	else
		run_reactive!(session, notebook, old, new, to_run_online; kwargs...)
	end
end

update_save_run!(session::ServerSession, notebook::Notebook, cell::Cell; kwargs...) = update_save_run!(session, notebook, [cell]; kwargs...)
update_run!(args...) = update_save_run!(args...; save=false)