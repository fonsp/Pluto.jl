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

    update_run!(🍭, notebook, notebook.cells[2:2])

    @test cell(2).errored == true
    @test occursinerror("UndefVarError: @dateformat_str", cell(2)) == true

    update_run!(🍭, notebook, notebook.cells)

    @test cell(1).errored == false
    @test cell(2).errored == false
  end
end
