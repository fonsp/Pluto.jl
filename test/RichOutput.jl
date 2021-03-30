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
                    end"""),
                    Cell("Set([17:20,\"Wonderful\"])"),
                    Cell("Set(0 : 0.1 : 20)"),
                ])
            fakeclient.connected_notebook = notebook

            update_run!(🍭, notebook, notebook.cells)

            @test notebook.cells[1].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[2].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[3].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[4].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[5].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[6].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[7].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[8].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[9].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[10].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[1].output.body isa Dict
            @test notebook.cells[2].output.body isa Dict
            @test notebook.cells[3].output.body isa Dict
            @test notebook.cells[4].output.body isa Dict
            @test notebook.cells[5].output.body isa Dict
            @test notebook.cells[6].output.body isa Dict
            @test notebook.cells[7].output.body isa Dict
            @test notebook.cells[8].output.body isa Dict
            @test notebook.cells[9].output.body isa Dict
            @test notebook.cells[10].output.body isa Dict

            @test notebook.cells[12].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[12].output.body isa Dict
            @test notebook.cells[14].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[14].output.body isa Dict

            @test notebook.cells[15].output.mime isa MIME"text/plain"
            
            @test notebook.cells[16].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test notebook.cells[16].output.body isa Dict
            @test occursin("circular", notebook.cells[16].output.body |> string)

            @test notebook.cells[17].output.body isa Dict
            @test length(notebook.cells[17].output.body[:elements]) == 2
            @test notebook.cells[17].output.body[:prefix] == "Set{Any}"
            @test notebook.cells[17].output.mime isa MIME"application/vnd.pluto.tree+object"
            @test occursin("Set", notebook.cells[17].output.body |> string)

            @test notebook.cells[18].output.body isa Dict
            @test length(notebook.cells[18].output.body[:elements]) < 200
            @test notebook.cells[18].output.body[:prefix] == "Set{Float64}"
            @test notebook.cells[18].output.mime isa MIME"application/vnd.pluto.tree+object"

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
            
            @test notebook.cells[1].output.mime isa MIME"image/png"
            @test notebook.cells[1].output.body == codeunits("1")
            @test notebook.cells[2].output.mime isa MIME"text/html"
            @test notebook.cells[2].output.body == "2"
            @test notebook.cells[3].output.mime isa MIME"text/plain"
            @test notebook.cells[3].output.body == "3"
            
            WorkspaceManager.unmake_workspace((🍭, notebook))
        end

        
        @testset "Special arrays" begin
            🍭.options.evaluation.workspace_use_distributed = true

            notebook = Notebook([
                Cell("using OffsetArrays"),
                Cell("OffsetArray(zeros(3), 20:22)"),
            ])
            fakeclient.connected_notebook = notebook

            update_run!(🍭, notebook, notebook.cells)
            
            @test notebook.cells[2].output.mime isa MIME"application/vnd.pluto.tree+object"
            s = string(notebook.cells[2].output.body)
            @test occursin("OffsetArray", s)
            @test occursin("21", s)
            if VERSION >= v"1.3"
                # once in the prefix, once as index
                @test count("22", s) >= 2
            end
            
            WorkspaceManager.unmake_workspace((🍭, notebook))
            🍭.options.evaluation.workspace_use_distributed = false
        end
    end

    
    @testset "Table viewer" begin
        🍭.options.evaluation.workspace_use_distributed = true
        notebook = Notebook([
                Cell("using DataFrames, Tables"),
                Cell("DataFrame()"),
                Cell("DataFrame(:a => [])"),
                Cell("DataFrame(:a => [1,2,3], :b => [999, 5, 6])"),
                Cell("DataFrame(rand(20,20), :auto)"),
                Cell("DataFrame(rand(2000,20), :auto)"),
                Cell("DataFrame(rand(20,2000), :auto)"),
                Cell("@view DataFrame(rand(100,3), :auto)[:, 2:2]"),
                Cell("@view DataFrame(rand(3,100), :auto)[2:2, :]"),
                Cell("DataFrame"),
                Cell("Tables.table(rand(11,11))"),
                Cell("Tables.table(rand(120,120))"),
            ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells)

        @test notebook.cells[2].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[3].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[4].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[5].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[6].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[7].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[8].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[9].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[11].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[12].output.mime isa MIME"application/vnd.pluto.table+object"
        @test notebook.cells[2].output.body isa Dict
        @test notebook.cells[3].output.body isa Dict
        @test notebook.cells[4].output.body isa Dict
        @test notebook.cells[5].output.body isa Dict
        @test notebook.cells[6].output.body isa Dict
        @test notebook.cells[7].output.body isa Dict
        @test notebook.cells[8].output.body isa Dict
        @test notebook.cells[9].output.body isa Dict
        @test notebook.cells[11].output.body isa Dict
        @test notebook.cells[12].output.body isa Dict

        @test notebook.cells[10].output.mime isa MIME"text/plain"
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
        🍭.options.evaluation.workspace_use_distributed = false
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
            @test notebook.cells[4].output.body == "4"
            @test notebook.cells[4].output.rootassignee == :c

            @test notebook.cells[5].errored == false
            @test notebook.cells[5].output.body == ""
            @test notebook.cells[5].output.rootassignee === nothing

            @test notebook.cells[6].errored == false
            @test notebook.cells[6].output.body == "6"
            @test notebook.cells[6].output.rootassignee === nothing

            @test notebook.cells[7].errored == false
            @test notebook.cells[7].output.body == ""
            @test notebook.cells[7].output.rootassignee === nothing

            @test notebook.cells[8].errored == false
            @test notebook.cells[8].output.body == ""

            @test notebook.cells[9].errored == false
            @test notebook.cells[9].output.body == ""

            @test occursinerror("syntax: extra token after", notebook.cells[10])

            @test occursinerror("syntax: extra token after", notebook.cells[11])
        end

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "Stack traces" begin
        escape_me = "16 \\ \" ' / \b \f \n \r \t 💩 \x10 \$"

        codes = [
            "sqrt(-1)",
            "let\n\nsqrt(-2)\nend",
            "\"Something very exciting!\"\nfunction w(x)\n\tsqrt(x)\nend",
            "w(-4)",
            "error(" * sprint(Base.print_quoted, escape_me) * ")",
        ]

        notebook1 = Notebook([
            Cell(code)
            for (i, code) in enumerate(codes)
        ])
            
        # create struct to disable the function-generating optimization
        notebook2 = Notebook([
            Cell("struct S$(i) end; $code")
            for (i, code) in enumerate(codes)
        ])

        @testset "$(wrapped ? "With" : "Without") function wrapping" for wrapped in [false, true]
            notebook = wrapped ? notebook1 : notebook2
            
            fakeclient.connected_notebook = notebook

            @test_nowarn update_run!(🍭, notebook, notebook.cells[1:5])

            @test occursinerror("DomainError", notebook.cells[1])
            let
                st = notebook.cells[1].output.body
                @test length(st[:stacktrace]) == 4 # check in REPL
                if Pluto.can_insert_filename
                    @test st[:stacktrace][4][:line] == 1
                    @test occursin(notebook.cells[1].cell_id |> string, st[:stacktrace][4][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][4][:file])
                else
                    @test_broken false
                end
            end

            @test occursinerror("DomainError", notebook.cells[2])
            let
                st = notebook.cells[2].output.body
                @test length(st[:stacktrace]) == 4
                if Pluto.can_insert_filename
                    @test st[:stacktrace][4][:line] == 3
                    @test occursin(notebook.cells[2].cell_id |> string, st[:stacktrace][4][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][4][:file])
                else
                    @test_broken false
                end
            end

            @test occursinerror("DomainError", notebook.cells[4])
            let
                st = notebook.cells[4].output.body
                @test length(st[:stacktrace]) == 5

                if Pluto.can_insert_filename
                    @test st[:stacktrace][4][:line] == 3
                    @test occursin(notebook.cells[3].cell_id |> string, st[:stacktrace][4][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][4][:file])

                    @test st[:stacktrace][5][:line] == 1
                    @test occursin(notebook.cells[4].cell_id |> string, st[:stacktrace][5][:file])
                    @test occursin(notebook.path |> basename, st[:stacktrace][5][:file])
                else
                    @test_broken false
                end
            end

            let
                st = notebook.cells[5].output.body
                @test occursin(escape_me, st[:msg])
            end

            WorkspaceManager.unmake_workspace((🍭, notebook))
        end

    end

end
