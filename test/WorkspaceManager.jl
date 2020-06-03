import Pluto: Notebook, Client, run_reactive!, Cell, WorkspaceManager

@testset "Workspace manager" begin
# basic functionality is already tested by the reactivity tests

    @testset "Multiple notebooks" begin
        fakeclientA = Client(:fakeA, nothing)
        fakeclientB = Client(:fakeB, nothing)
        Pluto.connectedclients[fakeclientA.id] = fakeclientA
        Pluto.connectedclients[fakeclientB.id] = fakeclientB


        notebookA = Notebook(joinpath(tempdir(), "test.jl"), [
            Cell("x = 3")
        ])
        fakeclientA.connected_notebook = notebookA

        notebookB = Notebook(joinpath(tempdir(), "test.jl"), [
            Cell("x")
        ])
        fakeclientB.connected_notebook = notebookB

        @test_nowarn run_reactive!(notebookA, notebookA.cells[1])
        @test_nowarn run_reactive!(notebookB, notebookB.cells[1])

        @test notebookB.cells[1].errored == true
    end
end