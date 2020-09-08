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


"""
    run([host,] port=1234)

Start Pluto! Are you excited? I am!

## Technobabble

The default `host` is `"127.0.0.1"`. For wild setups like Docker and heroku, you might need to change this to `"0.0.0.0"`.

This will start the static HTTP server and a WebSocket server. The server runs _synchronously_ (i.e. blocking call) on `http://[host]:[port]/`. Pluto notebooks can be started from the main menu in the web browser.
"""
function run(host, port::Union{Nothing,Integer}=nothing; launchbrowser::Bool=false, session=ServerSession(), security=ServerSecurity(true))
    pluto_router = http_router_for(session, security)

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
                requestURI = http.message.target |> HTTP.URIs.unescapeuri |> HTTP.URI
                @assert endswith(requestURI.path, string(session.secret))

                HTTP.WebSockets.upgrade(http) do clientstream
                    if !isopen(clientstream)
                        return
                    end
                    try
                    while !eof(clientstream)
                        # This stream contains data received over the WebSocket.
                        # It is formatted and MsgPack-encoded by send(...) in PlutoConnection.js
                        try
                            parentbody = let
                                # For some reason, long (>256*512 bytes) WS messages get split up - `readavailable` only gives the first 256*512 
                                data = UInt8[]
                                while !endswith(data, MSG_DELIM)
                                    if eof(clientstream)
                                        if isempty(data)
                                            return
                                        end
                                        @warn "Unexpected eof after" data
                                        append!(data, MSG_DELIM)
                                        break
                                    end
                                    append!(data, readavailable(clientstream))
                                end
                                # TODO: view to avoid memory allocation
                                unpack(data[1:end - length(MSG_DELIM)])
                            end
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
                else
                    bt = stacktrace(catch_backtrace())
                    @warn "HTTP upgrade failed for unknown reason" exception = (ex, bt)
                end
            end
        else
            request::HTTP.Request = http.message
            request.body = read(http)
            HTTP.closeread(http)
    
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

    address = let
        hostPretty = (hostStr = string(hostIP)) == "127.0.0.1" ? "localhost" : hostStr
        portPretty = Int(port)
        "http://$(hostPretty):$(portPretty)/"
    end
    Sys.set_process_title("Pluto server - $address")
    println("Go to $address to start writing ~ have fun!")
    println()
    println("Press Ctrl+C in this terminal to stop Pluto")
    println()
    
    launchbrowser && @warn "Not implemented yet"

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

run(port::Union{Nothing,Integer}=nothing; kwargs...) = run("127.0.0.1", port; kwargs...)

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
