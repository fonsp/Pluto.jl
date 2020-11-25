import UUIDs: UUID, uuid1
import .Configuration

###
# CLIENT
###

mutable struct ClientSession
    id::Symbol
    stream::Any
    connected_notebook::Union{Notebook,Nothing}
    pendingupdates::Channel
end

ClientSession(id::Symbol, stream) = let
    ClientSession(id, stream, nothing, Channel(1024))
end

"A combination of _client ID_ and a _request ID_. The front-end generates a unqique ID for every request that it sends. The back-end (the stuff you are currently reading) can respond to a specific request. In that case, the response does not go through the normal message handlers in the front-end, but it flies directly to the place where the message was sent. (It resolves the promise returned by `send(...)`.)"
struct Initiator
    client::ClientSession
    request_id::Symbol
end
function Base.getproperty(initiator::Initiator, property::Symbol)
    if property == :client_id
        getfield(initiator, :client).id
    # elseif property == :request_id
    #     getfield(initiator, :request).id
    else
        getfield(initiator, property)
    end
end

###
# SERVER
###

"""
The `ServerSession` keeps track of:

- `connected_clients`: connected (web) clients
- `notebooks`: running notebooks
- `secret`: the web access token
- `options`: global pluto configuration `Options` for this session.
"""
Base.@kwdef mutable struct ServerSession
    connected_clients::Dict{Symbol,ClientSession} = Dict{Symbol,ClientSession}()
    notebooks::Dict{UUID,Notebook} = Dict{UUID,Notebook}()
    secret::String = String(rand(('a':'z') ∪ ('A':'Z') ∪ ('0':'9'), 8))
    binder_token::Union{String,Nothing} = nothing
    options::Configuration.Options = Configuration.Options()
end

###
# UPDATE MESSAGE
###

struct UpdateMessage
    type::Symbol
    message::Any
    notebook::Union{Notebook,Nothing}
    cell::Union{Cell,Nothing}
    initiator::Union{Initiator,Missing}
end

UpdateMessage(type::Symbol, message::Any) = UpdateMessage(type, message, nothing, nothing, missing)
UpdateMessage(type::Symbol, message::Any, notebook::Notebook) = UpdateMessage(type, message, notebook, nothing, missing)

function clientupdate_notebook_list(notebooks; initiator::Union{Initiator,Missing}=missing)
    UpdateMessage(:notebook_list,
        Dict(
            :notebooks => [
                Dict(
                    :notebook_id => notebook.notebook_id,
                    :path => notebook.path,
                    :in_temp_dir => startswith(notebook.path, new_notebooks_directory()),
                    :shortpath => basename(notebook.path)
                ) for notebook in values(notebooks)
            ]
        ), nothing, nothing, initiator)
end                