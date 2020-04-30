import JSON
import UUIDs: UUID
import HTTP
import Sockets

import Base: endswith
function endswith(vec::Vector{T}, suffix::Vector{T}) where T
    local liv = lastindex(vec)
    local lis = lastindex(suffix)
    liv >= lis && (view(vec, (liv-lis + 1):liv) == suffix)
end

const connectedclients = Dict{Symbol,Client}()
const notebooks = Dict{UUID,Notebook}()

"Send `messages` to all clients connected to the `notebook`."
function putnotebookupdates!(notebook::Notebook, messages::UpdateMessage...)
    listeners = filter(collect(values(connectedclients))) do c
        c.connected_notebook !== nothing &&
        c.connected_notebook.uuid == notebook.uuid
    end
    if isempty(listeners)
        @info "no clients connected to this notebook!"
    else
        for next_to_send in messages, client in listeners
            put!(client.pendingupdates, next_to_send)
        end
    end
    flushallclients(listeners)
    listeners
end

"Send `messages` to all connected clients."
function putplutoupdates!(messages::UpdateMessage...)
    listeners = collect(values(connectedclients))
    if isempty(listeners)
        @info "no clients connected to pluto!"
    else
        for next_to_send in messages, client in listeners
            put!(client.pendingupdates, next_to_send)
        end
    end
    flushallclients(listeners)
    listeners
end

"Send `messages` to a `client`."
function putclientupdates!(client::Client, messages::UpdateMessage...)
    for next_to_send in messages
        put!(client.pendingupdates, next_to_send)
    end
    flushclient(client)
end

"Send `messages` to the `Client` who initiated."
function putclientupdates!(initiator::Initiator, messages::UpdateMessage...)
    putclientupdates!(connectedclients[initiator.clientID], messages...)
end

# https://github.com/JuliaWeb/HTTP.jl/issues/382
const flushtoken = Channel{Nothing}(1)
put!(flushtoken, nothing)

function flushclient(client::Client)
    didsomething = false
    while isready(client.pendingupdates)
        next_to_send = take!(client.pendingupdates)
        didsomething = true
        
        token = take!(flushtoken)
        try
            if client.stream !== nothing
                if isopen(client.stream)
                    write(client.stream, serialize_message(next_to_send))
                else
                    @info "Client $(client.id) stream closed."
                    put!(flushtoken, token)
                    return false
                end
            end
        catch ex
            bt = stacktrace(catch_backtrace())
            @warn "Failed to write to WebSocket of $(client.id) " exception=(ex,bt)
            put!(flushtoken, token)
            return false
        end
        put!(flushtoken, token)
    end
    true
end

function flushallclients(subset::Union{Set{Client}, AbstractArray{Client}})
    disconnected = Set{Symbol}()
    for client in subset
        stillconnected = flushclient(client)
        if !stillconnected
            push!(disconnected, client.id)
        end
    end
    for to_deleteID in disconnected
        delete!(connectedclients, to_deleteID)
    end
end

function flushallclients()
    flushallclients(values(connectedclients))
end


"Will hold all 'response handlers': functions that respond to a WebSocket request from the client. These are defined in `src/webserver/Dynamic.jl`."
responses = Dict{Symbol,Function}()

const MSG_DELIM = "IUUQ.km jt ejggjdvmu vhi" # riddle me this, Julius

