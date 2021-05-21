using Test
import UUIDs
import Pluto: Notebook, Cell, ServerSession, ClientSession, update_run!

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

    @test cell(1).errored == false
    @test [:🍎, :🍐] ⊆ notebook.topology.nodes[cell(1)].definitions
    @test :Fruit ∈ notebook.topology.nodes[cell(1)].funcdefs_without_signatures
    @test Symbol("@enum") ∈ notebook.topology.nodes[cell(1)].references

    @test cell(2).errored == false
    @test :🍎 ∈ notebook.topology.nodes[cell(2)].references

    @test cell(3).errored == false
    @test :Fruit ∈ notebook.topology.nodes[cell(3)].references
  end

  @testset "User defined macro" begin
    notebook = Notebook([
      Cell("""macro my_macro(sym, val) 
        :(\$(esc(sym)) = \$(val)) 
      end"""),
      Cell("@my_macro x 1+1"),
    ])
    cell(idx) = notebook.cells[idx]

    update_run!(🍭, notebook, notebook.cells)

    # Does not work on first try because it would require executing a partial
    # dependency graph. See strategy #2 in `resolve_topology`
    @test_broken :x ∈ notebook.topology.nodes[cell(2)].definitions
    @test Symbol("@my_macro") ∈ notebook.topology.nodes[cell(2)].references

    update_run!(🍭, notebook, notebook.cells)

    # Works on second time because of old workspace
    @test :x ∈ notebook.topology.nodes[cell(2)].definitions
    @test Symbol("@my_macro") ∈ notebook.topology.nodes[cell(2)].references
  end

  @testset "Package macro" begin
    notebook = Notebook([
      Cell("using Dates"),
      Cell("df = dateformat\"Y-m-d\""),
    ])
    cell(idx) = notebook.cells[idx]

    update_run!(🍭, notebook, cell(2))

    @test cell(2).errored == true
    @test occursinerror("UndefVarError: @dateformat_str", cell(2)) == true

    update_run!(🍭, notebook, notebook.cells)

    @test cell(1).errored == false
    @test cell(2).errored == false
  end

  @testset "Previous workspace for unknowns" begin
    notebook = Notebook([
      Cell("""macro my_macro(expr)
        expr
      end"""),
      Cell("(@__MODULE__, (@my_macro 1 + 1))"),
      Cell("@__MODULE__"),
    ])
    cell(idx) = notebook.cells[idx]

    update_run!(🍭, notebook, cell(1))
    update_run!(🍭, notebook, notebook.cells[2:end])

    @test cell(1).errored == false
    @test cell(2).errored == false
    @test cell(3).errored == false

    module_from_cell2 = cell(2).output.body[:elements][1][2][1]
    module_from_cell3 = cell(3).output.body

    # Current limitation of using the previous module 
    # for expansion of unknowns macros on the whole expression
    @test_broken module_from_cell2 == module_from_cell3
  end

  @testset "Definitions" begin
    notebook = Notebook([
      Cell("""macro my_macro(sym, val)
        :(\$(esc(sym)) = \$(val))
      end"""),
      Cell("c = :hello"),
      Cell("@my_macro b c"),
      Cell("b"),
    ])
    cell(idx) = notebook.cells[idx]

    update_run!(🍭, notebook, notebook.cells)
    update_run!(🍭, notebook, notebook.cells)

    @test ":hello" == cell(3).output.body
    @test ":hello" == cell(4).output.body
    @test :b ∈ notebook.topology.nodes[cell(3)].definitions
    @test [:c, Symbol("@my_macro")] ⊆ notebook.topology.nodes[cell(3)].references
    @test cell(3).cell_dependencies.contains_user_defined_macros == true

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

    # When using `import Package: @macro`, the first execution will fail for
    # the same reasons as in the "User defined macros" testset.
    @test_broken :option_type ∈ notebook.topology.nodes[cell(1)].references
    @test_broken cell(1).errored == true

    update_run!(🍭, notebook, notebook.cells)

    @test :option_type ∈ notebook.topology.nodes[cell(1)].references
    @test cell(1).errored == false
  end
end
