abstract type ChildExplorationResult end

struct Ok <: ChildExplorationResult end
struct CycleButItsOk <: ChildExplorationResult end
struct Cycle <: ChildExplorationResult
    cycled_cells::Vector{Cell}
end

#=
# $ tpluto React
# Current status: 439 passed, 0 failed, 3 errored, 9 broken
=#

@deprecate topological_order(::Notebook, topology::NotebookTopology, args...; kwargs...) topological_order(
    topology,
    args...;
    kwargs...
)

"""
Used to represent the cells value for a given reactive run. Disabling status is moved
out of the cell.metadata to prevent it for being updated by the client later in the run.
"""
Base.@kwdef mutable struct Node
    disabled::Bool = false
    cycle::Union{Nothing,CyclicReferenceError} = nothing
    multiple_definitions::Union{Nothing,MultipleDefinitionsError} = nothing

    downstream::Vector{Cell} = Cell[]
    upstream::Vector{Cell} = Cell[]
end

Base.@kwdef struct Tree
    nodes::Dict{Cell,Node} = Dict{Cell,Node}()
    cell_order::Vector{Cell} = Dict{Cell,Node}()
end

"""
    build_tree(topology::NotebookTopology, roots::AbstractVector{Cell})::Tree

This function builds a lineage tree between cells starting from the given roots using
a modified depth first search algorithm to explore the graph and attempt to make it
resistant to a certain type of edge that should only be present if there are no cycle.

In case of a cycle, it backtracks until it find a soft edge (an edge that can be broken)
to remove from the graph. These soft edges are used to implement a set of cell dependencies
that are nice to have but not a 100% reliable.
"""
function build_tree(topology::NotebookTopology, roots::AbstractVector{Cell})
    # We use vectors to enable backtracking
    entries = Cell[]
    exits = Cell[]
    relationships = Pair{Cell,Cell}[] # 👪

    cycles = Dict{Cell,CyclicReferenceError}()

    # https://xkcd.com/2407/
    function dfs(cell::Cell)
        if cell in exits
            return Ok()
        elseif haskey(cycles, cell)
            return Ok()
        elseif cell in entries
            currently_in = setdiff(entries, exits)
            cycle = currently_in[findfirst(isequal(cell), currently_in):end]

            if !cycle_is_among_functions(topology, cycle)
                for cell in cycle
                    cycles[cell] = CyclicReferenceError(topology, cycle)
                end
                return Cycle(cycle)
            end

            # the built tree has a "cycle" but it can be executed in any order
            # so the parent should not:
            #
            #   push!(relationships, cell => c)
            #
            return CycleButItsOk()
        end

        # used for cleanups of wrong cycles
        current_entries_num = length(entries)
        current_exits_num = length(exits)
        current_relationships_num = length(relationships)

        push!(entries, cell)

        referencers = where_referenced(topology, cell) |> Iterators.reverse
        for c in referencers
            if c != cell
                child_result = dfs(c)

                # No cycle for this child or the cycle has no soft edges
                if child_result isa Ok || (child_result isa Cycle && cell ∉ child_result.cycled_cells)
                    push!(relationships, cell => c)
                    continue
                elseif child_result isa CycleButItsOk
                    continue
                end

                # Can we cleanup the cycle from here or is it caused by a parent cell?
                # if the edge to the child cell is composed of soft assigments only then we can try to "break"
                # it else we bubble the result up to the parent until it is
                # either out of the cycle or a soft-edge is found
                if !is_soft_edge(topology, cell, c)
                    deleteat!(entries, (current_entries_num+1):length(entries))
                    deleteat!(exits, (current_exits_num+1):length(exits))
                    deleteat!(
                        relationships,
                        (current_relationships_num+1):length(relationships),
                    )
                    return child_result
                end

                # Here we found a soft edge than can be broken for this cycle!
                # there is still a tiny bit of cleanup that is needed 🧹
                # to cancel exploring this child (c)

                # 1. Cleanup the cycles
                for cycled_cell in child_result.cycled_cells
                    delete!(cycles, cycled_cell)
                end

                # 2. Remove the current child (c) from the entries if it was just added
                if entries[end] == c
                    pop!(entries)
                end

                continue # let's get to the next children
            end
        end

        push!(exits, cell)

        Ok()
    end

    prelim_order_1 =
        sort(roots, alg = MergeSort, by = c -> cell_precedence_heuristic(topology, c))
    prelim_order_2 = Iterators.reverse(prelim_order_1)

    for cell in prelim_order_2
        dfs(cell)
    end

    cell_order = reverse(exits)
    nodes = Dict{Cell,Node}(cell => Node() for cell in cell_order)

    for (errored, cycle) in cycles
        if !haskey(cycles, errored)
            cycles[errored] = Node()
        end

        # Build empty node for cells in cycles if needed
        if !haskey(nodes, errored)
            nodes[errored] = Node()
        end

        nodes[errored].cycle = cycle
    end

    # Build the actual tree 🎄
    for (parent, child) in unique(relationships)
        push!(nodes[parent].downstream, child)
        push!(nodes[child].upstream, parent)
    end

    Tree(; nodes, cell_order)
