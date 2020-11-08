using Test
using Pluto.Configuration: CompilerOptions
using Pluto.WorkspaceManager: _merge_notebook_compiler_options
import Pluto: update_save_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell, project_relative_path

@testset "Workspace manager" begin
# basic functionality is already tested by the reactivity tests

    @testset "Multiple notebooks" begin

        fakeclientA = ClientSession(:fakeA, nothing)
        fakeclientB = ClientSession(:fakeB, nothing)
        🍭 = ServerSession()
        🍭.connected_clients[fakeclientA.id] = fakeclientA
        🍭.connected_clients[fakeclientB.id] = fakeclientB


        notebookA = Notebook([
            Cell("x = 3")
        ])
        fakeclientA.connected_notebook = notebookA

        notebookB = Notebook([
            Cell("x")
        ])
        fakeclientB.connected_notebook = notebookB

        @test notebookA.path != notebookB.path

        update_save_run!(🍭, notebookA, notebookA.cells[1])
        update_save_run!(🍭, notebookB, notebookB.cells[1])

        @test notebookB.cells[1].errored == true

        WorkspaceManager.unmake_workspace((🍭, notebookA))
        WorkspaceManager.unmake_workspace((🍭, notebookB))
    end
    @testset "Variables with secret names" begin
        fakeclient = ClientSession(:fake, nothing)
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = false
        🍭.connected_clients[fakeclient.id] = fakeclient

        notebook = Notebook([
            Cell("result = 1"),
            Cell("result"),
            Cell("elapsed_ns = 3"),
            Cell("elapsed_ns"),
        ])
        fakeclient.connected_notebook = notebook

        update_save_run!(🍭, notebook, notebook.cells[1:4])
        @test notebook.cells[1].output_repr == "1"
        @test notebook.cells[2].output_repr == "1"
        @test notebook.cells[3].output_repr == "3"
        @test notebook.cells[4].output_repr == "3"
        
        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "notebook environment" begin
        session_options = CompilerOptions()
        notebook = Notebook([Cell("x")])
        notebook.compiler_options = CompilerOptions(;project="test")
        @test _merge_notebook_compiler_options(notebook, session_options).project ==
            joinpath(dirname(notebook.path), "test")

        notebook.compiler_options = CompilerOptions(;project=project_relative_path("test"))
        @test _merge_notebook_compiler_options(notebook, session_options).project ==
            project_relative_path("test")
        
        session_options = CompilerOptions(;project=project_relative_path("test"))
        notebook.compiler_options = CompilerOptions(;project=project_relative_path("Project.toml"))
        @test _merge_notebook_compiler_options(notebook, session_options).project ==
            project_relative_path("Project.toml")
    end
end