using Test
import Pluto: update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell


@testset "Rich output" begin
    @testset "Interactive inspector" begin
        withenv("PLUTO_WORKSPACE_USE_DISTRIBUTED" => "false") do
            🍭 = ServerSession()
            fakeclient = ClientSession(:fake, nothing)
            🍭.connected_clients[fakeclient.id] = fakeclient

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
                    Cell("struct Ten x end"),
                    Cell("Ten(11)"),
                    Cell("Vector(undef, 12)"),
                ])
                fakeclient.connected_notebook = notebook

            update_run!(🍭, notebook, notebook.cells)

            @test notebook.cells[1].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[2].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[3].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[4].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[5].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[6].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[7].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[8].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[9].repr_mime isa MIME"application/vnd.pluto.tree+xml"

            @test notebook.cells[11].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            @test notebook.cells[12].repr_mime isa MIME"application/vnd.pluto.tree+xml"
            

            WorkspaceManager.unmake_workspace(notebook)
        end
    end
end
