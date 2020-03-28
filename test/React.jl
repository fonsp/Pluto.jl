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

    @testset "Mutliple assignments" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("x = 1"),
            createcell_fromcode("x = 2"),
            createcell_fromcode("f(x) = 3"),
            createcell_fromcode("f(x) = 4"),
            createcell_fromcode("g(x) = 5"),
            createcell_fromcode("g = 6"),
        ])
        fakeclient.connected_notebook = notebook
        

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test occursin("Multiple", notebook.cells[1].errormessage)
        @test occursin("Multiple", notebook.cells[2].errormessage)
        
        notebook.cells[1].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].errormessage == nothing
        @test notebook.cells[2].errormessage == nothing
        

        run_reactive!(fakeclient, notebook, notebook.cells[3])
        run_reactive!(fakeclient, notebook, notebook.cells[4])
        @test occursin("Multiple", notebook.cells[3].errormessage)
        @test occursin("Multiple", notebook.cells[4].errormessage)
        
        notebook.cells[3].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].errormessage == nothing
        @test notebook.cells[4].errormessage == nothing
        

        run_reactive!(fakeclient, notebook, notebook.cells[5])
        run_reactive!(fakeclient, notebook, notebook.cells[6])
        @test occursin("Multiple", notebook.cells[5].errormessage)
        @test occursin("Multiple", notebook.cells[6].errormessage)
        
        notebook.cells[5].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test notebook.cells[5].errormessage == nothing
        # @test_broken !occursin("redefinition of constant", notebook.cells[6].errormessage)
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
            createcell_fromcode("f(n) = n * f(n-1)"),
            createcell_fromcode("g(n) = h(n-1)"),
            createcell_fromcode("h(n) = g(n-1)"),
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

    @testset "Changing functions" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
            createcell_fromcode("y = 1"),
            createcell_fromcode("f(x) = x + y"),
            createcell_fromcode("f(3)"),

            createcell_fromcode("g(a,b) = a+b"),
            createcell_fromcode("g(5,6)"),

            createcell_fromcode("h(x::Int64) = x"),
            createcell_fromcode("h(7)"),
            createcell_fromcode("h(8.0)"),
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[2].errormessage == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].output == 4

        notebook.cells[1].code = "y = 2"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[3].output == 5
        @test notebook.cells[2].errormessage == nothing

        notebook.cells[1].code = "y"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test occursin("UndefVarError", notebook.cells[1].errormessage)
        @test notebook.cells[2].errormessage == nothing
        @test occursin("UndefVarError", notebook.cells[3].errormessage)

        run_reactive!(fakeclient, notebook, notebook.cells[4])
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test notebook.cells[5].output == 11

        notebook.cells[4].code = "g(a) = a+a"
        run_reactive!(fakeclient, notebook, notebook.cells[4])
        @test notebook.cells[4].errormessage == nothing
        @test notebook.cells[5].errormessage != nothing

        notebook.cells[5].code = "g(5)"
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test notebook.cells[5].output == 10

        run_reactive!(fakeclient, notebook, notebook.cells[6])
        run_reactive!(fakeclient, notebook, notebook.cells[7])
        run_reactive!(fakeclient, notebook, notebook.cells[8])
        @test notebook.cells[6].errormessage == nothing
        @test notebook.cells[7].errormessage == nothing
        @test notebook.cells[8].errormessage != nothing
        
        notebook.cells[6].code = "h(x::Float64) = 2.0 * x"
        run_reactive!(fakeclient, notebook, notebook.cells[6])
        @test notebook.cells[6].errormessage == nothing
        @test notebook.cells[7].errormessage != nothing
        @test notebook.cells[8].errormessage == nothing
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