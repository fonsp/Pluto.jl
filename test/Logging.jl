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
        @testset "Single log" begin
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

            # Check that maxlog doesn't occur in the message
            @test all(notebook.cells[begin].logs) do log
                all(log["kwargs"]) do kwarg
                    kwarg[1] != "maxlog"
                end
            end

            WorkspaceManager.unmake_workspace((🍭, notebook))
        end

        @testset "Multiple log" begin
            notebook = Notebook(Cell.([
                """
                for i in 1:10
                    @info "logging" i maxlog=2
                    @info "logging more" maxlog = 4
                    @info "even more logging"
                end
                """,
            ]))

            update_run!(🍭, notebook, notebook.cells)
            @test notebook.cells[begin] |> noerror

            # Wait until all 16 logs are in
            @test poll(5, 1/60) do
                length(notebook.cells[begin].logs) == 16
            end

            # Get the ids of the three logs and their counts. We are
            # assuming that the logs are ordered same as in the loop.
            ids = unique(getindex.(notebook.cells[begin].logs, "id"))
            counts = [count(log -> log["id"] == id, notebook.cells[begin].logs) for id in ids]
            @test counts == [2, 4, 10]

            # Check that maxlog doesn't occur in the messages
            @test all(notebook.cells[begin].logs) do log
                all(log["kwargs"]) do kwarg
                    kwarg[1] != "maxlog"
                end
            end

            WorkspaceManager.unmake_workspace((🍭, notebook))
        end
    end
end
