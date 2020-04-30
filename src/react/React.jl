"Information container about the cells to run in a reactive call and any cells that will err."
struct CellTopology
	"Cells that form a directed acyclic graph, in topological order."
	runnable::Array{Cell, 1}
	"Cells that are in a directed cycle, with corresponding `ReactivityError`s."
	errable::Dict{Cell, ReactivityError}
end

"Return a `CellTopology` that lists the cells to be evaluated in a single reactive run, in topological order. Includes the given roots."
function topological_order(notebook::Notebook, roots::Array{Cell, 1})::CellTopology
	entries = Cell[]
	exits = Cell[]
	errable = Dict{Cell, ReactivityError}()

	function dfs(cell::Cell)
		if cell in keys(errable)
			return
		elseif cell in exits
			return
		elseif length(entries) > 0 && entries[end] == cell
			return # a cell referencing itself is legal
		elseif cell in entries
			currently_in = setdiff(entries, exits)
			cycle = currently_in[findfirst(currently_in .== [cell]):end]
			for cell in cycle
				errable[cell] = CyclicReferenceError(cycle)
			end
			return
		end

		push!(entries, cell)
		assigners = where_assigned(notebook, cell.symstate.assignments)
		if length(assigners) > 1
			for cell in assigners
				errable[cell] = MultipleDefinitionsError(cell, assigners)
			end
		end
		referencers = where_referenced(notebook, cell.symstate.assignments)
		dfs.(setdiff(union(assigners, referencers), [cell]))
		push!(exits, cell)
	end

	# When two cells 
	# we first move cells to the front if they call an import
    # we use MergeSort because it is a stable sort: leaves cells in order if they are in the same category
    prelim_order_1 = sort(roots, alg=MergeSort, by=(c -> isempty(c.module_usings)))
	# reversing because our search returns reversed order
	prelim_order_2 = reverse(prelim_order_1)
	dfs.(prelim_order_2)
	ordered = reverse(exits)
	CellTopology(setdiff(ordered, keys(errable)), errable)
end

function disjoint(a::Set, b::Set)
	!any(x in a for x in b)
end

"Return the cells that reference any of the given symbols. Recurses down functions calls, but not down cells."
function where_referenced(notebook::Notebook, symbols::Set{Symbol})::Array{Cell, 1}
	return filter(notebook.cells) do cell
		if !disjoint(symbols, cell.symstate.references)
			return true
		end
        for func in cell.symstate.funccalls
            if haskey(notebook.combined_funcdefs, func)
                if !disjoint(symbols, notebook.combined_funcdefs[func].references)
                    return true
                end
            end
		end
		return false
	end
end

"Return the cells that assign to any of the given symbols. Recurses down functions calls, but not down cells."
function where_assigned(notebook::Notebook, symbols::Set{Symbol})::Array{Cell, 1}
	return filter(notebook.cells) do cell
		if !disjoint(symbols, cell.symstate.assignments)
			return true
		end
        for func in cell.symstate.funccalls
            if haskey(notebook.combined_funcdefs, func)
                if !disjoint(symbols, notebook.combined_funcdefs[func].assignments)
                    return true
                end
            end
		end
		return false
	end
end

"Update the combined collection of function definitions, where multiple specialisations of a function are combined into a single `SymbolsState`."
function update_funcdefs!(notebook::Notebook)
	notebook.combined_funcdefs = union((c.symstate.funcdefs for c in notebook.cells)...)
end

"Return all variables that a cell references, including those referenced through function calls."
function all_references(notebook::Notebook, cell::Cell)::Set{Symbol}
	return cell.symstate.references
end

"Return all variables that a cell assigns to, including mutable globals assigned through function calls."
function all_assignments(notebook::Notebook, cell::Cell)::Set{Symbol}
	return cell.symstate.assignments
end 

"Return all functions called by a cell, and all functions called by those functions, et cetera."
function all_indirect_calls(notebook::Notebook, symstate::SymbolsState, found::Set{Vector{Symbol}}=Set{Vector{Symbol}}())::Set{Vector{Symbol}}
	for func in symstate.funccalls
		if func in found
			# done
		else
			push!(found, func)
            if haskey(notebook.combined_funcdefs, func)
                inner_symstate = notebook.combined_funcdefs[func]
                all_indirect_calls(notebook, inner_symstate, found)
            end
		end
	end

	return found
end
