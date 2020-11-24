import UUIDs: uuid1


"Will hold all 'response handlers': functions that respond to a WebSocket request from the client. These are defined in `src/webserver/Dynamic.jl`."
const responses = Dict{Symbol,Function}()

responses[:connect] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, UpdateMessage(:👋, Dict(
        :notebook_exists => (notebook !== nothing),
        :options => session.options,
        :version_info => Dict(
            :pluto => PLUTO_VERSION_STR,
            :julia => JULIA_VERSION_STR,
        ),
        # :notebook => notebook === nothing ? nothing : notebook_to_js(notebook),
    ), nothing, nothing, initiator))
end

responses[:ping] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putclientupdates!(session, initiator, UpdateMessage(:pong, Dict(), nothing, nothing, initiator))
end

responses[:run_multiple_cells] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    # indices = cell_index_from_id.([notebook], UUID.(body["cells"]))
    # cells = [notebook.cells[i] for i in indices if i !== nothing]
    # @info "Run multiple cells" cells indices
    uuids = UUID.(body["cells"])
    cells = map(uuids) do uuid
        notebook.cell_dict[uuid]
    end
    # save=true fixes the issue where "Submit all changes" or `Ctrl+S` has no effect.
    update_save_run!(session, notebook, cells; run_async=true, save=true)
end

responses[:get_all_notebooks] = (session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing) -> let
    putplutoupdates!(session, clientupdate_notebook_list(session.notebooks, initiator=initiator))
end

responses[:interrupt_all] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    success = WorkspaceManager.interrupt_workspace((session, notebook))
    # TODO: notify user whether interrupt was successful (i.e. whether they are using a `ProcessWorkspace`)
end

responses[:shutdown_notebook] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    SessionActions.shutdown(session, notebook; keep_in_session=body["keep_in_session"])
end


responses[:reshow_cell] = (session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing) -> let
    run = WorkspaceManager.format_fetch_in_workspace((session, notebook), cell.cell_id, ends_with_semicolon(cell.code), (parse(PlutoRunner.ObjectID, body["objectid"], base=16), convert(Int64, body["dim"])))
    set_output!(cell, run)
    # send to all clients, why not
    send_notebook_changes!(NotebookRequest(session, notebook, body, initiator))
end

# UPDATE STUFF

Base.@kwdef struct NotebookRequest
    session::ServerSession
    notebook::Notebook
    message::Any=nothing
    initiator::Union{Initiator,Nothing,Missing}=nothing
    client::Union{ClientSession,Nothing}=nothing
end

# Yeah I am including a Pluto Notebook!!
module Firebase include("./FirebaseSimple.jl") end

function notebook_to_js(notebook::Notebook)
    return Dict(
        :notebook_id => notebook.notebook_id,
        :path => notebook.path,
        :in_temp_dir => startswith(notebook.path, new_notebooks_directory()),
        :shortpath => basename(notebook.path),
        :cell_dict => Dict(map(collect(notebook.cell_dict)) do (id, cell)
            id => Dict(
                :cell_id => cell.cell_id,
                :code => cell.code,
                :code_folded => cell.code_folded,
            )
        end),
        :cells_running => Dict(map(collect(notebook.cell_dict)) do (id, cell)
            id => Dict(
                :cell_id => cell.cell_id,
                :queued => cell.queued,
                :running => cell.running,
                :errored => cell.errored,
                :runtime => ismissing(cell.runtime) ? nothing : cell.runtime,
                :output => Dict(                
                    :last_run_timestamp => cell.last_run_timestamp,
                    :persist_js_state => cell.persist_js_state,
                    :mime => cell.repr_mime,
                    :body => cell.output_repr,
                    :rootassignee => cell.rootassignee,
                ),
            )
        end),
        :cell_order => notebook.cell_order,
        :bonds => Dict(notebook.bonds),     
    )
end

global current_state_for_clients = WeakKeyDict{ClientSession,Any}()
function send_notebook_changes!(request::NotebookRequest)
    for (_, client) in request.session.connected_clients
        if client.connected_notebook !== nothing && client.connected_notebook.notebook_id == request.notebook.notebook_id
            notebook_dict = notebook_to_js(request.notebook)
            current_dict = get(current_state_for_clients, client, :empty)
            @info "current_dict:" current_dict
            patches = Firebase.diff(current_dict, notebook_dict)
            local patches_as_dict::Array{Dict} = patches

            @info "Patches:" patches
            current_state_for_clients[client] = notebook_dict

            if length(patches) != 0
                initiator = isnothing(request.initiator) ? missing : request.initiator
                putclientupdates!(client, UpdateMessage(:notebook_diff, patches_as_dict, request.notebook, nothing, initiator))
            end
        end
    end
