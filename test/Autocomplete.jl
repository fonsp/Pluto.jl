using Test
import Pluto: Notebook, ServerSession, update_run!, Cell, WorkspaceManager
import Malt

@testset "Autocomplete" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    notebook = Notebook([
        Cell("using Dates"),
        Cell("my_variable = 1"),
        Cell("other_variable = 2"),
    ])
    update_run!(🍭, notebook, notebook.cells)

    # Like the frontend: `query` is the code before the cursor without the identifier being typed.
    function complete(query_full)
        query = replace(query_full, r"[\p{L}\p{Nl}\p{Sc}\d_!]*$" => "")
        workspace = WorkspaceManager.get_workspace((🍭, notebook))
        results, _, _, _ = Malt.remote_eval_fetch(workspace.worker, quote
            PlutoRunner.completion_fetcher(
                $query,
                $query_full,
                getfield(Main, $(QuoteNode(workspace.module_name))),
            )
        end)
        Set(first.(results))
    end

    @testset "Names from using" begin
        @test "now" ∈ complete("no")
        @test "DateTime" ∈ complete("x = Da")
        @test "Dict" ∈ complete("let\n    Di")
        @test "now" ∈ complete("max(1, no")
        @test "now" ∈ complete("Dates.no")
    end

    @testset "Names from other cells" begin
        @test "my_variable" ∈ complete("my_")

        setcode!(notebook.cells[3], "other_variable = 3")
        update_run!(🍭, notebook, notebook.cells[3])
        @test "my_variable" ∈ complete("my_")
        @test "now" ∈ complete("no")
    end

    cleanup(🍭, notebook)
end
