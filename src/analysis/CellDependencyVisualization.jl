"""
Gets the cell number in execution order (as saved in the notebook.jl file)
"""
function get_cell_number(cell:: Cell, ordered_cells:: Vector{Cell}):: Int
    cell_id = findfirst(==(cell), ordered_cells)
    return cell_id === nothing ? -1 : cell_id
end
function get_cell_number(uuid:: UUID, notebook:: Notebook, ordered_cells:: Vector{Cell}):: Int
    cell = notebook.cells_dict[uuid]
    return get_cell_number(cell, ordered_cells)
end

"""
Gets the global variables on which are defined in the current cell.
"""
function get_referenced_symbols(cell:: Cell, notebook:: Notebook):: Set{Symbol}
    node = notebook.topology.nodes[cell]
    return node.definitions ∪ node.funcdefs_without_signatures
end

"""
Gets a dictionary of all symbols and the respective cell UUIDs which are dependent on the current cell.
Changes in the current cell cause re-evaluation of these cells.
Note that only direct dependents are given here, not indirect dependents.
"""
function get_references(cell:: Cell, notebook:: Notebook):: Dict{Symbol, Vector{UUID}}
    referenced_symbols = get_referenced_symbols(cell, notebook)
    return Dict(sym => get_cell_uuids(where_referenced(notebook, notebook.topology, Set((sym,)) ))
    for sym in referenced_symbols)
end

"""
Gets the global variables on which the current cell depends on.
"""
get_dependent_symbols(cell:: Cell, notebook:: Notebook):: Set{Symbol} = notebook.topology.nodes[cell].references

"""
Gets a dictionary of all symbols and the respective cell UUIDs on which the current cell depends on.
Changes in these cells cause re-evaluation of the current cell.
Note that only direct dependencies are given here, not indirect dependencies.
"""
function get_dependencies(cell:: Cell, notebook:: Notebook):: Dict{Symbol, Vector{UUID}}
    dependent_symbols = get_dependent_symbols(cell, notebook)
    return Dict(sym => get_cell_uuids(where_assigned(notebook, notebook.topology, Set((sym,)) ))
        for sym in dependent_symbols)
end

"Fills cell dependency information for display in the GUI"
function set_cell_dependencies(cell:: Cell, notebook:: Notebook, ordered_cells:: Vector{Cell})
    cell.cell_execution_order = get_cell_number(cell, ordered_cells)
    cell.referenced_cells = get_references(cell, notebook)
    cell.dependent_cells = get_dependencies(cell, notebook)
    cell.precedence_heuristic = cell_precedence_heuristic(notebook.topology, cell)
end
function set_cell_dependencies(cell:: Cell, notebook:: Notebook)
    ismissing(notebook.cell_execution_order) && error("cell execution order not defined")
    ordered_cells = [notebook.cells_dict[uuid] for uuid in notebook.cell_execution_order]
    set_cell_dependencies(cell, notebook, ordered_cells)
end

"Fills cell execution order information on notebook level"
function set_notebook_dependencies(notebook:: Notebook)
    ordered_cells = get_ordered_cells(notebook)
    set_notebook_dependencies(notebook, ordered_cells)
end
function set_notebook_dependencies(notebook:: Notebook, ordered_cells:: Vector{Cell})
    notebook.cell_execution_order = get_cell_uuids(ordered_cells)
end

"Fills dependency information on notebook and cell level."
function set_dependencies!(notebook:: Notebook, topology:: NotebookTopology)
    ordered_cells = get_ordered_cells(notebook, topology)
    set_notebook_dependencies(notebook, ordered_cells)
    for cell in ordered_cells
        set_cell_dependencies(cell, notebook, ordered_cells)
    end
end

"Converts a list of cells to a list of UUIDs."
get_cell_uuids(cells:: Vector{Cell}):: Vector{UUID} = getproperty.(cells, :cell_id)
