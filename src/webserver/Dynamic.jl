import UUIDs: uuid1


"Will hold all 'response handlers': functions that respond to a WebSocket request from the client. These are defined in `src/webserver/Dynamic.jl`."
const responses = Dict{Symbol,Function}()

function change_remote_cellinput!(session::ServerSession, notebook::Notebook, cell::Cell, newcode; initiator::Union{Initiator,Missing}=missing)
    # i.e. Shift+Enter was pressed on this cell
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
        :options => session.options,
        :version_info => Dict(
            :pluto => PLUTO_VERSION_STR,
            :julia => JULIA_VERSION_STR,
        ),
    ), nothing, nothing, initiator))
end

responses[:ping] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, UpdateMessage(:pong, Dict(), nothing, nothing, initiator))
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

    to_delete.code_folded = true
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
    putnotebookupdates!(session, notebook, clientupdate_cell_queued(notebook, cell, initiator=initiator))
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
    result = SessionActions.move(session, notebook, newpath)
    update = UpdateMessage(:move_notebook_result, result, notebook, nothing, initiator)
    putclientupdates!(session, initiator, update)
end

responses[:interrupt_all] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    success = WorkspaceManager.interrupt_workspace((session, notebook))
    # TODO: notify user whether interrupt was successful (i.e. whether they are using a `ProcessWorkspace`)
end

responses[:shutdown_notebook] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    SessionActions.shutdown(session, notebook; keep_in_session=body["keep_in_session"])
end

responses[:set_bond] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    bound_sym = Symbol(body["sym"])
    new_val = body["val"]

    variable_exists = is_assigned_anywhere(notebook, notebook.topology, bound_sym)
    if variable_exists
        any_dependents = is_referenced_anywhere(notebook, notebook.topology, bound_sym)
        
        # Assume `body["is_first_value"] == false` if you want to skip an edge case in this code
        cancel_run_early = if body["is_first_value"]
            # fix for https://github.com/fonsp/Pluto.jl/issues/275
            # if `Base.get` was defined to give an initial value (read more about this in the Interactivity sample notebook), then we want to skip the first value sent back from the bond. (if `Base.get` was not defined, then the variable has value `missing`)
            
            # check if the variable does not already have that value.
            # because if the initial value is already set, then we don't want to run dependent cells again.
            eq_tester = :(try !ismissing($bound_sym) && ($bound_sym == $new_val) catch; false end) # not just a === comparison because JS might send back the same value but with a different type (Float64 becomes Int64 in JS when it's an integer.)
            WorkspaceManager.eval_fetch_in_workspace((session, notebook), eq_tester)
        else
            false
        end
    
        reponse = Dict(body..., "triggered_other_cells" => any_dependents && (!cancel_run_early))
        
        putnotebookupdates!(session, notebook, UpdateMessage(:bond_update, reponse, notebook, nothing, initiator))
        
        if !cancel_run_early
            function custom_deletion_hook((session, notebook)::Tuple{ServerSession,Notebook}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::Array{Cell,1})
                push!(to_delete_vars, bound_sym) # also delete the bound symbol
                WorkspaceManager.delete_vars((session, notebook), to_delete_vars, funcs_to_delete, to_reimport)
                WorkspaceManager.eval_in_workspace((session, notebook), :($bound_sym = $new_val))
            end
            to_reeval = where_referenced(notebook, notebook.topology, Set{Symbol}([bound_sym]))

            update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, run_async=true, save=false, persist_js_state=true)
        end
    else
        # a bond was set while the cell is in limbo state
        # we don't need to do anything
    end
end

responses[:reshow_cell] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    run = WorkspaceManager.format_fetch_in_workspace((session, notebook), cell.cell_id, ends_with_semicolon(cell.code), parse(PlutoRunner.ObjectID, body["object_id"], base=16))
    set_output!(cell, run)
    # send to all clients, why not
    putnotebookupdates!(session, notebook, clientupdate_cell_output(notebook, cell))
end