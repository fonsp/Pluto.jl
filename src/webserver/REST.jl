module REST
import ..Pluto: ServerSession, Notebook, NotebookTopology, Cell, FunctionName, WorkspaceManager, where_assigned, where_referenced, update_save_run!, topological_order
import UUIDs: UUID
import HTTP
import JSON
import MsgPack

function direct_parents(notebook::Notebook, topology::NotebookTopology, node::Cell)
    filter(notebook.cells) do cell
        any(x ∈ topology[node].references for x ∈ topology[cell].definitions)
    end
end

function recursive_parents(notebook::Notebook, topology::NotebookTopology, node::Cell)
    parents = Set{Cell}([node])
    
    for parent_cell ∈ direct_parents(notebook, topology, node)
        parents = parents ∪ recursive_parents(notebook, topology, parent_cell)
    end

    parents
end
function recursive_parents(notebook::Notebook, topology::NotebookTopology, nodes::Vector{Cell})
    if length(nodes) == 0
        return []
    end

    reduce(∪, (x -> recursive_parents(notebook, topology, x)).(nodes))
end

function upstream_roots(notebook::Notebook, topology::NotebookTopology, from::Cell)
    found = Set{Cell}()
    parents = direct_parents(notebook, topology, from)

    for p ∈ parents
        if length(direct_parents(notebook, topology, p)) == 0
            found = found ∪ Set([p])
        else
            found = found ∪ upstream_roots(notebook, topology, p)
        end
    end

    found
end
function upstream_roots(notebook::Notebook, topology::NotebookTopology, from::Union{Vector{Cell}, Set{Cell}})
    reduce(∪, (x->upstream_roots(notebook, topology, x)).(from))
end

function get_notebook_output(session::ServerSession, notebook::Notebook, topology::NotebookTopology, inputs::Dict{Symbol, Any}, outputs::Set{Symbol})
    assigned = where_assigned(notebook, topology, outputs)
    provided_set = keys(inputs)
    to_set = provided_set

    new_values = values(inputs)
    output_cell = where_assigned(notebook, topology, outputs)[1]

    to_reeval = [
        # Re-evaluate all cells that reference the modified input parameters
        # TODO: Change this to a recursive where_referenced down to outputs. Needs to be smarter
        where_referenced(notebook, notebook.topology, Set{Symbol}(to_set))...
        # Re-evaluate all input cells that were not provided as parameters
        # TODO: Uncomment and figure something out to prevent whole notebook from running
        where_assigned(notebook, notebook.topology, Set{Symbol}(filter(x->(x ∉ provided_set), to_set)))...
    ]

    function custom_deletion_hook((session, notebook)::Tuple{ServerSession,Notebook}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::AbstractVector{Cell})
        to_delete_vars = Set([to_delete_vars..., to_set...]) # also delete the bound symbols
        WorkspaceManager.delete_vars((session, notebook), to_delete_vars, funcs_to_delete, to_reimport)
        for (sym, new_value) in zip(to_set, new_values)
            WorkspaceManager.eval_in_workspace((session, notebook), :($(sym) = $(new_value)))
        end
    end
    function custom_deletion_hook2((session, notebook)::Tuple{ServerSession,Notebook}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::AbstractVector{Cell})
        to_delete_vars = Set([to_delete_vars...])
        WorkspaceManager.delete_vars((session, notebook), to_delete_vars, funcs_to_delete, to_reimport)
    end

    update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, run_async=false, save=false)
    out = Dict(out_symbol => WorkspaceManager.eval_fetch_in_workspace((session, notebook), out_symbol) for out_symbol in outputs)
    update_save_run!(session, notebook, where_assigned(notebook, notebook.topology, Set{Symbol}(to_set)); deletion_hook=custom_deletion_hook2)

    out
end
get_notebook_output(session::ServerSession, notebook::Notebook, topology::NotebookTopology, inputs::Dict{Symbol, Any}, outputs::Vector{Symbol}) = get_notebook_output(session, notebook, topology, inputs, Set(outputs))