end


function update_notebook(request::NotebookRequest)
    notebook = request.notebook
    
    # if !haskey(current_state_for_clients, request.client)
    #     current_state_for_clients[request.client] = nothing
    # end

    code_changed = false
    file_changed = false

    for update in request.message["updates"]
        local operation = Symbol(update["op"])
        local path = Tuple(update["path"])
        local value = haskey(update, "value") ? update["value"] : nothing

        @assert operation in [:add, :replace, :remove] "Operation $(operation) unknown"

        if length(path) == 1 && path[1] == "path"
            @assert operation == :replace
            newpath = tamepath(value)
            notebook.path = newpath
            @info "Newpath:" newpath
            SessionActions.move(request.session, notebook, newpath)
        elseif length(path) == 1 && path[1] == "in_temp_dir"
            nothing
        elseif length(path) == 3 && path[1] == "cell_dict"
            file_changed = true
            code_changed = true

            @assert operation == :replace "You can only :replace on cells, you tried :$(operation)"
            property = Symbol(path[3])
            cell_id = UUID(path[2])
            # cell_index = c(notebook, cell_id)
            cell = notebook.cell_dict[cell_id]
            setproperty!(cell, property, value)

            if property == :code
                cell.parsedcode = nothing
                code_changed = true
            end
        elseif length(path) == 2 && path[1] == "cell_dict"
            file_changed = true
            code_changed = true

            if operation == :add
                cell_id = UUID(path[2])
                notebook.cell_dict[cell_id] = value
            elseif operation == :remove
                cell_id = UUID(path[2])
                delete!(notebook.cell_dict, cell_id)
            else
                throw("Tried :$(operation) on a whole cell, but you can only :add or :remove")
            end
        elseif length(path) == 1 && path[1] == "cell_order"
            file_changed = true

            @assert operation == :replace
            notebook.cell_order = value
        elseif length(path) == 2 && path[1] == "bonds"
            name = Symbol(path[2])
            notebook.bonds[name] = value
            @info "Bond" name value
            refresh_bond(session=request.session, notebook=notebook, name=name)
            @info "Refreshed bond..."
        else
            throw("Path :$(path[1]) not yet implemented")
        end
    end

    # if code_changed ????

    # end

    if file_changed
        save_notebook(notebook)
    end

    send_notebook_changes!(request)
end

responses[:update_notebook] = (session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing) -> let
    update_notebook(NotebookRequest(session=session, message=body, notebook=notebook, initiator=initiator))
end


function refresh_bond(; session::ServerSession, notebook::Notebook, name::Symbol)
    bound_sym = name

    variable_exists = is_assigned_anywhere(notebook, notebook.topology, bound_sym)
    if variable_exists
        any_dependents = is_referenced_anywhere(notebook, notebook.topology, bound_sym)
        
        # Assume `body["is_first_value"] == false` if you want to skip an edge case in this code
        # cancel_run_early = if body["is_first_value"]
        #     # fix for https://github.com/fonsp/Pluto.jl/issues/275
        #     # if `Base.get` was defined to give an initial value (read more about this in the Interactivity sample notebook), then we want to skip the first value sent back from the bond. (if `Base.get` was not defined, then the variable has value `missing`)
            
        #     # check if the variable does not already have that value.
        #     # because if the initial value is already set, then we don't want to run dependent cells again.
        #     eq_tester = :(try !ismissing($bound_sym) && ($bound_sym == $new_val) catch; false end) # not just a === comparison because JS might send back the same value but with a different type (Float64 becomes Int64 in JS when it's an integer.)
        #     WorkspaceManager.eval_fetch_in_workspace((session, notebook), eq_tester)
        # else
        #     false
        # end
    
        # reponse = Dict(body..., "triggered_other_cells" => any_dependents && (!cancel_run_early))
        
        # putnotebookupdates!(session, notebook, UpdateMessage(:bond_update, reponse, notebook, nothing, initiator))
        
        # if !cancel_run_early
            function custom_deletion_hook((session, notebook)::Tuple{ServerSession,Notebook}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::Array{Cell,1})
                push!(to_delete_vars, bound_sym) # also delete the bound symbol
                WorkspaceManager.delete_vars((session, notebook), to_delete_vars, funcs_to_delete, to_reimport)
                WorkspaceManager.eval_in_workspace((session, notebook), :($(bound_sym) = $(notebook.bonds[bound_sym])))
            end
            to_reeval = where_referenced(notebook, notebook.topology, Set{Symbol}([bound_sym]))

            update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, run_async=true, save=false, persist_js_state=true)
        # end
    else
        # a bond was set while the cell is in limbo state
        # we don't need to do anything
    end
end