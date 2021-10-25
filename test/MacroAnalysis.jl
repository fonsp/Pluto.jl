using Test
import UUIDs
import Pluto: PlutoRunner, Notebook, WorkspaceManager, Cell, ServerSession, ClientSession, update_run!

@testset "Macro analysis" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient

    @testset "Base macro call" begin
        notebook = Notebook([
            Cell("@enum Fruit 🍎 🍐"),
            Cell("my_fruit = 🍎"),
            Cell("jam(fruit::Fruit) = cook(fruit)"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test [:🍎, :🍐] ⊆ notebook.topology.nodes[cell(1)].definitions
        @test :Fruit ∈ notebook.topology.nodes[cell(1)].funcdefs_without_signatures
        @test Symbol("@enum") ∈ notebook.topology.nodes[cell(1)].references

        @test cell(2) |> noerror
        @test :🍎 ∈ notebook.topology.nodes[cell(2)].references

        @test cell(3) |> noerror
        @test :Fruit ∈ notebook.topology.nodes[cell(3)].references
    end

    @testset "User defined macro 1" begin
        notebook = Notebook([
            Cell("""macro my_assign(sym, val)
              :(\$(esc(sym)) = \$(val))
            end"""),
            Cell("@my_assign x 1+1"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test :x ∈ notebook.topology.nodes[cell(2)].definitions
        @test Symbol("@my_assign") ∈ notebook.topology.nodes[cell(2)].references

        update_run!(🍭, notebook, notebook.cells)

        # Works on second time because of old workspace
        @test :x ∈ notebook.topology.nodes[cell(2)].definitions
        @test Symbol("@my_assign") ∈ notebook.topology.nodes[cell(2)].references
    end
    
    @testset "User defined macro 2" begin
        notebook = Notebook([
            Cell("@my_identity(f(123))"),
            Cell(""),
            Cell(""),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)
        
        setcode(cell(2), """macro my_identity(expr)
            esc(expr)
        end""")
        update_run!(🍭, notebook, cell(2))
        
        setcode(cell(3), "f(x) = x")
        update_run!(🍭, notebook, cell(3))
        
        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
        @test cell(1).output.body == "123"
        
        update_run!(🍭, notebook, cell(1))
        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
    end

    @testset "User defined macro 3" begin
        notebook = Notebook([
            Cell("""
            macro mymap()
                quote
                    [1, 2, 3] .|> sqrt
                end
            end
            """),
            Cell("@mymap")
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror

        update_run!(🍭, notebook, cell(1))

        @test cell(2) |> noerror
    end

    @testset "User defined macro 4" begin
        notebook = Notebook([
            Cell("""macro my_assign(ex)
                esc(ex)
            end"""),
            Cell("@macroexpand @my_assign 1+1"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test Symbol("@my_assign") ∈ notebook.topology.nodes[cell(2)].references
    end

    @testset "User defined macro 5" begin
        notebook = Notebook([
            Cell("""macro dynamic_values(ex)
                [:a, :b, :c]
            end"""),
            Cell("myarray = @dynamic_values()"),
        ])
        references(idx) = notebook.topology.nodes[notebook.cells[idx]].references

        update_run!(🍭, notebook, notebook.cells)

        @test :a ∉ references(2)
        @test :b ∉ references(2)
        @test :c ∉ references(2)
    end

    @testset "User defined macro 6" begin
        notebook = Notebook([
            Cell("""macro my_macro()
                esc(:(y + x))
            end"""),
            Cell("""function my_function()
                @my_macro()
            end"""),
            Cell("my_function()"),
            Cell("x = 1"),
            Cell("y = 2"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test [Symbol("@my_macro"), :x, :y] ⊆ notebook.topology.nodes[cell(2)].references
        @test cell(3).output.body == "3"
    end

    @testset "Function docs" begin
        notebook = Notebook([
            Cell("""
                "my function doc"
                f(x) = 2x
            """),
            Cell("f"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test :f ∈ notebook.topology.nodes[cell(1)].funcdefs_without_signatures
        @test :f ∈ notebook.topology.nodes[cell(2)].references
    end

    @testset "Expr sanitization" begin
        struct A; end
        f(x) = x
        unserializable_expr = Expr(:call, f, A(), A[A(), A(), A()], PlutoRunner, PlutoRunner.sanitize_expr)

        get_expr_types(other) = typeof(other)
        get_expr_types(ex::Expr) = get_expr_types.(ex.args)

        flatten(x, acc=[]) = push!(acc, x)
        function flatten(arr::AbstractVector, acc=[]) foreach(x -> flatten(x, acc), arr); acc end

        sanitized_expr = PlutoRunner.sanitize_expr(unserializable_expr)
        types = sanitized_expr |> get_expr_types |> flatten |> Set

        # Checks that no fancy type is part of the serialized expression
        @test Set([Symbol, QuoteNode]) == types

        @test Meta.isexpr(sanitized_expr.args[3], :vect, 3)
        @test sanitized_expr.args[2] == :A
        @test sanitized_expr.args[1] == :(Main.f)
    end

    @testset "Macrodef cells not root of run" begin
        notebook = Notebook([
            Cell(""),
            Cell(""),
            Cell(""),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test all(noerror, notebook.cells)

        setcode(cell(1), raw"""
            macro test(sym)
                esc(:($sym = true))
            end
        """)
        update_run!(🍭, notebook, cell(1))

        setcode(cell(2), "x")
        setcode(cell(3), "@test x")
        update_run!(🍭, notebook, notebook.cells[2:3])

        @test cell(2).output.body == "true"
        @test all(noerror, notebook.cells)
    end

    @testset "Reverse order" begin
        notebook = Notebook([Cell() for _ in 1:3])
        cell(idx) = notebook.cells[idx]
        update_run!(🍭, notebook, notebook.cells)

        setcode(cell(1), "x")
        update_run!(🍭, notebook, cell(1))

        @test cell(1).errored == true

        setcode(cell(2), "@bar x")
        update_run!(🍭, notebook, cell(2))

        @test cell(1).errored == true
        @test cell(2).errored == true

        setcode(cell(3), raw"""macro bar(sym)
            esc(:($sym = "yay"))
        end""")
        update_run!(🍭, notebook, cell(3))

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
        @test cell(1).output.body == "\"yay\""
    end

    @testset "@a defines @b" begin
        notebook = Notebook([Cell() for _ in 1:4])
        cell(idx) = notebook.cells[idx]
        update_run!(🍭, notebook, notebook.cells)

        setcode(cell(1), "x")
        update_run!(🍭, notebook, cell(1))

        @test cell(1).errored == true

        setcode(cell(3), "@a()")
        setcode(cell(2), raw"""macro a()
            quote
                macro b(sym)
                    esc(:($sym = 42))
                end
            end |> esc
        end""")
        update_run!(🍭, notebook, notebook.cells[2:3])

        @test cell(1).errored == true
        @test cell(2) |> noerror
        @test cell(3) |> noerror

        setcode(cell(4), "@b x")
        update_run!(🍭, notebook, cell(4))

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
        @test cell(4) |> noerror
        @test cell(1).output.body == "42"
    end

    @testset "Redefines macro with new SymbolsState" begin
        🍭.options.evaluation.workspace_use_distributed = true

        notebook = Notebook(Cell.([
            "@b x",
            raw"""macro b(sym)
                esc(:($sym = 42))
            end""",
            "x",
            "y",
        ]))
        cell(idx) = notebook.cells[idx]
        update_run!(🍭, notebook, notebook.cells)

        @test cell(3).output.body == "42"
        @test cell(4).errored == true

        setcode(cell(2), """macro b(_)
            esc(:(y = 42))
        end""")
        update_run!(🍭, notebook, cell(2))

        # Cell 4 is not re-executed because the ReactiveNode
        # for @b(x) has not changed.
        @test_broken cell(4).output.body == "42"
        @test cell(3).errored == true

        WorkspaceManager.unmake_workspace((🍭, notebook))

        notebook = Notebook(Cell.([
            "@b x",
            raw"""macro b(sym)
                esc(:($sym = 42))
            end""",
            "x",
            "y",
        ]))
        update_run!(🍭, notebook, notebook.cells)

        @test cell(3).output.body == "42"
        @test cell(4).errored == true

        setcode(cell(2), """macro b(_)
            esc(:(y = 42))
        end""")
        update_run!(🍭, notebook, [cell(1), cell(2)])

        # Cell 4 is executed even because cell(1) is in the root
        # of the reactive run because the expansion is done with the new version
        # of the macro in the new workspace because of the current_roots parameter of `resolve_topology`.
        # See Run.jl#resolve_topology.
        @test cell(4).output.body == "42"
        @test cell(3).errored == true

        WorkspaceManager.unmake_workspace((🍭, notebook))
        🍭.options.evaluation.workspace_use_distributed = false
    end

    @testset "Reactive macro update does not invalidate the macro calls" begin
        notebook = Notebook(Cell.([
            raw"""macro b(sym)
                if z > 40
                    esc(:($sym = $z))
                else
                    esc(:(y = $z))
                end
            end""",
            "z = 42",
            "@b(x)",
            "x",
            "y",
        ]))
        cell(idx) = notebook.cells[idx]
        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror        
        @test cell(2) |> noerror        
        @test cell(3) |> noerror        
        @test cell(4) |> noerror        
        @test cell(5).errored == true

        setcode(cell(2), "z = 39")

        # running only 2, running all cells here works however
        update_run!(🍭, notebook, cell(2))

        @test cell(1) |> noerror        
        @test cell(2) |> noerror        
        @test cell(3) |> noerror
        @test cell(4).errored == true

        # cell 5 should re-run because all cells calling @b should be invalidated
        # at the reactive node level this is not yet the case
        @test_broken noerror(cell(5); verbose=false)
    end

    @testset "Explicitely running macrocalls updates the reactive node" begin
        notebook = Notebook(Cell.([
            "@b()",
            "ref = Ref{Int}(0)",
            raw"""macro b()
                ex = if iseven(ref[])
                    :(x = 10)
                else
                    :(y = 10)
                end |> esc
                ref[] += 1
                ex
            end""",
            "x",
            "y",
        ]))
        cell(i) = notebook.cells[i]
        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
        @test cell(4) |> noerror
        @test cell(5).errored == true

        update_run!(🍭, notebook, cell(1))

        @test cell(4).errored == true
        @test cell(5) |> noerror
    end

    @testset "Implicitely running macrocalls updates the reactive node" begin
        notebook = Notebook(Cell.([
            "updater; @b()",
            "ref = Ref{Int}(0)",
            raw"""macro b()
                ex = if iseven(ref[])
                    :(x = 10)
                else
                    :(y = 10)
                end |> esc
                ref[] += 1
                ex
            end""",
            "x",
            "y",
            "updater = 1",
        ]))
        cell(i) = notebook.cells[i]
        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
        @test cell(4) |> noerror
        @test cell(5).errored == true
        @test cell(6) |> noerror

        setcode(cell(6), "updater = 2")
        update_run!(🍭, notebook, cell(6))

        @test cell(4).errored == true

        # Since the run of `@b()` was not explicit,
        # the reactive node of cell(1) was not updated :'(
        @test_broken noerror(cell(5); verbose=false)
    end


    @testset "Cell failing first not re-run?" begin
        notebook = Notebook(Cell.([
            "x",
            "@b x",
            raw"macro b(sym) esc(:($sym = 42))",
        ]))
        update_run!(🍭, notebook, notebook.cells)

        # CELL 1 "x" was run first and failed because the definition
        # of x was not yet found. However, it was not run re-run when the definition of
        # x ("@b(x)") was run. Should it? Maybe set a higher precedence to cells that define
        # macros inside the notebook.
        @test_broken noerror(notebook.cells[1]; verbose=false)
    end

    @testset "@a defines @b initial loading" begin
        notebook = Notebook(Cell.([
            "x",
            "@b x",
            "@a",
            raw"""macro a()
                quote
                    macro b(sym)
                        esc(:($sym = 42))
                    end
                end |> esc
            end"""
        ]))
        cell(idx) = notebook.cells[idx]
        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror
        @test cell(4) |> noerror
        @test cell(1).output.body == "42"
    end

    @testset "Macro Prefix" begin
        🍭.options.evaluation.workspace_use_distributed = true

        notebook = Notebook(Cell.([
            "@sprintf \"answer = %d\" x",
            "x = y+1",
            raw"""
            macro def(sym)
                esc(:($sym=41))
            end
            """,
            "@def y",
            "import Printf: @sprintf",
        ]))
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, cell(1))

        @test cell(1).errored == true

        update_run!(🍭, notebook, cell(5))

        @test occursin("UndefVarError: x", cell(1).output.body[:msg])

        update_run!(🍭, notebook, cell(3))
        update_run!(🍭, notebook, cell(2))
        update_run!(🍭, notebook, cell(4))

        @test cell(1) |> noerror

        WorkspaceManager.unmake_workspace((🍭, notebook))
        🍭.options.evaluation.workspace_use_distributed = false
    end

    @testset "Package macro 1" begin
        notebook = Notebook([
            Cell("using Dates"),
            Cell("df = dateformat\"Y-m-d\""),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, cell(2))

        @test cell(2).errored == true
        @test occursinerror("UndefVarError: @dateformat_str", cell(2)) == true

        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        
        notebook = Notebook([
            Cell("using Dates"),
            Cell("df = dateformat\"Y-m-d\""),
        ])
        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror
    end

    @testset "Package macro 2" begin
        🍭.options.evaluation.workspace_use_distributed = true
        
        notebook = Notebook([
            Cell("z = x^2 + y"),
            Cell("@variables x y"),
            Cell("""
            begin
                import Pkg
                Pkg.activate(mktempdir())
                Pkg.add(Pkg.PackageSpec(name="Symbolics", version="1"))
                import Symbolics: @variables
            end
            """),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells[1:2])

        @test cell(1).errored == true
        @test cell(2).errored == true

        update_run!(🍭, notebook, cell(3))

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(2) |> noerror

        update_run!(🍭, notebook, notebook.cells)

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror

        update_run!(🍭, notebook, cell(2))

        @test cell(1) |> noerror
        @test cell(2) |> noerror

        setcode(cell(2), "@variables 🐰 y")
        update_run!(🍭, notebook, cell(2))

        @test cell(1).errored
        @test cell(2) |> noerror

        setcode(cell(1), "z = 🐰^2 + y")
        update_run!(🍭, notebook, cell(1))

        @test cell(1) |> noerror
        @test cell(2) |> noerror

        WorkspaceManager.unmake_workspace((🍭, notebook))
        
        🍭.options.evaluation.workspace_use_distributed = false
    end

    @testset "Previous workspace for unknowns" begin
        notebook = Notebook([
            Cell("""macro my_identity(expr)
              expr
            end"""),
            Cell("(@__MODULE__, (@my_identity 1 + 1))"),
            Cell("@__MODULE__"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, cell(1))
        update_run!(🍭, notebook, notebook.cells[2:end])

        @test cell(1) |> noerror
        @test cell(2) |> noerror
        @test cell(3) |> noerror

        module_from_cell2 = cell(2).output.body[:elements][1][2][1]
        module_from_cell3 = cell(3).output.body

        @test_broken module_from_cell2 == module_from_cell3
    end

    @testset "Definitions" begin
        notebook = Notebook([
            Cell("""macro my_assign(sym, val)
                :(\$(esc(sym)) = \$(val))
            end"""),
            Cell("c = :hello"),
            Cell("@my_assign b c"),
            Cell("b"),
        ])
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)
        update_run!(🍭, notebook, notebook.cells)

        @test ":hello" == cell(3).output.body
        @test ":hello" == cell(4).output.body
        @test :b ∈ notebook.topology.nodes[cell(3)].definitions
        @test [:c, Symbol("@my_assign")] ⊆ notebook.topology.nodes[cell(3)].references
        @test cell(3).cell_dependencies.contains_user_defined_macrocalls == true

        setcode(notebook.cells[2], "c = :world")
        update_run!(🍭, notebook, cell(2))

        @test ":world" == cell(3).output.body
        @test ":world" == cell(4).output.body
    end

    @testset "Macros using import" begin
        notebook = Notebook(Cell.([
            """
            @option "option_a" struct OptionA
                option_value::option_type
            end
            """,
            "option_type = String",
            "import Configurations: @option",
        ]))
        cell(idx) = notebook.cells[idx]

        update_run!(🍭, notebook, notebook.cells)

        @test :option_type ∈ notebook.topology.nodes[cell(1)].references
        @test cell(1) |> noerror
    end
end