end

"A bfs to inherit what the parents have themselves inherited"
function inheritance_bfs(f::Function, tree::Tree)
    indegrees = Dict{Cell,Int}()
    queue = Cell[]

    for cell in tree.cell_order # TODO: work with only a subset of roots
        indegree = indegrees[cell] = length(tree.nodes[cell].upstream)
        if indegree == 0
            push!(queue, cell)
        end
    end

    user_values = Dict{Cell,Bool}()

    order = Cell[]
    while !isempty(queue)
        current_cell = popfirst!(queue)
        push!(order, current_cell)

        if haskey(user_values, current_cell)
            error("TODO: There is cycle and there should not be one")
        end

        user_values[current_cell] = f(
            current_cell,
            [user_values[parent] for parent in tree.nodes[current_cell].upstream],
        )

        for child in tree.nodes[current_cell].downstream
            indegrees[child] -= 1

            if indegrees[child] == 0
                push!(queue, child)
            end
        end
    end

    order
end

# Yet another dfs 😬
function order(topology::NotebookTopology, tree::Tree)
    entries = Cell[]
    exits = Cell[]

    errable = Dict{Cell,ReactivityError}()
    for (cell, node) in tree.nodes
        if node.cycle !== nothing
            errable[cell] = node.cycle
        elseif node.multiple_definitions !== nothing
            errable[cell] = node.multiple_definitions
        end
    end

    function dfs(cell::Cell)::ChildExplorationResult
        if cell in exits
            return Ok()
        elseif haskey(errable, cell)
            return Ok()
        elseif length(entries) > 0 && entries[end] == cell
            return Ok()
        elseif cell in entries
            error("There is still a cycle")
        end

        node = tree.nodes[cell]

        if node.disabled
            return Ok()
        end

        for child in tree.nodes[cell].downstream
            dfs(child)
        end

        push!(exits, cell)

        Ok()
    end

    for cell in Iterators.reverse(tree.cell_order)
        dfs(cell) # ???
    end

    disabled = [
        cell for (cell, node) in tree.nodes if node.disabled
    ]

    ordered = reverse(exits)
    TopologicalOrder(topology, ordered, errable, disabled)
end

# TODO: move somewhere relevant
hard_definitions(topology::NotebookTopology, cell::Cell) = union(
    topology.nodes[cell].definitions,
    topology.nodes[cell].funcdefs_without_signatures,
)

