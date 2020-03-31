"Run a cell and all the cells that depend on it"
function run_reactive!(initiator, notebook::Notebook, cell::Cell)
	# This guarantees that we are the only run_reactive! that is running cells right now:
	token = take!(notebook.executetoken)

	workspace = WorkspaceManager.get_workspace(notebook)

	cell.parsedcode = Meta.parse(cell.code, raise=false)
	cell.module_usings = ExploreExpression.compute_usings(cell.parsedcode)

    old_resolved_symstate = cell.resolved_symstate
    old_symstate = cell.symstate
	new_symstate = cell.symstate = ExploreExpression.compute_symbolreferences(cell.parsedcode)

	# Recompute function definitions list
	# A function can have multiple definitions, each with its own SymbolsState
	# These are combined into a single SymbolsState for each function name.
    update_funcdefs!(notebook)

	# Unfortunately, this means that you lose reactivity in situations like:

	# f(x) = global z = x; z+2
	# g = f
	# g(5)
	# z

	# TODO: function calls are also references!

	oldnew_direct_callers = where_called(notebook, keys(new_symstate.funcdefs) ∪ keys(old_symstate.funcdefs))
	
	# Next, we need to update the cached list of resolved symstates for this cell.
    
	# We also need to update any cells that call a function that is/was assigned by this cell.
	for c in Set((cell, oldnew_direct_callers...))
        # "Resolved" means that recursive function calls are followed.
        c.resolved_funccalls = all_recursed_calls!(notebook, c.symstate)
        
        # "Resolved" means that the `SymbolsState`s of all (recursively) called functions are included.
        c.resolved_symstate = c.symstate
        for func in c.resolved_funccalls
            if haskey(notebook.combined_funcdefs, func)
                c.resolved_symstate = notebook.combined_funcdefs[func] ∪ c.resolved_symstate
            end
        end
    end

    new_resolved_symstate = cell.resolved_symstate
    new_assigned = cell.resolved_symstate.assignments
    all_assigned = old_resolved_symstate.assignments ∪ new_resolved_symstate.assignments
    
    
	competing_modifiers = where_assigned(notebook, all_assigned)
    reassigned = length(competing_modifiers) > 1 ? competing_modifiers : []
    
    # During the upcoming search, we will temporarily use `all_assigned` instead of `new_resolved_symstate.assignments as this cell's set of assignments. This way, any variables that were deleted by this cell change will be deleted, and the cells that depend on the deleted variable will be run again. (Leading to errors. 👍)
    cell.resolved_symstate.assignments = all_assigned
    
	dependency_info = dependent_cells.([notebook], union(competing_modifiers, [cell]))
	will_update = union((d[1] for d in dependency_info)...)
    cyclic = union((d[2] for d in dependency_info)...)
    
    # we reset the temporary assignment:
    cell.resolved_symstate.assignments = new_assigned

	for to_run in will_update
		putnotebookupdates!(notebook, clientupdate_cell_running(initiator, notebook, to_run))
    end
    
	module_usings = union((c.module_usings for c in notebook.cells)...)
    to_delete_vars = union(
        old_resolved_symstate.assignments, 
        (c.resolved_symstate.assignments for c in will_update)...
	)
	to_delete_funcs = union(
        keys(old_resolved_symstate.funcdefs), 
        (keys(c.resolved_symstate.funcdefs) for c in will_update)...
    )
	
	WorkspaceManager.delete_vars(workspace, to_delete_vars)
	WorkspaceManager.delete_funcs(workspace, to_delete_funcs)

	for to_run in will_update
		multidef_error = if to_run in reassigned MultipleDefinitionsError(to_run, reassigned) else nothing end
		cyclic_error = if to_run in cyclic CircularReferenceError(cyclic) else nothing end

		deleted_refs = let
			to_run.resolved_symstate.references ∩ workspace.deleted_vars
		end

		if multidef_error != nothing
			relay_reactivity_error!(to_run, multidef_error)
		elseif cyclic_error != nothing
			relay_reactivity_error!(to_run, cyclic_error)
		elseif length(deleted_refs) > 0
			relay_reactivity_error!(to_run, deleted_refs |> first |> UndefVarError)
		else
			run_single!(initiator, notebook, to_run)
		end
		
		putnotebookupdates!(notebook, clientupdate_cell_output(initiator, notebook, to_run))
	end

	put!(notebook.executetoken, token)

	return will_update
end

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
		WorkspaceManager.undelete_vars(notebook, cell.resolved_symstate.assignments)
	end
	# TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
end