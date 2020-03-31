"Information about the cells to run in a reactive call, including cycles etc."
struct CellGraph
	to_run::Array{Cell, 1} # those cells can be run
	cyclic::Array{Cell, 2} # cyclic[1] are members of the first cycle; cycles may overlap
	multidef::Array{Cell, 2} # like cyclic, but for multiple definitions of the same symbol
	unrunnable::Array{Cell, 1} # cells which depend on cyclic/multidef cells
end

"Cells to be evaluated in a single reactive run, in order - including the given cell."
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

"Cells that reference any of the given symbols. Recurses down functions calls, but not down cells."
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

"Cells that assign to any of the given symbols. Recurses down functions calls, but not down cells."
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

"Cells that modify any of the given symbols. Recurses down functions calls, but not down cells."
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
