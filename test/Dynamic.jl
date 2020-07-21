using Test
import Pluto
import Pluto: update_save_run!, WorkspaceManager, ClientSession, ServerSession

import UUIDs: uuid1

function get_unique_short_id()
    string(uuid1())[1:8]
end

@testset "Communication protocol" begin

    @testset "Functionality sweep" begin
        buffer = IOBuffer()
        client = ClientSession(:buffery, buffer)

        🍭 = ServerSession()
        # 🍭.connected_clients[client.id] = client

        notebook = Notebook([Cell("")])
        # client.connected_notebook = notebook

        function send(type, body, metadata)
            request_id = get_unique_short_id()
            Pluto.process_ws_message(🍭, Dict(
                "type" => string(type),
                "client_id" => string(client.id),
                "request_id" => request_id,
                "body" => body,
                metadata...
            ), client.stream)
        end

        @test_nowarn send(:connect, Dict(), Dict(:notebook_id => notebook.notebook_id |> string))
        @test_nowarn send(:deletecell, Dict(), Dict(:notebook_id => notebook.notebook_id |> string))

    end
end