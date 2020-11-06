import MsgPack
import UUIDs: UUID
import HTTP
import Sockets

import Base: endswith
function endswith(vec::Vector{T}, suffix::Vector{T}) where T
    local liv = lastindex(vec)
    local lis = lastindex(suffix)
    liv >= lis && (view(vec, (liv - lis + 1):liv) == suffix)
end

include("./WebSocketFix.jl")


# to fix lots of false error messages from HTTP
# https://github.com/JuliaWeb/HTTP.jl/pull/546
# we do HTTP.Stream{HTTP.Messages.Request,S} instead of just HTTP.Stream to prevent the Julia warning about incremental compilation
function HTTP.closebody(http::HTTP.Stream{HTTP.Messages.Request,S}) where S <: IO
    if http.writechunked
        http.writechunked = false
        try
            write(http.stream, "0\r\n\r\n")
        catch end
    end
end

# https://github.com/JuliaWeb/HTTP.jl/pull/609
HTTP.URIs.escapeuri(query::Union{Vector,Dict}) = isempty(query) ? HTTP.URIs.absent : join((HTTP.URIs.escapeuri(k, v) for (k, v) in query), "&")

# from https://github.com/JuliaLang/julia/pull/36425
function detectwsl()
    Sys.islinux() &&
    isfile("/proc/sys/kernel/osrelease") &&
    occursin(r"Microsoft|WSL"i, read("/proc/sys/kernel/osrelease", String))
end

function open_in_default_browser(url::AbstractString)::Bool
    try
        if Sys.isapple()
            Base.run(`open $url`)
            true
        elseif Sys.iswindows() || detectwsl()
            Base.run(`powershell.exe Start $url`)
            true
        elseif Sys.islinux()
            Base.run(`xdg-open $url`)
            true
        else
            false
        end
    catch ex
        false
    end
end

isurl(s::String) = startswith(s, "http://") || startswith(s, "https://")

"""
    Pluto.run()

Start Pluto!

## Keyword arguments
You can configure some of Pluto's more technical behaviour using keyword arguments, but this is mostly meant to support testing and strange setups like Docker. If you want to do something exciting with Pluto, you can probably write a creative notebook to do it!

    Pluto.run(; kwargs...)

For the full list, see the [`Pluto.Configuration`](@ref) module. Some **common parameters**:

- `launch_browser`: Optional. Whether to launch the system default browser. Disable this on SSH and such.
- `host`: Optional. The default `host` is `"127.0.0.1"`. For wild setups like Docker and heroku, you might need to change this to `"0.0.0.0"`.
- `port`: Optional. The default `port` is `1234`.

## Technobabble

This will start the static HTTP server and a WebSocket server. The server runs _synchronously_ (i.e. blocking call) on `http://[host]:[port]/`.
Pluto notebooks can be started from the main menu in the web browser.
"""
function run(; kwargs...)
    options = Configuration.from_flat_kwargs(; kwargs...)
    run(options)
end

function run(options::Configuration.Options)
    session = ServerSession(;options=options)
    run(session)
end

# Deprecation errors

function run(host::String, port::Union{Nothing,Integer}=nothing; kwargs...)
    @error "Deprecated in favor of:
    
        run(;host=$host, port=$port)
    "
end

function run(port::Integer; kwargs...)
    @error "Oopsie! This is the old command to launch Pluto. The new command is:
    
        Pluto.run()
    
    without the port as argument - it will choose one automatically. If you need to specify the port, use:

        Pluto.run(port=$port)
    "
end

