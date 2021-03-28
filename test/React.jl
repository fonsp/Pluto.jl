using Test
import Pluto: Configuration, Notebook, ServerSession, ClientSession, update_run!, Cell, WorkspaceManager
import Pluto.Configuration: Options, EvaluationOptions
import Distributed

@testset "Reactivity" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient

    @testset "Basic $(parallel ? "distributed" : "single-process")" for parallel in [false, true]
        🍭.options.evaluation.workspace_use_distributed = parallel
        
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

            Cell("import Distributed"),
            Cell("Distributed.myid()"),
        ])
        fakeclient.connected_notebook = notebook

        @test !haskey(WorkspaceManager.workspaces, notebook.notebook_id)

        update_run!(🍭, notebook, notebook.cells[1:2])
        @test notebook.cells[1].output.body == notebook.cells[2].output.body
        @test notebook.cells[1].output.rootassignee == :x
        @test notebook.cells[1].runtime !== nothing
        setcode(notebook.cells[1], "x = 12")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].output.body == notebook.cells[2].output.body
        @test notebook.cells[2].runtime !== nothing

        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false
        @test notebook.cells[3].output.rootassignee === nothing
    
        update_run!(🍭, notebook, notebook.cells[4])
        @test notebook.cells[4].output.body == "16"
        @test notebook.cells[4].errored == false
        @test notebook.cells[4].output.rootassignee === nothing

        setcode(notebook.cells[1], "x = 912")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[4].output.body == "916"

        setcode(notebook.cells[3], "f(x) = x")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[4].output.body == "4"

        setcode(notebook.cells[1], "x = 1")
        setcode(notebook.cells[2], "y = 2")
        update_run!(🍭, notebook, notebook.cells[1:2])
        update_run!(🍭, notebook, notebook.cells[5:6])
        @test notebook.cells[5].errored == false
        @test notebook.cells[6].output.body == "3"

        setcode(notebook.cells[2], "y = 1")
        update_run!(🍭, notebook, notebook.cells[2])
        @test notebook.cells[6].output.body == "2"

        setcode(notebook.cells[1], "x = 2")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[6].output.body == "3"

        update_run!(🍭, notebook, notebook.cells[7:8])
        @test if parallel
            notebook.cells[8].output.body != string(Distributed.myid())
        else
            notebook.cells[8].output.body == string(Distributed.myid())
        end

        WorkspaceManager.unmake_workspace((🍭, notebook))
    
    end

    🍭.options.evaluation.workspace_use_distributed = false

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
    

        update_run!(🍭, notebook, notebook.cells[1])
        update_run!(🍭, notebook, notebook.cells[2])
        @test occursinerror("Multiple", notebook.cells[1])
        @test occursinerror("Multiple", notebook.cells[2])
    
        setcode(notebook.cells[1], "")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false
    
    # https://github.com/fonsp/Pluto.jl/issues/26
        setcode(notebook.cells[1], "x = 1")
        update_run!(🍭, notebook, notebook.cells[1])
        setcode(notebook.cells[2], "x")
        update_run!(🍭, notebook, notebook.cells[2])
        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false

        update_run!(🍭, notebook, notebook.cells[3])
        update_run!(🍭, notebook, notebook.cells[4])
        @test occursinerror("Multiple", notebook.cells[3])
        @test occursinerror("Multiple", notebook.cells[4])
    
        setcode(notebook.cells[3], "")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false
    
        update_run!(🍭, notebook, notebook.cells[5])
        update_run!(🍭, notebook, notebook.cells[6])
        @test occursinerror("Multiple", notebook.cells[5])
        @test occursinerror("Multiple", notebook.cells[6])
    
        setcode(notebook.cells[5], "")
        update_run!(🍭, notebook, notebook.cells[5])
        @test notebook.cells[5].errored == false
        @test notebook.cells[6].errored == false

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "Mutliple assignments topology" begin
        notebook = Notebook([
            Cell("x = 1"),
            Cell("z = 4 + y"),
            Cell("y = x + 2"),
            Cell("y = x + 3"),
        ])
        notebook.topology = Pluto.updated_topology(notebook.topology, notebook, notebook.cells)

        let topo_order = Pluto.topological_order(notebook, notebook.topology, notebook.cells[[1]])
            @test indexin(topo_order.runnable, notebook.cells) == [1,2]
            @test topo_order.errable |> keys == notebook.cells[[3,4]] |> Set
        end
        let topo_order = Pluto.topological_order(notebook, notebook.topology, notebook.cells[[1]], allow_multiple_defs=true)
            @test indexin(topo_order.runnable, notebook.cells) == [1,3,4,2] # x first, y second and third, z last
            # this also tests whether multiple defs run in page order
            @test topo_order.errable == Dict()
        end
    end

    @testset "Pkg topology workarounds" begin
        notebook = Notebook([
            Cell("1 + 1"),
            Cell("json([1,2])"),
            Cell("using JSON"),
            Cell("""Pkg.add("JSON")"""),
            Cell("Pkg.activate(mktempdir())"),
            Cell("import Pkg"),
            Cell("using Revise"),
            Cell("1 + 1"),
        ])
        notebook.topology = Pluto.updated_topology(notebook.topology, notebook, notebook.cells)

        topo_order = Pluto.topological_order(notebook, notebook.topology, notebook.cells)
        @test indexin(topo_order.runnable, notebook.cells) == [6, 5, 4, 7, 3, 1, 2, 8]
        # 6, 5, 4, 3 should run first (this is implemented using `cell_precedence_heuristic`), in that order
        # 1, 2, 7 remain, and should run in notebook order.

        # if the cells were placed in reverse order...
        reverse!(notebook.cell_order)
        topo_order = Pluto.topological_order(notebook, notebook.topology, notebook.cells)
        @test indexin(topo_order.runnable, reverse(notebook.cells)) == [6, 5, 4, 7, 3, 8, 2, 1]
        # 6, 5, 4, 3 should run first (this is implemented using `cell_precedence_heuristic`), in that order
        # 1, 2, 7 remain, and should run in notebook order, which is 7, 2, 1.

        reverse!(notebook.cell_order)
    end

    @testset "Pkg topology workarounds -- hard" begin
        notebook = Notebook([
            Cell("json([1,2])"),
            Cell("using JSON"),
            Cell("Pkg.add(package_name)"),
            Cell(""" package_name = "JSON" """),
            Cell("Pkg.activate(envdir)"),
            Cell("envdir = mktempdir()"),
            Cell("import Pkg"),
            Cell("using JSON3, Revise"),
        ])

        notebook.topology = Pluto.updated_topology(notebook.topology, notebook, notebook.cells)

        topo_order = Pluto.topological_order(notebook, notebook.topology, notebook.cells)

        comesbefore(A, first, second) = findfirst(isequal(first),A) < findfirst(isequal(second), A)

        run_order = indexin(topo_order.runnable, notebook.cells)

        # like in the previous test
        @test comesbefore(run_order, 7, 5)
        @test_broken comesbefore(run_order, 5, 3)
        @test_broken comesbefore(run_order, 3, 2)
        @test comesbefore(run_order, 2, 1)
        @test comesbefore(run_order, 8, 2)
        @test comesbefore(run_order, 8, 1)

        # the variable dependencies
        @test comesbefore(run_order, 6, 5)
        @test comesbefore(run_order, 4, 3)
    end

    
    @testset "Multiple methods across cells" begin
        notebook = Notebook([
            Cell("a(x) = 1"),
            Cell("a(x,y) = 2"),
            Cell("a(3)"),
            Cell("a(4,4)"),

            Cell("b = 5"),
            Cell("b(x) = 6"),
            Cell("b + 7"),
            Cell("b(8)"),

            Cell("Base.tan(x::String) = 9"),
            Cell("Base.tan(x::Missing) = 10"),
            Cell("Base.tan(\"eleven\")"),
            Cell("Base.tan(missing)"),
            Cell("tan(missing)"),

            Cell("d(x::Integer) = 14"),
            Cell("d(x::String) = 15"),
            Cell("d(16)"),
            Cell("d(\"seventeen\")"),
            Cell("d"),

            Cell("struct asdf; x; y; end"),
            Cell(""),
            Cell("asdf(21, 21)"),
            Cell("asdf(22)"),

            Cell("@enum e1 e2 e3"),
            Cell("@enum e4 e5=24"),
            Cell("Base.@enum e6 e7=25 e8"),
            Cell("Base.@enum e9 e10=26 e11"),
            Cell("""@enum e12 begin
                    e13=27
                    e14
                end"""),
        ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells[1:4])
        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false
        @test notebook.cells[3].output.body == "1"
        @test notebook.cells[4].output.body == "2"

        setcode(notebook.cells[1], "a(x,x) = 999")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].errored == true
        @test notebook.cells[2].errored == true
        @test notebook.cells[3].errored == true
        @test notebook.cells[4].errored == true
        
        setcode(notebook.cells[1], "a(x) = 1")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false
        @test notebook.cells[3].output.body == "1"
        @test notebook.cells[4].output.body == "2"

        setcode(notebook.cells[1], "")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false
        @test notebook.cells[3].errored == true
        @test notebook.cells[4].output.body == "2"

        update_run!(🍭, notebook, notebook.cells[5:8])
        @test notebook.cells[5].errored == true
        @test notebook.cells[6].errored == true
        @test notebook.cells[7].errored == true
        @test notebook.cells[8].errored == true

        setcode(notebook.cells[5], "")
        update_run!(🍭, notebook, notebook.cells[5])
        @test notebook.cells[5].errored == false
        @test notebook.cells[6].errored == false
        @test notebook.cells[7].errored == true
        @test notebook.cells[8].output.body == "6"

        setcode(notebook.cells[5], "b = 5")
        setcode(notebook.cells[6], "")
        update_run!(🍭, notebook, notebook.cells[5:6])
        @test notebook.cells[5].errored == false
        @test notebook.cells[6].errored == false
        @test notebook.cells[7].output.body == "12"
        @test notebook.cells[8].errored == true

        update_run!(🍭, notebook, notebook.cells[11:13])
        @test notebook.cells[12].output.body == "missing"

        update_run!(🍭, notebook, notebook.cells[9:10])
        @test notebook.cells[9].errored == false
        @test notebook.cells[10].errored == false
        @test notebook.cells[11].output.body == "9"
        @test notebook.cells[12].output.body == "10"
        @test_broken notebook.cells[13].output.body == "10"
        update_run!(🍭, notebook, notebook.cells[13])
        @test notebook.cells[13].output.body == "10"

        setcode(notebook.cells[9], "")
        update_run!(🍭, notebook, notebook.cells[9])
        @test notebook.cells[11].errored == true
        @test notebook.cells[12].output.body == "10"

        setcode(notebook.cells[10], "")
        update_run!(🍭, notebook, notebook.cells[10])
        @test notebook.cells[11].errored == true
        @test notebook.cells[12].output.body == "missing"

        # Cell("d(x::Integer) = 14"),
        # Cell("d(x::String) = 15"),
        # Cell("d(16)"),
        # Cell("d(\"seventeen\")"),
        # Cell("d"),

        update_run!(🍭, notebook, notebook.cells[16:18])
        @test notebook.cells[16].errored == true
        @test notebook.cells[17].errored == true
        @test notebook.cells[18].errored == true

        update_run!(🍭, notebook, notebook.cells[14])
        @test notebook.cells[16].errored == false
        @test notebook.cells[17].errored == true
        @test notebook.cells[18].errored == false

        update_run!(🍭, notebook, notebook.cells[15])
        @test notebook.cells[16].errored == false
        @test notebook.cells[17].errored == false
        @test notebook.cells[18].errored == false

        setcode(notebook.cells[14], "")
        update_run!(🍭, notebook, notebook.cells[14])
        @test notebook.cells[16].errored == true
        @test notebook.cells[17].errored == false
        @test notebook.cells[18].errored == false

        setcode(notebook.cells[15], "")
        update_run!(🍭, notebook, notebook.cells[15])
        @test notebook.cells[16].errored == true
        @test notebook.cells[17].errored == true
        @test notebook.cells[18].errored == true
        @test occursinerror("UndefVarError", notebook.cells[18])

        # Cell("struct e; x; y; end"),
        # Cell(""),
        # Cell("e(21, 21)"),
        # Cell("e(22)"),

        update_run!(🍭, notebook, notebook.cells[19:22])
        @test notebook.cells[19].errored == false
        @test notebook.cells[21].errored == false
        @test notebook.cells[22].errored == true

        setcode(notebook.cells[20], "asdf(x) = asdf(x,x)")
        update_run!(🍭, notebook, notebook.cells[20])
        @test occursinerror("Multiple definitions", notebook.cells[19])
        @test occursinerror("Multiple definitions", notebook.cells[20])
        @test occursinerror("asdf", notebook.cells[20])
        @test occursinerror("asdf", notebook.cells[20])
        @test notebook.cells[21].errored == true
        @test notebook.cells[22].errored == true

        setcode(notebook.cells[20], "")
        update_run!(🍭, notebook, notebook.cells[20])
        @test notebook.cells[19].errored == false
        @test notebook.cells[20].errored == false
        @test notebook.cells[21].errored == false
        @test notebook.cells[22].errored == true

        setcode(notebook.cells[19], "begin struct asdf; x; y; end; asdf(x) = asdf(x,x); end")
        setcode(notebook.cells[20], "")
        update_run!(🍭, notebook, notebook.cells[19:20])
        @test notebook.cells[19].errored == false
        @test notebook.cells[20].errored == false
        @test notebook.cells[21].errored == false
        @test notebook.cells[22].errored == false

        update_run!(🍭, notebook, notebook.cells[23:27])
        @test notebook.cells[23].errored == false
        @test notebook.cells[24].errored == false
        @test notebook.cells[25].errored == false
        @test notebook.cells[26].errored == false
        @test notebook.cells[27].errored == false
        update_run!(🍭, notebook, notebook.cells[23:27])
        @test notebook.cells[23].errored == false
        @test notebook.cells[24].errored == false
        @test notebook.cells[25].errored == false
        @test notebook.cells[26].errored == false
        @test notebook.cells[27].errored == false

        setcode.(notebook.cells[23:27], [""])
        update_run!(🍭, notebook, notebook.cells[23:27])

        setcode(notebook.cells[23], "@assert !any(isdefined.([@__MODULE__], [Symbol(:e,i) for i in 1:14]))")
        update_run!(🍭, notebook, notebook.cells[23])
        @test notebook.cells[23].errored == false

        WorkspaceManager.unmake_workspace((🍭, notebook))

        # for some unsupported edge cases, see:
        # https://github.com/fonsp/Pluto.jl/issues/177#issuecomment-645039993
    end

    @testset "Cyclic" begin
        notebook = Notebook([
            Cell("xxx = yyy"),
            Cell("yyy = xxx"),
            Cell("zzz = yyy"),

            Cell("aaa() = bbb"),
            Cell("bbb = aaa()"),
        ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells[1:3])
        @test occursinerror("Cyclic reference", notebook.cells[1])
        @test occursinerror("xxx", notebook.cells[1])
        @test occursinerror("yyy", notebook.cells[1])
        @test occursinerror("Cyclic reference", notebook.cells[2])
        @test occursinerror("xxx", notebook.cells[2])
        @test occursinerror("yyy", notebook.cells[2])
        @test occursinerror("UndefVarError", notebook.cells[3])

        setcode(notebook.cells[1], "xxx = 1")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].output.body == "1"
        @test notebook.cells[2].output.body == "1"
        @test notebook.cells[3].output.body == "1"

        setcode(notebook.cells[1], "xxx = zzz")
        update_run!(🍭, notebook, notebook.cells[1])
        @test occursinerror("Cyclic reference", notebook.cells[1])
        @test occursinerror("Cyclic reference", notebook.cells[2])
        @test occursinerror("Cyclic reference", notebook.cells[3])
        @test occursinerror("xxx", notebook.cells[1])
        @test occursinerror("yyy", notebook.cells[1])
        @test occursinerror("zzz", notebook.cells[1])
        @test occursinerror("xxx", notebook.cells[2])
        @test occursinerror("yyy", notebook.cells[2])
        @test occursinerror("zzz", notebook.cells[2])
        @test occursinerror("xxx", notebook.cells[3])
        @test occursinerror("yyy", notebook.cells[3])
        @test occursinerror("zzz", notebook.cells[3])

        setcode(notebook.cells[3], "zzz = 3")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[1].output.body == "3"
        @test notebook.cells[2].output.body == "3"
        @test notebook.cells[3].output.body == "3"

        update_run!(🍭, notebook, notebook.cells[4:5])
        @test occursinerror("Cyclic reference", notebook.cells[4])
        @test occursinerror("aaa", notebook.cells[4])
        @test occursinerror("bbb", notebook.cells[4])
        @test occursinerror("Cyclic reference", notebook.cells[5])
        @test occursinerror("aaa", notebook.cells[5])
        @test occursinerror("bbb", notebook.cells[5])

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "Variable deletion" begin
        notebook = Notebook([
            Cell("x = 1"),
            Cell("y = x"),
            Cell("struct a; x end"),
            Cell("a")
        ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells[1:2])
        @test notebook.cells[1].output.body == notebook.cells[2].output.body
        
        setcode(notebook.cells[1], "")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].errored == false
        @test occursinerror("x not defined", notebook.cells[2])

        update_run!(🍭, notebook, notebook.cells[4])
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false
        setcode(notebook.cells[3], "struct a; x; y end")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false
        setcode(notebook.cells[3], "")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == true


        WorkspaceManager.unmake_workspace((🍭, notebook))
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

        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[1].output.body == "f" || startswith(notebook.cells[1].output.body, "f (generic function with ")
        @test notebook.cells[1].errored == false

        update_run!(🍭, notebook, notebook.cells[2:3])
        @test notebook.cells[2].errored == false
        @test notebook.cells[3].errored == false
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].errored == false

        update_run!(🍭, notebook, notebook.cells[4])
        @test notebook.cells[4].output.body == "2"

        setcode(notebook.cells[2], "k = 2")
        update_run!(🍭, notebook, notebook.cells[2])
        @test notebook.cells[4].output.body == "4"

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "Variable cannot reference its previous value" begin
        notebook = Notebook([
        Cell("x = 3")
    ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells[1])
        setcode(notebook.cells[1], "x = x + 1")
        update_run!(🍭, notebook, notebook.cells[1])
        @test occursinerror("UndefVarError", notebook.cells[1])

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    notebook = Notebook([
        Cell("y = 1"),
        Cell("f(x) = x + y"),
        Cell("f(3)"),

        Cell("g(a,b) = a+b"),
        Cell("g(5,6)"),

        Cell("h(x::Int) = x"),
        Cell("h(7)"),
        Cell("h(8.0)"),

        Cell("p(x) = 9"),
        Cell("p isa Function"),

        Cell("module Something
            export a
            a(x::String) = \"🐟\"
        end"),
        Cell("using .Something"),
        Cell("a(x::Int) = x"),
        Cell("a(\"i am a \")"),
        Cell("a(15)"),
        
        Cell("module Different
            export b
            b(x::String) = \"🐟\"
        end"),
        Cell("import .Different: b"),
        Cell("b(x::Int) = x"),
        Cell("b(\"i am a \")"),
        Cell("b(20)"),
        
        Cell("module Wow
            export c
            c(x::String) = \"🐟\"
        end"),
        Cell("begin
            import .Wow: c
            c(x::Int) = x
        end"),
        Cell("c(\"i am a \")"),
        Cell("c(24)"),

        Cell("Ref((25,:fish))"),
        Cell("begin
            import Base: show
            show(io::IO, x::Ref{Tuple{Int,Symbol}}) = write(io, \"🐟\")
        end"),

        Cell("Base.isodd(n::Integer) = \"🎈\""),
        Cell("Base.isodd(28)"),
        Cell("isodd(29)"),

        Cell("using Dates"),
        Cell("year(DateTime(31))"),
    ])
    fakeclient.connected_notebook = notebook

    @testset "Changing functions" begin

        update_run!(🍭, notebook, notebook.cells[2])
        @test notebook.cells[2].errored == false

        update_run!(🍭, notebook, notebook.cells[1])
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].output.body == "4"

        setcode(notebook.cells[1], "y = 2")
        update_run!(🍭, notebook, notebook.cells[1])
        @test notebook.cells[3].output.body == "5"
        @test notebook.cells[2].errored == false

        setcode(notebook.cells[1], "y")
        update_run!(🍭, notebook, notebook.cells[1])
        @test occursinerror("UndefVarError", notebook.cells[1])
        @test notebook.cells[2].errored == false
        @test occursinerror("UndefVarError", notebook.cells[3])

        update_run!(🍭, notebook, notebook.cells[4])
        update_run!(🍭, notebook, notebook.cells[5])
        @test notebook.cells[5].output.body == "11"

        setcode(notebook.cells[4], "g(a) = a+a")
        update_run!(🍭, notebook, notebook.cells[4])
        @test notebook.cells[4].errored == false
        @test notebook.cells[5].errored == true

        setcode(notebook.cells[5], "g(5)")
        update_run!(🍭, notebook, notebook.cells[5])
        @test notebook.cells[5].output.body == "10"

        update_run!(🍭, notebook, notebook.cells[6])
        update_run!(🍭, notebook, notebook.cells[7])
        update_run!(🍭, notebook, notebook.cells[8])
        @test notebook.cells[6].errored == false
        @test notebook.cells[7].errored == false
        @test notebook.cells[8].errored == true
    
        setcode(notebook.cells[6], "h(x::Float64) = 2.0 * x")
        update_run!(🍭, notebook, notebook.cells[6])
        @test notebook.cells[6].errored == false
        @test notebook.cells[7].errored == true
        @test notebook.cells[8].errored == false

        update_run!(🍭, notebook, notebook.cells[9:10])
        @test notebook.cells[9].errored == false
        @test notebook.cells[10].output.body == "true"

        setcode(notebook.cells[9], "p = p")
        update_run!(🍭, notebook, notebook.cells[9])
        @test occursinerror("UndefVarError", notebook.cells[9])

        setcode(notebook.cells[9], "p = 9")
        update_run!(🍭, notebook, notebook.cells[9])
        @test notebook.cells[9].errored == false
        @test notebook.cells[10].output.body == "false"
        
        setcode(notebook.cells[9], "p(x) = 9")
        update_run!(🍭, notebook, notebook.cells[9])
        @test notebook.cells[9].errored == false
        @test notebook.cells[10].output.body == "true"
    end

    @testset "Extending imported functions" begin
        update_run!(🍭, notebook, notebook.cells[11:15])
        @test_broken notebook.cells[11].errored == false
        @test_broken notebook.cells[12].errored == false # multiple definitions for `Something` should be okay? == false
        @test notebook.cells[13].errored == false
        @test notebook.cells[14].errored == true # the definition for a was created before `a` was used, so it hides the `a` from `Something`
        @test notebook.cells[15].output.body == "15"

        
        @test_nowarn update_run!(🍭, notebook, notebook.cells[13:15])
        @test notebook.cells[13].errored == false
        @test notebook.cells[14].errored == true # the definition for a was created before `a` was used, so it hides the `a` from `Something`
        @test notebook.cells[15].output.body == "15"

        @test_nowarn update_run!(🍭, notebook, notebook.cells[16:20])
        @test notebook.cells[16].errored == false
        @test occursinerror("Multiple", notebook.cells[17])
        @test occursinerror("Multiple", notebook.cells[18])
        @test occursinerror("UndefVarError", notebook.cells[19])
        @test occursinerror("UndefVarError", notebook.cells[20])

        @test_nowarn update_run!(🍭, notebook, notebook.cells[21:24])
        @test notebook.cells[21].errored == false
        @test notebook.cells[22].errored == false
        @test notebook.cells[23].errored == false
        @test notebook.cells[23].output.body == "\"🐟\""
        @test notebook.cells[24].output.body == "24"

        setcode(notebook.cells[22], "import .Wow: c")
        @test_nowarn update_run!(🍭, notebook, notebook.cells[22])
        @test notebook.cells[22].errored == false
        @test notebook.cells[23].output.body == "\"🐟\""
        @test notebook.cells[23].errored == false
        @test notebook.cells[24].errored == true # the extension should no longer exist

        # https://github.com/fonsp/Pluto.jl/issues/59
        original_repr = Pluto.PlutoRunner.format_output(Ref((25, :fish)))[1]
        @test_nowarn update_run!(🍭, notebook, notebook.cells[25])
        @test notebook.cells[25].output.body isa Dict
        @test_nowarn update_run!(🍭, notebook, notebook.cells[26])
        @test_broken notebook.cells[25].output.body == "🐟" # cell'🍭 don't automatically call `show` again when a new overload is defined - that'🍭 a minor issue
        @test_nowarn update_run!(🍭, notebook, notebook.cells[25])
        @test notebook.cells[25].output.body == "🐟"

        setcode(notebook.cells[26], "")
        @test_nowarn update_run!(🍭, notebook, notebook.cells[26])
        @test_nowarn update_run!(🍭, notebook, notebook.cells[25])
        @test notebook.cells[25].output.body isa Dict

        @test_nowarn update_run!(🍭, notebook, notebook.cells[28:29])
        @test notebook.cells[28].output.body == "false"
        @test notebook.cells[29].output.body == "true"
        @test_nowarn update_run!(🍭, notebook, notebook.cells[27])
        @test notebook.cells[28].output.body == "\"🎈\""
        @test_broken notebook.cells[29].output.body == "\"🎈\"" # adding the overload doesn't trigger automatic re-eval because `isodd` doesn't match `Base.isodd`
        @test_nowarn update_run!(🍭, notebook, notebook.cells[28:29])
        @test notebook.cells[28].output.body == "\"🎈\""
        @test notebook.cells[29].output.body == "\"🎈\""

        setcode(notebook.cells[27], "")
        update_run!(🍭, notebook, notebook.cells[27])
        @test notebook.cells[28].output.body == "false"
        @test_broken notebook.cells[29].output.body == "true" # removing the overload doesn't trigger automatic re-eval because `isodd` doesn't match `Base.isodd`
        update_run!(🍭, notebook, notebook.cells[28:29])
        @test notebook.cells[28].output.body == "false"
        @test notebook.cells[29].output.body == "true"
    end

    @testset "Using external libraries" begin
        update_run!(🍭, notebook, notebook.cells[30:31])
        @test notebook.cells[30].errored == false
        @test notebook.cells[31].output.body == "31"
        update_run!(🍭, notebook, notebook.cells[31])
        @test notebook.cells[31].output.body == "31"

        setcode(notebook.cells[30], "")
        update_run!(🍭, notebook, notebook.cells[30:31])
        @test occursinerror("UndefVarError", notebook.cells[31])
    end
    WorkspaceManager.unmake_workspace((🍭, notebook))

    @testset "Functional programming" begin
        notebook = Notebook([
            Cell("a = 1"),
            Cell("map(2:2) do val; (a = val; 2*val) end |> last"),

            Cell("b = 3"),
            Cell("g = f"),
            Cell("f(x) = x + b"),
            Cell("g(6)"),

            Cell("h = [x -> x + b][1]"),
            Cell("h(8)"),
        ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells[1:2])
        @test notebook.cells[1].output.body == "1"
        @test notebook.cells[2].output.body == "4"

        update_run!(🍭, notebook, notebook.cells[3:6])
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false
        @test notebook.cells[5].errored == false
        @test notebook.cells[6].errored == false
        @test notebook.cells[6].output.body == "9"

        setcode(notebook.cells[3], "b = -3")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[6].output.body == "3"

        update_run!(🍭, notebook, notebook.cells[7:8])
        @test notebook.cells[7].errored == false
        @test notebook.cells[8].output.body == "5"

        setcode(notebook.cells[3], "b = 3")
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[8].output.body == "11"

        WorkspaceManager.unmake_workspace((🍭, notebook))
        
    end

    @testset "Global assignments inside functions" begin
    # We currently have a slightly relaxed version of immutable globals:
    # globals can only be mutated/assigned _in a single cell_.
        notebook = Notebook([
            Cell("x = 1"),
            Cell("x = 2"),
            Cell("y = -3; y = 3"),
            Cell("z = 4"),
            Cell("let global z = 5 end"),
            Cell("wowow"),
            Cell("function floep(x) global wowow = x end"),
            Cell("floep(8)"),
            Cell("v"),
            Cell("function g(x) global v = x end; g(10)"),
            Cell("g(11)"),
            Cell("let
                    local r = 0
                    function f()
                        r = 12
                    end
                    f()
                    r
                end"),
            Cell("apple"),
            Cell("map(14:14) do i; global apple = orange; end"),
            Cell("orange = 15"),
        ])
        fakeclient.connected_notebook = notebook

        update_run!(🍭, notebook, notebook.cells[1])
        update_run!(🍭, notebook, notebook.cells[2])
        @test occursinerror("Multiple definitions for x", notebook.cells[1])
        @test occursinerror("Multiple definitions for x", notebook.cells[1])
    
        setcode(notebook.cells[2], "x + 1")
        update_run!(🍭, notebook, notebook.cells[2])
        @test notebook.cells[1].output.body == "1"
        @test notebook.cells[2].output.body == "2"
    
        update_run!(🍭, notebook, notebook.cells[3])
        @test notebook.cells[3].output.body == "3"

        update_run!(🍭, notebook, notebook.cells[4])
        update_run!(🍭, notebook, notebook.cells[5])
        @test occursinerror("Multiple definitions for z", notebook.cells[4])
        @test occursinerror("Multiple definitions for z", notebook.cells[5])
    
        update_run!(🍭, notebook, notebook.cells[6:7])
        @test occursinerror("UndefVarError", notebook.cells[6])

        # @test_broken occursinerror("assigns to global", notebook.cells[7])
        # @test_broken occursinerror("wowow", notebook.cells[7])
        # @test_broken occursinerror("floep", notebook.cells[7])
    
        update_run!(🍭, notebook, notebook.cells[8])
        @test_broken !occursinerror("UndefVarError", notebook.cells[6])

        update_run!(🍭, notebook, notebook.cells[9:10])
        @test !occursinerror("UndefVarError", notebook.cells[9])
        @test notebook.cells[10].errored == false

        update_run!(🍭, notebook, notebook.cells[11])
        @test_broken notebook.cells[9].errored == true
        @test_broken notebook.cells[10].errored == true
        @test_broken notebook.cells[11].errored == true

        update_run!(🍭, notebook, notebook.cells[12])
        @test notebook.cells[12].output.body == "12"

        update_run!(🍭, notebook, notebook.cells[13:15])
        @test notebook.cells[13].output.body == "15"
        @test notebook.cells[14].errored == false

        setcode(notebook.cells[15], "orange = 10005")
        update_run!(🍭, notebook, notebook.cells[15])
        @test notebook.cells[13].output.body == "10005"

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "No top level return" begin
        notebook = Notebook([
            Cell("return 10"),
            Cell("return (0, 0)"),
            Cell("return (0, 0)"),
            Cell("return (0, 0, 0)"),
            Cell("begin return \"a string\" end"),
            Cell("""
                let
                    return []
                end
            """),
            Cell("""filter(1:3) do x
                return true
            end"""),

            # create struct to disable the function-generating optimization
            Cell("struct A1 end; return 10"),
            Cell("struct A2 end; return (0, 0)"),
            Cell("struct A3 end; return (0, 0)"),
            Cell("struct A4 end; return (0, 0, 0)"),
            Cell("struct A5 end; begin return \"a string\" end"),
            Cell("""
                struct A6 end; let
                    return []
                end
            """),
            Cell("""struct A7 end; filter(1:3) do x
                return true
            end"""),
        ])

        update_run!(🍭, notebook, notebook.cells)
        @test occursinerror("You can only use return inside a function.", notebook.cells[1])
        @test occursinerror("You can only use return inside a function.", notebook.cells[2])
        @test occursinerror("You can only use return inside a function.", notebook.cells[3])
        @test occursinerror("You can only use return inside a function.", notebook.cells[4])
        @test occursinerror("You can only use return inside a function.", notebook.cells[5])
        @test occursinerror("You can only use return inside a function.", notebook.cells[6])
        @test notebook.cells[7].errored == false

        @test occursinerror("You can only use return inside a function.", notebook.cells[8])
        @test occursinerror("You can only use return inside a function.", notebook.cells[9])
        @test occursinerror("You can only use return inside a function.", notebook.cells[10])
        @test occursinerror("You can only use return inside a function.", notebook.cells[11])
        @test occursinerror("You can only use return inside a function.", notebook.cells[12])
        @test occursinerror("You can only use return inside a function.", notebook.cells[13])
        @test notebook.cells[14].errored == false

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    @testset "Function wrapping" begin
        notebook = Notebook([
            Cell("false && jlaksdfjalskdfj"),
            Cell("fonsi = 2"),
            Cell("""
            filter(1:fonsi) do x
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                false
            end |> length
            """),
            Cell("4"),
            Cell("[5]"),
            Cell("6 / 66"),
            Cell("false && (seven = 7)"),
            Cell("seven"),
            
            Cell("nine = :identity"),
            Cell("nine"),
            Cell("@__FILE__; nine"),
            Cell("@__FILE__; twelve = :identity"),
            Cell("@__FILE__; twelve"),
            Cell("twelve"),

            Cell("fifteen = :(1 + 1)"),
            Cell("fifteen"),
            Cell("@__FILE__; fifteen"),
            Cell("@__FILE__; eighteen = :(1 + 1)"),
            Cell("@__FILE__; eighteen"),
            Cell("eighteen"),
        ])

        update_run!(🍭, notebook, notebook.cells)
        @test notebook.cells[1].errored == false
        @test notebook.cells[1].output.body == "false"

        function benchmark(fonsi)
            filter(1:fonsi) do x
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                x = sum(1 for z in 1:x)
                false
            end |> length
        end

        bad = @elapsed benchmark(2)
        good = 0.01 * @elapsed for i in 1:100
            benchmark(2)
        end

        update_run!(🍭, notebook, notebook.cells)
        @test 0.1 * good < notebook.cells[3].runtime / 1.0e9 < 0.5 * bad

        old = notebook.cells[4].output.body
        setcode(notebook.cells[4], "4.0")
        update_run!(🍭, notebook, notebook.cells[4])
        @test old != notebook.cells[4].output.body
        
        old = notebook.cells[5].output.body
        setcode(notebook.cells[5], "[5.0]")
        update_run!(🍭, notebook, notebook.cells[5])
        @test old != notebook.cells[5].output.body

        old = notebook.cells[6].output.body
        setcode(notebook.cells[6], "66 / 6")
        update_run!(🍭, notebook, notebook.cells[6])
        @test old != notebook.cells[6].output.body

        @test notebook.cells[7].errored == false
        @test notebook.cells[7].output.body == "false"

        @test occursinerror("UndefVarError", notebook.cells[8])

        @test notebook.cells[9].output.body == ":identity"
        @test notebook.cells[10].output.body == ":identity"
        @test notebook.cells[11].output.body == ":identity"
        @test notebook.cells[12].output.body == ":identity"
        @test notebook.cells[13].output.body == ":identity"
        @test notebook.cells[14].output.body == ":identity"

        @test notebook.cells[15].output.body == ":(1 + 1)"
        @test notebook.cells[16].output.body == ":(1 + 1)"
        @test notebook.cells[17].output.body == ":(1 + 1)"
        @test notebook.cells[18].output.body == ":(1 + 1)"
        @test notebook.cells[19].output.body == ":(1 + 1)"
        @test notebook.cells[20].output.body == ":(1 + 1)"

        WorkspaceManager.unmake_workspace((🍭, notebook))


        @testset "Expression hash" begin
            same(a,b) = Pluto.PlutoRunner.expr_hash(a) == Pluto.PlutoRunner.expr_hash(b)

            @test same(:(1), :(1))
            @test !same(:(1), :(1.0))
            @test same(:(x + 1), :(x + 1))
            @test !same(:(x + 1), :(x + 1.0))
            @test same(:(1 |> a |> a |> a), :(1 |> a |> a |> a))
            @test same(:(a(b(1,2))), :(a(b(1,2))))
            @test !same(:(a(b(1,2))), :(a(b(1,3))))
            @test !same(:(a(b(1,2))), :(a(b(1,1))))
            @test !same(:(a(b(1,2))), :(a(b(2,1))))
        end
    end

    @testset "Run multiple" begin
        notebook = Notebook([
            Cell("x = []"),
            Cell("b = a + 2; push!(x,2)"),
            Cell("c = b + a; push!(x,3)"),
            Cell("a = 1; push!(x,4)"),
            Cell("a + b +c; push!(x,5)"),

            Cell("a = 1; push!(x,6)"),

            Cell("n = m; push!(x,7)"),
            Cell("m = n; push!(x,8)"),
            Cell("n = 1; push!(x,9)"),

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

        update_run!(🍭, notebook, notebook.cells[1])

        @testset "Basic" begin
            update_run!(🍭, notebook, notebook.cells[2:5])

            update_run!(🍭, notebook, notebook.cells[15])
            @test notebook.cells[15].output.body == "\"4-2-3-5\""
        end
        
        @testset "Errors" begin
            update_run!(🍭, notebook, notebook.cells[6:9])

            # should all err, no change to `x`
            update_run!(🍭, notebook, notebook.cells[15])
            @test notebook.cells[15].output.body == "\"4-2-3-5\""
        end

        @testset "Maintain order when possible" begin
            update_run!(🍭, notebook, notebook.cells[10:14])

            update_run!(🍭, notebook, notebook.cells[15])
            @test notebook.cells[15].output.body == "\"4-2-3-5-10-11-12-13-14\""

            update_run!(🍭, notebook, notebook.cells[1]) # resets `x`, only 10-14 should run, in order
            @test notebook.cells[15].output.body == "\"10-11-12-13-14\""
            update_run!(🍭, notebook, notebook.cells[15])
            @test notebook.cells[15].output.body == "\"10-11-12-13-14\""
        end
        

        update_run!(🍭, notebook, notebook.cells[16:18])
        @test notebook.cells[16].errored == false
        @test notebook.cells[16].output.body == "34"
        @test notebook.cells[17].errored == false
        @test notebook.cells[18].errored == false

        setcode(notebook.cells[18], "υ = 8")
        update_run!(🍭, notebook, notebook.cells[18])
        @test notebook.cells[16].output.body == "24"
        
        update_run!(🍭, notebook, notebook.cells[19:22])
        @test notebook.cells[19].errored == false
        @test notebook.cells[19].output.body == "60"
        @test notebook.cells[20].errored == false
        @test notebook.cells[21].errored == false
        @test notebook.cells[22].errored == false

        setcode(notebook.cells[22], "y = 0")
        update_run!(🍭, notebook, notebook.cells[22])
        @test notebook.cells[19].output.body == "38"

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end
end
