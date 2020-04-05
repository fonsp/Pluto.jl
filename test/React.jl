using Test
using Pluto
import Pluto: Notebook, Client, run_reactive!, Cell, WorkspaceManager

to_test = [WorkspaceManager.ModuleWorkspace]
if Sys.iswindows()
    println("Can't test ProcessWorkspace on Windows")
else
    push!(to_test, WorkspaceManager.ProcessWorkspace)
end
@testset "Reactivity $(method.name.name)" for method in to_test

    WorkspaceManager.set_default_workspace_method(method)

    fakeclient = Client(:fake, nothing)
    Pluto.connectedclients[fakeclient.id] = fakeclient

    

    @testset "Basic" begin
        notebook = Notebook([
        Cell("x = 1"),
        Cell("y = x"),
        Cell("f(x) = x + y"),
        Cell("f(4)"),

        Cell("""begin
            g(a) = x
            g(a,b) = y
        end"""),
        Cell("g(6) + g(6,6)"),
    ])
        fakeclient.connected_notebook = notebook

        @test !haskey(WorkspaceManager.workspaces, notebook.uuid)
        @test WorkspaceManager.get_workspace(notebook) isa method

        run_reactive!(notebook, notebook.cells[1:2])
        @test notebook.cells[1].output_repr == notebook.cells[2].output_repr
        notebook.cells[1].code = "x = 12"
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == notebook.cells[2].output_repr

        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[3].error_repr == nothing
    
        run_reactive!(notebook, notebook.cells[4])
        @test notebook.cells[4].output_repr == "16"

        notebook.cells[1].code = "x = 912"
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[4].output_repr == "916"

        notebook.cells[3].code = "f(x) = x"
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[4].output_repr == "4"

        notebook.cells[1].code = "x = 1"
        notebook.cells[2].code = "y = 2"
        run_reactive!(notebook, notebook.cells[1:2])
        run_reactive!(notebook, notebook.cells[5:6])
        @test notebook.cells[5].error_repr == nothing
        @test notebook.cells[6].output_repr == "3"

        notebook.cells[2].code = "y = 1"
        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[6].output_repr == "2"

        notebook.cells[1].code = "x = 2"
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[6].output_repr == "3"

        WorkspaceManager.unmake_workspace(notebook)
    end

