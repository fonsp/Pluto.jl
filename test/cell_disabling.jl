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
                    1 + x
                end"""),
                Cell("x = 2"),
                Cell("z = sqrt(y)"),
                Cell("a = 4x"),
                Cell("w = z^5"),
                Cell(""),
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

    # change x, this change should not propagate through y
    original_y_output = notebook.cells[1].output.body
    original_z_output = notebook.cells[3].output.body
    original_a_output = notebook.cells[4].output.body
    original_w_output = notebook.cells[5].output.body
    setcode(notebook.cells[2], "x = 123123")
    update_run!(🍭, notebook, notebook.cells[2])
    @test notebook.cells[1].output.body == original_y_output
    @test notebook.cells[3].output.body == original_z_output
    @test notebook.cells[4].output.body != original_a_output
    @test notebook.cells[5].output.body == original_w_output

    setcode(notebook.cells[2], "x = 2")
    update_run!(🍭, notebook, notebook.cells[2])
    @test notebook.cells[1].output.body == original_y_output
    @test notebook.cells[3].output.body == original_z_output
    @test notebook.cells[4].output.body == original_a_output
    @test notebook.cells[5].output.body == original_w_output

    # disable root cell
    notebook.cells[2].running_disabled = true
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == collect(1:5)


    original_6_output = notebook.cells[6].output.body
    setcode(notebook.cells[6], "x + 6")
    update_run!(🍭, notebook, notebook.cells[6])
    @test notebook.cells[6].depends_on_disabled_cells
    @test notebook.cells[6].errored === false
    @test notebook.cells[6].output.body == original_6_output

    # reactivate first cell - still all cells should be running_disabled
    notebook.cells[1].running_disabled = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == collect(1:6)

    # the x cell is disabled, so changing it should have no effect
    setcode(notebook.cells[2], "x = 123123")
    update_run!(🍭, notebook, notebook.cells[2])
    @test notebook.cells[1].output.body == original_y_output
    @test notebook.cells[3].output.body == original_z_output
    @test notebook.cells[4].output.body == original_a_output
    @test notebook.cells[5].output.body == original_w_output

    # reactivate root cell
    notebook.cells[2].running_disabled = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == []


    @test notebook.cells[1].output.body != original_y_output
    @test notebook.cells[3].output.body != original_z_output
    @test notebook.cells[4].output.body != original_a_output
    @test notebook.cells[5].output.body != original_w_output

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
