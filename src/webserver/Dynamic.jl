import UUIDs: uuid1


"Will hold all 'response handlers': functions that respond to a WebSocket request from the client. These are defined in `src/webserver/Dynamic.jl`."
const responses = Dict{Symbol,Function}()

responses[:connect] = function response_connect(session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing)
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

responses[:ping] = function response_ping(session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing)
    putclientupdates!(session, initiator, UpdateMessage(:pong, Dict(), nothing, nothing, initiator))
end

responses[:run_multiple_cells] = function response_run_multiple_cells(session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing)
    uuids = UUID.(body["cells"])
    cells = map(uuids) do uuid
        notebook.cell_dict[uuid]
    end

    for cell in cells
        cell.queued = true
    end
    send_notebook_changes!(NotebookRequest(session::ServerSession, notebook::Notebook, body, initiator))

    # save=true fixes the issue where "Submit all changes" or `Ctrl+S` has no effect.
    update_save_run!(session, notebook, cells; run_async=true, save=true)
end

responses[:get_all_notebooks] = function response_get_all_notebooks(session::ServerSession, body, notebook = nothing; initiator::Union{Initiator,Missing}=missing)
    putplutoupdates!(session, clientupdate_notebook_list(session.notebooks, initiator=initiator))
end

responses[:interrupt_all] = function response_interrupt_all(session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing)
    success = WorkspaceManager.interrupt_workspace((session, notebook))
    # TODO: notify user whether interrupt was successful (i.e. whether they are using a `ProcessWorkspace`)
end

responses[:shutdown_notebook] = function response_shutdown_notebook(session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing)
    SessionActions.shutdown(session, notebook; keep_in_session=body["keep_in_session"])
end


responses[:reshow_cell] = function response_reshow_cell(session::ServerSession, body, notebook::Notebook, cell::Cell; initiator::Union{Initiator,Missing}=missing)
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
end

# Yeah I am including a Pluto Notebook!!
module Firebase include("./FirebaseSimple.jl") end

Base.@kwdef struct DiffableCellData
    cell_id::UUID
    code::String
    code_folded::Bool
end
Base.@kwdef struct DiffableCellOutput
    last_run_timestamp
    persist_js_state
    mime
    body
    rootassignee
end
Base.@kwdef struct DiffableCellState
    cell_id::UUID
    queued::Bool
    running::Bool
    errored::Bool
    runtime
    output::Union{Nothing,DiffableCellOutput}
end
Base.@kwdef struct DiffableNotebook
    notebook_id::UUID
    path::AbstractString
    in_temp_dir::Bool
    shortpath::AbstractString
    cell_dict::Dict{UUID,DiffableCellData}
    cells_running::Dict{UUID,DiffableCellState}
    cell_order::Array{UUID}
    bonds::Dict{Symbol,Any}
end

MsgPack.msgpack_type(::Type{DiffableCellData}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{DiffableCellOutput}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{DiffableCellState}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{DiffableNotebook}) = MsgPack.StructType()

Firebase.diff(o1::DiffableNotebook, o2::DiffableNotebook) = Firebase.diff(Firebase.Deep(o1), Firebase.Deep(o2))
Firebase.diff(o1::DiffableCellData, o2::DiffableCellData) = Firebase.diff(Firebase.Deep(o1), Firebase.Deep(o2))
Firebase.diff(o1::DiffableCellOutput, o2::DiffableCellOutput) = Firebase.diff(Firebase.Deep(o1), Firebase.Deep(o2))
Firebase.diff(o1::DiffableCellState, o2::DiffableCellState) = Firebase.diff(Firebase.Deep(o1), Firebase.Deep(o2))

