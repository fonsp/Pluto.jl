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
        "notebook_id" => notebook.notebook_id,
        "path" => notebook.path,
        "in_temp_dir" => startswith(notebook.path, new_notebooks_directory()),
        "shortpath" => basename(notebook.path),
        "cell_dict" => Dict(map(collect(notebook.cell_dict)) do (id, cell)
            id => Dict(
                "cell_id" => cell.cell_id,
                "code" => cell.code,
                "code_folded" => cell.code_folded,
            )
        end),
        "cells_running" => Dict(map(collect(notebook.cell_dict)) do (id, cell)
            id => Dict(
                "cell_id" => cell.cell_id,
                "queued" => cell.queued,
                "running" => cell.running,
                "errored" => cell.errored,
                "runtime" => ismissing(cell.runtime) ? nothing : cell.runtime,
                "output" => Dict(                
                    "last_run_timestamp" => cell.last_run_timestamp,
                    "persist_js_state" => cell.persist_js_state,
                    "mime" => cell.repr_mime,
                    "body" => cell.output_repr,
                    "rootassignee" => cell.rootassignee,
                ),
            )
        end),
        "cell_order" => notebook.cell_order,
        "bonds" => Dict(notebook.bonds),     
    )
end

global current_state_for_clients = WeakKeyDict{ClientSession,Any}()
function send_notebook_changes!(request::NotebookRequest; response::Any=nothing)
    notebook_dict = notebook_to_js(request.notebook)
    @info "notebook_dict" notebook_dict
    for (_, client) in request.session.connected_clients
        if client.connected_notebook !== nothing && client.connected_notebook.notebook_id == request.notebook.notebook_id
            current_dict = get(current_state_for_clients, client, :empty)
            patches = Firebase.diff(current_dict, notebook_dict)
            patches_as_dict::Array{Dict} = patches
            current_state_for_clients[client] = notebook_dict

            # Make sure we do send a confirmation to the client who made the request, even without changes
            is_response = request.initiator !== nothing && client == request.initiator.client

            if length(patches) != 0 || is_response
                initiator = isnothing(request.initiator) ? missing : request.initiator
                response = Dict(
                    :patches => patches_as_dict,
                    :response => is_response ? response : nothing
                )
                putclientupdates!(client, UpdateMessage(:notebook_diff, response, request.notebook, nothing, initiator))
            end
        end
    end
end



function convert_jsonpatch(::Type{Firebase.JSONPatch}, patch_dict::Dict)
	if patch_dict["op"] == "add"
		Firebase.AddPatch(patch_dict["path"], patch_dict["value"])
	elseif patch_dict["op"] == "remove"
		Firebase.RemovePatch(patch_dict["path"])
	elseif patch_dict["op"] == "replace"
		Firebase.ReplacePatch(patch_dict["path"], patch_dict["value"])
	else
		throw(ArgumentError("Unknown operation :$(patch_dict["op"]) in Dict to JSONPatch conversion"))
	end
end

struct Wildcard end
function trigger_resolver(anything, path, values=[])
	(value=anything, matches=values, rest=path)
end
function trigger_resolver(resolvers::Dict, path, values=[])
	if length(path) == 0
		throw(BoundsError("resolver path ends at Dict with keys $(keys(resolver))"))
	end
	
	segment = path[firstindex(path)]
	rest = path[firstindex(path)+1:lastindex(path)]
	for (key, resolver) in resolvers
		if key isa Wildcard
			continue
		end
		if key == segment
			return trigger_resolver(resolver, rest, values)
		end
	end
	
	if haskey(resolvers, Wildcard())
		return trigger_resolver(resolvers[Wildcard()], rest, (values..., segment))
    else
        throw(BoundsError("failed to match path $(path), possible keys $(keys(resolver))"))
	end
end

abstract type Changed end
struct CodeChanged <: Changed end
struct FileChanged <: Changed end

const mutators = Dict(
    "path" => function(; request::NotebookRequest, patch::Firebase.ReplacePatch)
        newpath = tamepath(patch.value)
        SessionActions.move(request.session, request.notebook, newpath)
        nothing
    end,
    "in_temp_dir" => function(; _...) nothing end,
    "cell_dict" => Dict(
        Wildcard() => function(cell_id, rest; request::NotebookRequest, patch::Firebase.JSONPatch)
            # cell = request.notebook.cell_dict[UUID(cell_id)]
            Firebase.update!(request.notebook, patch)
            @info "Updating cell" patch

            if length(rest) == 0
                [CodeChanged(), FileChanged()]
            elseif length(rest) == 1 && Symbol(rest[1]) == :code
                request.notebook.cell_dict[UUID(cell_id)].parsedcode = nothing
                [CodeChanged(), FileChanged()]
            else
                [FileChanged()]
            end
        end,
    ),
    "cell_order" => function(; request::NotebookRequest, patch::Firebase.ReplacePatch)
        Firebase.update!(request.notebook, patch)
        # request.notebook.cell_order = patch.value
        return [FileChanged()]
    end,
    "bonds" => Dict(
        Wildcard() => function(name; request::NotebookRequest, patch::Firebase.JSONPatch)
            # @assert patch isa Firebase.ReplacePatch || patch isa Firebase.AddPatch
            name = Symbol(name)
            # request.notebook.bonds[name] = patch.value
            Firebase.update!(request.notebook, patch)
            @info "Bond" name patch.value
            refresh_bond(session=request.session, notebook=request.notebook, name=name)
            nothing
        end,
    )
)

function update_notebook(request::NotebookRequest)
    try
        notebook = request.notebook
        patches = (convert_jsonpatch(Firebase.JSONPatch, update) for update in request.message["updates"])

        if length(patches) == 0
            return send_notebook_changes!(request)
        end

        if !haskey(current_state_for_clients, request.initiator.client)
            throw(ErrorException("Updating without having a first version of the notebook??"))
        end

        # TODO Immutable ??
        for patch in patches
            Firebase.update!(current_state_for_clients[request.initiator.client], patch)
        end

        changes = Set{Changed}()

        for patch in patches
            (mutator, matches, rest) = trigger_resolver(mutators, patch.path)
            
            current_changes = if length(rest) == 0 && applicable(mutator, matches...)
                mutator(matches...; request=request, patch=patch)
            else
                mutator(matches..., rest; request=request, patch=patch)
            end

            if current_changes !== nothing && current_changes isa AbstractVector{Changed}
                push!(changes, current_changes...)
            end
        end

        if FileChanged ∈ changes
            @info "SAVE NOTEBOOK"
            save_notebook(notebook)
        end
    
        send_notebook_changes!(request; response=Dict(:you_okay => :👍))    

        # if code_changed ????

        # end
    catch e
        response = if e isa SessionActions.UserError
            Dict(
                :you_okay => :👎,
                :why_not => sprint(showerror, e),
                :should_i_tell_the_user => true,
            )
        elseif e isa Exception
            Dict(
                :you_okay => :👎,
                :why_not => sprint(showerror, e),
                :should_i_tell_the_user => false,
            )
        else
            Dict(
                :you_okay => :👎,
                :why_not => string(e),
                :should_i_tell_the_user => false,
            )
        end
        send_notebook_changes!(request; response=response)
    end
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