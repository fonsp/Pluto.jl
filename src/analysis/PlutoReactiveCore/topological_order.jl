abstract type ChildExplorationResult end

struct Ok <: ChildExplorationResult end
struct Cycle <: ChildExplorationResult
	cycled_cells::Vector{<:AbstractCell}
end

"""
Return a `TopologicalOrder` that lists the cells to be evaluated in a single reactive run, in topological order. Includes the given roots.

# Keyword arguments

- `allow_multiple_defs::Bool = false`
  
  If `false` (default), multiple definitions are not allowed. When a cell is found that defines a variable that is also defined by another cell (this other cell is called a *fellow assigner*), then both cells are marked as `errable` and not `runnable`.
  
  If `true`, then multiple definitions are allowed, in the sense that we ignore the existance of other cells that define the same variable.


- `skip_at_partial_multiple_defs::Bool = false`
  
  If `true` (not default), and `allow_multiple_defs = true` (not default), then the search stops going downward when finding a cell that has fellow assigners, *unless all fellow assigners can be reached by the `roots`*, in which case we continue searching downward.

  In other words, if there is a set of fellow assigners that can only be reached **partially** by the roots, then this set blocks the search, and cells that depend on the set are not found.
"""
function topological_order(topology::NotebookTopology{C}, roots::AbstractVector{C}; 
	allow_multiple_defs::Bool=false,
	skip_at_partial_multiple_defs::Bool=false,
)::TopologicalOrder

	if skip_at_partial_multiple_defs
		@assert allow_multiple_defs
	end

	entries = C[]
	exits = C[]
	errable = Dict{C,ReactivityError}()

	# https://xkcd.com/2407/
	function bfs(cell::C)::ChildExplorationResult
		if cell in exits
			return Ok()
		elseif haskey(errable, cell)
			return Ok()
		elseif length(entries) > 0 && entries[end] === cell
			return Ok() # a cell referencing itself is legal
		elseif cell in entries
			currently_in = setdiff(entries, exits)
			cycle = currently_in[findfirst(isequal(cell), currently_in):end]

			if !cycle_is_among_functions(topology, cycle)
				for cell in cycle
					errable[cell] = CyclicReferenceError(topology, cycle)
				end
				return Cycle(cycle)
			end

			return Ok()
		end

		# used for cleanups of wrong cycles
		current_entries_num = length(entries)
		current_exits_num = length(exits)

		push!(entries, cell)

		assigners = where_assigned(topology, cell)
		referencers = where_referenced(topology, cell) |> Iterators.reverse
		
		if !allow_multiple_defs && length(assigners) > 1
			for c in assigners
				errable[c] = MultipleDefinitionsError(topology, c, assigners)
			end
		end
		
		should_continue_search_down = !skip_at_partial_multiple_defs || all(c -> c === cell || c ∈ exits, assigners)
		should_search_fellow_assigners_if_any = !allow_multiple_defs
		
		to_search_next = if should_continue_search_down
			if should_search_fellow_assigners_if_any
				union(assigners, referencers)
			else
				referencers
			end
		else
			C[]
		end
		
		for c in to_search_next
			if c !== cell
				child_result = bfs(c)

				# No cycle for this child or the cycle has no soft edges
				if child_result isa Ok || cell ∉ child_result.cycled_cells
					continue
				end

				# Can we cleanup the cycle from here or is it caused by a parent cell?
				# if the edge to the child cell is composed of soft assigments only then we can try to "break"
				# it else we bubble the result up to the parent until it is
				# either out of the cycle or a soft-edge is found
				if !is_soft_edge(topology, cell, c)
					# Cleanup all entries & child exits
					deleteat!(entries, current_entries_num+1:length(entries))
					deleteat!(exits, current_exits_num+1:length(exits))
					return child_result
				end

				# Cancel exploring this child (c)
				# 1. Cleanup the errables
				for cycled_cell in child_result.cycled_cells
					delete!(errable, cycled_cell)
				end
				# 2. Remove the current child (c) from the entries if it was just added
				if entries[end] === c
					pop!(entries)
				end

				continue # the cycle was created by us so we can keep exploring other childs
			end
		end
		push!(exits, cell)
		Ok()
	end

	# we first move cells to the front if they call `import` or `using`
	# we use MergeSort because it is a stable sort: leaves cells in order if they are in the same category
	prelim_order_1 = sort(roots, alg=MergeSort, by=c -> cell_precedence_heuristic(topology, c))
	# reversing because our search returns reversed order
    for i in length(prelim_order_1):-1:1
        bfs(prelim_order_1[i])
    end
	ordered = reverse(exits)
	TopologicalOrder(topology, setdiff(ordered, keys(errable)), errable)
end


Base.collect(notebook_topo_order::TopologicalOrder) = union(notebook_topo_order.runnable, keys(notebook_topo_order.errable))

function disjoint(a, b)
	!any(x in a for x in b)
end

