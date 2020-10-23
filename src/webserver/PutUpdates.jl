
function serialize_message_to_stream(io::IO, message::UpdateMessage)
    to_send = Dict(:type => message.type, :message => message.message)
    if message.notebook !== nothing
        to_send[:notebook_id] = message.notebook.notebook_id
    end
    if message.cell !== nothing
        to_send[:cell_id] = message.cell.cell_id
    end
    if message.initiator !== missing
        to_send[:initiator_id] = message.initiator.client_id
        to_send[:request_id] = message.initiator.request_id
    end

    pack(io, to_send)
end

function serialize_message(message::UpdateMessage)
    sprint(serialize_message_to_stream, message)
end

"Send `messages` to all clients connected to the `notebook`."
function putnotebookupdates!(session::ServerSession, notebook::Notebook, messages::UpdateMessage...; flush::Bool=true)
    listeners = filter(collect(values(session.connected_clients))) do c
        c.connected_notebook !== nothing &&
        c.connected_notebook.notebook_id == notebook.notebook_id
    end
    for next_to_send in messages, client in listeners
        put!(client.pendingupdates, next_to_send)
    end
    flush && flushallclients(session, listeners)
    listeners
end

"Send `messages` to all connected clients."
function putplutoupdates!(session::ServerSession, messages::UpdateMessage...; flush::Bool=true)
    listeners = collect(values(session.connected_clients))
    for next_to_send in messages, client in listeners
        put!(client.pendingupdates, next_to_send)
    end
    flush && flushallclients(session, listeners)
    listeners
end

"Send `messages` to a `client`."
function putclientupdates!(client::ClientSession, messages::UpdateMessage...)
    for next_to_send in messages
        put!(client.pendingupdates, next_to_send)
    end
    flushclient(client)
    client
end

"Send `messages` to the `ClientSession` who initiated."
function putclientupdates!(session::ServerSession, initiator::Initiator, messages::UpdateMessage...)
    putclientupdates!(session.connected_clients[initiator.client_id], messages...)
end

# https://github.com/JuliaWeb/HTTP.jl/issues/382
const flushtoken = Token()

function flushclient(client::ClientSession)
    take!(flushtoken)
    while isready(client.pendingupdates)
        next_to_send = take!(client.pendingupdates)
        
        try
            if client.stream !== nothing
                if isopen(client.stream)
                    if client.stream isa HTTP.WebSockets.WebSocket
                        client.stream.frame_type = HTTP.WebSockets.WS_BINARY
                    end
                    write(client.stream, serialize_message(next_to_send))
                else
                    put!(flushtoken)
                    return false
                end
            end
        catch ex
            bt = stacktrace(catch_backtrace())
            if ex isa Base.IOError
                # client socket closed, so we return false (about 5 lines after this one)
            else
                @warn "Failed to write to WebSocket of $(client.id) " exception = (ex, bt)
            end
            put!(flushtoken)
            return false
        end
    end
    put!(flushtoken)
    true
end

function flushallclients(session::ServerSession, subset::Union{Set{ClientSession},AbstractArray{ClientSession}})
    disconnected = Set{Symbol}()
    for client in subset
        stillconnected = flushclient(client)
        if !stillconnected
            push!(disconnected, client.id)
        end
    end
    for to_deleteID in disconnected
        delete!(session.connected_clients, to_deleteID)
    end
end

function flushallclients(session::ServerSession)
    flushallclients(session, values(session.connected_clients))
end