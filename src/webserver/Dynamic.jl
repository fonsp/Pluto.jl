import UUIDs: uuid1

import TableIOInterface: get_example_code, is_extension_supported

import .PkgTools

"Will hold all 'response handlers': functions that respond to a WebSocket request from the client."
const responses = Dict{Symbol,Function}()

Base.@kwdef struct ClientRequest
    session::ServerSession
    notebook::Union{Nothing,Notebook}
    body::Any=nothing
    initiator::Union{Initiator,Nothing}=nothing
end

require_notebook(r::ClientRequest) = if r.notebook === nothing
    throw(ArgumentError("Notebook request called without a notebook 😗"))
end




###
# MISC RESPONSES
###

responses[:connect] = function response_connect(🙋::ClientRequest)
    putclientupdates!(🙋.session, 🙋.initiator, UpdateMessage(:👋, Dict(
        :notebook_exists => (🙋.notebook !== nothing),
        :options => 🙋.session.options,
        :version_info => Dict(
            :pluto => PLUTO_VERSION_STR,
            :julia => JULIA_VERSION_STR,
        ),
    ), nothing, nothing, 🙋.initiator))
end

responses[:ping] = function response_ping(🙋::ClientRequest)
    putclientupdates!(🙋.session, 🙋.initiator, UpdateMessage(:pong, Dict(), nothing, nothing, 🙋.initiator))
end

responses[:run_multiple_cells] = function response_run_multiple_cells(🙋::ClientRequest)
    require_notebook(🙋)
    uuids = UUID.(🙋.body["cells"])
    cells = map(uuids) do uuid
        🙋.notebook.cells_dict[uuid]
    end

    for cell in cells
        cell.queued = true
    end
    send_notebook_changes!(🙋)

    # save=true fixes the issue where "Submit all changes" or `Ctrl+S` has no effect.
    update_save_run!(🙋.session, 🙋.notebook, cells; run_async=true, save=true)
end

responses[:get_all_notebooks] = function response_get_all_notebooks(🙋::ClientRequest)
    putplutoupdates!(🙋.session, clientupdate_notebook_list(🙋.session.notebooks, initiator=🙋.initiator))
end

responses[:interrupt_all] = function response_interrupt_all(🙋::ClientRequest)
    require_notebook(🙋)
    success = WorkspaceManager.interrupt_workspace((🙋.session, 🙋.notebook))
    # TODO: notify user whether interrupt was successful
end

responses[:shutdown_notebook] = function response_shutdown_notebook(🙋::ClientRequest)
    require_notebook(🙋)
    SessionActions.shutdown(🙋.session, 🙋.notebook; keep_in_session=🙋.body["keep_in_session"])
end


responses[:reshow_cell] = function response_reshow_cell(🙋::ClientRequest)
    require_notebook(🙋)
    cell = let
        cell_id = UUID(🙋.body["cell_id"])
        🙋.notebook.cells_dict[cell_id]
    end
    run = WorkspaceManager.format_fetch_in_workspace((🙋.session, 🙋.notebook), cell.cell_id, ends_with_semicolon(cell.code), (parse(PlutoRunner.ObjectID, 🙋.body["objectid"], base=16), convert(Int64, 🙋.body["dim"])))
    set_output!(cell, run)
    # send to all clients, why not
    send_notebook_changes!(ClientRequest(🙋.session, 🙋.notebook, 🙋.body, missing))
end




###
# RESPONDING TO A NOTEBOOK STATE UPDATE
###

# Yeah I am including a Pluto Notebook!!
module Firebasey include("./FirebaseySimple.jl") end


