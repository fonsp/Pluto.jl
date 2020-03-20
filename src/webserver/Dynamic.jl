import JSON

struct UpdateMessage
    type::Symbol
    message::Any
    notebook::Union{Notebook,Nothing}
    cell::Union{Cell,Nothing}
    initiator::Union{Client,Nothing}
end

UpdateMessage(type::Symbol, message::Any) = UpdateMessage(type, message, nothing, nothing, nothing)
UpdateMessage(type::Symbol, message::Any, notebook::Notebook) = UpdateMessage(type, message, notebook, nothing, nothing)


function serialize_message(message::UpdateMessage)
    to_send = Dict(:type => message.type, :message => message.message)
    if message.notebook !== nothing
        to_send[:notebookID] = string(message.notebook.uuid)
    end
    if message.cell !== nothing
        to_send[:cellID] = string(message.cell.uuid)
    end
    if message.initiator !== nothing
        to_send[:initiatorID] = string(message.initiator.id)
    end

    JSON.json(to_send)
end


function clientupdate_cell_output(initiator::Client, notebook::Notebook, cell::Cell)
    payload, mime = format_output(cell.output)

    return UpdateMessage(:cell_output, 
            Dict(:mime => mime,
             :output => payload,
             :errormessage => cell.errormessage,
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

function clientupdate_notebook_list(initiator::Client, notebook_list)
    return UpdateMessage(:notebook_list,
        Dict(:notebooks => [Dict(:uuid => string(notebook.uuid),
            :path => notebook.path,
        ) for notebook in notebook_list]), nothing, nothing, initiator)
end




function handle_changecell(initiator, notebook, cell, newcode)
    # i.e. Ctrl+Enter was pressed on this cell
    # we update our `Notebook` and start execution

    # don't reparse when code is identical (?)
    if cell.code != newcode
        cell.code = newcode
        cell.parsedcode = nothing
    end

    putnotebookupdates!(notebook, clientupdate_cell_input(initiator, notebook, cell))

    # TODO: evaluation async
    @time to_update = run_reactive!(initiator, notebook, cell)
    
    # TODO: feedback to user about File IO
    save_notebook(notebook)
end



# TODO: actions on the notebook are not thread safe
addresponse(:addcell) do (initiator, body, notebook)
    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)

    new_cell = createcell_fromcode("")

    insert!(notebook.cells, new_index, new_cell)

    putnotebookupdates!(notebook, clientupdate_cell_added(initiator, notebook, new_cell, new_index))
    nothing
end

addresponse(:deletecell) do (initiator, body, notebook, cell)    
    to_delete = cell

    changecell_succes = handle_changecell(initiator, notebook, to_delete, "")
    
    filter!(c->c.uuid ≠ to_delete.uuid, notebook.cells)

    putnotebookupdates!(notebook, clientupdate_cell_deleted(initiator, notebook, to_delete))
    nothing
end

addresponse(:movecell) do (initiator, body, notebook, cell)
    to_move = cell

    # Indexing works as if a new cell is added.
    # e.g. if the third cell (at julia-index 3) of [0, 1, 2, 3, 4]
    # is moved to the end, that would be new julia-index 6

    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)
    old_index = findfirst(isequal(to_move), notebook.cells)

    # Because our cells run in _topological_ order, we don't need to reevaluate anything.
    if new_index < old_index
        deleteat!(notebook.cells, old_index)
        insert!(notebook.cells, new_index, to_move)
    elseif new_index > old_index + 1
        insert!(notebook.cells, new_index, to_move)
        deleteat!(notebook.cells, old_index)
    end

    putnotebookupdates!(notebook, clientupdate_cell_moved(initiator, notebook, to_move, new_index))
    nothing
end

addresponse(:changecell) do (initiator, body, notebook, cell)
    newcode = body["code"]

    handle_changecell(initiator, notebook, cell, newcode)
    nothing
end


# TODO:
# addresponse(:getcell) do (initiator, body, notebook, cell)
    
# end

addresponse(:getallcells) do (initiator, body, notebook)
    # TODO: 
    updates = []
    for (i, cell) in enumerate(notebook.cells)
        push!(updates, clientupdate_cell_added(initiator, notebook, cell, i))
        push!(updates, clientupdate_cell_input(initiator, notebook, cell))
        push!(updates, clientupdate_cell_output(initiator, notebook, cell))
    end
    # [clientupdate_cell_added(notebook, c, i) for (i, c) in enumerate(notebook.cells)]

    updates
end

addresponse(:getallnotebooks) do (initiator, body)
    [clientupdate_notebook_list(initiator, values(notebooks))]
end