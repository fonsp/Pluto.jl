using Test
using Pluto
using Pluto: Configuration, update_run!, WorkspaceManager, ServerSession, ClientSession, Cell, Notebook

@testset "CellDepencencyVisualization" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient

    notebook = Notebook([
                Cell("x = 1"), # prerequisite of test cell
                Cell("f(x) = x + y"), # depends on test cell
                Cell("f(4)"),

                Cell("""begin
                    g(a) = x
                    g(a,b) = y
                end"""), # depends on test cell
                Cell("y = x"), # test cell below
                Cell("g(6) + g(6,6)"),

                Cell("import Distributed"),
                Cell("Distributed.myid()"),
            ])
    fakeclient.connected_notebook = notebook
    update_run!(🍭, notebook, notebook.cells)

    ordered_cells = Pluto.get_cell_uuids(Pluto.get_ordered_cells(notebook))
    cell = notebook.cells_dict[notebook.cell_order[5]] # example cell
    @test Pluto.get_cell_number(cell, notebook) == 2
    @test Pluto.get_cell_numbers(Pluto.get_referenced_cells(cell, notebook), notebook) == [3, 5] # these cells depend on selected cell
    @test Pluto.get_cell_numbers(Pluto.get_dependent_cells(cell, notebook), notebook) == [1] # selected cell depends on this cell

    # test if this information gets updated in the cell objects
    @test cell.cell_execution_order == 2
    @test Pluto.get_cell_numbers(cell.referenced_cells, notebook) == [3, 5]
    @test Pluto.get_cell_numbers(cell.dependent_cells, notebook) == [1]
end
