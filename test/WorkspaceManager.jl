using Pluto
import Pluto: run_reactive!, WorkspaceManager

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

        @test_nowarn run_reactive!(🍭, notebookA, notebookA.cells[1])
        @test_nowarn run_reactive!(🍭, notebookB, notebookB.cells[1])

        @test notebookB.cells[1].errored == true
    end
end