function compute_disabled_and_multiple_definitions!(tree::Tree, topology::NotebookTopology)
    all_disabled_cells = filter(is_disabled, all_cells(topology))

    bigger_tree = build_tree(topology, all_disabled_cells)
    cells = inheritance_bfs(bigger_tree) do cell, parents_disabling
        disabled =
            bigger_tree.nodes[cell].disabled =
                is_disabled(cell) || any(parents_disabling)

        if haskey(tree.nodes, cell)
            tree.nodes[cell].disabled = disabled
        end

        disabled
    end

    bigger_tree_disabled(c::Cell) =
        haskey(bigger_tree.nodes, c) && bigger_tree.nodes[c].disabled

    for cell in cells ∪ tree.cell_order
        assigners = where_assigned(topology, cell)

        # We handle the multiple definitions group-wise
        if length(assigners) > 1
            for assigner in assigners
                if bigger_tree_disabled(assigner)
                    continue
                end
                assigned = hard_definitions(topology, assigner)

                competitors = [
                    other for other in assigners if other != assigner &&
                    !bigger_tree_disabled(other) &&
                    !disjoint(hard_definitions(topology, assigner), assigned)
                ]

                if !isempty(competitors)
                    if !haskey(tree.nodes, assigner)
                        tree.nodes[assigner] = Node()
                    end
                    # TODO: report multiple defs for other branches (bigger_tree)
                    tree.nodes[assigner].multiple_definitions =
                        MultipleDefinitionsError(topology, assigner, competitors)
                end
            end
        end
    end

    # Move relevant nodes to the run tree
    for cell in cells
        if !haskey(tree.nodes, cell)
            tree.nodes[cell] = Node(disabled = bigger_tree.nodes[cell].disabled)
        end
    end

    tree
end


"Return a `TopologicalOrder` that lists the cells to be evaluated in a single reactive run, in topological order. Includes the given roots."
function topological_order(
    topology::NotebookTopology,
    roots::AbstractVector{Cell};
    allow_multiple_defs = false
)::TopologicalOrder
    tree = build_tree(topology, roots)
    if !allow_multiple_defs
        compute_disabled_and_multiple_definitions!(tree, topology)
    end
    return order(topology, tree)


    entries = Cell[]
    exits = Cell[]
    errable = Dict{Cell,ReactivityError}()

    # https://xkcd.com/2407/
    function dfs(cell::Cell)::ChildExplorationResult
        if cell in exits
            return Ok()
        elseif haskey(errable, cell)
            return Ok()
        elseif length(entries) > 0 && entries[end] == cell
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
        if !allow_multiple_defs && length(assigners) > 1
            for c in assigners
                errable[c] = MultipleDefinitionsError(topology, c, assigners)
            end
        end
        referencers = where_referenced(topology, cell) |> Iterators.reverse
        for c in (allow_multiple_defs ? referencers : union(assigners, referencers))
            if c != cell
                child_result = dfs(c)

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
                    deleteat!(entries, (current_entries_num+1):length(entries))
                    deleteat!(exits, (current_exits_num+1):length(exits))
                    return child_result
                end
                # Cancel exploring this child (c)
                # 1. Cleanup the errables
                for cycled_cell in child_result.cycled_cells
                    delete!(errable, cycled_cell)
                end
                # 2. Remove the current child (c) from the entries if it was just added
                if entries[end] == c
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
    prelim_order_1 =
        sort(roots, alg = MergeSort, by = c -> cell_precedence_heuristic(topology, c))
    # reversing because our search returns reversed order
    prelim_order_2 = Iterators.reverse(prelim_order_1)
    for cell in prelim_order_2
        dfs(cell)
    end
    ordered = reverse(exits)
    TopologicalOrder(topology, setdiff(ordered, keys(errable)), errable)
end

function topological_order(notebook::Notebook)
    cached = notebook._cached_topological_order
    if cached === nothing || cached.input_topology !== notebook.topology
        topological_order(notebook.topology, all_cells(notebook.topology))
    else
        cached
    end
end

Base.collect(notebook_topo_order::TopologicalOrder) =
    union(notebook_topo_order.runnable, keys(notebook_topo_order.errable))

