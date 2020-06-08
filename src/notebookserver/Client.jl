mutable struct Client
    id::Symbol
    stream::Any
    connected_notebook::Union{Notebook,Nothing}
    pendingupdates::Channel
end

Client(id::Symbol, stream) = let
    Client(id, stream, nothing, Channel(1024))
end

struct Initiator
    client_id::Symbol
    request_id::Symbol
end


struct UpdateMessage
    type::Symbol
    message::Any
    notebook::Union{Notebook,Nothing}
    cell::Union{Cell,Nothing}
    initiator::Union{Initiator,Missing}
end

UpdateMessage(type::Symbol, message::Any) = UpdateMessage(type, message, nothing, nothing, missing)
UpdateMessage(type::Symbol, message::Any, notebook::Notebook) = UpdateMessage(type, message, notebook, nothing, missing)


function clientupdate_cell_output(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing} = missing)
    payload, mime = cell.output_repr, cell.repr_mime

    return UpdateMessage(:cell_output, 
        Dict(
            :running => cell.running,
            :runtime => cell.runtime,
            :errored => cell.errored,
            :output => Dict(
                :mime => mime,
                :body => payload,
                :rootassignee => cell.rootassignee,
            )
        ),
        notebook, cell, initiator)
end

function clientupdate_cell_input(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing} = missing)
    return UpdateMessage(:cell_input, 
        Dict(:code => cell.code, :folded => cell.code_folded), notebook, cell, initiator)
end

function clientupdate_cell_added(notebook::Notebook, cell::Cell, new_index::Integer; initiator::Union{Initiator,Missing} = missing)
    return UpdateMessage(:cell_added, 
        Dict(
            :index => new_index - 1, # 1-based index (julia) to 0-based index (js)
        ), notebook, cell, initiator)
end

function clientupdate_cell_deleted(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing} = missing)
    return UpdateMessage(:cell_deleted, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_cell_moved(notebook::Notebook, cell::Cell, new_index::Integer; initiator::Union{Initiator,Missing} = missing)
    return UpdateMessage(:cell_moved, 
        Dict(
            :index => new_index - 1, # 1-based index (julia) to 0-based index (js)
        ), notebook, cell, initiator)
end

function clientupdate_cell_running(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing} = missing)
    return UpdateMessage(:cell_running, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_cell_folded(notebook::Notebook, cell::Cell, folded::Bool; initiator::Union{Initiator,Missing} = missing)
    return UpdateMessage(:cell_folded, 
        Dict(:folded => folded), notebook, cell, initiator)
end

function clientupdate_notebook_list(notebooks; initiator::Union{Initiator,Missing} = missing)
    update = UpdateMessage(:notebook_list,
        Dict(
            :notebooks => [
                Dict(
                    :notebook_id => notebook.notebook_id,
                    :path => notebook.path,
                    :shortpath => basename(notebook.path)
                ) for notebook in values(notebooks)
            ]
        ), nothing, nothing, initiator)
end                