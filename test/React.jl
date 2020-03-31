using Test
using Pluto
import Pluto: Notebook, Client, run_reactive!, Cell, WorkspaceManager

@testset "Reactivity $(method.name.name)" for method in [WorkspaceManager.ModuleWorkspace, WorkspaceManager.ProcessWorkspace]
    WorkspaceManager.set_default_workspace_method(method)

    fakeclient = Client(:fake, nothing)
    Pluto.connectedclients[fakeclient.id] = fakeclient

    @testset "Basic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        Cell("x = 1"),
        Cell("y = x"),
        Cell("f(x) = x + y"),
        Cell("f(4)"),
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
        Cell("a"),
        Cell("1 = 2")
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
        Cell("x = 1"),
        Cell("x = 2"),
        Cell("f(x) = 3"),
        Cell("f(x) = 4"),
        Cell("g(x) = 5"),
        Cell("g = 6"),
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

    @testset "Cyclic" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        Cell("x = y"),
        Cell("y = x")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])
        run_reactive!(fakeclient, notebook, notebook.cells[2])
        @test occursin("Cyclic reference", notebook.cells[1].error_repr)
        @test occursin("Cyclic reference", notebook.cells[2].error_repr)

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Variable deletion" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        Cell("x = 1"),
        Cell("y = x")
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
        Cell("f(n) = n * f(n-1)"),
        Cell("g(n) = h(n-1)"),
        Cell("h(n) = g(n-1)"),
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
        Cell("x = 3")
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
        Cell("y = 1"),
        Cell("f(x) = x + y"),
        Cell("f(3)"),

        Cell("g(a,b) = a+b"),
        Cell("g(5,6)"),

        Cell("h(x::Int64) = x"),
        Cell("h(7)"),
        Cell("h(8.0)"),
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
#             Cell(
# """begin
#     function f(x)
#         x
#     end
#     function f(x,s)
#         s
#     end
# end"""
#             )
#             Cell(
# """function g(x)
#     x
# end"""
#             )
#             Cell(
# """function g(x,s)
#     s
# end"""
#             )
#             Cell("function f(x) x end")
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
        Cell("x = 1"),
        Cell("x = 2"),
        Cell("y = -3; y = 3"),
        Cell("z = 4"),
        Cell("let global z = 5 end"),
        Cell("w"),
        Cell("function f(x) global w = x end"),
        Cell("f(-8); f(8)"),
        Cell("f(9)"),
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

    @testset "Run all" begin
        notebook = Notebook(joinpath(tempdir(), "test.jl"), [
        Cell("x = []"),
        Cell("push!(x,2); b = a + 2"),
        Cell("push!(x,3); c = b + a"),
        Cell("push!(x,4); a = 1"),
        Cell("push!(x,5); a + b +c"),

        Cell("push!(x,6); a = 1"),

        Cell("push!(x,7); n = m"),
        Cell("push!(x,8); m = n"),
        Cell("push!(x,9); n = 1"),

        Cell("push!(x,10)"),
        Cell("push!(x,11)"),
        Cell("push!(x,12)"),
        Cell("push!(x,13)"),
        Cell("push!(x,14)"),

        Cell("join(x, '-')")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(fakeclient, notebook, notebook.cells[1])

        @testset "Basic" begin
            run_reactive!(fakeclient, notebook, notebook.cells[2:5])

            run_reactive!(fakeclient, notebook, notebook.cells[15])
            @test notebook.cells[15].output_repr == "\"4-2-3-5\""
        end
        
        @testset "Errors" begin
            run_reactive!(fakeclient, notebook, notebook.cells[6:9])

            # should all err, no change to `x`
            run_reactive!(fakeclient, notebook, notebook.cells[15])
            @test notebook.cells[15].output_repr == "\"4-2-3-5\""
        end

        @testset "Maintain order when possible" begin
            run_reactive!(fakeclient, notebook, notebook.cells[10:14])

            run_reactive!(fakeclient, notebook, notebook.cells[15])
            @test notebook.cells[15].output_repr == "\"4-2-3-5-10-11-12-13-14\""
        end

        WorkspaceManager.unmake_workspace(notebook)
    end
end