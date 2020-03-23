using Test
using Pluto
import Pluto: Notebook, Client, run_reactive!,fakeclient,  createcell_fromcode, ModuleManager

@testset "Reactivity" begin
    fakeclient = Client(:fake, nothing)
    Pluto.connectedclients[fakeclient.id] = fakeclient

    @testset "Basic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 1"),
            createcell_fromcode("y = x")
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output == notebook.cells[2].output
        notebook.cells[1].code = "x = 12"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output == notebook.cells[2].output
    end

    @testset "Bad code" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("a"),
            createcell_fromcode("1 = 2")
        ])
        fakeclient.connected_notebook = notebook

        @test_nowarn run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test_nowarn run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].errormessage !== nothing
        @test notebook.cells[2].errormessage !== nothing
    end

    @testset "Cyclic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = y"),
            createcell_fromcode("y = x")
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test occursin("Cyclic reference", notebook.cells[1].errormessage)
        @test occursin("Cyclic reference", notebook.cells[2].errormessage)
    end

    @testset "Variable deletion" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 1"),
            createcell_fromcode("y = x")
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output == notebook.cells[2].output
        notebook.cells[1].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output == nothing
        @test notebook.cells[1].errormessage == nothing
        @test notebook.cells[2].output == nothing
        @test occursin("x not defined", notebook.cells[2].errormessage)
    end

    @testset "Recursive function is not considered cyclic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("factorial(n) = n * factorial(n-1)")
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test !isempty(methods(notebook.cells[1].output))
        @test notebook.cells[1].errormessage == nothing
    end

    @testset "Variable cannot reference its previous value" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 3")
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        notebook.cells[1].code = "x = x + 1"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output == nothing
        @test occursin("UndefVarError", notebook.cells[1].errormessage)
    end
end