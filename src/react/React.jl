function run_single!(initiator, notebook::Notebook, cell::Cell)
	# if isa(cell.parsedcode, Expr) && cell.parsedcode.head == :using
	#	 # Don't run this cell. We set its output directly and stop the method prematurely.
	#	 relay_error!(cell, "Use `import` instead of `using`.\nSupport for `using` will be added soon.")
	#	 return
	# end
	workspace = ModuleManager.get_workspace(notebook)
	starttime = time_ns()
	try
		starttime = time_ns()
		output = Core.eval(workspace, cell.parsedcode)
		cell.runtime = time_ns() - starttime

		relay_output!(cell, output)
		# TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
	catch err
		cell.runtime = time_ns() - starttime
		bt = stacktrace(catch_backtrace())
		relay_error!(cell, err, bt)
	end

end

"Run a cell and all the cells that depend on it"
function run_reactive!(initiator, notebook::Notebook, cell::Cell)
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
        
        # We also include the functions defined in this cell, to make sure that the function definition is re-evaluated when it uses a global variable that changed. e.g.
        
        # y = 1
        # f(x) = x + y
        
        # In a REPL, this is not necessary: `y` is evaluated when the function is called, not when it is defined. However, it is necessary in our case because we move to a new workspace for most evaluations, so the same `y` is no longer available to `f`.
        for func in keys(c.resolved_symstate.funcdefs)
            if haskey(notebook.combined_funcdefs, func)
                c.resolved_symstate.references = notebook.combined_funcdefs[func].references ∪ c.resolved_symstate.references
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
    to_delete = union(
        old_resolved_symstate.assignments, 
        (c.resolved_symstate.assignments for c in will_update)..., 
        keys(old_resolved_symstate.funcdefs),
        (keys(c.resolved_symstate.funcdefs) for c in will_update)..., 
    )
	
	ModuleManager.delete_vars(notebook, to_delete, module_usings)


	for to_run in will_update
		if to_run in reassigned
			assigned_multiple = let
				other_modifiers = setdiff(competing_modifiers, [to_run])
				union((to_run.resolved_symstate.assignments ∩ c.resolved_symstate.assignments for c in other_modifiers)...)
			end
			relay_error!(to_run, "Multiple definitions for $(join(assigned_multiple, ", ", " and "))")
		elseif to_run in cyclic
			assigned_cyclic = let
				referenced_during_cycle = union((c.resolved_symstate.references for c in cyclic)...)
				assigned_during_cycle = union((c.resolved_symstate.assignments for c in cyclic)...)
				
				referenced_during_cycle ∩ assigned_during_cycle
			end
			relay_error!(to_run, "Cyclic references: $(join(assigned_cyclic, ", ", " and "))")
		else
			run_single!(initiator, notebook, to_run)
		end
		putnotebookupdates!(notebook, clientupdate_cell_output(initiator, notebook, to_run))
	end

	return will_update
end


"Cells to be evaluated in a single reactive cell run, in order - including the given cell"
function dependent_cells(notebook::Notebook, root::Cell)
	entries = Cell[]
	exits = Cell[]
	cyclic = Set{Cell}()

	function dfs(cell::Cell)
		if cell in exits
			return
		elseif length(entries) > 0 && entries[end] == cell
			return # a cell referencing itself is legal
		elseif cell in entries
			currently_entered = setdiff(entries, exits)
			detected_cycle = currently_entered[findfirst(currently_entered .== [cell]):end]
			cyclic = union(cyclic, detected_cycle)
			return
		end

		push!(entries, cell)
		dfs.(where_referenced(notebook, cell.resolved_symstate.assignments))
		push!(exits, cell)
	end

	dfs(root)
	return reverse(exits), cyclic
end

function disjoint(a::Set, b::Set)
	!any(x in a for x in b)
end

"Return cells that reference any of the given symbols. Recurses down functions calls, but not down cells."
function where_referenced(notebook::Notebook, symbols::Set{Symbol})
	return filter(notebook.cells) do cell
		if !disjoint(symbols, cell.resolved_symstate.references)
			return true
		end
        for func in cell.resolved_funccalls
            if haskey(notebook.combined_funcdefs, func)
                if !disjoint(symbols, notebook.combined_funcdefs[func].references)
                    return true
                end
            end
		end
		return false
	end
end


"Return cells that assign to any of the given symbols. Recurses down functions calls, but not down cells."
function where_assigned(notebook::Notebook, symbols::Set{Symbol})
	return filter(notebook.cells) do cell
		if !disjoint(symbols, cell.resolved_symstate.assignments)
			return true
		end
        for func in cell.resolved_funccalls
            if haskey(notebook.combined_funcdefs, func)
                if !disjoint(symbols, notebook.combined_funcdefs[func].assignments)
                    return true
                end
            end
		end
		return false
	end
end

"Return cells that modify any of the given symbols. Recurses down functions calls, but not down cells."
function where_called(notebook::Notebook, symbols::Set{Symbol})
	return filter(notebook.cells) do cell
		if !disjoint(symbols, cell.resolved_symstate.funccalls)
			return true
		end
        for func in cell.resolved_funccalls
            if haskey(notebook.combined_funcdefs, func)
                if !disjoint(symbols, notebook.combined_funcdefs[func].funccalls)
                    return true
                end
            end
		end
		return false
	end
end

function update_funcdefs!(notebook::Notebook)
	# TODO: optimise
	combined = notebook.combined_funcdefs = Dict{Symbol, SymbolsState}()

	for cell in notebook.cells
		for (func, symstate) in cell.symstate.funcdefs
			if haskey(combined, func)
				combined[func] = symstate ∪ combined[func]
			else
				combined[func] = symstate
			end
		end
	end
end

function all_recursed_calls!(notebook::Notebook, symstate::SymbolsState, found::Set{Symbol}=Set{Symbol}())
	for func in symstate.funccalls
		if func in found
			# done
		else
            push!(found, func)
            if haskey(notebook.combined_funcdefs, func)
                inner_symstate = notebook.combined_funcdefs[func]
                all_recursed_calls!(notebook, inner_symstate, found)
            end
		end
	end

	return found
end
