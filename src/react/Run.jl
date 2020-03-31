"Run some cells and all the cells that depend on them"
function run_reactive!(initiator, notebook::Notebook, cells::Set{Cell})
	# make sure that we're the only run_reactive! being executed - like a semaphor
	token = take!(notebook.executetoken)

	to_delete_vars = Set{Symbol}()
	to_delete_funcs = Set{Symbol}()

	# save the old topology - we'll delete variables from it and update its cells
	old_topology = dependent_cells(notebook, cells)
	to_delete_vars = union(to_delete_vars, (runnable.symstate.assignments for runnable in old_topology.runnable)...)
	to_delete_funcs = union(to_delete_funcs, (Set(keys(runnable.symstate.funcdefs)) for runnable in old_topology.runnable)...)

	# update the cache using the new code and compute the new topology
	for cell in cells
		cell.parsedcode = Meta.parse(cell.code, raise=false)
		cell.module_usings = ExploreExpression.compute_usings(cell.parsedcode)
		cell.symstate = ExploreExpression.compute_symbolreferences(cell.parsedcode)
		cell.symstate.references = all_references(notebook, cell) # account for globals referenced in function calls
		cell.symstate.assignments = all_assignments(notebook, cell) # account for globals assigned to in function calls
	end
	update_funcdefs!(notebook)
	new_topology = dependent_cells(notebook, cells)
	to_run = setdiff(union(new_topology.runnable, old_topology.runnable, keys(old_topology.errors)), keys(new_topology.errors)) # TODO: think if old error cell order matters

	# change the bar on the sides of cells to "running"
	for cell in to_run
		putnotebookupdates!(notebook, clientupdate_cell_running(initiator, notebook, cell))
	end
	for (cell, error) in new_topology.errors
		relay_reactivity_error!(cell, error)
	end
	
	# delete new variables in case a cell errors (then the later cells show an UndefVarError)
    to_delete_vars = union(to_delete_vars, (runnable.symstate.assignments for runnable in new_topology.runnable)...)
	to_delete_funcs = union(to_delete_funcs, (Set(keys(runnable.symstate.funcdefs)) for runnable in new_topology.runnable)...)
	
	workspace = WorkspaceManager.get_workspace(notebook)
	WorkspaceManager.delete_vars(workspace, to_delete_vars)
	WorkspaceManager.delete_funcs(workspace, to_delete_funcs)

	for cell in to_run
		deleted_refs = cell.symstate.references ∩ workspace.deleted_vars
		if length(deleted_refs) > 0
			relay_reactivity_error!(cell, deleted_refs |> first |> UndefVarError)
		else
			run_single!(initiator, notebook, cell)
		end
		
		putnotebookupdates!(notebook, clientupdate_cell_output(initiator, notebook, cell))
	end

	# allow other run_reactive! calls to be executed
	put!(notebook.executetoken, token)
	return new_topology
end

run_reactive!(initiator, notebook::Notebook, cell::Cell) = run_reactive!(initiator, notebook, Set{Cell}([cell]))

"Run a single cell non-reactively"
function run_single!(initiator, notebook::Notebook, cell::Cell)
	starttime = time_ns()
	output, errored = WorkspaceManager.eval_fetch_in_workspace(notebook, cell.parsedcode)
	cell.runtime = time_ns() - starttime

	if errored
		cell.output_repr = nothing
		cell.error_repr = output[1]
		cell.repr_mime = output[2]
	else
		cell.output_repr = output[1]
		cell.error_repr = nothing
		cell.repr_mime = output[2]
		WorkspaceManager.undelete_vars(notebook, cell.symstate.assignments)
	end
	# TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
end