using Test
import Neptune: Notebook, ServerSession, ClientSession, Cell, update_caches!, updated_topology, is_just_text

@testset "Analysis" begin
    notebook = Notebook([
        Cell(""),
        Cell("md\"a\""),
        Cell("html\"a\""),
        Cell("md\"a \$b\$\""),
        Cell("""
        let
            x = md"a"
            md"r \$x"
        end
        """),
        Cell("html\"a \$b\""),

        Cell("md\"a \$b\""),
        Cell("@a md\"asdf\""),
        Cell("x()"),
        Cell("x() = y()"),
        Cell("1 + 1"),
        Cell("import Dates"),
        Cell("import Dates"),
    ])

    update_caches!(notebook, notebook.cells)
    old = notebook.topology
    new = notebook.topology = updated_topology(old, notebook, notebook.cells)

    @testset "Only-text detection" begin
        for c in notebook.cells[1:6]
            @test is_just_text(new, c)
        end
        for c in notebook.cells[7:end]
            @test !is_just_text(new, c)
        end
    end
end