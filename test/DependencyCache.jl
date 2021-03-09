using Test
using Pluto
using Pluto: Configuration, update_run!, WorkspaceManager, ServerSession, ClientSession, Cell, Notebook, cell_id
using UUIDs

"""
Gets the cell number in execution order (as saved in the notebook.jl file)
"""
get_cell_number(cell::Cell, ordered_cells::Vector{Cell}) = findfirst(isequal(cell), ordered_cells)

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
                Cell("using Dates"),
                Cell("import Distributed"),
                Cell("Distributed.myid()"),
            ])
    fakeclient.connected_notebook = notebook
    update_run!(🍭, notebook, notebook.cells)

    ordered_cells = Pluto.topological_order(notebook) |> collect
    cell = notebook.cells[5] # example cell
    @test get_cell_number(cell, ordered_cells) == 3

    references = Pluto.downstream_cells_map(cell, notebook)
    @test get_cell_number.(references[:y], [ordered_cells]) == [4, 6] # these cells depend on selected cell
    dependencies = Pluto.upstream_cells_map(cell, notebook)
    @test get_cell_number.(dependencies[:x], [ordered_cells]) == [2] # selected cell depends on this cell

    # test if this information gets updated in the cell objects
    @test notebook.cell_execution_order !== nothing
    @test findfirst(isequal(cell.cell_id) ∘ cell_id, notebook.cell_execution_order) == 3
    @test cell.downstream_cells_map == references
    @test cell.upstream_cells_map == dependencies
    @test cell.precedence_heuristic == 8

    # test if this also works for function definitions
    cell2 = notebook.cells[2]
    @test findfirst(isequal(cell2.cell_id) ∘ cell_id, notebook.cell_execution_order) == 4
    references2 = Pluto.downstream_cells_map(cell2, notebook)
    @test get_cell_number.(references2[:f], [ordered_cells]) == [5] # these cells depend on selected cell
    dependencies2 = Pluto.upstream_cells_map(cell2, notebook)
    @test get_cell_number.(dependencies2[:y], [ordered_cells]) == [3] # selected cell depends on this cell
    @test get_cell_number.(dependencies2[:+], [ordered_cells]) == [] # + function is not defined / extended in the notebook

    using_cell = notebook.cells[7]
    @test using_cell.precedence_heuristic == 6
end
