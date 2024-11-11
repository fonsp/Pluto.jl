using Test
import UUIDs
import Pluto: PlutoRunner, Notebook, WorkspaceManager, Cell, ServerSession, ClientSession, update_run!
using Pluto.WorkspaceManager: poll

@testset "Logging" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = true

    notebook = Notebook(Cell.([
        "println(123)",
        "println(stdout, 123)",
        "println(stderr, 123)",
        "display(123)",
        "show(123)",
        "popdisplay()",
        "println(123)",
        "pushdisplay(TextDisplay(devnull))",
        "print(12); print(3)", # 9
        
        """
        for i in 1:10
            @info "logging" i maxlog=2
        end
        """, # 10
        
        """
        for i in 1:10
            @info "logging" i maxlog=2
            @info "logging more" maxlog = 4
            @info "even more logging"
        end
        """, # 11
        
        "t1 = @async sleep(3)", # 12
        "!istaskfailed(t1) && !istaskdone(t1)", # 13
        "t2 = @async run(`sleep 3`)", # 14
        "!istaskfailed(t2) && !istaskdone(t2)", # 15
        
        """
        macro hello()
            a = rand()
            @info a
            nothing
        end
        """, # 16
        
        "@hello", # 17
        
        "123", # 18
        

        "struct StructWithCustomShowThatLogs end", # 19
        """ # 20
        function Base.show(io::IO, ::StructWithCustomShowThatLogs)
            println("stdio log")
            @info "showing StructWithCustomShowThatLogs"
            show(io, "hello")
        end
        """,
        "StructWithCustomShowThatLogs()", # 21
        """
        printstyled(stdout, "hello", color=:red)
        """, # 22
        "show(collect(1:500))", # 23
        "show(stdout, collect(1:500))", # 24
        "show(stdout, \"text/plain\", collect(1:500))", # 25
        "display(collect(1:500))", # 26

        "struct StructThatErrorsOnPrinting end", # 27
        """
        Base.print(::IO, ::StructThatErrorsOnPrinting) = error("Can't print this")
        """, # 28
        """
        @info "" _id=StructThatErrorsOnPrinting()
        """, # 29
    ]))

    @testset "Stdout" begin
        
        idx_123 = [1,2,3,4,5,7,9]

        update_run!(🍭, notebook, notebook.cells[1:9])
        @test notebook.cells[1] |> noerror
        @test notebook.cells[2] |> noerror
        @test notebook.cells[3] |> noerror
        @test notebook.cells[4] |> noerror
        @test notebook.cells[5] |> noerror
        @test notebook.cells[6] |> noerror
        @test notebook.cells[7] |> noerror
        @test notebook.cells[8] |> noerror
        @test notebook.cells[9] |> noerror

        @test poll(5, 1/60) do
            all(notebook.cells[idx_123]) do c
                length(c.logs) == 1
            end
        end
        
        @testset "123 - $(i)" for i in idx_123
            log = only(notebook.cells[i].logs)
            @test log["level"] == "LogLevel(-555)"
            @test strip(log["msg"][1]) == "123"
            @test log["msg"][2] == MIME"text/plain"()
        end
        
        update_run!(🍭, notebook, notebook.cells[12:15])
        update_run!(🍭, notebook, notebook.cells[[12,14]])
        @test notebook.cells[13].output.body == "true"
        Sys.iswindows() || @test notebook.cells[15].output.body == "true"
        
        update_run!(🍭, notebook, notebook.cells[16:18])
        
        @test isempty(notebook.cells[16].logs)
        @test length(notebook.cells[17].logs) == 1
        @test isempty(notebook.cells[18].logs)
        
        update_run!(🍭, notebook, notebook.cells[18])
        update_run!(🍭, notebook, notebook.cells[17])
        
        @test isempty(notebook.cells[16].logs)
        @test length(notebook.cells[17].logs) == 1
        @test isempty(notebook.cells[18].logs)
        
        update_run!(🍭, notebook, notebook.cells[16])
        
        @test isempty(notebook.cells[16].logs)
        @test length(notebook.cells[17].logs) == 1
        @test isempty(notebook.cells[18].logs)

        update_run!(🍭, notebook, notebook.cells[19:21])

        @test isempty(notebook.cells[19].logs)
        @test isempty(notebook.cells[20].logs)

        @test poll(5, 1/60) do
            length(notebook.cells[21].logs) == 2
        end
    end

    @testset "ANSI Color Output" begin
        update_run!(🍭, notebook, notebook.cells[22])
        msg = only(notebook.cells[22].logs)["msg"][1]

        @test startswith(msg, Base.text_colors[:red])
        @test endswith(msg, Base.text_colors[:default])
    end
    
    @testset "show(...) and display(...) behavior" begin
        update_run!(🍭, notebook, notebook.cells[23:25])

        msgs_show = [only(cell.logs)["msg"][1] for cell in notebook.cells[23:25]]

        # `show` should show a middle element of the big array
        for msg in msgs_show
            @test contains(msg, "1") && contains(msg, "500")
            @test contains(msg, "250")
        end

        update_run!(🍭, notebook, notebook.cells[26])
        msg_display = only(notebook.cells[26].logs)["msg"][1]

        # `display` should not display the middle element of the big array
        @test contains(msg_display, "1") && contains(msg_display, "500")
        @test !contains(msg_display, "250")
    end

    @testset "Logging respects maxlog" begin
        @testset "Single log" begin
            
            update_run!(🍭, notebook, notebook.cells[10])
            @test notebook.cells[10] |> noerror

            @test poll(5, 1/60) do
                length(notebook.cells[10].logs) == 2
            end

            # Check that maxlog doesn't occur in the message
            @test all(notebook.cells[10].logs) do log
                all(log["kwargs"]) do kwarg
                    kwarg[1] != "maxlog"
                end
            end

        end

        @testset "Multiple log" begin
            update_run!(🍭, notebook, notebook.cells[11])
            @test notebook.cells[11] |> noerror

            # Wait until all 16 logs are in
            @test poll(5, 1/60) do
                length(notebook.cells[11].logs) == 16
            end

            # Get the ids of the three logs and their counts. We are
            # assuming that the logs are ordered same as in the loop.
            ids = unique(getindex.(notebook.cells[11].logs, "id"))
            counts = [count(log -> log["id"] == id, notebook.cells[11].logs) for id in ids]
            @test counts == [2, 4, 10]

            # Check that maxlog doesn't occur in the messages
            @test all(notebook.cells[11].logs) do log
                all(log["kwargs"]) do kwarg
                    kwarg[1] != "maxlog"
                end
            end
        end
    end

    cleanup(🍭, notebook)

    @testset "Logging error fallback" begin
        # This testset needs to use a local worker to capture the worker stderr (which is
        # different from the notebook stderr)
        🍍 = ServerSession()
        🍍.options.evaluation.workspace_use_distributed = false

        io = IOBuffer()
        old_stderr = PlutoRunner.original_stderr[]
        PlutoRunner.original_stderr[] = io
        
        update_run!(🍍, notebook, notebook.cells[27:29])
        
        msg = String(take!(io))
        close(io)
        PlutoRunner.original_stderr[] = old_stderr

        @test notebook.cells[27] |> noerror
        @test notebook.cells[28] |> noerror
        @test notebook.cells[29] |> noerror
        @test occursin("Failed to relay log from PlutoRunner", msg)

        cleanup(🍍, notebook)
    end
end
