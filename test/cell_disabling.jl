using Test
using Pluto
using Pluto: update_run!, ServerSession, ClientSession, Cell, Notebook, set_disabled, is_disabled, WorkspaceManager





@testset "Cell Disabling" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    notebook = Notebook([
                Cell("const a = 1")
                Cell("const b = 2")
                Cell("const c = 3")
                Cell("const d = 4")
                
                Cell("const x = a")    # 5
                # these cells will be uncommented later
                Cell("# const x = b")  # 6
                Cell("# const x = c")  # 7
                
                Cell("const z = x")    # 8
                Cell("# const z = d")  # 9
                
                Cell("const y = z")    # 10
                
                Cell("things = []")    # 11
                Cell("""begin
                    cool = 1
                    push!(things, 1)
                end""")                # 12
                Cell("""begin
                    # cool = 2
                    # push!(things, 2)
                end""")                # 13
                Cell("cool; length(things)")   # 14
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
    setcode!(c(6), "const x = b")
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
    setcode!(c(7), "const x = c")
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
    
    @test noerror(c(3))
    @test noerror(c(7))
    @test noerror(c(8))
    @test noerror(c(10))
    @test get_indirectly_disabled_cells(notebook) == [1, 2, 5, 6]
    
    
    ###
    setcode!(c(9), "const z = d")
    update_run!(🍭, notebook, c([9]))
    
    @test noerror(c(7))
    @test c(8).errored
    @test c(9).errored
    @test c(10).errored
    @test get_indirectly_disabled_cells(notebook) == [1, 2, 5, 6]
    
    
    ###
    set_disabled(c(4), true)
    update_run!(🍭, notebook, c(4))
    
    @test noerror(c(3))
    @test noerror(c(4))
    @test noerror(c(7))
    @test noerror(c(8))
    @test noerror(c(10))
    @test get_indirectly_disabled_cells(notebook) == [1, 2, 4, 5, 6, 9]
    
    
    ###
    set_disabled(c(1), true)
    set_disabled(c(2), false)
    set_disabled(c(3), true)
    set_disabled(c(4), false)
    
    set_disabled(c(5), true)
    set_disabled(c(6), true)
    set_disabled(c(7), false)
    
    set_disabled(c(8), false)
    set_disabled(c(9), true)
    
    setcode!(c(10), "const x = 123123")
    set_disabled(c(10), false)
    
    update_run!(🍭, notebook, c(1:10))
    
    
    @test noerror(c(1))
    @test noerror(c(2))
    @test noerror(c(3))
    @test noerror(c(4))
    
    @test noerror(c(8))
    @test noerror(c(10))
    
    @test get_indirectly_disabled_cells(notebook) == [1, 3, 5, 6, 7, 9]
    
    ###
    set_disabled(c(3), false)
    update_run!(🍭, notebook, c(3))
    
    @test get_indirectly_disabled_cells(notebook) == [1, 5, 6, 9]
    @test c(7).errored
    @test c(8).errored
    @test c(10).errored
    
    ###
    set_disabled(c(10), true)
    update_run!(🍭, notebook, c(10))
    
    @test get_indirectly_disabled_cells(notebook) == [1, 5, 6, 9, 10]
    @test noerror(c(7))
    @test noerror(c(8))
    
    ###
    set_disabled(c(7), true)
    set_disabled(c(10), false)
    update_run!(🍭, notebook, c([7,10]))
    
    @test get_indirectly_disabled_cells(notebook) == [1, 5, 6, 7, 9]
    @test noerror(c(7))
    @test noerror(c(8))
    @test noerror(c(10))
    
    
    ### check that they really don't run when disabled
    @test c(14).output.body == "1"
    
    setcode!(c(13), replace(c(13).code, "#" => ""))
    update_run!(🍭, notebook, c([11,13]))
    
    
    @test c(12).errored
    @test c(13).errored
    @test c(14).errored
    
    set_disabled(c(13), true)
    update_run!(🍭, notebook, c([13]))
    
    @test noerror(c(12))
    @test noerror(c(14))
    
    @test c(14).output.body == "1"
    update_run!(🍭, notebook, c([11]))
    @test c(14).output.body == "1"
    update_run!(🍭, notebook, c([12]))
    update_run!(🍭, notebook, c([12]))
    @test c(14).output.body == "3"
    
    cleanup(🍭, notebook)
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

    cleanup(🍭, notebook)
end

@testset "Disabled cells should stay in the topology (#2676)" begin
    🍭 = ServerSession()
    notebook = Notebook(Cell.([
        "using Dates",
        "b = 2; December",
        "b",
    ]))

    disabled_cell = notebook.cells[end]
    Pluto.set_disabled(disabled_cell, true)
    @test is_disabled(disabled_cell)

    old_topo = notebook.topology
    @test count(Pluto.is_disabled, notebook.cells) == 1
    order = update_run!(🍭, notebook, notebook.cells)

    # Disabled
    @test length(order.input_topology.disabled_cells) == 1
    @test disabled_cell ∈ order.input_topology.disabled_cells
    runned_cells = collect(order)
    @test length(runned_cells) == 2
    @test disabled_cell ∉ runned_cells

    topo = notebook.topology
    @test old_topo !== topo # topology was updated

    order = Pluto.topological_order(notebook)

    @test length(order.input_topology.disabled_cells) == 1
    @test disabled_cell ∈ order.input_topology.disabled_cells
    saved_cells = collect(order)
    @test length(saved_cells) == length(notebook.cells)
    @test issetequal(saved_cells, notebook.cells)

    io = IOBuffer()
    Pluto.save_notebook(io, notebook)
    seekstart(io)
    notebook2 = Pluto.load_notebook_nobackup(io, "mynotebook.jl")
    @test length(notebook2.cells) == length(notebook.cells)

    cleanup(🍭, notebook)
end
