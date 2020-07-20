using Test
using Pluto
import Pluto: run_reactive!, run_reactive_async!, WorkspaceManager, ClientSession, ServerSession

@testset "Workspace manager" begin
# basic functionality is already tested by the reactivity tests
    🍭 = ServerSession()
    clientA = ClientSession(:fakeA, nothing)
    clientB = ClientSession(:fakeB, nothing)
    🍭.connected_clients[clientA.id] = clientA
    🍭.connected_clients[clientB.id] = clientB

    notebookA = Notebook([
        Cell("x = 3"),
        Cell("sleep(.1)"),
    ])
    clientA.connected_notebook = notebookA

    notebookB = Notebook([
        Cell("x"),
        Cell("let
            i = 1
            while i < 5
                i += 1
            end
        end"),
    ])
    clientB.connected_notebook = notebookB

    @testset "Scope interference between notebooks" begin
        @test notebookA.path != notebookB.path

        run_reactive!(🍭, notebookA, notebookA.cells[1])
        run_reactive!(🍭, notebookB, notebookB.cells[1])

        @test notebookB.cells[1].errored == true

    end

    @testset "Interrupting" begin
        if Sys.iswindows()
            @test_broken "Interrupting cells on Windows" == "possible"
        else
            @sync begin
                @async begin
                    # to precompile
                    run_reactive!(🍭, notebookA, notebookA.cells[2])

                    notebookA.cells[2].code = "sleep(5)"
                    run_reactive_async!(🍭, notebookA, notebookA.cells[2])
                    sleep(.5)
                    @async WorkspaceManager.interrupt_workspace(notebookA)
                    sleep(1)

                    @test notebookA.cells[2].running == false
                    @test notebookA.cells[2].errored == true
                    @test occursin("Interrupt", notebookA.cells[2].output_repr)

                    notebookA.cells[1].code = "9"
                    run_reactive_async!(🍭, notebookA, notebookA.cells[1])
                    sleep(.5)
                    @test notebookA.cells[1].output_repr == "9"
                end
                @async begin
                    # to precompile
                    run_reactive!(🍭, notebookB, notebookB.cells[2])
                    
                    notebookB.cells[2].code = "while true end"
                    run_reactive_async!(🍭, notebookB, notebookB.cells[2])
                    sleep(.5)
                    tic = time()
                    @async WorkspaceManager.interrupt_workspace(notebookB)
                    sleep(1)
                    wait(notebookB.executetoken)
                    toc = time()

                    @test toc - tic < 10.0
                    @test notebookB.cells[2].running == false
                    @test notebookB.cells[2].errored == true
                    @test occursin("Interrupt", notebookB.cells[2].output_repr)

                    notebookB.cells[1].code = "8"
                    run_reactive_async!(🍭, notebookB, notebookB.cells[1])
                    sleep(.5)
                    wait(notebookB.executetoken)
                    @test notebookB.cells[1].output_repr == "8"
                    
                end
            end
        end
    end
    @test false
end

# TODO: test pwd()