function disjoint(a::Set, b::Set)
    !any(x in a for x in b)
end

"Return the cells that reference any of the symbols defined by the given cell. Non-recursive: only direct dependencies are found."
function where_referenced(topology::NotebookTopology, myself::Cell)::Vector{Cell}
    to_compare = union(
        topology.nodes[myself].definitions,
        topology.nodes[myself].soft_definitions,
        topology.nodes[myself].funcdefs_without_signatures,
    )
    where_referenced(topology, to_compare)
end
"Return the cells that reference any of the given symbols. Non-recursive: only direct dependencies are found."
function where_referenced(topology::NotebookTopology, to_compare::Set{Symbol})::Vector{Cell}
    return filter(all_cells(topology)) do cell
        !disjoint(to_compare, topology.nodes[cell].references)
    end
end
where_referenced(::Notebook, args...) = where_referenced(args...)

"Returns whether or not the edge between two cells is composed only of \"soft\"-definitions"
function is_soft_edge(topology::NotebookTopology, parent_cell::Cell, child_cell::Cell)
    hard_definitions = union(
        topology.nodes[parent_cell].definitions,
        topology.nodes[parent_cell].funcdefs_without_signatures,
    )
    soft_definitions = topology.nodes[parent_cell].soft_definitions

    child_references = topology.nodes[child_cell].references

    disjoint(hard_definitions, child_references) &&
        !disjoint(soft_definitions, child_references)
end


"Return the cells that also assign to any variable or method defined by the given cell. If more than one cell is returned (besides the given cell), then all of them should throw a `MultipleDefinitionsError`. Non-recursive: only direct dependencies are found."
function where_assigned(topology::NotebookTopology, myself::Cell)::Vector{Cell}
    self = topology.nodes[myself]
    return filter(all_cells(topology)) do cell
        other = topology.nodes[cell]
        !(
            disjoint(self.definitions, other.definitions) &&
            disjoint(self.definitions, other.funcdefs_without_signatures) &&
            disjoint(self.funcdefs_without_signatures, other.definitions) &&
            disjoint(self.funcdefs_with_signatures, other.funcdefs_with_signatures)
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
where_assigned(::Notebook, args...) = where_assigned(args...)


"Return whether any cell references the given symbol. Used for the @bind mechanism."
function is_referenced_anywhere(
    notebook::Notebook,
    topology::NotebookTopology,
    sym::Symbol,
)::Bool
    any(notebook.cells) do cell
        sym ∈ topology.nodes[cell].references
    end
end

"Return whether any cell defines the given symbol. Used for the @bind mechanism."
function is_assigned_anywhere(
    notebook::Notebook,
    topology::NotebookTopology,
    sym::Symbol,
)::Bool
    any(notebook.cells) do cell
        sym ∈ topology.nodes[cell].definitions
    end
end

function cyclic_variables(
    topology::NotebookTopology,
    cycle::AbstractVector{Cell},
)::Set{Symbol}
    referenced_during_cycle =
        union!(Set{Symbol}(), (topology.nodes[c].references for c in cycle)...)
    assigned_during_cycle = union!(
        Set{Symbol}(),
        (
            topology.nodes[c].definitions ∪ topology.nodes[c].soft_definitions ∪
            topology.nodes[c].funcdefs_without_signatures for c in cycle
        )...,
    )

    referenced_during_cycle ∩ assigned_during_cycle
end

function cycle_is_among_functions(
    topology::NotebookTopology,
    cycle::AbstractVector{Cell},
)::Bool
    cyclics = cyclic_variables(topology, cycle)

    all(
        any(s ∈ topology.nodes[c].funcdefs_without_signatures for c in cycle) for
        s in cyclics
    )
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
        DEFAULT_PRECEDENCE_HEURISTIC
    end
end

const DEFAULT_PRECEDENCE_HEURISTIC = 9
