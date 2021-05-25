using Test
using Pluto
using Pluto: update_run!, ServerSession, ClientSession, Cell, Notebook

@testset "Cell Disabling" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient

    notebook = Notebook([
                Cell("""y = begin
                    2x
                end"""),
                Cell("x = 14"),
                Cell("z = sqrt(y)"),
                Cell("a = 3x"),
                Cell("z^3"),
            ])
    fakeclient.connected_notebook = notebook
    update_run!(🍭, notebook, notebook.cells)

    # helper functions
    id(i) = notebook.cells[i].cell_id
    get_disabled_cells(notebook) = [i for (i, c) in pairs(notebook.cells) if c.depends_on_disabled_cells]

    @test !any(c.running_disabled for c in notebook.cells)
    @test !any(c.depends_on_disabled_cells for c in notebook.cells)

    # disable first cell
    notebook.cells[1].running_disabled = true
    update_run!(🍭, notebook, notebook.cells)
    should_be_disabled = [1, 3, 5]
    @test get_disabled_cells(notebook) == should_be_disabled

    # disable root cell
    notebook.cells[2].running_disabled = true
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == collect(1:length(notebook.cells))

    # reactivate first cell - still all cells should be running_disabled
    notebook.cells[1].running_disabled = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == collect(1:length(notebook.cells))

    # reactivate root cell
    notebook.cells[2].running_disabled = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == []

    # disable first cell again
    notebook.cells[1].running_disabled = true
    update_run!(🍭, notebook, notebook.cells)
    should_be_disabled = [1, 3, 5]
    @test get_disabled_cells(notebook) == should_be_disabled

    # and reactivate it
    notebook.cells[1].running_disabled = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == []

end
