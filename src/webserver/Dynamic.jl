import JSON

# JSON.jl doesn't define a serialization method for MIME and UUID objects, so we these ourselves:
import JSON: lower
JSON.lower(m::MIME) = string(m)
JSON.lower(u::UUID) = string(u)

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

    JSON.print(io, to_send)
end

function serialize_message(message::UpdateMessage)
    sprint(serialize_message_to_stream, message)
end

function change_remote_cellinput!(session::ServerSession, notebook::Notebook, cell::Cell, newcode; initiator::Union{Initiator,Missing}=missing)
    # i.e. Ctrl+Enter was pressed on this cell
    # we update our `Notebook` and start execution

    # don't reparse when code is identical (?)
    if cell.code != newcode
        cell.code = newcode
        cell.parsedcode = nothing
    end
    
    putnotebookupdates!(session, notebook, clientupdate_cell_input(notebook, cell, initiator=initiator))
end

responses[:connect] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, UpdateMessage(:👋, Dict(
        :notebook_exists => (notebook !== nothing),
        :ENV => merge(ENV_DEFAULTS, filter(p -> startswith(p.first, "PLUTO"), ENV)),
    ), nothing, nothing, initiator))
end

responses[:get_version] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, UpdateMessage(:versioninfo, Dict(
        :pluto => PLUTO_VERSION_STR,
        :julia => JULIA_VERSION_STR,
    ), nothing, nothing, initiator))
end


# TODO: actions on the notebook are not thread safe
responses[:add_cell] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)

    new_cell = Cell("")
    new_cell.output_repr = "" # we 'run' the code and get this output

    insert!(notebook.cells, new_index, new_cell)
    
    putnotebookupdates!(session, notebook, clientupdate_cell_added(notebook, new_cell, new_index, initiator=initiator))
    save_notebook(notebook)
end

responses[:delete_cell] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    to_delete = cell

    # replace the cell's code with "" and do a reactive run
    change_remote_cellinput!(session, notebook, to_delete, "", initiator=initiator)
    runtask = update_save_run!(session, notebook, [to_delete]; run_async=true)::Task
    
    # wait for the reactive run to finish, then delete the cells
    # we wait async, to make sure that the web server remains responsive
    @asynclog begin
        wait(runtask)

        filter!(c -> c.cell_id ≠ to_delete.cell_id, notebook.cells)
        putnotebookupdates!(session, notebook, clientupdate_cell_deleted(notebook, to_delete, initiator=initiator))
        save_notebook(notebook) # this might be "too late", but it will save the latest version of `notebook` anyways
    end
end

responses[:move_multiple_cells] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    indices = cell_index_from_id.([notebook], UUID.(body["cells"]))
    cells = [notebook.cells[i] for i in indices if i !== nothing]

    # Indexing works as if a new cell is added.
    # e.g. if the third cell (at julia-index 3) of [0, 1, 2, 3, 4]
    # is moved to the end, that would be new julia-index 6

    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)
    old_first_index = findfirst(in(cells), notebook.cells)

    # Because our cells run in _topological_ order, we don't need to reevaluate anything.
    before = setdiff(notebook.cells[1:new_index - 1], cells)
    after = setdiff(notebook.cells[new_index:end], cells)

    notebook.cells = [before; cells; after]
    
    putnotebookupdates!(session, notebook, clientupdate_cells_moved(notebook, cells, new_index, initiator=initiator))
    save_notebook(notebook)
end

responses[:change_cell] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    newcode = body["code"]

    change_remote_cellinput!(session, notebook, cell, newcode, initiator=initiator)
    putnotebookupdates!(session, notebook, clientupdate_cell_running(notebook, cell, initiator=initiator))
    update_save_run!(session, notebook, [cell]; run_async=true)
end

responses[:fold_cell] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    newfolded = body["folded"]
    cell.code_folded = newfolded
    save_notebook(notebook)

    putnotebookupdates!(session, notebook, clientupdate_cell_folded(notebook, cell, newfolded, initiator=initiator))
end

responses[:run] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    update_save_run!(session, notebook, [cell]; run_async=true, save=false)
end

responses[:run_multiple_cells] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    indices = cell_index_from_id.([notebook], UUID.(body["cells"]))
    cells = [notebook.cells[i] for i in indices if i !== nothing]
    # save=true fixes the issue where "Submit all changes" or `Ctrl+S` has no effect.
    update_save_run!(session, notebook, cells; run_async=true, save=true)
end

responses[:getinput] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, clientupdate_cell_input(notebook, cell, initiator=initiator))
end

responses[:set_input] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    change_remote_cellinput!(session, notebook, cell, body["code"], initiator=initiator)
end

responses[:get_output] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, clientupdate_cell_output(notebook, cell, initiator=initiator))
end

responses[:get_all_cells] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    # TODO: the client's update channel might get full
    update = UpdateMessage(:cell_list,
        Dict(:cells => [Dict(
                :cell_id => string(cell.cell_id),
                ) for cell in notebook.cells]), nothing, nothing, initiator)
    
    putclientupdates!(session, initiator, update)
end

responses[:get_all_notebooks] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putplutoupdates!(session, clientupdate_notebook_list(session.notebooks, initiator=initiator))
end

responses[:move_notebook_file] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    newpath = tamepath(body["path"])
    result = try
        if isfile(newpath)
            (success = false, reason = "File exists already - you need to delete the old file manually.")
        else
            move_notebook(notebook, newpath)
            putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
            WorkspaceManager.eval_in_workspace(notebook, :(cd($(newpath |> dirname))))
            (success = true, reason = "")
        end
    catch ex
        showerror(stderr, stacktrace(catch_backtrace()))
        (success = false, reason = sprint(showerror, ex))
    end

    update = UpdateMessage(:move_notebook_result, result, notebook, nothing, initiator)
    putclientupdates!(session, initiator, update)
end

responses[:interrupt_all] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    success = WorkspaceManager.interrupt_workspace(notebook)
    # TODO: notify user whether interrupt was successful (i.e. whether they are using a `ProcessWorkspace`)
end

responses[:shut_down_workspace] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    listeners = putnotebookupdates!(session, notebook) # TODO: shutdown message
    if body["remove_from_list"]
        delete!(session.notebooks, notebook.notebook_id)
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
        for client in listeners
            @async close(client.stream)
        end
    end
    success = WorkspaceManager.unmake_workspace(notebook)
end


responses[:set_bond] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    bound_sym = Symbol(body["sym"])
    new_val = body["val"]

    body["any_dependents"] = any_dependents = !isempty(where_assigned(notebook, notebook.topology, Set{Symbol}([bound_sym])))
    putnotebookupdates!(session, notebook, UpdateMessage(:bond_update, body, notebook, nothing, initiator))
    
    if any_dependents
        function custom_deletion_hook(notebook::Notebook, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Vector{Symbol}}, to_reimport::Set{Expr}; to_run::Array{Cell,1})
            push!(to_delete_vars, bound_sym) # also delete the bound symbol
            WorkspaceManager.delete_vars(notebook, to_delete_vars, funcs_to_delete, to_reimport)
            WorkspaceManager.eval_in_workspace(notebook, :($bound_sym = $new_val))
        end
        to_reeval = where_referenced(notebook, notebook.topology, Set{Symbol}([bound_sym]))

        update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, run_async=true, save=false)
    end

end