# https://github.com/fonsp/Pluto.jl/issues/32
    @testset "Bad code" begin
        notebook = Notebook([
        Cell("a"),
        Cell("1 = 2")
    ])
        fakeclient.connected_notebook = notebook

        @test_nowarn run_reactive!(notebook, notebook.cells[1])
        @test_nowarn run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[1].error_repr !== nothing
        @test notebook.cells[2].error_repr !== nothing

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Mutliple assignments" begin
        notebook = Notebook([
        Cell("x = 1"),
        Cell("x = 2"),
        Cell("f(x) = 3"),
        Cell("f(x) = 4"),
        Cell("g(x) = 5"),
        Cell("g = 6"),
    ])
        fakeclient.connected_notebook = notebook
    

        run_reactive!(notebook, notebook.cells[1])
        run_reactive!(notebook, notebook.cells[2])
        @test occursin("Multiple", notebook.cells[1].error_repr)
        @test occursin("Multiple", notebook.cells[2].error_repr)
    
        notebook.cells[1].code = ""
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[1].error_repr == nothing
        @test notebook.cells[2].error_repr == nothing
    
    # https://github.com/fonsp/Pluto.jl/issues/26
        notebook.cells[1].code = "x = 1"
        run_reactive!(notebook, notebook.cells[1])
        notebook.cells[2].code = "x"
        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[1].error_repr == nothing
        @test notebook.cells[2].error_repr == nothing

        run_reactive!(notebook, notebook.cells[3])
        run_reactive!(notebook, notebook.cells[4])
        @test occursin("Multiple", notebook.cells[3].error_repr)
        @test occursin("Multiple", notebook.cells[4].error_repr)
    
        notebook.cells[3].code = ""
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[3].error_repr == nothing
        @test notebook.cells[4].error_repr == nothing
    
        run_reactive!(notebook, notebook.cells[5])
        run_reactive!(notebook, notebook.cells[6])
        @test occursin("Multiple", notebook.cells[5].error_repr)
        @test occursin("Multiple", notebook.cells[6].error_repr)
    
        notebook.cells[5].code = ""
        run_reactive!(notebook, notebook.cells[5])
        @test notebook.cells[5].error_repr == nothing
    # @test_broken !occursin("redefinition of constant", notebook.cells[6].error_repr)

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Cyclic" begin
        notebook = Notebook([
        Cell("x = y"),
        Cell("y = x")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1])
        run_reactive!(notebook, notebook.cells[2])
        @test occursin("Cyclic reference", notebook.cells[1].error_repr)
        @test occursin("Cyclic reference", notebook.cells[2].error_repr)

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Variable deletion" begin
        notebook = Notebook([
        Cell("x = 1"),
        Cell("y = x")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1])
        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[1].output_repr == notebook.cells[2].output_repr
        notebook.cells[1].code = ""
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == ""
        @test notebook.cells[1].error_repr == nothing
        @test notebook.cells[2].output_repr == nothing
        @test occursin("x not defined", notebook.cells[2].error_repr)

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Recursion" begin
        notebook = Notebook([
        Cell("f(n) = n * f(n-1)"),

        Cell("k = 1"),
        Cell("""begin
            g(n) = h(n-1) + k
            h(n) = n > 0 ? g(n-1) : 0
        end"""),

        Cell("h(4)"),
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1])
        @test startswith(notebook.cells[1].output_repr, "f (generic function with ")
        @test notebook.cells[1].error_repr == nothing

        run_reactive!(notebook, notebook.cells[2:3])
        @test notebook.cells[2].error_repr == nothing
        @test notebook.cells[3].error_repr == nothing
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[3].error_repr == nothing

        run_reactive!(notebook, notebook.cells[4])
        @test notebook.cells[4].output_repr == "2"

        notebook.cells[2].code = "k = 2"
        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[4].output_repr == "4"

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Variable cannot reference its previous value" begin
        notebook = Notebook([
        Cell("x = 3")
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1])
        notebook.cells[1].code = "x = x + 1"
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == nothing
        @test occursin("UndefVarError", notebook.cells[1].error_repr)

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Changing functions" begin
        notebook = Notebook([
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

        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[2].error_repr == nothing

        run_reactive!(notebook, notebook.cells[1])
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[3].output_repr == "4"

        notebook.cells[1].code = "y = 2"
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[3].output_repr == "5"
        @test notebook.cells[2].error_repr == nothing

        notebook.cells[1].code = "y"
        run_reactive!(notebook, notebook.cells[1])
        @test occursin("UndefVarError", notebook.cells[1].error_repr)
        @test_broken notebook.cells[2].error_repr == nothing
        @test occursin("UndefVarError", notebook.cells[3].error_repr)

        run_reactive!(notebook, notebook.cells[4])
        run_reactive!(notebook, notebook.cells[5])
        @test notebook.cells[5].output_repr == "11"

        notebook.cells[4].code = "g(a) = a+a"
        run_reactive!(notebook, notebook.cells[4])
        @test notebook.cells[4].error_repr == nothing
        @test notebook.cells[5].error_repr != nothing

        notebook.cells[5].code = "g(5)"
        run_reactive!(notebook, notebook.cells[5])
        @test notebook.cells[5].output_repr == "10"

        run_reactive!(notebook, notebook.cells[6])
        run_reactive!(notebook, notebook.cells[7])
        run_reactive!(notebook, notebook.cells[8])
        @test notebook.cells[6].error_repr == nothing
        @test notebook.cells[7].error_repr == nothing
        @test notebook.cells[8].error_repr != nothing
    
        notebook.cells[6].code = "h(x::Float64) = 2.0 * x"
        run_reactive!(notebook, notebook.cells[6])
        @test notebook.cells[6].error_repr == nothing
        @test notebook.cells[7].error_repr != nothing
        @test notebook.cells[8].error_repr == nothing

        WorkspaceManager.unmake_workspace(notebook)
    end

#     @testset "Multiple dispatch" begin
#         notebook = Notebook([
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

#         run_reactive!(notebook, notebook.cells[1])
#         run_reactive!(notebook, notebook.cells[1])
#         notebook.cells[1].code = "x = x + 1"
#         run_reactive!(notebook, notebook.cells[1])
#         @test notebook.cells[1].output_repr == nothing
#         @test occursin("UndefVarError", notebook.cells[1].error_repr)
#     end

    @testset "Functional programming" begin
        notebook = Notebook([
            Cell("a = 1"),
            Cell("map(2:2) do val; (global a = val; 2*val) end |> last"),

            Cell("b = 3"),
            Cell("g = f"),
            Cell("f(x) = x + b"),
            Cell("g(6)"),

            Cell("h = [x -> x + b][1]"),
            Cell("h(8)"),
        ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1:2])
        @test occursin("Multiple definitions for a", notebook.cells[1].error_repr)
        @test occursin("Multiple definitions for a", notebook.cells[2].error_repr)

        notebook.cells[1].code = "a"
        run_reactive!(notebook, notebook.cells[1])
        @test notebook.cells[1].output_repr == "2"
        @test notebook.cells[2].output_repr == "4"

        run_reactive!(notebook, notebook.cells[3:6])
        @test notebook.cells[3].error_repr == nothing
        @test notebook.cells[4].error_repr == nothing
        @test notebook.cells[5].error_repr == nothing
        @test notebook.cells[6].error_repr == nothing
        @test notebook.cells[6].output_repr == "9"

        notebook.cells[3].code = "b = -3"
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[6].output_repr == "3"

        run_reactive!(notebook, notebook.cells[7:8])
        @test notebook.cells[7].error_repr == nothing
        @test notebook.cells[8].output_repr == "5"

        notebook.cells[3].code = "b = 3"
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[8].output_repr == "11"

        WorkspaceManager.unmake_workspace(notebook)
        
    end

    @testset "Immutable globals" begin
    # We currently have a slightly relaxed version of immutable globals:
    # globals can only be mutated/assigned _in a single cell_.
        notebook = Notebook([
        Cell("x = 1"),
        Cell("x = 2"),
        Cell("y = -3; y = 3"),
        Cell("z = 4"),
        Cell("let global z = 5 end"),
        Cell("w"),
        Cell("function f(x) global w = x end"),
        Cell("f(8)"),
        Cell("v"),
        Cell("function g(x) global v = x end; g(10)"),
        Cell("g(11)"),
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1])
        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[1].output_repr == nothing
        @test notebook.cells[2].output_repr == nothing
        @test occursin("Multiple definitions for x", notebook.cells[1].error_repr)
        @test occursin("Multiple definitions for x", notebook.cells[1].error_repr)
    
        notebook.cells[2].code = "x + 1"
        run_reactive!(notebook, notebook.cells[2])
        @test notebook.cells[1].output_repr == "1"
        @test notebook.cells[2].output_repr == "2"
    
        run_reactive!(notebook, notebook.cells[3])
        @test notebook.cells[3].output_repr == "3"

        run_reactive!(notebook, notebook.cells[4])
        run_reactive!(notebook, notebook.cells[5])
        @test occursin("Multiple definitions for z", notebook.cells[4].error_repr)
        @test occursin("Multiple definitions for z", notebook.cells[5].error_repr)
    
        run_reactive!(notebook, notebook.cells[6:7])
        @test occursin("UndefVarError", notebook.cells[6].error_repr)
        @test notebook.cells[7].error_repr == nothing
    
        run_reactive!(notebook, notebook.cells[8])
        @test occursin("UndefVarError", notebook.cells[6].error_repr)
        @test occursin("Multiple definitions for w", notebook.cells[7].error_repr)
        @test occursin("Multiple definitions for w", notebook.cells[8].error_repr)

        run_reactive!(notebook, notebook.cells[9:10])
        @test notebook.cells[9].output_repr == "10"
        @test notebook.cells[10].error_repr == nothing

        run_reactive!(notebook, notebook.cells[11])
        @test occursin("UndefVarError", notebook.cells[9].error_repr)
        @test occursin("Multiple definitions for v", notebook.cells[10].error_repr)
        @test occursin("Multiple definitions for v", notebook.cells[11].error_repr)

        WorkspaceManager.unmake_workspace(notebook)
    end

    @testset "Run all" begin
        notebook = Notebook([
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

        Cell("join(x, '-')"),

        Cell("φ(16)"),
        Cell("φ(χ) = χ + υ"),
        Cell("υ = 18"),

        Cell("f(19)"),
        Cell("f(x) = x + g(x)"),
        Cell("g(x) = x + y"),
        Cell("y = 22"),
    ])
        fakeclient.connected_notebook = notebook

        run_reactive!(notebook, notebook.cells[1])

        @testset "Basic" begin
            run_reactive!(notebook, notebook.cells[2:5])

            run_reactive!(notebook, notebook.cells[15])
            @test notebook.cells[15].output_repr == "\"4-2-3-5\""
        end
        
        @testset "Errors" begin
            run_reactive!(notebook, notebook.cells[6:9])

            # should all err, no change to `x`
            run_reactive!(notebook, notebook.cells[15])
            @test notebook.cells[15].output_repr == "\"4-2-3-5\""
        end

        @testset "Maintain order when possible" begin
            run_reactive!(notebook, notebook.cells[10:14])

            run_reactive!(notebook, notebook.cells[15])
            @test notebook.cells[15].output_repr == "\"4-2-3-5-10-11-12-13-14\""
        end
        

        run_reactive!(notebook, notebook.cells[16:18])
        @test notebook.cells[16].error_repr == nothing
        @test notebook.cells[16].output_repr == "34"
        @test notebook.cells[17].error_repr == nothing
        @test notebook.cells[18].error_repr == nothing

        notebook.cells[18].code = "υ = 8"
        run_reactive!(notebook, notebook.cells[18])
        @test notebook.cells[16].output_repr == "24"
        
        run_reactive!(notebook, notebook.cells[19:22])
        @test notebook.cells[19].error_repr == nothing
        @test notebook.cells[19].output_repr == "60"
        @test notebook.cells[20].error_repr == nothing
        @test notebook.cells[21].error_repr == nothing
        @test notebook.cells[22].error_repr == nothing

        notebook.cells[22].code = "y = 0"
        run_reactive!(notebook, notebook.cells[22])
        @test notebook.cells[19].output_repr == "38"

        WorkspaceManager.unmake_workspace(notebook)
    end
end

WorkspaceManager.reset_default_workspace_method()
