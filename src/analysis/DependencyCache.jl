"""
Gets a dictionary of all symbols and the respective cells which are dependent on the given cell.

Changes in the given cell cause re-evaluation of these cells.
Note that only direct dependents are given here, not indirect dependents.
"""
function downstream_cells_map(cell::Cell, notebook::Notebook)::Dict{Symbol,Vector{Cell}}
    defined_symbols = let node = notebook.topology.nodes[cell]
        node.definitions ∪ node.funcdefs_without_signatures
    end
    return Dict{Symbol,Vector{Cell}}(
        sym => where_referenced(notebook, notebook.topology, Set([sym]))
        for sym in defined_symbols
    )
end

"""
Gets a dictionary of all symbols and the respective cells on which the given cell depends.

Changes in these cells cause re-evaluation of the given cell.
Note that only direct dependencies are given here, not indirect dependencies.
"""
function upstream_cells_map(cell::Cell, notebook::Notebook)::Dict{Symbol,Vector{Cell}}
    referenced_symbols = notebook.topology.nodes[cell].references
    return Dict{Symbol,Vector{Cell}}(
        sym => where_assigned(notebook, notebook.topology, Set([sym]) )
        for sym in referenced_symbols
    )
end

"Fills cell dependency information for display in the GUI"
function update_dependency_cache!(cell::Cell, notebook::Notebook)
    cell.downstream_cells_map = downstream_cells_map(cell, notebook)
    cell.upstream_cells_map = upstream_cells_map(cell, notebook)
    cell.precedence_heuristic = cell_precedence_heuristic(notebook.topology, cell)
end

"Fills dependency information on notebook and cell level."
function update_dependency_cache!(notebook::Notebook)
    notebook.cell_execution_order = get_ordered_cells(notebook)
    for cell in notebook.cell_execution_order
        update_dependency_cache!(cell, notebook)
    end
end

topological_order(notebook:: Notebook) = topological_order(notebook, notebook.topology, notebook.cells)

get_ordered_cells(notebook_topo_order:: TopologicalOrder) = union(notebook_topo_order.runnable, keys(notebook_topo_order.errable))
get_ordered_cells(notebook:: Notebook) = get_ordered_cells(topological_order(notebook))