function notebook_to_js(notebook::Notebook)
    Dict{String,Any}(
        "notebook_id" => notebook.notebook_id,
        "path" => notebook.path,
        "in_temp_dir" => startswith(notebook.path, new_notebooks_directory()),
        "shortpath" => basename(notebook.path),
        "cell_inputs" => Dict{UUID,Dict{String,Any}}(
            id => Dict{String,Any}(
                "cell_id" => cell.cell_id,
                "code" => cell.code,
                "code_folded" => cell.code_folded,
            )
        for (id, cell) in notebook.cells_dict),
        "cell_results" => Dict{UUID,Dict{String,Any}}(
            id => Dict{String,Any}(
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
        for (id, cell) in notebook.cells_dict),
        "cell_order" => notebook.cell_order,
        "bonds" => Dict{String,Dict{String,Any}}(
            String(key) => Dict("value" => bondvalue.value)
        for (key, bondvalue) in notebook.bonds),
        "nbpkg" => let
            ctx = notebook.nbpkg_ctx
            Dict{String,Any}(
                "enabled" => ctx !== nothing,
                "notebook_restart_recommended" => notebook.nbpkg_notebook_restart_recommended,
                "notebook_restart_required" => notebook.nbpkg_notebook_restart_required,
                # TODO: cache this
                "installed_versions" => ctx === nothing ? nothing : Dict{String,String}(
                    x => string(PkgTools.get_manifest_version(ctx, x)) for x in keys(ctx.env.project.deps)
                ),
            )
        end,
    )
end

"""
For each connected client, we keep a copy of their current state. This way we know exactly which updates to send when the server-side state changes.
"""
const current_state_for_clients = WeakKeyDict{ClientSession,Any}()

"""
Update the local state of all clients connected to this notebook.
"""
function send_notebook_changes!(🙋::ClientRequest; commentary::Any=nothing)
    notebook_dict = notebook_to_js(🙋.notebook)
    for (_, client) in 🙋.session.connected_clients
        if client.connected_notebook !== nothing && client.connected_notebook.notebook_id == 🙋.notebook.notebook_id
            current_dict = get(current_state_for_clients, client, :empty)
            patches = Firebasey.diff(current_dict, notebook_dict)
            patches_as_dicts::Array{Dict} = patches
            current_state_for_clients[client] = deepcopy(notebook_dict)

            # Make sure we do send a confirmation to the client who made the request, even without changes
            is_response = 🙋.initiator !== nothing && client == 🙋.initiator.client

            if !isempty(patches) || is_response
                response = Dict(
                    :patches => patches_as_dicts,
                    :response => is_response ? commentary : nothing
                )
                putclientupdates!(client, UpdateMessage(:notebook_diff, response, 🙋.notebook, nothing, 🙋.initiator))
            end
        end
    end
end

"""
A placeholder path. The path elements that it replaced will be given to the function as arguments.
"""
struct Wildcard end

@enum Changed begin
    CodeChanged
    FileChanged
end

# to support push!(x, y...) # with y = []
Base.push!(x::Set{Changed}) = x

const no_changes = Changed[]


const effects_of_changed_state = Dict(
    "path" => function(; request::ClientRequest, patch::Firebasey.ReplacePatch)
        newpath = tamepath(patch.value)
        # SessionActions.move(request.session, request.notebook, newpath)

        if isfile(newpath)
            throw(UserError("File exists already - you need to delete the old file manually."))
        else
            move_notebook!(request.notebook, newpath)
            putplutoupdates!(request.session, clientupdate_notebook_list(request.session.notebooks))
            WorkspaceManager.cd_workspace((request.session, request.notebook), newpath)
        end
        return no_changes
    end,
    "in_temp_dir" => function(; _...) no_changes end,
    "cell_inputs" => Dict(
        Wildcard() => function(cell_id, rest...; request::ClientRequest, patch::Firebasey.JSONPatch)
            Firebasey.update!(request.notebook, patch)

            if length(rest) == 0
                [CodeChanged, FileChanged]
            elseif length(rest) == 1 && Symbol(rest[1]) == :code
                request.notebook.cells_dict[UUID(cell_id)].parsedcode = nothing
                [CodeChanged, FileChanged]
            else
                [FileChanged]
            end
        end,
    ),
    "cell_order" => function(; request::ClientRequest, patch::Firebasey.ReplacePatch)
        Firebasey.update!(request.notebook, patch)
        [FileChanged]
    end,
    "bonds" => Dict(
        Wildcard() => function(name; request::ClientRequest, patch::Firebasey.JSONPatch)
            name = Symbol(name)
            Firebasey.update!(request.notebook, patch)
            set_bond_value_reactive(
                session=request.session,
                notebook=request.notebook,
                name=name,
                is_first_value=patch isa Firebasey.AddPatch,
                run_async=true,
            )
            # [BondChanged]
            return no_changes
        end,
    )
)


responses[:update_notebook] = function response_update_notebook(🙋::ClientRequest)
    require_notebook(🙋)
    try
        notebook = 🙋.notebook
        patches = (convert_jsonpatch(Firebasey.JSONPatch, update) for update in 🙋.body["updates"])

        if length(patches) == 0
            send_notebook_changes!(🙋)
            return nothing
        end

        if !haskey(current_state_for_clients, 🙋.initiator.client)
            throw(ErrorException("Updating without having a first version of the notebook??"))
        end

        # TODO Immutable ??
        for patch in patches
            Firebasey.update!(current_state_for_clients[🙋.initiator.client], patch)
        end

        changes = Set{Changed}()

        for patch in patches
            (mutator, matches, rest) = trigger_resolver(effects_of_changed_state, patch.path)
            
            current_changes = if isempty(rest) && applicable(mutator, matches...)
                mutator(matches...; request=🙋, patch=patch)
            else
                mutator(matches..., rest...; request=🙋, patch=patch)
            end

            push!(changes, current_changes...)
        end

        # if CodeChanged ∈ changes
        #     update_caches!(notebook, cells)
        #     old = notebook.topology
        #     new = notebook.topology = updated_topology(old, notebook, cells)
        # end

        # If CodeChanged ∈ changes, then the client will also send a request like run_multiple_cells, which will trigger a file save _before_ running the cells.
        # In the future, we should get rid of that request, and save the file here. For now, we don't save the file here, to prevent unnecessary file IO.
        # (You can put a log in save_notebook to track how often the file is saved)
        if FileChanged ∈ changes && CodeChanged ∉ changes
            save_notebook(notebook)
        end
    
        send_notebook_changes!(🙋; commentary=Dict(:update_went_well => :👍))    
    catch ex
        @error "Update notebook failed"  🙋.body["updates"] exception=(ex, stacktrace(catch_backtrace()))
        response = Dict(
            :update_went_well => :👎,
            :why_not => sprint(showerror, ex),
            :should_i_tell_the_user => ex isa SessionActions.UserError,
        )
        send_notebook_changes!(🙋; commentary=response)
    end
end

function convert_jsonpatch(::Type{Firebasey.JSONPatch}, patch_dict::Dict)
	if patch_dict["op"] == "add"
		Firebasey.AddPatch(patch_dict["path"], patch_dict["value"])
	elseif patch_dict["op"] == "remove"
		Firebasey.RemovePatch(patch_dict["path"])
	elseif patch_dict["op"] == "replace"
		Firebasey.ReplacePatch(patch_dict["path"], patch_dict["value"])
	else
		throw(ArgumentError("Unknown operation :$(patch_dict["op"]) in Dict to JSONPatch conversion"))
	end
end

function trigger_resolver(anything, path, values=[])
	(value=anything, matches=values, rest=path)
end
function trigger_resolver(resolvers::Dict, path, values=[])
	if isempty(path)
		throw(BoundsError("resolver path ends at Dict with keys $(keys(resolver))"))
	end
	
	segment = first(path)
	rest = path[firstindex(path)+1:end]
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

###
# HANDLE NEW BOND VALUES
###

function set_bond_value_reactive(; session::ServerSession, notebook::Notebook, name::Symbol, is_first_value::Bool=false, kwargs...)
    bound_sym = name
    new_value = notebook.bonds[name].value

    variable_exists = is_assigned_anywhere(notebook, notebook.topology, bound_sym)
    if !variable_exists
        # a bond was set while the cell is in limbo state
        # we don't need to do anything
        return
    end

    # TODO: Not checking for any dependents now
    # any_dependents = is_referenced_anywhere(notebook, notebook.topology, bound_sym)

    # fix for https://github.com/fonsp/Pluto.jl/issues/275
    # if `Base.get` was defined to give an initial value (read more about this in the Interactivity sample notebook), then we want to skip the first value sent back from the bond. (if `Base.get` was not defined, then the variable has value `missing`)
    # Check if the variable does not already have that value.
    # because if the initial value is already set, then we don't want to run dependent cells again.
    eq_tester = :(try !ismissing($bound_sym) && ($bound_sym == $new_value) catch; false end) # not just a === comparison because JS might send back the same value but with a different type (Float64 becomes Int64 in JS when it's an integer.)
    if is_first_value && WorkspaceManager.eval_fetch_in_workspace((session, notebook), eq_tester)
        return
    end
        
    function custom_deletion_hook((session, notebook)::Tuple{ServerSession,Notebook}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::AbstractVector{Cell})
        to_delete_vars = Set([to_delete_vars..., bound_sym]) # also delete the bound symbol
        WorkspaceManager.delete_vars((session, notebook), to_delete_vars, funcs_to_delete, to_reimport)
        WorkspaceManager.eval_in_workspace((session, notebook), :($(bound_sym) = $(new_value)))
    end
    to_reeval = where_referenced(notebook, notebook.topology, Set{Symbol}([bound_sym]))

    update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, save=false, persist_js_state=true, kwargs...)
