"""
Gets a dictionary of all symbols and the respective cells which are dependent on the given cell.

Changes in the given cell cause re-evaluation of these cells.
Note that only direct dependents are given here, not indirect dependents.
"""
function downstream_cells_map(cell::Cell, topology::NotebookTopology)::Dict{Symbol,Vector{Cell}}
    defined_symbols = let node = topology.nodes[cell]
        node.definitions ∪ node.funcdefs_without_signatures
    end
    return Dict{Symbol,Vector{Cell}}(
        sym => where_referenced(topology, Set([sym]))
        for sym in defined_symbols
    )
end
@deprecate downstream_cells_map(cell::Cell, notebook::Notebook) downstream_cells_map(cell, notebook.topology)

"""
Gets a dictionary of all symbols and the respective cells on which the given cell depends.

Changes in these cells cause re-evaluation of the given cell.
Note that only direct dependencies are given here, not indirect dependencies.
"""
function upstream_cells_map(cell::Cell, topology::NotebookTopology)::Dict{Symbol,Vector{Cell}}
    referenced_symbols = topology.nodes[cell].references
    return Dict{Symbol,Vector{Cell}}(
        sym => where_assigned(topology, Set([sym]) )
        for sym in referenced_symbols
    )
end
@deprecate upstream_cells_map(cell::Cell, notebook::Notebook) upstream_cells_map(cell, notebook.topology)

"Fills cell dependency information for display in the GUI"
function update_dependency_cache!(cell::Cell, topology::NotebookTopology)
    cell.cell_dependencies = CellDependencies(
        downstream_cells_map(cell, topology), 
        upstream_cells_map(cell, topology), 
        cell_precedence_heuristic(topology, cell),
    )
end

"Fills dependency information on notebook and cell level."
function update_dependency_cache!(notebook::Notebook)
    notebook._cached_topological_order = topological_order(notebook)
    for cell in values(notebook.cells_dict)
        update_dependency_cache!(cell, notebook.topology)
    end
end

"""
Find (indirectly) deactivated cells and update their status. 
Fills also disabling status into cell metadata.
"""
function disable_dependent_cells!(notebook:: Notebook, topology:: NotebookTopology):: Vector{Cell}
	deactivated = filter(c -> c.running_disabled, notebook.cells)
    indirectly_deactivated = collect(topological_order(notebook, topology, deactivated))

    for cell in notebook.cells
        if cell.running_disabled
            cell.metadata["disabled"] = "directly"
            cell.running = false
            cell.queued = false
            cell.depends_on_disabled_cells = true
        elseif cell in indirectly_deactivated
            cell.metadata["disabled"] =  "indirectly"
            cell.running = false
            cell.queued = false
            cell.depends_on_disabled_cells = true
        else
            pop!(cell.metadata, "disabled", "")
            cell.depends_on_disabled_cells = false
        end
    end
	return indirectly_deactivated
end

disable_dependent_cells!(notebook:: Notebook) = disable_dependent_cells!(notebook, notebook.topology)