function get_notebook_static_function(session::ServerSession, notebook::Notebook, topology::NotebookTopology, inputs::Vector{Symbol}, outputs::Vector{Symbol})
    output_cells = where_assigned(notebook, topology, Set(outputs))
    output_cell = output_cells[1]
    
    input_cells = (input -> where_assigned(notebook, topology, Set([input]))[1]).(inputs)

    to_set = upstream_roots(notebook, topology, output_cell)

    function_name = Symbol("eval_" * string(outputs[1]))
    function_params = (x -> Expr(:kw, :($x), WorkspaceManager.eval_fetch_in_workspace((session, notebook), x))).(inputs)

    necessary_cells = recursive_parents(notebook, topology, output_cell)
    @info necessary_cells

    cell_ordering = topological_order(notebook, topology, [necessary_cells..., output_cell])
    # cell_ordering = topological_order(notebook, topology, [output_cell])

    cell_expressions = (cell -> Meta.parse(cell.code)).(filter(cell_ordering.runnable) do cell
        (cell ∈ necessary_cells && cell ∉ input_cells) || cell ∈ output_cells
    end)

    :(
        function $function_name($(function_params...))
            $(cell_expressions...)
        end
    )
end


function static_function(output::Symbol, inputs::Vector{Symbol}, host::AbstractString="localhost:1234", session_id::Union{AbstractString, Nothing}=nothing)
    @warn "Ensure you trust this host, as the function returned could be malicious"

    query = ["outputs" => String(output), "inputs" => join(inputs, ",")]
    request_uri = merge(HTTP.URI("http://$(host)/notebookfile/static"); query=query)
    response = HTTP.get(request_uri)

    Meta.parse(String(response.body))
end

function evaluate(output::Symbol, host::AbstractString="localhost:1234", session_id::Union{AbstractString, Nothing}=nothing, with_json=false; kwargs...)
    query = ["outputs" => string(output), "inputs" => JSON.json(kwargs)]
    if !isnothing(session_id)
        push!(query, "id" => session_id)
    end
    request_uri = merge(HTTP.URI("http://$(host)/notebookfile/eval"); query=query)

    response = HTTP.get(request_uri, [
        "Accept" => with_json ? "application/json" : "application/x-msgpack"
    ])
    
    if with_json
        return JSON.parse(String(response.body))[string(output)]
    else
        return MsgPack.unpack(response.body)[string(output)]
    end
end
end


struct PlutoNotebook
    host::AbstractString
    session_id::Union{AbstractString, Nothing}
end
PlutoNotebook(host::AbstractString="localhost:1234") = PlutoNotebook(host, nothing)

struct PlutoNotebookWithArgs
    notebook::PlutoNotebook
    kwargs::Dict{Symbol, Any}
end

# Looks like notebook_instance(a=3, b=4)
function (nb::PlutoNotebook)(; kwargs...)
    PlutoNotebookWithArgs(nb, Dict{Symbol, Any}(kwargs))
end
# Looks like notebook_instance(a=3, b=4).c ⟹ 5
function Base.getproperty(with_args::PlutoNotebookWithArgs, symbol::Symbol)
    REST.evaluate(symbol, Base.getfield(with_args, :notebook).host, Base.getfield(with_args, :notebook).session_id; Base.getfield(with_args, :kwargs)...)
end
# Looks like notebook_instance(a=3, b=4)[:c, :m] ⟹ 5
function Base.getindex(with_args::PlutoNotebookWithArgs, symbols::Symbol...)
    outputs = []

    # TODO: Refactor to make 1 request with multiple output symbols
    for symbol ∈ symbols
        push!(outputs, REST.evaluate(symbol, Base.getfield(with_args, :notebook).host, Base.getfield(with_args, :notebook).session_id; Base.getfield(with_args, :kwargs)...))
    end

    # https://docs.julialang.org/en/v1/base/base/#Core.NamedTuple
    return (; zip(symbols, outputs)...)
end

macro resolve(with_args, output::Symbol)

    :(
        REST.static_function($:($(esc(output))), collect(keys(Base.getfield($(esc(with_args)), :kwargs))), Base.getfield($(esc(with_args)), :notebook).host, Base.getfield($(esc(with_args)), :notebook).session_id)
    )
end
