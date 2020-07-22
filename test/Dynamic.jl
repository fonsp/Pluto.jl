using Test
import Pluto
import Pluto: update_save_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell

import UUIDs: uuid1

function get_unique_short_id()
    string(uuid1())[1:8]
end

function stringify_keys(d::Dict)
    Dict(string(k) => stringify_keys(v) for (k, v) in d)
end
stringify_keys(x::Any) = x

@testset "Communication protocol" begin

    @testset "Functionality sweep" begin
        buffer = IOBuffer()
        client = ClientSession(:buffery, buffer)

        🍭 = ServerSession()
        # 🍭.connected_clients[client.id] = client

        notebook = Notebook([Cell("")])
        🍭.notebooks[notebook.notebook_id] = notebook
        update_save_run!(🍭, notebook, notebook.cells)
        # client.connected_notebook = notebook

        function send(type, body, metadata)
            request_id = get_unique_short_id()
            Pluto.process_ws_message(🍭, Dict(
                "type" => string(type),
                "client_id" => string(client.id),
                "request_id" => request_id,
                "body" => body,
                metadata...
            ) |> stringify_keys, client.stream)
        end

        n = notebook.notebook_id |> string
        c(cell) = cell.cell_id |> string

        @test_nowarn send(:connect, Dict(), Dict(:notebook_id => n))
        @test_nowarn send(:getversion, Dict(), Dict())

        @test_nowarn send(:addcell, Dict(:index => 0), Dict(:notebook_id => n))
        send(:addcell, Dict(:index => 0), Dict(:notebook_id => n))
        send(:addcell, Dict(:index => 0), Dict(:notebook_id => n))
        @test length(notebook.cells) == 4
        @test_nowarn send(:setinput, Dict(:code => "1 + 2"), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))
        @test_nowarn send(:runmultiple, Dict(:cells => [string(c.cell_id) for c in notebook.cells[1:2]]), Dict(:notebook_id => n))
        @test_nowarn send(:run, Dict(), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))
        @test_nowarn send(:setbond, Dict(:sym => "x", :val => 9), Dict(:notebook_id => n))
        @test_nowarn send(:changecell, Dict(:code => "1+1"), Dict(:notebook_id => n, :cell_id => c(notebook.cells[3])))
        @test_nowarn send(:deletecell, Dict(), Dict(:notebook_id => n, :cell_id => c(notebook.cells[4])))

        @test_nowarn send(:movecell, Dict(:index => 1), Dict(:notebook_id => n, :cell_id => c(notebook.cells[3])))
        @test_nowarn send(:foldcell, Dict(:folded => true), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))
        @test_nowarn send(:getinput, Dict(), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))
        @test_nowarn send(:getoutput, Dict(), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))
        @test_nowarn send(:getallcells, Dict(), Dict(:notebook_id => n))
        @test_nowarn send(:getallnotebooks, Dict(), Dict(:notebook_id => n))
        @test_nowarn send(:getallnotebooks, Dict(), Dict())

        @test_nowarn send(:movenotebookfile, Dict(:path => tempname()), Dict(:notebook_id => n))
        
        # TODO: we need to wait for all above command to finish before we can do this:
        # send(:shutdownworkspace, Dict(:remove_from_list => true), Dict(:notebook_id => n))
    end
end

# TODO: test returned data