# function notebook_to_js(notebook::Notebook)
#     return DiffableNotebook(
#         notebook_id = notebook.notebook_id,
#         path = notebook.path,
#         in_temp_dir = startswith(notebook.path, new_notebooks_directory()),
#         shortpath = basename(notebook.path),
#         cell_dict = Dict(map(collect(notebook.cell_dict)) do (id, cell)
#             id => DiffableCellData(
#                 cell_id = cell.cell_id,
#                 code = cell.code,
#                 code_folded = cell.code_folded,
#             )
#         end),
#         cells_running = Dict(map(collect(notebook.cell_dict)) do (id, cell)
#             id => DiffableCellState(
#                 cell_id = cell.cell_id,
#                 queued = cell.queued,
#                 running = cell.running,
#                 errored = cell.errored,
#                 runtime = ismissing(cell.runtime) ? nothing : cell.runtime,
#                 output = DiffableCellOutput(                
#                     last_run_timestamp = cell.last_run_timestamp,
#                     persist_js_state = cell.persist_js_state,
#                     mime = cell.repr_mime,
#                     body = cell.output_repr,
#                     rootassignee = cell.rootassignee,
#                 ),
#             )
#         end),
#         cell_order = notebook.cell_order,
#         bonds = Dict(notebook.bonds),     
#     )
# end


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
        "bonds" => Dict{String,Dict{String,Any}}(map(collect(notebook.bonds)) do (key, bondvalue)
            String(key) => Dict("value" => bondvalue.value)
        end),
    )
end

# using Crayons
function prettytime(time_ns::Number)
    suffices = ["ns", "μs", "ms", "s"]
	
	current_amount = time_ns
	suffix = ""
	for current_suffix in suffices
    	if current_amount >= 1000.0
        	current_amount = current_amount / 1000.0
		else
			suffix = current_suffix
			break
		end
	end
    
    # const roundedtime = time_ns.toFixed(time_ns >= 100.0 ? 0 : 1)
	roundedtime = current_amount >= 100.0 ? round(current_amount; digits=0) : round(current_amount; digits=1)
    return "$(roundedtime) $(suffix)"
end
function printtime(expr, time_ns, bytes)
    time = prettytime(time_ns)
    if time_ns > 1e8
        # println(crayon"light_red", time, " ", crayon"reset", string(expr))
        println("[$(time)] $(string(expr))")
    elseif time_ns > 10e6
        # println(crayon"red", time, " ", crayon"reset", string(expr))
        println("[$(time)] $(string(expr))")
    else
        nothing
    end
end

struct Remove end
function visit_expr(fn, something)
	visit(fn, something, [])
end
function visit_expr(fn, expr::Expr, stack)
	substack = [expr, stack...]
	args = []
	for arg in expr.args
		result = visit(fn, arg, substack)
		if result isa Remove 
			nothing
		else
			push!(args, result)
		end
	end
	fn(Expr(expr.head, args...), substack)
end
function visit_expr(fn, something, stack)
	fn(something, stack)
end

function remove_blocks(expr)
    visit_expr(expr) do expr, (parent,)
        if expr.head == :block
            QuoteNode(:(...))
        else
            expr
        end
	end
end
function remove_line_nodes(expr)
    visit_expr(expr) do expr, (parent,)
		if expr isa LineNumberNode
			if parent.head == :block
				Remove()
			else
				nothing
			end
		else
			expr
		end
	end
end



macro track(expr)
    quote
        local expr = $(QuoteNode(expr))
        local value, time_seconds, bytes = @timed $(esc(expr))
        printtime(expr, time_seconds * 1e9, bytes)
	end
end

