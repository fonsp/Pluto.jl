using Test
import Pluto: Notebook, ServerSession, ClientSession, Cell, updated_topology, is_just_text

@testset "Analysis" begin
    notebook = Notebook([
        Cell(""),
        Cell("md\"a\""),
        Cell("html\"a\""),
        Cell("md\"a \$b\$\""),
        Cell("md\"a ``b``\""),
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
        Cell("while false end"),
        Cell("for i in [1,2]; end"),
        Cell("[i for i in [1,2]]"),
        
    ])

    old = notebook.topology
    new = notebook.topology = updated_topology(old, notebook, notebook.cells)

    @testset "Only-text detection" begin
        @test is_just_text(new, notebook.cells[1])
        @test is_just_text(new, notebook.cells[2])
        @test is_just_text(new, notebook.cells[3])
        @test is_just_text(new, notebook.cells[4])
        @test is_just_text(new, notebook.cells[5])
        @test is_just_text(new, notebook.cells[6])
        @test is_just_text(new, notebook.cells[7])

        @test !is_just_text(new, notebook.cells[8])
        @test !is_just_text(new, notebook.cells[9])
        @test !is_just_text(new, notebook.cells[10])
        @test !is_just_text(new, notebook.cells[11])
        @test !is_just_text(new, notebook.cells[12])
        @test !is_just_text(new, notebook.cells[13])
        @test !is_just_text(new, notebook.cells[14])
        @test !is_just_text(new, notebook.cells[15])
        @test !is_just_text(new, notebook.cells[16])
        @test !is_just_text(new, notebook.cells[17])
    end
end
