using Test
using Pluto
import Pluto: Notebook, Client, run_reactive!,fakeclient,  createcell_fromcode, WorkspaceManager

@testset "Reactivity" begin
    fakeclient = Client(:fake, nothing)
    Pluto.connectedclients[fakeclient.id] = fakeclient

    @testset "Basic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 1"),
            createcell_fromcode("y = x"),
            createcell_fromcode("f(x) = x + y"),
            createcell_fromcode("f(4)"),
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output == notebook.cells[2].output
        notebook.cells[1].code = "x = 12"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output == notebook.cells[2].output

        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].errormessage == nothing
        
        run_reactive!(fakeclient, notebook, notebook.cells[4])
        @test notebook.cells[4].output == 16

        notebook.cells[1].code = "x = 912"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[4].output == 916

        notebook.cells[3].code = "f(x) = x"
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[4].output == 4
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
            createcell_fromcode("factorial(n) = n * factorial(n-1)"),
            createcell_fromcode("f(n) = g(n-1)"),
            createcell_fromcode("g(n) = f(n-1)"),
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test !isempty(methods(notebook.cells[1].output))
        @test notebook.cells[1].errormessage == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[2])
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[2].errormessage == nothing
        @test notebook.cells[3].errormessage == nothing
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

#     @testset "Multiple dispatch" begin
#         notebook = Notebook(joinpath(tempdir(), "test.jl"), [
#             createcell_fromcode(
# """begin
#     function f(x)
#         x
#     end
#     function f(x,s)
#         s
#     end
# end"""
#             )
#             createcell_fromcode(
# """function g(x)
#     x
# end"""
#             )
#             createcell_fromcode(
# """function g(x,s)
#     s
# end"""
#             )
#             createcell_fromcode("function f(x) x end")
#         ])
#         fakeclient.connected_notebook = notebook

#         run_reactive!(fakeclient, notebook, notebook.cells[1])
#         run_reactive!(fakeclient, notebook, notebook.cells[1])
#         notebook.cells[1].code = "x = x + 1"
#         run_reactive!(fakeclient, notebook, notebook.cells[1])
#         @test notebook.cells[1].output == nothing
#         @test occursin("UndefVarError", notebook.cells[1].errormessage)
#     end

    @testset "Immutable globals" begin
        # We currently have a slightly relaxed version of immutable globals:
        # globals can only be mutated/assigned _in a single cell_.
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 1"),
            createcell_fromcode("x = 2"),
            createcell_fromcode("y = -3; y = 3"),
            createcell_fromcode("z = 4"),
            createcell_fromcode("let global z = 5 end"),
            createcell_fromcode("w"),
            createcell_fromcode("function f(x) global w = x end"),
            createcell_fromcode("f(-8); f(8)"),
            createcell_fromcode("f(9)"),
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output == nothing
        @test notebook.cells[2].output == nothing
        @test occursin("Multiple definitions for x", notebook.cells[1].errormessage)
        @test occursin("Multiple definitions for x", notebook.cells[1].errormessage)
        
        notebook.cells[2].code = "x + 1"

        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output == 1
        @test notebook.cells[2].output == 2
        
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].output == 3

        run_reactive!(fakeclient, notebook, notebook.cells[4])
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test occursin("Multiple definitions for z", notebook.cells[4].errormessage)
        @test occursin("Multiple definitions for z", notebook.cells[5].errormessage)
        
        run_reactive!(fakeclient, notebook, notebook.cells[6])
        run_reactive!(fakeclient, notebook, notebook.cells[7])
        @test occursin("UndefVarError", notebook.cells[6].errormessage)
        
        run_reactive!(fakeclient, notebook, notebook.cells[8])
        @test notebook.cells[6].errormessage == nothing
        @test notebook.cells[7].errormessage == nothing
        @test notebook.cells[8].errormessage == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[9])
        @test occursin("UndefVarError", notebook.cells[6].errormessage)
        @test notebook.cells[7].errormessage == nothing
        @test occursin("Multiple definitions for w", notebook.cells[8].errormessage)
        @test occursin("Multiple definitions for w", notebook.cells[9].errormessage)
    end
end