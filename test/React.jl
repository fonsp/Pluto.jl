using Test
using Pluto
import Pluto: Notebook, Client, run_reactive!,fakeclient,  createcell_fromcode, WorkspaceManager

@testset "Reactivity $(method.name.name)" for method in [WorkspaceManager.ModuleWorkspace, WorkspaceManager.ProcessWorkspace]
    WorkspaceManager.set_default_workspace_method(method)

    @test WorkspaceManager.default_workspace_method[] == method

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

        @test !haskey(WorkspaceManager.workspaces, notebook.uuid)
        @test WorkspaceManager.get_workspace(notebook) isa method

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output_repr == notebook.cells[2].output_repr
        notebook.cells[1].code = "x = 12"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == notebook.cells[2].output_repr

        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].error_repr == nothing
    
        run_reactive!(fakeclient, notebook, notebook.cells[4])
        @test notebook.cells[4].output_repr == "16"

        notebook.cells[1].code = "x = 912"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[4].output_repr == "916"

        notebook.cells[3].code = "f(x) = x"
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[4].output_repr == "4"

        WorkspaceManager.unmake_workspace(notebook)
    end

# https://github.com/fonsp/Pluto.jl/issues/32
    @testset "Bad code" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        createcell_fromcode("a"),
        createcell_fromcode("1 = 2")
    ])
        fakeclient.connected_notebook = notebook

        @test_nowarn run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test_nowarn run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].error_repr !== nothing
        @test notebook.cells[2].error_repr !== nothing

        WorkspaceManager.unmake_workspace(notebook)

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
        @test occursin("Multiple", notebook.cells[1].error_repr)
        @test occursin("Multiple", notebook.cells[2].error_repr)
    
        notebook.cells[1].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].error_repr == nothing
        @test notebook.cells[2].error_repr == nothing
    
    # https://github.com/fonsp/Pluto.jl/issues/26
        notebook.cells[1].code = "x = 1"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        notebook.cells[2].code = "x"
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].error_repr == nothing
        @test notebook.cells[2].error_repr == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[3])
        run_reactive!(fakeclient, notebook, notebook.cells[4])
        @test occursin("Multiple", notebook.cells[3].error_repr)
        @test occursin("Multiple", notebook.cells[4].error_repr)
    
        notebook.cells[3].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].error_repr == nothing
        @test notebook.cells[4].error_repr == nothing
    
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        run_reactive!(fakeclient, notebook, notebook.cells[6])
        @test occursin("Multiple", notebook.cells[5].error_repr)
        @test occursin("Multiple", notebook.cells[6].error_repr)
    
        notebook.cells[5].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test notebook.cells[5].error_repr == nothing
    # @test_broken !occursin("redefinition of constant", notebook.cells[6].error_repr)

        WorkspaceManager.unmake_workspace(notebook)

    end

    @testset "Circular" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        createcell_fromcode("x = y"),
        createcell_fromcode("y = x")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test occursin("Circular reference", notebook.cells[1].error_repr)
        @test occursin("Circular reference", notebook.cells[2].error_repr)

        WorkspaceManager.unmake_workspace(notebook)

    end

    @testset "Variable deletion" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        createcell_fromcode("x = 1"),
        createcell_fromcode("y = x")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output_repr == notebook.cells[2].output_repr
        notebook.cells[1].code = ""
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == ""
        @test notebook.cells[1].error_repr == nothing
        @test notebook.cells[2].output_repr == nothing
        @test occursin("x not defined", notebook.cells[2].error_repr)

        WorkspaceManager.unmake_workspace(notebook)

    end

    @testset "Recursive function is not considered cyclic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        createcell_fromcode("f(n) = n * f(n-1)"),
        createcell_fromcode("g(n) = h(n-1)"),
        createcell_fromcode("h(n) = g(n-1)"),
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test startswith(notebook.cells[1].output_repr, "f (generic function with ")
        @test notebook.cells[1].error_repr == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[2])
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[2].error_repr == nothing
        @test notebook.cells[3].error_repr == nothing

        WorkspaceManager.unmake_workspace(notebook)

    end

    @testset "Variable cannot reference its previous value" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        createcell_fromcode("x = 3")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        notebook.cells[1].code = "x = x + 1"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == nothing
        @test occursin("UndefVarError", notebook.cells[1].error_repr)

        WorkspaceManager.unmake_workspace(notebook)

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
        @test notebook.cells[2].error_repr == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].output_repr == "4"

        notebook.cells[1].code = "y = 2"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test notebook.cells[3].output_repr == "5"
        @test notebook.cells[2].error_repr == nothing

        notebook.cells[1].code = "y"
        run_reactive!(fakeclient, notebook, notebook.cells[1])
        @test occursin("UndefVarError", notebook.cells[1].error_repr)
        @test notebook.cells[2].error_repr == nothing
        @test occursin("UndefVarError", notebook.cells[3].error_repr)

        run_reactive!(fakeclient, notebook, notebook.cells[4])
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test notebook.cells[5].output_repr == "11"

        notebook.cells[4].code = "g(a) = a+a"
        run_reactive!(fakeclient, notebook, notebook.cells[4])
        @test notebook.cells[4].error_repr == nothing
        @test notebook.cells[5].error_repr != nothing

        notebook.cells[5].code = "g(5)"
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test notebook.cells[5].output_repr == "10"

        run_reactive!(fakeclient, notebook, notebook.cells[6])
        run_reactive!(fakeclient, notebook, notebook.cells[7])
        run_reactive!(fakeclient, notebook, notebook.cells[8])
        @test notebook.cells[6].error_repr == nothing
        @test notebook.cells[7].error_repr == nothing
        @test notebook.cells[8].error_repr != nothing
    
        notebook.cells[6].code = "h(x::Float64) = 2.0 * x"
        run_reactive!(fakeclient, notebook, notebook.cells[6])
        @test notebook.cells[6].error_repr == nothing
        @test notebook.cells[7].error_repr != nothing
        @test notebook.cells[8].error_repr == nothing

        WorkspaceManager.unmake_workspace(notebook)

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
#         @test notebook.cells[1].output_repr == nothing
#         @test occursin("UndefVarError", notebook.cells[1].error_repr)
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
        @test notebook.cells[1].output_repr == nothing
        @test notebook.cells[2].output_repr == nothing
        @test occursin("Multiple definitions for x", notebook.cells[1].error_repr)
        @test occursin("Multiple definitions for x", notebook.cells[1].error_repr)
    
        notebook.cells[2].code = "x + 1"

        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test notebook.cells[1].output_repr == "1"
        @test notebook.cells[2].output_repr == "2"
    
        run_reactive!(fakeclient, notebook, notebook.cells[3])
        @test notebook.cells[3].output_repr == "3"

        run_reactive!(fakeclient, notebook, notebook.cells[4])
        run_reactive!(fakeclient, notebook, notebook.cells[5])
        @test occursin("Multiple definitions for z", notebook.cells[4].error_repr)
        @test occursin("Multiple definitions for z", notebook.cells[5].error_repr)
    
        run_reactive!(fakeclient, notebook, notebook.cells[6])
        run_reactive!(fakeclient, notebook, notebook.cells[7])
        @test occursin("UndefVarError", notebook.cells[6].error_repr)
    
        run_reactive!(fakeclient, notebook, notebook.cells[8])
        @test notebook.cells[6].error_repr == nothing
        @test notebook.cells[7].error_repr == nothing
        @test notebook.cells[8].error_repr == nothing

        run_reactive!(fakeclient, notebook, notebook.cells[9])
        @test occursin("UndefVarError", notebook.cells[6].error_repr)
        @test notebook.cells[7].error_repr == nothing
        @test occursin("Multiple definitions for w", notebook.cells[8].error_repr)
        @test occursin("Multiple definitions for w", notebook.cells[9].error_repr)

        WorkspaceManager.unmake_workspace(notebook)

    end
end