"Return the cells that reference any of the symbols defined by the given cell. Non-recursive: only direct dependencies are found."
function where_referenced(topology::NotebookTopology{C}, myself::C)::Vector{C} where C <: AbstractCell
	to_compare = union(topology.nodes[myself].definitions, topology.nodes[myself].soft_definitions, topology.nodes[myself].funcdefs_without_signatures)
	where_referenced(topology, to_compare)
end
"Return the cells that reference any of the given symbols. Non-recursive: only direct dependencies are found."
function where_referenced(topology::NotebookTopology, to_compare::Set{Symbol})::Vector{Cell}
	return filter(all_cells(topology)) do cell
		!disjoint(to_compare, topology.nodes[cell].references)
	end
end

"Returns whether or not the edge between two cells is composed only of \"soft\"-definitions"
function is_soft_edge(topology::NotebookTopology, parent_cell::Cell, child_cell::Cell)
	hard_definitions = union(topology.nodes[parent_cell].definitions, topology.nodes[parent_cell].funcdefs_without_signatures)
	soft_definitions = topology.nodes[parent_cell].soft_definitions

	child_references = topology.nodes[child_cell].references

	disjoint(hard_definitions, child_references) && !disjoint(soft_definitions, child_references)
end


"Return the cells that also assign to any variable or method defined by the given cell. If more than one cell is returned (besides the given cell), then all of them should throw a `MultipleDefinitionsError`. Non-recursive: only direct dependencies are found."
function where_assigned(topology::NotebookTopology, myself::Cell)::Vector{Cell}
	where_assigned(topology, topology.nodes[myself])
end

function where_assigned(topology::NotebookTopology, self::ReactiveNode)::Vector{Cell}
	return filter(all_cells(topology)) do cell
		other = topology.nodes[cell]
		!(
			disjoint(self.definitions,                 other.definitions) &&

			disjoint(self.definitions,                 other.funcdefs_without_signatures) &&
			disjoint(self.funcdefs_without_signatures, other.definitions) &&

			disjoint(self.funcdefs_with_signatures,    other.funcdefs_with_signatures)
		)
	end
end

function where_assigned(topology::NotebookTopology, to_compare::Set{Symbol})::Vector{Cell}
	filter(all_cells(topology)) do cell
		other = topology.nodes[cell]
		!(
			disjoint(to_compare, other.definitions) &&
			disjoint(to_compare, other.funcdefs_without_signatures)
		)
	end
end



function cyclic_variables(topology::NotebookTopology, cycle::AbstractVector{Cell})::Set{Symbol}
	referenced_during_cycle = union!(Set{Symbol}(), (topology.nodes[c].references for c in cycle)...)
	assigned_during_cycle = union!(Set{Symbol}(), (topology.nodes[c].definitions ∪ topology.nodes[c].soft_definitions ∪ topology.nodes[c].funcdefs_without_signatures for c in cycle)...)
	
	referenced_during_cycle ∩ assigned_during_cycle
end

function cycle_is_among_functions(topology::NotebookTopology, cycle::AbstractVector{Cell})::Bool
	cyclics = cyclic_variables(topology, cycle)
	
	all(
		any(s ∈ topology.nodes[c].funcdefs_without_signatures for c in cycle)
		for s in cyclics
	)
end

function cell_precedence_heuristic(topology::NotebookTopology, cell::Cell)
	cell_precedence_heuristic(topology.nodes[cell], topology.codes[cell])
end


"""Assigns a number to a cell - cells with a lower number might run first. 

This is used to treat reactive dependencies between cells that cannot be found using static code anylsis."""
function cell_precedence_heuristic(node::ReactiveNode, code::ExprAnalysisCache)::Real
	if :Pkg ∈ node.definitions
		1
	elseif :DrWatson ∈ node.definitions
		2
	elseif Symbol("Pkg.API.activate") ∈ node.references || 
		Symbol("Pkg.activate") ∈ node.references ||
		Symbol("@pkg_str") ∈ node.references ||
		# https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
		Symbol("quickactivate") ∈ node.references ||
		Symbol("@quickactivate") ∈ node.references ||
		Symbol("DrWatson.@quickactivate") ∈ node.references ||
		Symbol("DrWatson.quickactivate") ∈ node.references
		3
	elseif Symbol("Pkg.API.add") ∈ node.references ||
		Symbol("Pkg.add") ∈ node.references ||
		Symbol("Pkg.API.develop") ∈ node.references ||
		Symbol("Pkg.develop") ∈ node.references
		4
	elseif :LOAD_PATH ∈ node.references
		# https://github.com/fonsp/Pluto.jl/issues/323
		5
	elseif :Revise ∈ node.definitions
		# Load Revise before other packages so that it can properly `revise` them.
		6
	elseif !isempty(code.module_usings_imports.usings)
		# always do `using X` before other cells, because we don't (yet) know which cells depend on it (we only know it with `import X` and `import X: y, z`)
		7
	elseif :include ∈ node.references
		# https://github.com/fonsp/Pluto.jl/issues/193
		# because we don't (yet) know which cells depend on it
		8
	else
		DEFAULT_PRECEDENCE_HEURISTIC
	end
end

const DEFAULT_PRECEDENCE_HEURISTIC = 9
