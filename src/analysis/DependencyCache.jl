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
    cell.cell_dependencies = CellDependencies(
        downstream_cells_map(cell, notebook), 
        upstream_cells_map(cell, notebook), 
        cell_precedence_heuristic(notebook.topology, cell),
    )
end

"Fills dependency information on notebook and cell level."
function update_dependency_cache!(notebook::Notebook)
    notebook._cached_topological_order = topological_order(notebook)
    for cell in values(notebook.cells_dict)
        update_dependency_cache!(cell, notebook)
    end
end

"""
find (indirectly) deactivated cells and update their status
"""
function disable_dependent_cells!(notebook:: Notebook, topology:: NotebookTopology):: Vector{Cell}
	deactivated = filter(c -> c.running_disabled, notebook.cells)
    indirectly_deactivated = collect(topological_order(notebook, topology, deactivated))
    for cell in indirectly_deactivated
        cell.running = false
        cell.queued = false
        cell.depends_on_disabled_cells = true
    end
	return indirectly_deactivated
end

disable_dependent_cells!(notebook:: Notebook) = disable_dependent_cells!(notebook, notebook.topology)
