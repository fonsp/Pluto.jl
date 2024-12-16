using Test
using Pluto
using Pluto: update_run!, ServerSession, Cell, Notebook, WorkspaceManager

@testset "Stale cells" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    notebook = Notebook([
        Cell("a = 1") # 1
        Cell("b = a + 1") # 2

        Cell("""
        begin
            c = b
            push!(runs, a + 1)
            b
        end
            """) # 3

        Cell("a + 1") # 4

        Cell("begin runs = [] end") # 5

        Cell("length(runs)") # 6

        Cell("c") # 7
    ])
    update_run!(🍭, notebook, notebook.cells)

    id(i) = notebook.cells[i].cell_id
    c(i) = notebook.cells[i]
    get_depends_on_stale_cells(notebook::Notebook) = [i for (i, c) in pairs(notebook.cells) if c.depends_on_stale_cells]
    get_stale_cells(notebook::Notebook) = [i for (i, c) in pairs(notebook.cells) if c.stale]

    @test get_stale_cells(notebook) == []
    @test get_depends_on_stale_cells(notebook) == []
    @test all(noerror, notebook.cells)
    @test c(6).output.body == "1"

    # Cell metadata gets updated
    setcode!(c(2), "begin b = a + 1; Main.PlutoRunner.Stale(Nothing) end")

    update_run!(🍭, notebook, c(2))

    @test get_stale_cells(notebook) == [2]
    @test get_depends_on_stale_cells(notebook) == [3, 7]
    @test all(noerror, notebook.cells)

    # depends_on_stale_cells output does not change, but stale cells do
    setcode!(c(2), "begin b = a + 2; Main.PlutoRunner.Stale(b) end")

    update_run!(🍭, notebook, c(2))
    update_run!(🍭, notebook, c(6))

    @test get_stale_cells(notebook) == [2]
    @test get_depends_on_stale_cells(notebook) == [3, 7]
    @test c(3).output.body == "2"
    @test c(2).output.body == "3"
    @test all(noerror, notebook.cells)
    @test c(6).output.body == "1"

    setcode!(c(1), "a = 2")

    update_run!(🍭, notebook, c(1))
    update_run!(🍭, notebook, c(6))

    @test get_stale_cells(notebook) == [2]
    @test get_depends_on_stale_cells(notebook) == [3, 7]
    @test c(3).output.body == "2"
    @test c(2).output.body == "4"
    @test c(7).output.body == "2"
    @test all(noerror, notebook.cells)
    @test c(6).output.body == "1"

    # we can resume
    setcode!(c(2), "begin b = a + 2; Nothing end")

    update_run!(🍭, notebook, c(2))
    update_run!(🍭, notebook, c(6))

    @test get_stale_cells(notebook) == []
    @test get_depends_on_stale_cells(notebook) == []
    @test c(3).output.body == "4"
    @test c(7).output.body == "4"
    @test all(noerror, notebook.cells)
    @test c(6).output.body == "2"

    cleanup(🍭, notebook)
end