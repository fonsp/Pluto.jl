using Test
import Pluto: Notebook, ServerSession, ClientSession, run_reactive!, Cell, WorkspaceManager
import Distributed

@testset "Pluto runner" begin
    🍭 = ServerSession()
    client = ClientSession(:fake, nothing)
    🍭.connected_clients[client.id] = client

    begin
        escape_me = "16 \\ \" ' / \b \f \n \r \t 💩 \$"
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
            Cell("error(" * sprint(Base.print_quoted, escape_me) * ")"),

            Cell("function test(a)
            throw(InexactError(:test, a, a))
        end"),
            Cell("test([[0]])"),
            Cell("sqrt(-1)"),
            Cell("x = 1"),
        ])
        client.connected_notebook = notebook

        @testset "Strange code"  begin
            run_reactive!(🍭, notebook, notebook.cells[1])
            run_reactive!(🍭, notebook, notebook.cells[2])
            @test notebook.cells[1].errored == true
            @test notebook.cells[2].errored == true

        end
        @testset "Mutliple expressions & semicolon"  begin

            run_reactive!(🍭, notebook, notebook.cells[3:end])
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
            @test_nowarn run_reactive!(🍭, notebook, notebook.cells[12:16])

            @test occursinerror("DomainError", notebook.cells[12])
            let
                st = Pluto.JSON.parse(notebook.cells[12].output_repr)
                @test length(st["stacktrace"]) == 4 # check in REPL
                if Pluto.can_insert_filename
                    @test st["stacktrace"][4]["line"] == 1
                    @test occursin(notebook.cells[12].cell_id |> string, st["stacktrace"][4]["file"])
                    @test occursin(notebook.path |> basename, st["stacktrace"][4]["file"])
                else
                    @test_broken false
                end
            end

            @test occursinerror("DomainError", notebook.cells[13])
            let
                st = Pluto.JSON.parse(notebook.cells[13].output_repr)
                @test length(st["stacktrace"]) == 4
                if Pluto.can_insert_filename
                    @test st["stacktrace"][4]["line"] == 3
                    @test occursin(notebook.cells[13].cell_id |> string, st["stacktrace"][4]["file"])
                    @test occursin(notebook.path |> basename, st["stacktrace"][4]["file"])
                else
                    @test_broken false
                end
            end

            @test occursinerror("DomainError", notebook.cells[15])
            let
                st = Pluto.JSON.parse(notebook.cells[15].output_repr)
                @test length(st["stacktrace"]) == 5

                if Pluto.can_insert_filename
                    @test st["stacktrace"][4]["line"] == 3
                    @test occursin(notebook.cells[14].cell_id |> string, st["stacktrace"][4]["file"])
                    @test occursin(notebook.path |> basename, st["stacktrace"][4]["file"])

                    @test st["stacktrace"][5]["line"] == 1
                    @test occursin(notebook.cells[15].cell_id |> string, st["stacktrace"][5]["file"])
                    @test occursin(notebook.path |> basename, st["stacktrace"][5]["file"])
                else
                    @test_broken false
                end
            end

            let
                st = Pluto.JSON.parse(notebook.cells[16].output_repr)
                @test occursin(escape_me, st["msg"])
            end

        end
        WorkspaceManager.unmake_workspace(notebook)
    end
end
