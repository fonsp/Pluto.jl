using Test
using Pluto
using Pluto: update_run!, ServerSession, ClientSession, Cell, Notebook, set_disabled, is_disabled





@testset "Cell Disabling" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    notebook = Notebook([
                Cell("a = 1")
                Cell("b = 2")
                Cell("c = 3")
                Cell("d = 4")
                
                Cell("x = a")    # 5
                # these cells will be uncommented later
                Cell("# x = b")  # 6
                Cell("# x = c")  # 7
                
                Cell("z = x")    # 8
                Cell("# z = d")  # 9
                
                Cell("y = z")    # 10
            ])
    update_run!(🍭, notebook, notebook.cells)

    # helper functions
    id(i) = notebook.cells[i].cell_id
    c(i) = notebook.cells[i]
    get_indirectly_disabled_cells(notebook) = [i for (i, c) in pairs(notebook.cells) if c.depends_on_disabled_cells]

    
    
    @test !any(is_disabled, notebook.cells)
    @test get_indirectly_disabled_cells(notebook) == []
    @test all(noerror, notebook.cells)
    
    ###
    setcode!(c(6), "x = b")
    update_run!(🍭, notebook, c(6))
    
    @test c(5).errored
    @test c(6).errored
    @test c(8).errored
    @test c(10).errored
    @test get_indirectly_disabled_cells(notebook) == []
    
    ###
    set_disabled(c(1), true)
    update_run!(🍭, notebook, c(1))
    
    @test noerror(c(1))
    @test noerror(c(6))
    @test noerror(c(8))
    @test noerror(c(10))
    @test get_indirectly_disabled_cells(notebook) == [1, 5]
    
    update_run!(🍭, notebook, c(5:6))
    @test noerror(c(1))
    @test noerror(c(6))
    @test noerror(c(8))
    @test noerror(c(10))    
    @test get_indirectly_disabled_cells(notebook) == [1, 5]
    
    ###
    set_disabled(c(1), false)
    update_run!(🍭, notebook, c(1))
    
    @test noerror(c(1))
    @test c(5).errored
    @test c(6).errored
    @test c(8).errored
    @test c(10).errored
    @test get_indirectly_disabled_cells(notebook) == []
    
    ###
    set_disabled(c(5), true)
    update_run!(🍭, notebook, c(5))
    
    @test noerror(c(1))
    @test noerror(c(6))
    @test noerror(c(8))
    @test noerror(c(10))
    @test get_indirectly_disabled_cells(notebook) == [5]
    
    ###
    set_disabled(c(1), true)
    update_run!(🍭, notebook, c(1))
    
    @test noerror(c(1))
    @test noerror(c(6))
    @test noerror(c(8))
    @test noerror(c(10))
    @test get_indirectly_disabled_cells(notebook) == [1, 5]
    
    
    ###
    set_disabled(c(5), false)
    setcode!(c(7), "x = c")
    update_run!(🍭, notebook, c([5,7]))
    
    @test c(5).errored
    @test c(6).errored
    @test c(7).errored
    @test c(8).errored
    @test c(10).errored
    @test get_indirectly_disabled_cells(notebook) == [1, 5]
    
    ###
    set_disabled(c(2), true)
    update_run!(🍭, notebook, c(2))
    
    @test noerror(c(1))
    @test noerror(c(2))
    @test noerror(c(3))
    @test noerror(c(7))
    @test noerror(c(8))
    @test noerror(c(10))
    @test get_indirectly_disabled_cells(notebook) == [1, 2, 5, 6]
    
    
    
end





@testset "Cell Disabling 1" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

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
    update_run!(🍭, notebook, notebook.cells)

    # helper functions
    id(i) = notebook.cells[i].cell_id
    get_disabled_cells(notebook) = [i for (i, c) in pairs(notebook.cells) if c.depends_on_disabled_cells]

    @test !any(get(c.metadata, "disabled", false) for c in notebook.cells)
    @test !any(c.depends_on_disabled_cells for c in notebook.cells)

    # disable first cell
    notebook.cells[1].metadata["disabled"] = true
    update_run!(🍭, notebook, notebook.cells[1])
    should_be_disabled = [1, 3, 5]
    @test get_disabled_cells(notebook) == should_be_disabled
    @test notebook.cells[1].metadata["disabled"] == true

    # metadatum will exists in memory, but not in the serialized form
    @test all(haskey(notebook.cells[i].metadata , "disabled") for i=1:5)

    # change x, this change should not propagate through y
    original_y_output = notebook.cells[1].output.body
    original_z_output = notebook.cells[3].output.body
    original_a_output = notebook.cells[4].output.body
    original_w_output = notebook.cells[5].output.body
    setcode!(notebook.cells[2], "x = 123123")
    update_run!(🍭, notebook, notebook.cells[2])
    @test notebook.cells[1].output.body == original_y_output
    @test notebook.cells[3].output.body == original_z_output
    @test notebook.cells[4].output.body != original_a_output
    @test notebook.cells[5].output.body == original_w_output

    setcode!(notebook.cells[2], "x = 2")
    update_run!(🍭, notebook, notebook.cells[2])
    @test notebook.cells[1].output.body == original_y_output
    @test notebook.cells[3].output.body == original_z_output
    @test notebook.cells[4].output.body == original_a_output
    @test notebook.cells[5].output.body == original_w_output

    # disable root cell
    notebook.cells[2].metadata["disabled"] = true
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == collect(1:5)


    original_6_output = notebook.cells[6].output.body
    setcode!(notebook.cells[6], "x + 6")
    update_run!(🍭, notebook, notebook.cells[6])
    @test notebook.cells[6].depends_on_disabled_cells
    @test notebook.cells[6].errored === false
    @test notebook.cells[6].output.body == original_6_output

    # reactivate first cell - still all cells should be running_disabled
    notebook.cells[1].metadata["disabled"] = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == collect(1:6)

    # the x cell is disabled, so changing it should have no effect
    setcode!(notebook.cells[2], "x = 123123")
    update_run!(🍭, notebook, notebook.cells[2])
    @test notebook.cells[1].output.body == original_y_output
    @test notebook.cells[3].output.body == original_z_output
    @test notebook.cells[4].output.body == original_a_output
    @test notebook.cells[5].output.body == original_w_output

    # reactivate root cell
    notebook.cells[2].metadata["disabled"] = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == []


    @test notebook.cells[1].output.body != original_y_output
    @test notebook.cells[3].output.body != original_z_output
    @test notebook.cells[4].output.body != original_a_output
    @test notebook.cells[5].output.body != original_w_output

    # disable first cell again
    notebook.cells[1].metadata["disabled"] = true
    update_run!(🍭, notebook, notebook.cells)
    should_be_disabled = [1, 3, 5]
    @test get_disabled_cells(notebook) == should_be_disabled

    # and reactivate it
    notebook.cells[1].metadata["disabled"] = false
    update_run!(🍭, notebook, notebook.cells)
    @test get_disabled_cells(notebook) == []

end
