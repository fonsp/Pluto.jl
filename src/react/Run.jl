"Run given cells and all the cells that depend on them."
function run_reactive!(notebook::Notebook, cells::Array{Cell, 1})
	# make sure that we're the only run_reactive! being executed - like a semaphor
	token = take!(notebook.executetoken)

	to_delete_vars = Set{Symbol}()
	to_delete_funcs = Set{Symbol}()

	# save the old topology - we'll delete variables assigned from it and re-evalutate its cells
	old_topology = dependent_cells(notebook, cells)
	
	old_runnable = old_topology.runnable
	to_delete_vars = union(to_delete_vars, (runnable.symstate.assignments for runnable in old_runnable)...)
	to_delete_funcs = union(to_delete_funcs, (Set(keys(runnable.symstate.funcdefs)) for runnable in old_runnable)...)

	# update the cache using the new code and compute the new topology
	for cell in cells
		cell.parsedcode = Meta.parse(cell.code, raise=false)
		cell.module_usings = ExploreExpression.compute_usings(cell.parsedcode)
		cell.symstate = ExploreExpression.compute_symbolreferences(cell.parsedcode)
		cell.symstate.references = all_references(notebook, cell) # account for globals referenced in function calls
		cell.symstate.assignments = all_assignments(notebook, cell) # account for globals assigned to in function calls
	end
	update_funcdefs!(notebook)

	new_topology = dependent_cells(notebook, union(cells, keys(old_topology.errable)))
	to_run = setdiff(union(new_topology.runnable, old_topology.runnable), keys(new_topology.errable)) # TODO: think if old error cell order matters

	# change the bar on the sides of cells to "running"
	for cell in to_run
		putnotebookupdates!(notebook, clientupdate_cell_running(notebook, cell))
	end
	for (cell, error) in new_topology.errable
		relay_reactivity_error!(cell, error)
	end
	
	# delete new variables in case a cell errors (then the later cells show an UndefVarError)
	new_runnable = new_topology.runnable
    to_delete_vars = union(to_delete_vars, (runnable.symstate.assignments for runnable in new_runnable)...)
	to_delete_funcs = union(to_delete_funcs, (Set(keys(runnable.symstate.funcdefs)) for runnable in new_runnable)...)
	
	new_errable = keys(new_topology.errable)
	to_delete_vars = union(to_delete_vars, (errable.symstate.assignments for errable in new_errable)...)
	to_delete_funcs = union(to_delete_funcs, (Set(keys(errable.symstate.funcdefs)) for errable in new_errable)...)
	
	workspace = WorkspaceManager.get_workspace(notebook)
	WorkspaceManager.delete_vars(workspace, to_delete_vars)
	WorkspaceManager.delete_funcs(workspace, to_delete_funcs)

	local any_interrupted = false
	for cell in to_run
		if any_interrupted
			relay_reactivity_error!(cell, InterruptException())
		else
			deleted_refs = cell.symstate.references ∩ workspace.deleted_vars
			if length(deleted_refs) > 0
				relay_reactivity_error!(cell, deleted_refs |> first |> UndefVarError)
			else
				any_interrupted |= run_single!(notebook, cell)
			end
		end
		putnotebookupdates!(notebook, clientupdate_cell_output(notebook, cell))
	end

	# allow other run_reactive! calls to be executed
	put!(notebook.executetoken, token)
	return new_topology
end


"See `run_reactive`."
function run_reactive_async!(notebook::Notebook, cells::Array{Cell, 1})::Task
	@async begin
		# because this is being run async, we need to catch exceptions manually
		try
			run_reactive!(notebook, cells)
		catch ex
			bt = stacktrace(catch_backtrace())
			showerror(stderr, ex, bt)
		end
	end
end

run_reactive!(notebook::Notebook, cell::Cell) = run_reactive!(notebook, [cell])
run_reactive_async!(notebook::Notebook, cell::Cell) = run_reactive_async!(notebook, [cell])

"Run a single cell non-reactively, return whether the run was Interrupted."
function run_single!(notebook::Notebook, cell::Cell)::Bool
	starttime = time_ns()
	run = WorkspaceManager.eval_fetch_in_workspace(notebook, cell.parsedcode)
	cell.runtime = time_ns() - starttime

	if run.errored
		cell.output_repr = nothing
		cell.error_repr = run.output_formatted[1]
		cell.repr_mime = run.output_formatted[2]
	else
		cell.output_repr = run.output_formatted[1]
		cell.error_repr = nothing
		cell.repr_mime = run.output_formatted[2]
		WorkspaceManager.undelete_vars(notebook, cell.symstate.assignments)
	end

	return run.interrupted
	# TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
end