end

responses[:write_file] = function (🙋::ClientRequest)
    path = 🙋.notebook.path
    reldir = "$(path |> basename).assets"
    dir = joinpath(path |> dirname, reldir)
    file_noext = reduce(*, split(🙋.body["name"], ".")[1:end - 1])
    extension = split(🙋.body["name"], ".")[end]
    save_path = numbered_until_new(joinpath(dir, file_noext); sep=" ", suffix=".$(extension)", create_file=false)

    if !ispath(dir)
        mkpath(dir)
    end
    success = try
        io = open(save_path, "w")
        write(io, 🙋.body["file"])
        close(io)
        true
    catch e
        false
    end

    code = get_template_code(basename(save_path), reldir, 🙋.body["file"])

    msg = UpdateMessage(:write_file_reply, 
        Dict(
            :success => success,
            :code => code
        ), 🙋.notebook, nothing, 🙋.initiator)

    putclientupdates!(🙋.session, 🙋.initiator, msg)
end

# helpers

get_template_code = (filename, directory, iofilecontents) -> begin
    path = """joinpath(split(@__FILE__, '#')[1] * ".assets", "$(filename)")"""
    extension = split(filename, ".")[end]
    varname = replace(basename(path), r"[\"\-,\.#@!\%\s+\;()\$&*\[\]\{\}'^]" => "")

    if extension ∈ ["jpg", "jpeg", "png", "svg", "webp", "tiff", "bmp", "gif", "wav", "aac", "mp3", "mpeg", "mp4", "webm", "ogg"]
        req_code = "import PlutoUI"
        code = """$(extension)_$(varname) = let
    $(req_code)
    PlutoUI.LocalResource($(path))
end"""

    elseif extension ∈ ["txt", "text"]
        code = """txt_$(varname) = let
    $(varname) = open($(path))
    read($(varname), String)
end"""

    elseif extension ∈ ["jl"]
        io = IOBuffer();
        write(io, iofilecontents)
        code = String(take!(io))

    elseif is_extension_supported(extension)
        code = get_example_code(directory, filename)

    else
        code = missing
    end
end
