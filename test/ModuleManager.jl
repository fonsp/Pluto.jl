@testset "Module manager" begin
# basic functionality is already tested by the reactivity tests

    @testset "Multiple notebooks" begin
        fakeclientA = Client(:fakeA, nothing)
        fakeclientB = Client(:fakeB, nothing)
        Pluto.connectedclients[fakeclientA.id] = fakeclientA
        Pluto.connectedclients[fakeclientB.id] = fakeclientB


        notebookA = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 3")
        ])
        fakeclientA.connected_notebook = notebookA

        notebookB = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x")
        ])
        fakeclientB.connected_notebook = notebookB

        @test_nowarn run_reactive!(fakeclientA, notebookA, notebookA.cells[1])
        @test_nowarn run_reactive!(fakeclientB, notebookB, notebookB.cells[1])

        @test notebookB.cells[1].errormessage !== nothing
    end
end