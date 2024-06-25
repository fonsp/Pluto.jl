using Test
import Pluto: PlutoRunner, Notebook, WorkspaceManager, Cell, ServerSession, update_run!

@testset "stdout/stderr/display IOContext" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = true

    # $(repr(p)) rather than $p for parseable interpolation, e.g., symbols with colons
    cells = Cell[]
    for (k, v) in pairs(PlutoRunner.default_stdout_iocontext.dict)
        append!(cells, [
            Cell("($(repr(k)) => $(repr(v))) in stdout"),
            Cell("($(repr(k)) => $(repr(v))) in stderr"),
        ])
    end
    for (k, v) in pairs(PlutoRunner.default_display_iocontext.dict)
        # We can popdisplay() once per cell since Pluto cells have separate display stacks 
        push!(cells, Cell("($(repr(k)) => $(repr(v))) in popdisplay().io"))
    end
    notebook = Notebook(cells)

    update_run!(🍭, notebook, notebook.cells)
    for cell in values(notebook.cells_dict)
        # @test cell.output.body == "true", but with more informative output on failure
        @test endswith("($(cell.code)) == $(cell.output.body)", "true")
    end

    WorkspaceManager.unmake_workspace((🍭, notebook))
end
