"""
Gets the cell number in execution order (as saved in the notebook.jl file)
"""
get_cell_number(uuid:: UUID, notebook:: Notebook):: Int = findfirst(==(uuid), notebook.cell_order)
get_cell_number(cell:: Cell, notebook:: Notebook):: Int = get_cell_number(cell.cell_id, notebook)

"""
Gets a list of all cells on which the current cell depends on.
Changes in these cells cause re-evaluation of the current cell.
"""
get_referenced_cells(cell:: Cell, notebook:: Notebook):: Vector{Cell} = Pluto.where_referenced(notebook, notebook.topology, cell)
get_referenced_cells(uuid:: UUID, notebook:: Notebook):: Vector{Cell} = get_referenced_cells(notebook.cells_dict[uuid], notebook)

"""
Gets a list of all cells which are dependent on the current cell.
Changes in the current cell cause re-evaluation of these cells.
"""
function get_dependent_cells(cell:: Cell, notebook:: Notebook):: Vector{Cell}
    node = notebook.topology.nodes[cell]
    return Pluto.where_assigned(notebook, notebook.topology, node.references)
end
get_dependent_cells(uuid:: UUID, notebook:: Notebook):: Vector{Cell} = get_dependent_cells(notebook.cells_dict[uuid], notebook)

"Converts a list of cells to a list of UUIDs."
get_cell_uuids(cells:: Vector{Cell}):: Vector{UUID} = getproperty.(cells, :cell_id)

"Converts a list of cells to a list of execution order cell numbers."
get_cell_numbers(cells:: Vector{Cell}, notebook:: Notebook):: Vector{Int} = get_cell_number.(get_cell_uuids(cells), Ref(notebook))
