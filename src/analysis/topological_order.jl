"Return a `TopologicalOrder` that lists the cells to be evaluated in a single reactive run, in topological order. Includes the given roots."
function topological_order(notebook::Notebook, topology::NotebookTopology, roots::Array{Cell,1}; allow_multiple_defs=false)::TopologicalOrder
	entries = Cell[]
	exits = Cell[]
	errable = Dict{Cell,ReactivityError}()

	# https://xkcd.com/2407/
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
		assigners = where_assigned(notebook, topology, cell)
		if !allow_multiple_defs && length(assigners) > 1
			for c in assigners
				errable[c] = MultipleDefinitionsError(topology, c, assigners)
			end
		end
		referencers = where_referenced(notebook, topology, cell) |> Iterators.reverse
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
	TopologicalOrder(topology, setdiff(ordered, keys(errable)), errable)
end

function topological_order(notebook::Notebook)
	cached = notebook._cached_topological_order
	if cached === nothing || cached.input_topology !== notebook.topology
		topological_order(notebook, notebook.topology, notebook.cells)
	else
		cached
	end
end

Base.collect(notebook_topo_order::TopologicalOrder) = union(notebook_topo_order.runnable, keys(notebook_topo_order.errable))


function disjoint(a::Set, b::Set)
	!any(x in a for x in b)
end

"Return the cells that reference any of the symbols defined by the given cell. Non-recursive: only direct dependencies are found."
function where_referenced(notebook::Notebook, topology::NotebookTopology, myself::Cell)::Array{Cell,1}
	to_compare = union(topology.nodes[myself].definitions, topology.nodes[myself].soft_definitions, topology.nodes[myself].funcdefs_without_signatures)
	where_referenced(notebook, topology, to_compare)
end
"Return the cells that reference any of the given symbols. Non-recursive: only direct dependencies are found."
function where_referenced(notebook::Notebook, topology::NotebookTopology, to_compare::Set{Symbol})::Array{Cell,1}
	return filter(notebook.cells) do cell
		!disjoint(to_compare, topology.nodes[cell].references)
	end
end

"Return the cells that also assign to any variable or method defined by the given cell. If more than one cell is returned (besides the given cell), then all of them should throw a `MultipleDefinitionsError`. Non-recursive: only direct dependencies are found."
function where_assigned(notebook::Notebook, topology::NotebookTopology, myself::Cell)::Array{Cell,1}
	self = topology.nodes[myself]
	return filter(notebook.cells) do cell
		other = topology.nodes[cell]
		!(
			disjoint(self.definitions,                 other.definitions) &&

			disjoint(self.definitions,                 other.funcdefs_without_signatures) &&
			disjoint(self.funcdefs_without_signatures, other.definitions) &&

			disjoint(self.funcdefs_with_signatures,    other.funcdefs_with_signatures)
		)
	end
end

function where_assigned(notebook::Notebook, topology::NotebookTopology, to_compare::Set{Symbol})::Array{Cell,1}
	filter(notebook.cells) do cell
		other = topology.nodes[cell]
		!(
			disjoint(to_compare, other.definitions) &&
			disjoint(to_compare, other.funcdefs_without_signatures)
		)
	end
end

"Return whether any cell references the given symbol. Used for the @bind mechanism."
function is_referenced_anywhere(notebook::Notebook, topology::NotebookTopology, sym::Symbol)::Bool
	any(notebook.cells) do cell
		sym ∈ topology.nodes[cell].references
	end
end

"Return whether any cell defines the given symbol. Used for the @bind mechanism."
function is_assigned_anywhere(notebook::Notebook, topology::NotebookTopology, sym::Symbol)::Bool
	any(notebook.cells) do cell
		sym ∈ topology.nodes[cell].definitions
	end
end


"""Assigns a number to a cell - cells with a lower number might run first. 

This is used to treat reactive dependencies between cells that cannot be found using static code anylsis."""
function cell_precedence_heuristic(topology::NotebookTopology, cell::Cell)::Real
	top = topology.nodes[cell]
	if :Pkg ∈ top.definitions
		1
	elseif :DrWatson ∈ top.definitions
		2
	elseif Symbol("Pkg.API.activate") ∈ top.references || 
		Symbol("Pkg.activate") ∈ top.references ||
		Symbol("@pkg_str") ∈ top.references ||
		# https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
		Symbol("quickactivate") ∈ top.references ||
		Symbol("@quickactivate") ∈ top.references ||
		Symbol("DrWatson.@quickactivate") ∈ top.references ||
		Symbol("DrWatson.quickactivate") ∈ top.references
		3
	elseif Symbol("Pkg.API.add") ∈ top.references ||
		Symbol("Pkg.add") ∈ top.references ||
		Symbol("Pkg.API.develop") ∈ top.references ||
		Symbol("Pkg.develop") ∈ top.references
		4
	elseif :LOAD_PATH ∈ top.references
		# https://github.com/fonsp/Pluto.jl/issues/323
		5
	elseif :Revise ∈ top.definitions
		# Load Revise before other packages so that it can properly `revise` them.
		6
	elseif !isempty(topology.codes[cell].module_usings_imports.usings)
		# always do `using X` before other cells, because we don't (yet) know which cells depend on it (we only know it with `import X` and `import X: y, z`)
		7
	elseif :include ∈ top.references
		# https://github.com/fonsp/Pluto.jl/issues/193
		# because we don't (yet) know which cells depend on it
		8
	else
		9
	end
end
