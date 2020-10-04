import .ExpressionExplorer: SymbolsState

function disjoint(a::Set, b::Set)
	!any(x in a for x in b)
end

"Information container about the cells to run in a reactive call and any cells that will err."
struct TopologicalOrder
	"Cells that form a directed acyclic graph, in topological order."
	runnable::Array{Cell,1}
	"Cells that are in a directed cycle, with corresponding `ReactivityError`s."
	errable::Dict{Cell,ReactivityError}
end

"Return a `TopologicalOrder` that lists the cells to be evaluated in a single reactive run, in topological order. Includes the given roots."
function topological_order(notebook::Notebook, topology::NotebookTopology, roots::Array{Cell,1}; allow_multiple_defs=false)::TopologicalOrder
	entries = Cell[]
	exits = Cell[]
	errable = Dict{Cell,ReactivityError}()

	# NOTE: it currently runs the duplicate methods detection on all cells
	# Maybe it can run it on a subset of functions which have been updated
  errable_cells_id_syms = detect_duplicated_methods(topology)
  for (cell_id, func) in errable_cells_id_syms
	  cell_idx = findfirst(cell -> cell.cell_id == cell_id, notebook.cells)
	  errable[notebook.cells[cell_idx]] = MultipleDefinitionsError(Set([func]))
	end

	function dfs(cell::Cell)
		if cell in exits
			return
		elseif haskey(errable, cell)
			return
		elseif length(entries) > 0 && entries[end] == cell
			return # a cell referencing itself is legal
		elseif cell in entries
			currently_in = setdiff(entries, exits)
			cycle = currently_in[findfirst(isequal(cell), currently_in):end]
			for cell in cycle
				errable[cell] = CyclicReferenceError(topology, cycle...)
			end
			return
		end

		push!(entries, cell)
		assigners = where_assigned(notebook, topology, topology[cell].assignments)
		if !allow_multiple_defs && length(assigners) > 1
			for c in assigners
				errable[c] = MultipleDefinitionsError(topology, c, assigners)
			end
		end
		referencers = where_referenced(notebook, topology, topology[cell].assignments) |> Iterators.reverse
		for c in (allow_multiple_defs ? referencers : union(assigners, referencers))
			if c != cell
				dfs(c)
			end
		end
		push!(exits, cell)
	end

	# we first move cells to the front if they call `import` or `using`
    # we use MergeSort because it is a stable sort: leaves cells in order if they are in the same category
    prelim_order_1 = sort(roots, alg=MergeSort, by=c -> cell_precedence_heuristic(topology, c))
	# reversing because our search returns reversed order
	prelim_order_2 = Iterators.reverse(prelim_order_1)
	dfs.(prelim_order_2)
	ordered = reverse(exits)

	TopologicalOrder(setdiff(ordered, keys(errable)), errable)
end

"Return the cells that reference any of the given symbols. Recurses down functions calls, but not down cells."
function where_referenced(notebook::Notebook, topology::NotebookTopology, symbols::Set{Symbol})::Array{Cell,1}
	return filter(notebook.cells) do cell
		if !disjoint(symbols, topology[cell].references)
			return true
		end
        for func in topology[cell].funccalls
            if haskey(topology.combined_funcdefs, func)
                if !disjoint(symbols, topology.combined_funcdefs[func].combined_symstates.references)
                    return true
                end
            end
		end
		return false
	end
end

"Return the cells that assign to any of the given symbols. Recurses down functions calls, but not down cells."
function where_assigned(notebook::Notebook, topology::NotebookTopology, symbols::Set{Symbol})::Array{Cell,1}
	return filter(notebook.cells) do cell
		if !disjoint(symbols, topology[cell].assignments)
			return true
		end
        for func in topology[cell].funccalls
            if haskey(topology.combined_funcdefs, func)
                if !disjoint(symbols, topology.combined_funcdefs[func].combined_symstates.assignments)
                    return true
                end
            end
		end
		return false
	end
end

"Return all functions called by a cell, and all functions called by those functions, et cetera."
function all_indirect_calls(topology::NotebookTopology, symstate::SymbolsState, found::Set{Vector{Symbol}}=Set{Vector{Symbol}}())::Set{Vector{Symbol}}
	for func in symstate.funccalls
		if func in found
			# done
		else
			push!(found, func)
            if haskey(topology.combined_funcdefs, func)
                inner_symstate = topology.combined_funcdefs[func]
                all_indirect_calls(topology, inner_symstate.combined_symstates, found)
            end
		end
	end

	return found
end

const md_and_friends = [Symbol("@md_str"), Symbol("@html_str")]

"""Does the cell only contain md"..." and html"..."?

This is used to run these cells first."""
function is_just_text(topology::NotebookTopology, cell::Cell)::Bool
	# https://github.com/fonsp/Pluto.jl/issues/209
	isempty(topology[cell].assignments) && 
		length(topology[cell].references) <= 2 && 
		topology[cell].references ⊆ md_and_friends
end

"""Assigns a number to a cell - cells with a lower number might run first. 

This is used to treat reactive dependencies between cells that cannot be found using static code anylsis."""
function cell_precedence_heuristic(topology::NotebookTopology, cell::Cell)::Number
	if :LOAD_PATH ∈ topology[cell].references
		# https://github.com/fonsp/Pluto.jl/issues/323
		1
	elseif !isempty(cell.module_usings)
		# always do `using X` before other cells, because we don't (yet) know which cells depend on it (we only know it with `import X` and `import X: y, z`)
		2
	elseif [:include] ∈ topology[cell].funccalls
		# https://github.com/fonsp/Pluto.jl/issues/193
		# because we don't (yet) know which cells depend on it
		3
	else
		4
	end
end