"""
    run(session::ServerSession)

Specifiy the [`Pluto.ServerSession`](@ref) to run the web server on, which includes the configuration. Passing a session as argument allows you to start the web server with some notebooks already running. See [`SessionActions`](@ref) to learn more about manipulating a `ServerSession`.
"""
function run(session::ServerSession)
    pluto_router = http_router_for(session)
    host = session.options.server.host
    port = session.options.server.port

    hostIP = parse(Sockets.IPAddr, host)
    if port === nothing
        port, serversocket = Sockets.listenany(hostIP, UInt16(1234))
    else
        try
            serversocket = Sockets.listen(hostIP, UInt16(port))
        catch e
            @error "Port with number $port is already in use. Use Pluto.run() to automatically select an available port."
            return
        end
    end

    kill_server = Ref{Function}(identity)

    servertask = @async HTTP.serve(hostIP, UInt16(port), stream=true, server=serversocket) do http::HTTP.Stream
        # messy messy code so that we can use the websocket on the same port as the HTTP server

        if HTTP.WebSockets.is_upgrade(http.message)
            try
                @assert is_authenticated(session, http.message)

                HTTP.WebSockets.upgrade(http) do clientstream
                    if !isopen(clientstream)
                        return
                    end
                    try
                    while !eof(clientstream)
                        # This stream contains data received over the WebSocket.
                        # It is formatted and MsgPack-encoded by send(...) in PlutoConnection.js
                        try
                            message = collect(WebsocketFix.readmessage(clientstream))
                            # TODO: view to avoid memory allocation
                            parentbody = unpack(message)

                            process_ws_message(session, parentbody, clientstream)
                        catch ex
                            if ex isa InterruptException
                                kill_server[]()
                            elseif ex isa HTTP.WebSockets.WebSocketError || ex isa EOFError
                                # that's fine!
                            elseif ex isa InexactError
                                # that's fine! this is a (fixed) HTTP.jl bug: https://github.com/JuliaWeb/HTTP.jl/issues/471
                                # TODO: remove this switch
                            else
                                bt = stacktrace(catch_backtrace())
                                @warn "Reading WebSocket client stream failed for unknown reason:" exception = (ex, bt)
                            end
                        end
                    end
                    catch ex
                        if ex isa InterruptException
                            kill_server[]()
                        else
                            bt = stacktrace(catch_backtrace())
                            @warn "Reading WebSocket client stream failed for unknown reason:" exception = (ex, bt)
                        end
                    end
                end
            catch ex
                if ex isa InterruptException
                    kill_server[]()
                elseif ex isa Base.IOError
                    # that's fine!
                elseif ex isa ArgumentError && occursin("stream is closed", ex.msg)
                    # that's fine!
                elseif ex isa AssertionError && occursin("is_authenticated", ex.msg)
                    # That's fine!
                else
                    bt = stacktrace(catch_backtrace())
                    @warn "HTTP upgrade failed for unknown reason" exception = (ex, bt)
                end
            end
        else
            request::HTTP.Request = http.message
            request.body = read(http)
            HTTP.closeread(http)

            # If a "token" url parameter is passed in from binder, then we store it to add to every URL (so that you can share the URL to collaborate).
            params = HTTP.queryparams(HTTP.URI(request.target))
            if haskey(params, "token") && session.binder_token === nothing 
                session.binder_token = params["token"]
            end

            request_body = IOBuffer(HTTP.payload(request))
            if eof(request_body)
                # no request body
                response_body = HTTP.handle(pluto_router, request)
            else
                @warn "HTTP request contains a body, huh?" request_body
            end
    
            request.response::HTTP.Response = response_body
            request.response.request = request
            try
                HTTP.startwrite(http)
                write(http, request.response.body)
                HTTP.closewrite(http)
            catch e
                if isa(e, Base.IOError) || isa(e, ArgumentError)
                    # @warn "Attempted to write to a closed stream at $(request.target)"
                else
                    rethrow(e)
                end
            end
        end
    end

    address = pretty_address(session, hostIP, port)

    println()
    if session.options.server.launch_browser && open_in_default_browser(address)
        println("Opening $address in your default browser... ~ have fun!")
    else
        println("Go to $address in your browser to start writing ~ have fun!")
    end
    println()
    println("Press Ctrl+C in this terminal to stop Pluto")
    println()

    kill_server[] = () -> @sync begin
        println("\n\nClosing Pluto... Restart Julia for a fresh session. \n\nHave a nice day! 🎈")
        @async close(serversocket)
        # TODO: HTTP has a kill signal?
        # TODO: put do_work tokens back 
        for client in values(session.connected_clients)
            @async close(client.stream)
        end
        empty!(session.connected_clients)
        for (notebook_id, ws) in WorkspaceManager.workspaces
            @async WorkspaceManager.unmake_workspace(ws)
        end
    end

    try
        # create blocking call and switch the scheduler back to the server task, so that interrupts land there
        wait(servertask)
    catch e
        if e isa InterruptException
            kill_server[]()
        elseif e isa TaskFailedException
            # nice!
        else
            rethrow(e)
        end
    end
end

function pretty_address(session::ServerSession, hostIP, port)
    root = if session.options.server.root_url === nothing
        host_str = string(hostIP)
        host_pretty = if isa(hostIP, Sockets.IPv6)
            if host_str == "::1"
                "localhost"
            else
                "[$(host_str)]"
            end
        elseif host_str == "127.0.0.1" # Assuming the other alternative is IPv4
            "localhost"
        else
            host_str
        end
        port_pretty = Int(port)
        "http://$(host_pretty):$(port_pretty)/"
    else
        @assert endswith(session.options.server.root_url, "/")
        session.options.server.root_url
    end

    Sys.set_process_title("Pluto server - $root")

    url_params = Dict{String,String}()

    if session.options.security.require_secret_for_access
        url_params["secret"] = session.secret
    end
    fav_notebook = session.options.server.notebook
    new_root = if fav_notebook !== nothing
        key = isurl(fav_notebook) ? "url" : "path"
        url_params[key] = string(fav_notebook)
        root * "open"
    else
        root
    end
    merge(HTTP.URIs.URI(new_root), query=url_params) |> string
end

"All messages sent over the WebSocket get decoded+deserialized and end up here."
function process_ws_message(session::ServerSession, parentbody::Dict, clientstream::IO)
    client_id = Symbol(parentbody["client_id"])
    client = get!(session.connected_clients, client_id, ClientSession(client_id, clientstream))
    client.stream = clientstream # it might change when the same client reconnects
    
    messagetype = Symbol(parentbody["type"])
    request_id = Symbol(parentbody["request_id"])

    args = []
    if haskey(parentbody, "notebook_id")
        notebook = let
            notebook_id = UUID(parentbody["notebook_id"])
            get(session.notebooks, notebook_id, nothing)
        end

        if messagetype === :connect
            if notebook === nothing
                messagetype === :connect || @warn "Remote notebook not found locally!"
            else
                client.connected_notebook = notebook
            end
        end
        
        push!(args, notebook)

        if haskey(parentbody, "cell_id")
            cell_id = UUID(parentbody["cell_id"])
            index = cell_index_from_id(notebook, cell_id)
            if index === nothing
                @warn "Remote cell not found locally!"
            else
                push!(args, notebook.cells[index])
            end
        end
    end

    body = parentbody["body"]

    if haskey(responses, messagetype)
        responsefunc = responses[messagetype]
        try
            responsefunc(session, body, args..., initiator=Initiator(client.id, request_id))
        catch ex
            @warn "Response function to message of type $(messagetype) failed"
            rethrow(ex)
        end
    else
        @warn "Message of type $(messagetype) not recognised"
    end
end
