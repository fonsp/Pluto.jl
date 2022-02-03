### A Pluto.jl notebook ###
# v0.17.7

using Markdown
using InteractiveUtils

# ╔═╡ 73e15975-75c7-425f-9cbb-5c4af91b48e0
using Sockets

# ╔═╡ 99b5bd90-ee78-4185-a1ae-3b225b351f8c
using Logging

# ╔═╡ f1be8693-2f50-4e9b-80e5-09a051ae939f
"Wrap `expr` in `try ... catch`. The exception is logged and then ignored."
macro trylog(expr, logmsg, loglevel = Logging.Warn)
    quote
        try
            $(esc(expr))
        catch ex
            @logmsg $(loglevel) $(logmsg) exception = (ex, catch_backtrace())
        end
    end
end

# ╔═╡ 3c47eac4-851b-4448-a220-4685784cb4a0
# Two structs

Base.@kwdef struct 🐸Server
    port::UInt16
    accept_task::Task
    tcp_server::Sockets.TCPServer
end

# ╔═╡ 91613326-9944-492e-80b4-6bf720d2ec53
import Sockets: connect, listen

# ╔═╡ e6148987-790b-4473-ac60-dad3384012d1
"Like @async except it prints errors to the terminal. 👶"
macro asynclog(expr)
    quote
        @async begin
            # because this is being run asynchronously, we need to catch exceptions manually
            try
                $(esc(expr))
            catch ex
                bt = stacktrace(catch_backtrace())
                showerror(stderr, ex, bt)
                rethrow(ex)
            end
        end
    end
end

# ╔═╡ 13932da9-6eeb-4e83-a441-4aef9ea1992a
Base.@kwdef struct 🐸ClientConnection
    stream::IO
    outbox::Channel{Any}
    read_task::Task
    write_task::Task
end

# ╔═╡ 1d095ee0-bd32-45fc-b6ff-63b0604ec039
const SHUTDOWN = Ref(nothing)

# ╔═╡ 0faeb955-0f34-4d48-82f4-02cf330e31cb
# API: `send_message` and `create_server`

function send_message(client::🐸ClientConnection, message::Union{Vector{UInt8},String})
	@info "REALLYYYY???"
    put!(client.outbox, message)
	@info "PEPPPP???"
end

# ╔═╡ b2c182e4-61db-474c-b0aa-ffd6454ee32f
Base.wait(server::🐸Server) = wait(server.accept_task)

# ╔═╡ 0fe73e2e-ab61-4d22-a416-d6072c1fb722
Base.wait(client::🐸ClientConnection) = begin
    wait(client.read_task)
    wait(client.write_task)
end

# ╔═╡ 5805e447-9cd7-4f77-af19-30452f5b2939
Base.isopen(server::🐸Server) = isopen(server.tcp_server)

# ╔═╡ babb018c-1fb5-4104-a8d9-b6e19c18db48
Base.isopen(client::🐸ClientConnection) = isopen(client.stream)

# ╔═╡ 8e45ea9b-453f-4ee8-bbb6-e3695e29b399
function create_server(;
    port::Integer,
    on_message::Function = (client, message) -> nothing,
    on_disconnect::Function = (client) -> nothing
)
    # Create a TCP server
    port = UInt16(port)
    tcp_server = listen(port)

    accept_task = @asynclog begin
        while isopen(tcp_server)
            # Wait for a new client to connect, accept the connection and store the stream.
            client_stream = try
                accept(tcp_server)
            catch ex
                if isopen(tcp_server)
                    @warn "Failed to open client stream" exception = (ex, catch_backtrace())
                end
                nothing
            end

            if client_stream isa IO
                client_id = String(rand('a':'z', 6))
                @info "Server: connected" client_id

                # Will hold the client later...
                client_ref = Ref{Union{Nothing,🐸ClientConnection}}(nothing)

                # This task takes items from the outbox and sends them to the client.
                write_task = Task() do
                    while isopen(client_stream)
                        next_msg = take!(client_ref[].outbox)
                        @debug "Message to write!" next_msg
                        if next_msg !== SHUTDOWN && isopen(client_stream)
                            try
                                @debug "writing..."
                                write(client_stream, next_msg)
                            catch ex
                                if isopen(client_stream)
                                    @warn "Server: failed to write to client" client_id exception = (ex, catch_backtrace())
                                end
                            end
                        else
                            break
                        end
                    end
                    @info "Server: client outbox task finished" client_id
                end


                # This task reads from the client and sends the messages to `on_message`.
                read_task = Task() do
                    while isopen(client_stream)
                        incoming = try
                            # Read any available data. This call blocks until data arrives.
                            readavailable(client_stream)
                        catch e
                            @warn "Server: failed to read client data" client_id exception = (e, catch_backtrace())
                            nothing
                        end
                        if !isnothing(incoming) && !isempty(incoming)
                            @debug "Server: message from" client_id length(incoming)
                            try
                                # Let the user handle the message.
                                on_message(client_ref[], incoming)
                            catch e
                                @error "Server: failed to call on_message handler" client_id exception = (e, catch_backtrace())
                            end
                        end
                    end

                    # At this point, the client stream has closed. We send a signal...
                    on_disconnect(client)

                    # ...and we stop the write_task:
                    begin
                        # Clear the queue...
                        while isready(client_ref[].outbox)
                            take!(client_ref[].outbox)
                        end
                        # ...send the stop signal...
                        put!(client_ref[].outbox, SHUTDOWN)
                        # ...wait for the write task to finish.
                        wait(write_task)
                    end

                    @info "Server: stopped reading client" client_id
                end



                client = 🐸ClientConnection(;
                    stream = client_stream,
                    outbox = Channel{Any}(256),
                    read_task,
                    write_task
                )

                client_ref[] = client

                schedule(read_task)
                schedule(write_task)
            end
        end
        @info "Server: stopped accepting"
    end


    return 🐸Server(;
        port,
        accept_task,
        tcp_server
    )
