using Test
import Pluto
import Pluto: update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell


@testset "Rich output" begin

    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false
    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient
    
    @testset "Tree viewer" begin
        @testset "Basics" begin
            notebook = Notebook([
                    Cell("[1,1,[1]]"),
                    Cell("Dict(:a => [:b, :c])"),
                    Cell("[3, Dict()]"),
                    Cell("[4,[3, Dict()]]"),
                    Cell("[5, missing, 5]"),
                    Cell("[]"),
                    Cell("(7,7)"),
                    Cell("(a=8,b=[8])"),
                    Cell("Ref(9)"),
                    Cell("Vector(undef, 10)"),
                    Cell("struct Eleven x end"),
                    Cell("Eleven(12)"),

                    Cell("struct Amazing{T} x::T end"),
                    Cell("Amazing(14)"),

                    Cell("1:15"),

                    Cell("""begin
                        mutable struct A x; y end
                        a = A(16, 0)
                        a.y = [1, (2, A(3, (r=4, t=(5 => Dict(6 => Ref(a))))))]
                        a
                    end""")
                ])
            fakeclient.connected_notebook = notebook

            update_run!(🍭, notebook, notebook.cells)

            @test notebook.cells[1].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[2].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[3].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[4].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[5].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[6].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[7].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[8].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[9].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[10].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[1].output_repr isa Dict
            @test notebook.cells[2].output_repr isa Dict
            @test notebook.cells[3].output_repr isa Dict
            @test notebook.cells[4].output_repr isa Dict
            @test notebook.cells[5].output_repr isa Dict
            @test notebook.cells[6].output_repr isa Dict
            @test notebook.cells[7].output_repr isa Dict
            @test notebook.cells[8].output_repr isa Dict
            @test notebook.cells[9].output_repr isa Dict
            @test notebook.cells[10].output_repr isa Dict

            @test notebook.cells[12].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[12].output_repr isa Dict
            @test notebook.cells[14].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[14].output_repr isa Dict

            @test notebook.cells[15].repr_mime isa MIME"text/plain"
            
            @test notebook.cells[16].repr_mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[16].output_repr isa Dict
            @test occursin("circular", notebook.cells[16].output_repr |> string)

            WorkspaceManager.unmake_workspace((🍭, notebook))
        end

        @testset "Overloaded Base.show" begin

            notebook = Notebook([
                Cell("""begin
                    struct A x end
                    Base.show(io::IO, ::MIME"image/png", x::Vector{A}) = print(io, "1")
                    [A(1), A(1)]
                end"""),
                
                Cell("""begin
                    struct B x end
                    Base.show(io::IO, ::MIME"text/html", x::B) = print(io, "2")
                    B(2)
                end"""),

                Cell("""begin
                    struct C x end
                    Base.show(io::IO, ::MIME"text/plain", x::C) = print(io, "3")
                    C(3)
                end"""),
            ])
            fakeclient.connected_notebook = notebook

            update_run!(🍭, notebook, notebook.cells)
            
            @test notebook.cells[1].repr_mime isa MIME"image/png"
            @test notebook.cells[1].output_repr == codeunits("1")
            @test notebook.cells[2].repr_mime isa MIME"text/html"
            @test notebook.cells[2].output_repr == "2"
            @test notebook.cells[3].repr_mime isa MIME"text/plain"
            @test notebook.cells[3].output_repr == "3"
            
            WorkspaceManager.unmake_workspace((🍭, notebook))
        end

        @testset "Special arrays" begin

            notebook = Notebook([
                Cell("using OffsetArrays"),
                Cell("OffsetArray(zeros(3), 20:22)"),
            ])
            fakeclient.connected_notebook = notebook

            update_run!(🍭, notebook, notebook.cells)
            
            @test notebook.cells[2].repr_mime isa MIME"application/vnd.pluto.tree+object"
            s = string(notebook.cells[2].output_repr)
            @test occursin("OffsetArray", s)
            @test occursin("21", s)
            if VERSION >= v"1.3"
                # once in the prefix, once as index
                @test count("22", s) >= 2
            end
            
            WorkspaceManager.unmake_workspace((🍭, notebook))
        end
    end

    @testset "Table viewer" begin
        notebook = Notebook([
                Cell("using DataFrames, Tables"),
                Cell("DataFrame()"),
                Cell("DataFrame(:a => [])"),
                Cell("DataFrame(:a => [1,2,3], :b => [999, 5, 6])"),
                Cell("DataFrame(rand(20,20))"),
                Cell("DataFrame(rand(2000,20))"),
                Cell("DataFrame(rand(20,2000))"),
                Cell("@view DataFrame(rand(100,3))[:, 2:2]"),
                Cell("@view DataFrame(rand(3,100))[2:2, :]"),
                Cell("DataFrame"),
                Cell("Tables.table(rand(11,11))"),
                Cell("Tables.table(rand(120,120))"),
            ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells)

        @test notebook.cells[2].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[3].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[4].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[5].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[6].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[7].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[8].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[9].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[11].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[12].repr_mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[2].output_repr isa Dict
        @test notebook.cells[3].output_repr isa Dict
        @test notebook.cells[4].output_repr isa Dict
        @test notebook.cells[5].output_repr isa Dict
        @test notebook.cells[6].output_repr isa Dict
        @test notebook.cells[7].output_repr isa Dict
        @test notebook.cells[8].output_repr isa Dict
        @test notebook.cells[9].output_repr isa Dict
        @test notebook.cells[11].output_repr isa Dict
        @test notebook.cells[12].output_repr isa Dict

        @test notebook.cells[10].repr_mime isa MIME"text/plain"
        @test notebook.cells[10].errored == false
        
        # to see if we truncated correctly, we convert the output to string and check how big it is
        # because we don't want to test too specifically
        roughsize(x) = length(string(x))

        smallsize = roughsize(notebook.cells[5])
        manyrowssize = roughsize(notebook.cells[6])
        manycolssize = roughsize(notebook.cells[7])
        @test manyrowssize < 50 * smallsize
        @test manycolssize < 50 * smallsize

        # TODO: test lazy loading more rows/cols

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end
    
    begin
        escape_me = "16 \\ \" ' / \b \f \n \r \t 💩 \x10 \$"
        notebook = Notebook([
            Cell("a\\"),
            Cell("1 = 2"),
            
            Cell("b = 3.0\nb = 3"),
            Cell("\n# uhm\n\nc = 4\n\n# wowie \n\n"),
            Cell("d = 5;"),
            Cell("e = 6; f = 6"),
            Cell("g = 7; h = 7;"),
            Cell("\n\n0 + 8; 0 + 8;\n\n\n"),
            Cell("0 + 9; 9;\n\n\n"),
            Cell("0 + 10;\n10;"),
            Cell("0 + 11;\n11"),
            
            Cell("sqrt(-12)"),
            Cell("\n\nsqrt(-13)"),
            Cell("\"Something very exciting!\"\nfunction w(x)\n\tsqrt(x)\nend"),
            Cell("w(-15)"),
            Cell("error(" * sprint(Base.print_quoted, escape_me) * ")")
        ])
        fakeclient.connected_notebook = notebook

        @testset "Strange code"  begin
            update_run!(🍭, notebook, notebook.cells[1])
            update_run!(🍭, notebook, notebook.cells[2])
            @test notebook.cells[1].errored == true
            @test notebook.cells[2].errored == true

        end
        @testset "Mutliple expressions & semicolon"  begin

            update_run!(🍭, notebook, notebook.cells[3:end])
            @test occursinerror("syntax: extra token after", notebook.cells[3])

            @test notebook.cells[4].errored == false
            @test notebook.cells[4].output_repr == "4"
            @test notebook.cells[4].rootassignee == :c

            @test notebook.cells[5].errored == false
            @test notebook.cells[5].output_repr == ""
            @test notebook.cells[5].rootassignee === nothing

            @test notebook.cells[6].errored == false
            @test notebook.cells[6].output_repr == "6"
            @test notebook.cells[6].rootassignee === nothing

            @test notebook.cells[7].errored == false
            @test notebook.cells[7].output_repr == ""
            @test notebook.cells[7].rootassignee === nothing

            @test notebook.cells[8].errored == false
            @test notebook.cells[8].output_repr == ""

            @test notebook.cells[9].errored == false
            @test notebook.cells[9].output_repr == ""

            @test occursinerror("syntax: extra token after", notebook.cells[10])

            @test occursinerror("syntax: extra token after", notebook.cells[11])
        end

        @testset "Stack traces" begin
            @test_nowarn update_run!(🍭, notebook, notebook.cells[12:16])

            @test occursinerror("DomainError", notebook.cells[12])
            let
                st = notebook.cells[12].output_repr
                @test length(st[:stacktrace]) == 4 # check in REPL
                if Pluto.can_insert_filename
                    @test st[:stacktrace][4][:line] == 1
                    @test occursin(notebook.cells[12].cell_id |> string, st[:stacktrace][4][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][4][:file])
                else
                    @test_broken false
                end
            end

            @test occursinerror("DomainError", notebook.cells[13])
            let
                st = notebook.cells[13].output_repr
                @test length(st[:stacktrace]) == 4
                if Pluto.can_insert_filename
                    @test st[:stacktrace][4][:line] == 3
                    @test occursin(notebook.cells[13].cell_id |> string, st[:stacktrace][4][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][4][:file])
                else
                    @test_broken false
                end
            end

            @test occursinerror("DomainError", notebook.cells[15])
            let
                st = notebook.cells[15].output_repr
                @test length(st[:stacktrace]) == 5

                if Pluto.can_insert_filename
                    @test st[:stacktrace][4][:line] == 3
                    @test occursin(notebook.cells[14].cell_id |> string, st[:stacktrace][4][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][4][:file])

                    @test st[:stacktrace][5][:line] == 1
                    @test occursin(notebook.cells[15].cell_id |> string, st[:stacktrace][5][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][5][:file])
                else
                    @test_broken false
                end
            end

            let
                st = notebook.cells[16].output_repr
                @test occursin(escape_me, st[:msg])
            end

        end
        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

end
