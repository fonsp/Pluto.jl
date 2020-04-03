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
    Client(id, stream, at, nothing, Channel(1024))
end

struct Initiator
    clientID::Symbol
    requestID::Symbol
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


function clientupdate_cell_output(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing)
    payload, mime = cell.output_repr, cell.repr_mime

    return UpdateMessage(:cell_output, 
            Dict(:mime => mime,
             :output => payload,
             :errormessage => cell.error_repr,
             :runtime => cell.runtime,
            ),
            notebook, cell, initiator)
end

function clientupdate_cell_input(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing)
    return UpdateMessage(:cell_input, 
        Dict(:code => cell.code), notebook, cell, initiator)
end

function clientupdate_cell_added(notebook::Notebook, cell::Cell, new_index::Integer; initiator::Union{Initiator,Missing}=missing)
    return UpdateMessage(:cell_added, 
        Dict(:index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ), notebook, cell, initiator)
end

function clientupdate_cell_deleted(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing)
    return UpdateMessage(:cell_deleted, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_cell_moved(notebook::Notebook, cell::Cell, new_index::Integer; initiator::Union{Initiator,Missing}=missing)
    return UpdateMessage(:cell_moved, 
        Dict(:index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ), notebook, cell, initiator)
end

function clientupdate_cell_running(notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing)
    return UpdateMessage(:cell_running, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_notebook_list(notebooks; initiator::Union{Initiator,Missing}=missing)

    short_paths = Dict()

    notebookpaths = map(values(notebooks)) do notebook
        pathsep = Sys.iswindows() ? '\\' : '/'
        path_split = split(notebook.path, pathsep)
        if path_split[1] == ""
            path_split = path_split[2:end]
        end
        NotebookPath(notebook.uuid, path_split, "", -1)
    end

    make_paths_distinct!(Set(notebookpaths))

    short_paths = Dict(map(notebookpaths) do np
        np.uuid => np.current_path
    end...)

    update = UpdateMessage(:notebook_list,
        Dict(:notebooks => [Dict(
                :uuid => string(notebook.uuid),
                :path => notebook.path,
                :shortpath => short_paths[notebook.uuid]
                ) for notebook in values(notebooks)]), nothing, nothing, initiator)
end                