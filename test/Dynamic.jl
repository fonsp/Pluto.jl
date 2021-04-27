using Test
import Pluto
import Pluto: update_save_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell

import UUIDs: UUID, uuid1

function get_unique_short_id()
    string(uuid1())[1:8]
end

function stringify_keys(d::Dict)
    Dict(string(k) => stringify_keys(v) for (k, v) in d)
end
stringify_keys(x::Any) = x

import Pluto.Firebasey


function await_with_timeout(check::Function, timeout::Real=60.0, interval::Real=.05)
    starttime = time()
    while !check()
        sleep(interval)
        if time() - starttime >= timeout
            error("Timeout after $(timeout) seconds")
        end
    end
end

@testset "Communication protocol" begin

    @testset "Functionality sweep" begin
        u = [uuid1() for _ in 1:100]

        buffer = IOBuffer()
        client = ClientSession(:buffery, buffer)

        🍭 = ServerSession()
        # 🍭.connected_clients[client.id] = client


        notebook = Notebook([
            Cell(
                u[1], 
                ""
            ),
        ])
        🍭.notebooks[notebook.notebook_id] = notebook
        update_save_run!(🍭, notebook, notebook.cells)
        client.connected_notebook = notebook
        read(buffer)

        local_state = Pluto.notebook_to_js(notebook)


        function send(type, body, metadata = Dict(:notebook_id => string(notebook.notebook_id)))
            request_id = get_unique_short_id()
            Pluto.process_ws_message(🍭, Dict(
                "type" => string(type),
                "client_id" => string(client.id),
                "request_id" => request_id,
                "body" => body,
                metadata...
            ) |> stringify_keys, client.stream)
        end

        function send_new_state(new_state)
            patches::Array{Dict} = Firebasey.diff(new_state, local_state)
            # @info "patches" patches
            send(:update_notebook, Dict("updates" => patches))

            new_state
        end

        # function update_local_notebook(mutate_fn::Function)
        #     mutable_notebook = deepcopy(notebook)

        #     mutate_fn(mutable_notebook)

        #     new_state = Pluto.notebook_to_js(mutable_notebook)
        #     send_new_state(new_state)
        # end

        last_position = position(buffer)
        function wait_for_updates(process=true)
            # @info "Waiting for updates"
            await_with_timeout() do
                position(buffer) != last_position
            end
            seek(buffer, last_position)
            response = Pluto.unpack(buffer)
            last_position = position(buffer)

            if process
                if response["type"] == "notebook_diff"
                    message = response["message"]
                    patches = [Base.convert(Firebasey.JSONPatch, update) for update in message["patches"]]
                    # @show patches
                    for patch in patches
                        Firebasey.applypatch!(local_state, patch)
                    end
                end
            end

            # @info "Response received" response

            local_state
        end

        # function patch_and_check(mutate_fn::Function)
        #     desired = update_local_notebook(mutate_fn)
        #     result = wait_for_updates()
        #     desired == result
        # end

        @test_nowarn send(:connect, Dict())
        wait_for_updates()

        @test_nowarn send_new_state(local_state)
        wait_for_updates(false)

        read(buffer)

        #= 
        We would also like to test:
        - add cell
        - set code and run
        - fold cell
        - move cell
        - delete cell

        - run multiple cells
        - move cells
        - set bond

        - move notebook file
        - search for docs
        - show more items of an array =#

        send(:shutdown_notebook, Dict("keep_in_session" => false))

        @test_nowarn await_with_timeout() do
            !haskey(🍭.notebooks, notebook.notebook_id)
        end
    end

    @testset "Docs" begin
        @test occursin("square root", Pluto.PlutoRunner.doc_fetcher("sqrt")[1])
        @test occursin("square root", Pluto.PlutoRunner.doc_fetcher("Base.sqrt")[1])
        @test occursin("No documentation found", Pluto.PlutoRunner.doc_fetcher("Base.findmeta")[1])
    end

    @testset "PlutoRunner API" begin
        fakeclient = ClientSession(:fake, nothing)
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = true
        🍭.connected_clients[fakeclient.id] = fakeclient

        notebook = Notebook([
            Cell("PlutoRunner.notebook_id[] |> Text"),
            Cell("""
            let
                a = PlutoRunner.publish(Dict(
                    "hello" => "world",
                    "xx" => UInt8[6,7,8],
                ))
                b = PlutoRunner.publish("cool")
                Text((a, b))
            end
            """),
            Cell("3"),
            Cell("PlutoRunner.publish_to_js(Ref(4))"),
            Cell("PlutoRunner.publish_to_js((ref=4,))"),
        ])
        fakeclient.connected_notebook = notebook

        update_save_run!(🍭, notebook, notebook.cells)
        @test notebook.cells[1].output.body == notebook.notebook_id |> string

        @test !notebook.cells[2].errored
        a, b = Meta.parse(notebook.cells[2].output.body) |> eval
        p = notebook.cells[2].published_objects
        @test sort(collect(keys(p))) == sort([a,b])
        @test isempty(notebook.cells[3].published_objects)

        @test p[a] == Dict(
            "hello" => "world",
            "xx" => UInt8[6,7,8],
        )
        @test p[b] == "cool"

        setcode(notebook.cells[2], "2")
        update_save_run!(🍭, notebook, notebook.cells)
        @test isempty(notebook.cells[2].published_objects)

        @test notebook.cells[4].errored
        @test !notebook.cells[5].errored

        WorkspaceManager.unmake_workspace((🍭, notebook))
    end
end
