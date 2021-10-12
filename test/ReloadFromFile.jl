using Test
import Pluto: Configuration, Notebook, ServerSession, ClientSession, update_run!, Cell, WorkspaceManager, SessionActions
import Pluto.Configuration: Options, EvaluationOptions
import Distributed
using Pluto.WorkspaceManager: poll
import Pkg

@testset "Reload from file" begin
    
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false
    🍭.options.server.auto_reload_from_file = true
    
    
    
    timeout_between_tests = 🍭.options.server.auto_reload_from_file_cooldown * 1.5

    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient
    
    notebook = SessionActions.new(🍭; run_async=false)
    fakeclient.connected_notebook = notebook
    
    ### 
    sleep(timeout_between_tests)
    
    nb1 = Notebook([
        Cell("x = 123"),
        Cell("x + x"),
        Cell("rand()"),
    ])
    file1 = sprint(Pluto.save_notebook, nb1)

    
    write(notebook.path, file1)
    
    @test poll(30) do
        length(notebook.cells) == 3
    end
    @test poll(5) do
        notebook.cells[1].output.body == "123"
    end
    @test poll(5) do
        all(c -> !c.running, notebook.cells)
    end
    
    @test notebook.cells[2].output.body == "246"
    @test notebook.cells[3].errored == false
    
    original_rand_output = notebook.cells[3].output.body
    
    ###
    sleep(timeout_between_tests)
    
    
    nb2 = Notebook(reverse(nb1.cells))

    file2 = sprint(Pluto.save_notebook, nb2)
    write(notebook.path, file2)
    
    @test poll(10) do
        notebook.cells[3].output.body == "123"
    end
    
    # notebook order reversed, but cell should not re-run
    @test original_rand_output == notebook.cells[1].output.body
    
    
    ###
    sleep(timeout_between_tests)
    
    
    file3 = replace(file1, "123" => "6")
    write(notebook.path, file3)
    
    
    @test poll(10) do
        notebook.cells[1].output.body == "6"
    end
    @test poll(5) do
        all(c -> !c.running, notebook.cells)
    end
    @test notebook.cells[2].output.body == "12"
    
    # notebook order reversed again, but cell should not re-run
    @test original_rand_output == notebook.cells[3].output.body


    ###
    sleep(timeout_between_tests)
    
    file4 = read(joinpath(@__DIR__, "packages", "simple_stdlib_import.jl"), String)
    write(notebook.path, file4)
    
    
    @test poll(10) do
        notebook.cells[2].output.body == "false"
    end
    @test length(notebook.cells) == 2
    @test notebook.nbpkg_restart_required_msg !== nothing
end