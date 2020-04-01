mutable struct Client
    id::Symbol
    stream::Any
    stream_accesstoken::Channel{Nothing}
    connected_notebook::Union{Notebook,Nothing}
    pendingupdates::Channel
end

Client(id::Symbol, stream) = let
    at = Channel{Nothing}(1)
    put!(at, nothing)
    Client(id, stream, at, nothing, Channel(128))
end


struct UpdateMessage
    type::Symbol
    message::Any
    notebook::Union{Notebook,Nothing}
    cell::Union{Cell,Nothing}
    initiator::Union{Client,Nothing}
end

UpdateMessage(type::Symbol, message::Any) = UpdateMessage(type, message, nothing, nothing, nothing)
UpdateMessage(type::Symbol, message::Any, notebook::Notebook) = UpdateMessage(type, message, notebook, nothing, nothing)


function clientupdate_cell_output(initiator::Client, notebook::Notebook, cell::Cell)
    payload, mime = cell.output_repr, cell.repr_mime

    return UpdateMessage(:cell_output, 
            Dict(:mime => mime,
             :output => payload,
             :errormessage => cell.error_repr,
             :runtime => cell.runtime,
            ),
            notebook, cell, initiator)
end

function clientupdate_cell_input(initiator::Client, notebook::Notebook, cell::Cell)
    return UpdateMessage(:cell_input, 
        Dict(:code => cell.code), notebook, cell, initiator)
end

function clientupdate_cell_added(initiator::Client, notebook::Notebook, cell::Cell, new_index::Integer)
    return UpdateMessage(:cell_added, 
        Dict(:index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ), notebook, cell, initiator)
end

function clientupdate_cell_deleted(initiator::Client, notebook::Notebook, cell::Cell)
    return UpdateMessage(:cell_deleted, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_cell_moved(initiator::Client, notebook::Notebook, cell::Cell, new_index::Integer)
    return UpdateMessage(:cell_moved, 
        Dict(:index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ), notebook, cell, initiator)
end

function clientupdate_cell_dependecies(initiator::Client, notebook::Notebook, cell::Cell, dependentcells)
    return UpdateMessage(:cell_dependecies, 
        Dict(:depenentcells => [string(c.uuid) for c in dependentcells],
            ), notebook, cell, initiator)
end

function clientupdate_cell_running(initiator::Client, notebook::Notebook, cell::Cell)
    return UpdateMessage(:cell_running, 
        Dict(), notebook, cell, initiator)
end