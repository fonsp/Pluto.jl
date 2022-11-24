using Test
using Pluto.Configuration: CompilerOptions
using Pluto.WorkspaceManager: _merge_notebook_compiler_options
import Pluto: update_save_run!, update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell, project_relative_path
import Distributed

@testset "Workspace manager" begin
# basic functionality is already tested by the reactivity tests

    @testset "Multiple notebooks" begin
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = true

        notebookA = Notebook([
            Cell("x = 3")
        ])
        notebookB = Notebook([
            Cell("x")
        ])

        @test notebookA.path != notebookB.path

        Sys.iswindows() && sleep(.5) # workaround for https://github.com/JuliaLang/julia/issues/39270
        update_save_run!(🍭, notebookA, notebookA.cells[1])
        Sys.iswindows() && sleep(.5) # workaround for https://github.com/JuliaLang/julia/issues/39270
        update_save_run!(🍭, notebookB, notebookB.cells[1])

        @test notebookB.cells[1].errored == true

        Sys.iswindows() && sleep(.5) # workaround for https://github.com/JuliaLang/julia/issues/39270
        WorkspaceManager.unmake_workspace((🍭, notebookA))
        Sys.iswindows() && sleep(.5) # workaround for https://github.com/JuliaLang/julia/issues/39270
        WorkspaceManager.unmake_workspace((🍭, notebookB))
    end
    @testset "Variables with secret names" begin
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = false

        notebook = Notebook([
            Cell("result = 1"),
            Cell("result"),
            Cell("elapsed_ns = 3"),
            Cell("elapsed_ns"),
        ])

        update_save_run!(🍭, notebook, notebook.cells[1:4])
        @test notebook.cells[1].output.body == "1"
        @test notebook.cells[2].output.body == "1"
        @test notebook.cells[3].output.body == "3"
        @test notebook.cells[4].output.body == "3"
        
        WorkspaceManager.unmake_workspace((🍭, notebook); verbose=false)
    end

    Sys.iswindows() || @testset "Pluto inside Pluto" begin
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = true

        notebook = Notebook([
            Cell("""begin
                import Pkg
                Pkg.activate()
                empty!(LOAD_PATH)
                push!(LOAD_PATH, $(repr(Base.load_path()))...)
                import Pluto
            end"""),
            Cell("""
            s = Pluto.ServerSession()
            """),
            Cell("""
            nb = Pluto.SessionActions.open(s, Pluto.project_relative_path("sample", "Tower of Hanoi.jl"); run_async=false, as_sample=true)
            """),
            Cell("length(nb.cells)"),
            Cell(""),
        ])

        update_run!(🍭, notebook, notebook.cells)

        @test notebook.cells[1] |> noerror
        @test notebook.cells[2] |> noerror
        @test notebook.cells[3] |> noerror
        @test notebook.cells[4] |> noerror
        @test notebook.cells[5] |> noerror

        setcode!(notebook.cells[5], "length(nb.cells)")
        update_run!(🍭, notebook, notebook.cells[5])
        @test notebook.cells[5] |> noerror


        desired_nprocs = Distributed.nprocs() - 1
        setcode!(notebook.cells[5], "Pluto.SessionActions.shutdown(s, nb)")
        update_run!(🍭, notebook, notebook.cells[5])
        @test noerror(notebook.cells[5])

        while Distributed.nprocs() != desired_nprocs
            sleep(.1)
        end
        sleep(.1)

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end
end