"""Start a Pluto server _synchronously_ (i.e. blocking call) on `http://localhost:[port]/`.

This will start the static HTTP server and a WebSocket server. Pluto Notebooks will be started dynamically (by user input)."""
function run(port = 1234, launchbrowser = false)
    serversocket = Sockets.listen(UInt16(port))
    @async HTTP.serve(Sockets.localhost, UInt16(port), stream = true, server = serversocket) do http::HTTP.Stream
        # messy messy code so that we can use the websocket on the same port as the HTTP server

        if HTTP.WebSockets.is_upgrade(http.message)
            try
                HTTP.WebSockets.upgrade(http) do clientstream
                    if !isopen(clientstream)
                        return
                    end
                    while !eof(clientstream)
                        # This stream contains data received over the WebSocket.
                        # It is formatted and JSON-encoded by send(...) in editor.html
                        try
                            parentbody = let
                                # For some reason, long (>256*512 bytes) WS messages get split up - `readavailable` only gives the first 256*512 
                                data = ""
                                while !endswith(data, MSG_DELIM)
                                    data = data * String(readavailable(clientstream))
                                end
                                JSON.parse(SubString(data, 1:(lastindex(data)-length(MSG_DELIM))))
                            end
                            process_ws_message(parentbody, clientstream)
                        catch ex
                            if ex isa InterruptException
                                rethrow(ex)
                            elseif ex isa HTTP.WebSockets.WebSocketError
                                # that's fine!
                            elseif ex isa InexactError
                                # that's fine! this is a (fixed) HTTP.jl bug: https://github.com/JuliaWeb/HTTP.jl/issues/471
                                # TODO: remove this switch
                            else
                                bt = stacktrace(catch_backtrace())
                                @warn "Reading WebSocket client stream failed for unknown reason:" exception=(ex,bt)
                            end
                        end
                    end
                end
            catch ex
                if ex isa InterruptException
                    rethrow(ex)
                elseif ex isa Base.IOError
                    # that's fine!
                elseif ex isa ArgumentError && occursin("stream is closed", ex.msg)
                    # that's fine!
                else
                    bt = stacktrace(catch_backtrace())
                    @warn "HTTP upgrade failed for unknown reason" exception=(ex,bt)
                end
            end
        else
            request::HTTP.Request = http.message
            request.body = read(http)
            HTTP.closeread(http)
    
            request_body = IOBuffer(HTTP.payload(request))
            if eof(request_body)
                # no request body
                response_body = HTTP.handle(PLUTOROUTER, request)
            else
                # there's a body, so pass it on to the handler we dispatch to
                response_body = HTTP.handle(PLUTOROUTER, request, JSON.parse(request_body))
            end
    
            request.response::HTTP.Response = response_body
            request.response.request = request
            try
                HTTP.startwrite(http)
                write(http, request.response.body)
            catch e
                if isa(e, HTTP.IOError) || isa(e, ArgumentError)
                    @warn "Attempted to write to a closed stream at $(request.target)"
                else
                    rethrow(e)
                end
            end
        end
    end

    println("Go to http://localhost:$(port)/ to start writing ~ have fun!")
    println()
    println("Press Ctrl+C in this terminal to stop Pluto")
    println()
    
    launchbrowser && @warn "Not implemented yet"

    
    # create blocking call:
    try
        while true
            sleep(typemax(UInt64))
        end
    catch e
        if isa(e, InterruptException)
            println("\n\nClosing Pluto... Restart Julia for a fresh session. \n\nHave a nice day! 🎈")
            close(serversocket)
            # TODO: HTTP has a kill signal?
            # TODO: put do_work tokens back 
            empty!(notebooks)
            for client in values(connectedclients)
                @async close(client.stream)
            end
            empty!(connectedclients)
            for (uuid, ws) in WorkspaceManager.workspaces
                WorkspaceManager.unmake_workspace(ws)
            end
        else
            rethrow(e)
        end
    end
end

function process_ws_message(parentbody::Dict{String, Any}, clientstream::HTTP.WebSockets.WebSocket)
    client = let
        clientID = Symbol(parentbody["clientID"])
        Client(clientID, clientstream)
    end
    # add to our list of connected clients
    connectedclients[client.id] = client
    
    messagetype = Symbol(parentbody["type"])
    requestID = Symbol(parentbody["requestID"])

    if messagetype == :disconnect
        delete!(connectedclients, client.id)
        close(clientstream)
    else
        body = parentbody["body"]

        args = []
        if haskey(parentbody, "notebookID")
            notebook = let
                notebookID = UUID(parentbody["notebookID"])
                get(notebooks, notebookID, nothing)
            end
            if notebook === nothing
                messagetype === :connect || @warn "Remote notebook not found locally!"
            else
                client.connected_notebook = notebook
                push!(args, notebook)
            end
        end

        if haskey(parentbody, "cellID")
            cell = let
                cellID = UUID(parentbody["cellID"])
                selectcell_byuuid(notebook, cellID)
            end
            if cell === nothing
                @warn "Remote cell not found locally!"
            else
                push!(args, cell)
            end
        end
        
        if haskey(responses, messagetype)
            responsefunc = responses[messagetype]
            try
                responsefunc(body, args..., initiator=Initiator(client.id, requestID))
            catch ex
                @warn "Response function to message of type $(messagetype) failed"
                rethrow(ex)
            end
        else
            @warn "Message of type $(messagetype) not recognised"
        end
    end
end