end

# ╔═╡ 0f4100eb-44c2-457f-9e65-3bb67580be70
"Shut down a server"
function Base.close(server::🐸Server)
	var"@trylog"
    # @trylog(
        isopen(server.tcp_server) && close(server.tcp_server)
    #     "Failed to close server"
    # )
    # @trylog(
        wait(server.accept_task)
    #     "Something went wrong with the accept task"
    # )
end;

# ╔═╡ 252dae67-abdf-462e-a66c-72c2517395e3


# ╔═╡ 6aac62db-a8da-4c42-ab18-1509a5196599
md"## `@skip_as_script`"

# ╔═╡ 79f7a694-f72c-4a97-be76-f3b9b7593aad
function is_inside_pluto(m::Module)
	if isdefined(m, :PlutoForceDisplay)
		return m.PlutoForceDisplay
	else
		isdefined(m, :PlutoRunner) && parentmodule(m) == Main
	end
end

# ╔═╡ 96915991-7c7f-475c-9c61-241bf9f55d02
"""
	@skip_as_script expression

Marks a expression as Pluto-only, which means that it won't be executed when running outside Pluto. Do not use this for your own projects.
"""
macro skip_as_script(ex)
	if is_inside_pluto(__module__)
		esc(ex)
	else
		nothing
	end
end

# ╔═╡ 4cd5eaa0-b56d-40a8-9b82-3fdb1877220d
@skip_as_script server = create_server(;
    port = 9009,
    on_message = (client, message) -> begin
        to_send = "Hello, " * String(message)
        @info "to_send" to_send
        send_message(client, to_send)
    end,
    on_disconnect = (client) ->
        @info "Server: client disconnected" objectid(client)
)

# ╔═╡ 228df544-21fb-4442-97d4-4d3cbe781516
@skip_as_script close(server)

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Logging = "56ddb016-857b-54e1-b83d-db4d58db5568"
Sockets = "6462fe0b-24de-5631-8697-dd941f90decc"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"
"""

# ╔═╡ Cell order:
# ╟─f1be8693-2f50-4e9b-80e5-09a051ae939f
# ╠═3c47eac4-851b-4448-a220-4685784cb4a0
# ╠═73e15975-75c7-425f-9cbb-5c4af91b48e0
# ╠═91613326-9944-492e-80b4-6bf720d2ec53
# ╠═99b5bd90-ee78-4185-a1ae-3b225b351f8c
# ╠═e6148987-790b-4473-ac60-dad3384012d1
# ╠═13932da9-6eeb-4e83-a441-4aef9ea1992a
# ╠═1d095ee0-bd32-45fc-b6ff-63b0604ec039
# ╠═0faeb955-0f34-4d48-82f4-02cf330e31cb
# ╠═8e45ea9b-453f-4ee8-bbb6-e3695e29b399
# ╠═0f4100eb-44c2-457f-9e65-3bb67580be70
# ╠═b2c182e4-61db-474c-b0aa-ffd6454ee32f
# ╠═0fe73e2e-ab61-4d22-a416-d6072c1fb722
# ╠═5805e447-9cd7-4f77-af19-30452f5b2939
# ╠═babb018c-1fb5-4104-a8d9-b6e19c18db48
# ╠═252dae67-abdf-462e-a66c-72c2517395e3
# ╠═4cd5eaa0-b56d-40a8-9b82-3fdb1877220d
# ╠═228df544-21fb-4442-97d4-4d3cbe781516
# ╟─6aac62db-a8da-4c42-ab18-1509a5196599
# ╟─79f7a694-f72c-4a97-be76-f3b9b7593aad
# ╟─96915991-7c7f-475c-9c61-241bf9f55d02
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
