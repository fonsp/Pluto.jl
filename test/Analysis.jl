using Test
import Pluto: Notebook, Cell, updated_topology, static_resolve_topology, is_just_text, NotebookTopology

@testset "Analysis" begin
    @testset "is_just_text" begin
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
            Cell("html\"a 7 \$b\""),

            Cell("md\"a 8 \$b\""),
            Cell("@a md\"asdf 9\""),
            Cell("x()"),
            Cell("x() = y()"),
            Cell("12 + 12"),
            Cell("import Dates"),
            Cell("import Dates"),
            Cell("while false end"),
            Cell("for i in [16]; end"),
            Cell("[i for i in [17]]"),
            Cell("module x18 end"),
            Cell("""
            module x19
                exit()
            end
            """),
            Cell("""quote end"""),
            Cell("""quote x = 21 end"""),
            Cell("""quote \$(x = 22) end"""),
            Cell("""asdf"23" """),
            Cell("""@asdf("24") """),
            Cell("""@x"""),
            Cell("""@y z 26"""),
            Cell("""f(g"27")"""),
        ])

        old = notebook.topology
        new = notebook.topology = updated_topology(old, notebook, notebook.cells) |> static_resolve_topology

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
            @test !is_just_text(new, notebook.cells[18])
            @test !is_just_text(new, notebook.cells[19])
            @test !is_just_text(new, notebook.cells[20])
            @test !is_just_text(new, notebook.cells[21])
            @test !is_just_text(new, notebook.cells[22])
            @test !is_just_text(new, notebook.cells[23])
            @test !is_just_text(new, notebook.cells[24])
            @test !is_just_text(new, notebook.cells[25])
            @test !is_just_text(new, notebook.cells[26])
            @test !is_just_text(new, notebook.cells[27])
        end
    end

    @testset "updated_topology identity" begin
        notebook = Notebook([
            Cell("x = 1")
            Cell("function f(x)
                x + 1
            end")
            Cell("a = x - 123")
            Cell("")
            Cell("")
            Cell("")
        ])
        
        empty_top = notebook.topology
        topo = updated_topology(empty_top, notebook, notebook.cells)
        # updated_topology should preserve the identity of the topology if nothing changed. This means that we can cache the result of other functions in our code!
        @test topo === updated_topology(topo, notebook, notebook.cells)
        @test topo === updated_topology(topo, notebook, Cell[])
        @test topo === static_resolve_topology(topo)
        
        # for n in fieldnames(NotebookTopology)
        #     @test getfield(topo, n) === getfield(top2a, n)
        # end
        
        setcode!(notebook.cells[1], "x = 999")
        topo_2 = updated_topology(topo, notebook, notebook.cells[1:1])
        @test topo_2 !== topo
        
        
        setcode!(notebook.cells[4], "@asdf 1 + 2")
        topo_3 = updated_topology(topo_2, notebook, notebook.cells[4:4])
        @test topo_3 !== topo_2
        @test topo_3 !== topo
        
        @test topo_3.unresolved_cells |> only === notebook.cells[4]
        
        @test topo_3 === updated_topology(topo_3, notebook, notebook.cells[1:3])
        @test topo_3 === updated_topology(topo_3, notebook, Cell[])
        # rerunning the cell with the macro does not change the topology because it was already unresolved
        @test topo_3 === updated_topology(topo_3, notebook, notebook.cells[1:4])
        
        # let's pretend that we resolved the macro in the 4th cell
        topo_3_resolved = NotebookTopology(;
            nodes=topo_3.nodes, 
            codes=topo_3.codes, 
            unresolved_cells=setdiff(topo_3.unresolved_cells, notebook.cells[4:4]),
            cell_order=topo_3.cell_order,
			disabled_cells=topo_3.disabled_cells,
        )
        
        @test topo_3_resolved === updated_topology(topo_3_resolved, notebook, notebook.cells[1:3])
        @test topo_3_resolved === updated_topology(topo_3_resolved, notebook, Cell[])
        # rerunning the cell with the macro makes it unresolved again
        @test topo_3_resolved !== updated_topology(topo_3_resolved, notebook, notebook.cells[1:4])
        
        notebook.cells[4] ∈ updated_topology(topo_3_resolved, notebook, notebook.cells[1:4]).unresolved_cells
        
        # @test topo_3 === static_resolve_topology(topo_3)
    end
end