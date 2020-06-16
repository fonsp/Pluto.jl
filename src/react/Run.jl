import REPL: ends_with_semicolon

Base.push!(x::Set{Cell}) = x

"Run given cells and all the cells that depend on them."
function run_reactive!(notebook::Notebook, cells::Array{Cell, 1}; deletion_hook::Function=WorkspaceManager.delete_vars)::CellTopology
	# make sure that we're the only `run_reactive!` being executed - like a semaphor
	token = take!(notebook.executetoken)

	# save the old topology - we'll delete variables assigned from it and re-evalutate its cells
	old_topology = topological_order(notebook, cells)
	
	old_runnable = old_topology.runnable
	to_delete_vars = union!(Set{Symbol}(), (runnable.symstate.assignments for runnable in old_runnable)...)
	to_delete_funcs = union!(Set{Vector{Symbol}}(), (keys(runnable.symstate.funcdefs) for runnable in old_runnable)...)

	# update the cache using the new code and compute the new topology
	update_caches!(notebook, cells)

	new_topology = topological_order(notebook, union(cells, keys(old_topology.errable)))
	to_run = setdiff(union(new_topology.runnable, old_topology.runnable), keys(new_topology.errable))::Array{Cell, 1} # TODO: think if old error cell order matters

	# change the bar on the sides of cells to "running"
	for cell in to_run
		cell.running = true
		putnotebookupdates!(notebook, clientupdate_cell_running(notebook, cell))
	end
	for (cell, error) in new_topology.errable
		cell.running = false
		relay_reactivity_error!(cell, error)
		putnotebookupdates!(notebook, clientupdate_cell_output(notebook, cell))
	end
	
	# delete new variables that will be defined by a cell
	new_runnable = new_topology.runnable
	to_delete_vars = union!(to_delete_vars, (runnable.symstate.assignments for runnable in new_runnable)...)
	to_delete_funcs = union!(to_delete_funcs, (keys(runnable.symstate.funcdefs) for runnable in new_runnable)...)
	
	# delete new variables in case a cell errors (then the later cells show an UndefVarError)
	new_errable = keys(new_topology.errable)
	to_delete_vars = union!(to_delete_vars, (errable.symstate.assignments for errable in new_errable)...)
	to_delete_funcs = union!(to_delete_funcs, (keys(errable.symstate.funcdefs) for errable in new_errable)...)
	
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
		putnotebookupdates!(notebook, clientupdate_cell_output(notebook, cell))
	end

	# allow other `run_reactive!` calls to be executed
	put!(notebook.executetoken, token)
	return new_topology
end


"See `run_reactive`."
function run_reactive_async!(notebook::Notebook, cells::Array{Cell, 1}; kwargs...)::Task
	@async begin
		# because this is being run asynchronously, we need to catch exceptions manually
		try
			run_reactive!(notebook, cells; kwargs...)
		catch ex
			bt = stacktrace(catch_backtrace())
			showerror(stderr, ex, bt)
		end
	end
end

run_reactive!(notebook::Notebook, cell::Cell; kwargs...) = run_reactive!(notebook, [cell]; kwargs...)::CellTopology
run_reactive_async!(notebook::Notebook, cell::Cell; kwargs...) = run_reactive_async!(notebook, [cell]; kwargs...)::Task

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

"Parse and analyze code for the given `cells`; analyze (indirect) function calls."
function update_caches!(notebook, cells)
	for cell in cells
		start_cache!(notebook, cell)
	end
	update_funcdefs!(notebook)
	for cell in cells
		finish_cache!(notebook, cell)
	end
end

"Update a single cell's cache - parsed code etc"
function start_cache!(notebook::Notebook, cell::Cell)
	cell.parsedcode = parse_custom(notebook, cell)
	cell.module_usings = ExploreExpression.compute_usings(cell.parsedcode)
	cell.rootassignee = ExploreExpression.get_rootassignee(cell.parsedcode)
	cell.symstate = try
		ExploreExpression.compute_symbolreferences(cell.parsedcode)
	catch ex
		@error "Expression explorer failed on: " cell.code
		showerror(stderr, ex, stacktrace(backtrace()))
		ExploreExpression.SymbolsState()
	end
end

"Account for globals referenced in function calls by including `SymbolsState`s from called functions in the cell itself."
function finish_cache!(notebook::Notebook, cell::Cell)
	calls = all_indirect_calls(notebook, cell.symstate)
	calls = union!(calls, keys(cell.symstate.funcdefs)) # _assume_ that all defined functions are called inside the cell to trigger eager reactivity.
	filter!(in(keys(notebook.combined_funcdefs)), calls)

	union!(cell.symstate.references, (notebook.combined_funcdefs[func].references for func in calls)...)
	union!(cell.symstate.assignments, (notebook.combined_funcdefs[func].assignments for func in calls)...)

	add_funcnames!(notebook, cell, calls)
end

"""Add method calls and definitions as symbol references and definition, resp.

Will add `Module.func` (stored as `Symbol[:Module, :func]`) as Symbol("Module.func") (which is not the same as the expression `:(Module.func)`)."""
function add_funcnames!(notebook::Notebook, cell::Cell, calls::Set{Vector{Symbol}})
	push!(cell.symstate.references, (cell.symstate.funccalls .|> join_funcname_parts)...)
	push!(cell.symstate.assignments, (keys(cell.symstate.funcdefs) .|> join_funcname_parts)...)

	union!(cell.symstate.references, (notebook.combined_funcdefs[func].funccalls .|> join_funcname_parts for func in calls)...)
	union!(cell.symstate.assignments, (keys(notebook.combined_funcdefs[func].funcdefs) .|> join_funcname_parts for func in calls)...)
end