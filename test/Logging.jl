using Test
import UUIDs
import Pluto: PlutoRunner, Notebook, WorkspaceManager, Cell, ServerSession, ClientSession, update_run!
using Pluto.WorkspaceManager: poll

@testset "Logging" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = true

    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient

    @testset "Logging respects maxlog" begin
        notebook = Notebook(Cell.([
            """
            for i in 1:10
                @info "logging" i maxlog=2
            end
            """,
        ]))

        update_run!(🍭, notebook, notebook.cells)
        @test notebook.cells[begin] |> noerror

        @test poll(5, 1/60) do
            length(notebook.cells[begin].logs) == 2
        end
        WorkspaceManager.unmake_workspace((🍭, notebook))
    end
end
