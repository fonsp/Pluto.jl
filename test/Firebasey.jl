using Test
import Pluto: ServerSession, update_run!, WorkspaceManager

@testset "Test Firebasey" begin
    🍭 = ServerSession()

    file = tempname()
    write(file, read(normpath(Pluto.project_relative_path("src", "webserver", "Firebasey.jl"))))

    notebook = Pluto.load_notebook_nobackup(file)

    update_run!(🍭, notebook, notebook.cells)

    # Test that the resulting file is runnable
    @test jl_is_runnable(file)
    # and also that Pluto can figure out the execution order on its own
    @test all(noerror, notebook.cells)

    cleanup(🍭, notebook)
end