const current_state_for_clients = WeakKeyDict{ClientSession,Any}()
function send_notebook_changes!(request::NotebookRequest; response::Any=nothing)
    notebook_dict = notebook_to_js(request.notebook)
    for (_, client) in request.session.connected_clients
        if client.connected_notebook !== nothing && client.connected_notebook.notebook_id == request.notebook.notebook_id
            current_dict = get(current_state_for_clients, client, :empty)
            patches = Firebase.diff(current_dict, notebook_dict)
            patches_as_dicts::Array{Dict} = patches
            current_state_for_clients[client] = deepcopy(notebook_dict)

            # Make sure we do send a confirmation to the client who made the request, even without changes
            is_response = request.initiator !== nothing && client == request.initiator.client

            if length(patches) != 0 || is_response
                initiator = request.initiator === nothing ? missing : request.initiator
                response = Dict(
                    :patches => patches_as_dicts,
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

@enum Changed CodeChanged FileChanged
const no_changes = Changed[]

# to support push!(x, y...) # with y = []
Base.push!(x::Set{Changed}) = x

mutators = Dict(
    "path" => function(; request::NotebookRequest, patch::Firebase.ReplacePatch)
        newpath = tamepath(patch.value)
        # SessionActions.move(request.session, request.notebook, newpath)

        if isfile(newpath)
            throw(UserError("File exists already - you need to delete the old file manually."))
        else
            move_notebook!(request.notebook, newpath)
            putplutoupdates!(request.session, clientupdate_notebook_list(request.session.notebooks))
            WorkspaceManager.cd_workspace((request.session, request.notebook), newpath)
        end
        no_changes
    end,
    "in_temp_dir" => function(; _...) no_changes end,
    "cell_dict" => Dict(
        Wildcard() => function(cell_id, rest; request::NotebookRequest, patch::Firebase.JSONPatch)
            Firebase.update!(request.notebook, patch)

            @info "cell_dict" rest patch

            if length(rest) == 0
                [CodeChanged, FileChanged]
            elseif length(rest) == 1 && Symbol(rest[1]) == :code
                request.notebook.cell_dict[UUID(cell_id)].parsedcode = nothing
                [CodeChanged, FileChanged]
            else
                [FileChanged]
            end
        end,
    ),
    "cell_order" => function(; request::NotebookRequest, patch::Firebase.ReplacePatch)
        Firebase.update!(request.notebook, patch)
        # request.notebook.cell_order = patch.value
        [FileChanged]
    end,
    "bonds" => Dict(
        Wildcard() => function(name; request::NotebookRequest, patch::Firebase.JSONPatch)
            name = Symbol(name)
            Firebase.update!(request.notebook, patch)
            @async refresh_bond(
                session=request.session,
                notebook=request.notebook,
                name=name,
                is_first_value=patch isa Firebase.AddPatch
            )
            # [BondChanged]
            no_changes
        end,
    )
)

function update_notebook(request::NotebookRequest)
    try
        notebook = request.notebook
        patches = (convert_jsonpatch(Firebase.JSONPatch, update) for update in request.message["updates"])

        if length(patches) == 0
            send_notebook_changes!(request)
            return nothing
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
    
        send_notebook_changes!(request; response=Dict(:you_okay => :👍))    
    catch ex
        @error "Update notebook failed" ex stacktrace=stacktrace(catch_backtrace()) request.message["updates"]
        response = Dict(
            :you_okay => :👎,
            :why_not => sprint(showerror, ex),
            :should_i_tell_the_user => ex isa SessionActions.UserError,
        )
        send_notebook_changes!(request; response=response)
    end
end

responses[:update_notebook] = function response_update_notebook(session::ServerSession, body, notebook::Notebook; initiator::Union{Initiator,Missing}=missing)
    update_notebook(NotebookRequest(session=session, message=body, notebook=notebook, initiator=initiator))
end

function refresh_bond(; session::ServerSession, notebook::Notebook, name::Symbol, is_first_value::Bool=false)
    bound_sym = name
    new_value = notebook.bonds[name].value

    variable_exists = is_assigned_anywhere(notebook, notebook.topology, bound_sym)
    if !variable_exists
        # a bond was set while the cell is in limbo state
        # we don't need to do anything
        return
    end

    # Not checking for any dependents now
    # any_dependents = is_referenced_anywhere(notebook, notebook.topology, bound_sym)

    # fix for https://github.com/fonsp/Pluto.jl/issues/275
    # if `Base.get` was defined to give an initial value (read more about this in the Interactivity sample notebook), then we want to skip the first value sent back from the bond. (if `Base.get` was not defined, then the variable has value `missing`)
    # Check if the variable does not already have that value.
    # because if the initial value is already set, then we don't want to run dependent cells again.
    eq_tester = :(try !ismissing($bound_sym) && ($bound_sym == $new_value) catch; false end)
    if is_first_value && WorkspaceManager.eval_fetch_in_workspace((session, notebook), eq_tester) # not just a === comparison because JS might send back the same value but with a different type (Float64 becomes Int64 in JS when it's an integer.)
        return
    end
        
    function custom_deletion_hook((session, notebook)::Tuple{ServerSession,Notebook}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::Array{Cell,1})
        push!(to_delete_vars, bound_sym) # also delete the bound symbol
        WorkspaceManager.delete_vars((session, notebook), to_delete_vars, funcs_to_delete, to_reimport)
        WorkspaceManager.eval_in_workspace((session, notebook), :($(bound_sym) = $(new_value)))
    end
    to_reeval = where_referenced(notebook, notebook.topology, Set{Symbol}([bound_sym]))

    update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, save=false, persist_js_state=true)
end