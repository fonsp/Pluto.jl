using Test
using Pluto
using Pluto: update_run!, ServerSession, ClientSession, Cell, Notebook


@testset "CellDepencencyVisualization" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    notebook = Notebook([
                Cell("x = 1"), # prerequisite of test cell
                Cell("f(x) = x + y"), # depends on test cell
                Cell("f(3)"),

                Cell("""begin
                    g(a) = x
                    g(a,b) = y
                end"""), # depends on test cell
                Cell("y = x"), # test cell below
                Cell("g(6) + g(6,6)"),
                Cell("using Dates"),
            ])
    update_run!(🍭, notebook, notebook.cells)
    state = Pluto.notebook_to_js(notebook)

    id(i) = notebook.cells[i].cell_id

    order_of(i) = findfirst(isequal(id(i)), state["cell_execution_order"])
    @test order_of(7) < order_of(1) < order_of(5) < order_of(2) < order_of(3)


    deps = state["cell_dependencies"]
    
    @test deps[id(5)]["downstream_cells_map"] |> keys == Set(["y"])
    @test deps[id(5)]["downstream_cells_map"]["y"] == [id(2), id(4)]
    
    @test deps[id(5)]["upstream_cells_map"] |> keys == Set(["x"])
    @test deps[id(5)]["upstream_cells_map"]["x"] == [id(1)]

    # test if this also works for function definitions
    @test deps[id(2)]["downstream_cells_map"] |> keys == Set(["f"])
    @test deps[id(2)]["downstream_cells_map"]["f"] == [id(3)]
    
    @test deps[id(2)]["upstream_cells_map"] |> keys == Set(["y", "+"])
    @test deps[id(2)]["upstream_cells_map"]["y"] == [id(5)]
    @test deps[id(2)]["upstream_cells_map"]["+"] == [] # + function is not defined / extended in the notebook


    @test deps[id(1)]["precedence_heuristic"] > deps[id(7)]["precedence_heuristic"]
end
