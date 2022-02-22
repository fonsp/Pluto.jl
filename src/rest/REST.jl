module REST
import ..Pluto: ServerSession, Notebook, NotebookTopology, Cell, FunctionName, WorkspaceManager, ReactiveNode, ExprAnalysisCache, where_assigned, where_referenced, update_save_run!, topological_order, is_joined_funcname
import Pluto.PlutoRunner
import UUIDs: UUID
import Distributed
import REPL: ends_with_semicolon

WYSIWYR_VERSION = "v1"


"Return all cells that are depended upon by any of the given cells."
function upstream_recursive(notebook::Notebook, topology::NotebookTopology, from::Union{Vector{Cell},Set{Cell}})
    found = Set{Cell}(copy(from))
    upstream_recursive!(found, notebook, topology, from)
    found
end

function upstream_recursive!(found::Set{Cell}, notebook::Notebook, topology::NotebookTopology, from::Vector{Cell})
    for cell in from
        references = topology.nodes[cell].references
        for upstream in where_assigned(notebook, topology, references)
            if upstream ∉ found
                push!(found, upstream)
                upstream_recursive!(found, notebook, topology, Cell[upstream])
            end
        end
    end
end

function direct_parents(notebook::Notebook, topology::NotebookTopology, node::Cell)
    filter(notebook.cells) do cell
        any(x ∈ topology.nodes[node].references for x ∈ topology.nodes[cell].definitions)
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
    to_set, new_values = keys(inputs), values(inputs)
    output_cell = where_assigned(notebook, topology, outputs)

    if length(output_cell) < length(outputs)
        throw(ErrorException("A requested output does not exist"))
    end
    # For now only one output cell is supported
    output_cell = output_cell[1]

    intersection_path = upstream_recursive(notebook, topology, Cell[output_cell])

    to_reeval = Cell[
        # Re-evaluate all cells that reference the modified input parameters
        where_referenced(notebook, notebook.topology, Set{Symbol}(to_set))...
    ]

    function custom_deletion_hook(session_notebook::Union{WorkspaceManager.SN, WorkspaceManager.Workspace}, old_workspace_name::Symbol, new_workspace_name::Union{Nothing,Symbol}, to_delete_vars::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}; to_run::AbstractVector{Cell})
        to_delete_vars = Set{Symbol}([to_delete_vars..., to_set...]) # also delete the bound symbols
        WorkspaceManager.move_vars(session_notebook, old_workspace_name, new_workspace_name, to_delete_vars, funcs_to_delete, to_reimport, true)

        workspace = WorkspaceManager.get_workspace(session_notebook)
        eval_workspace = workspace.module_name

        for (sym, new_value) in zip(to_set, new_values)
            expr = :($(sym) = $(new_value))
            Distributed.remotecall_eval(Main, [workspace.pid], :(Core.eval($(eval_workspace), $(expr |> QuoteNode))))
        end
    end

    rest_formatted_errors = Dict{Cell, Any}()

    "Run a single cell non-reactively without updating ouputs, but saving errors"
    function run_single_rest!(session_notebook::Union{Tuple{ServerSession,Notebook},WorkspaceManager.Workspace}, cell::Cell, reactive_node::ReactiveNode, expr_cache::ExprAnalysisCache; user_requested_run::Bool=true)
        run = WorkspaceManager.eval_format_fetch_in_workspace(
            session_notebook, 
            expr_cache.parsedcode, 
            cell.cell_id, 
            ends_with_semicolon(cell.code), 
            expr_cache.function_wrapped ? (filter(!is_joined_funcname, reactive_node.references), reactive_node.definitions) : nothing,
            expr_cache.forced_expr_id,
            user_requested_run,
            collect(keys(cell.published_objects)),
        )
        if run.errored
            rest_formatted_errors[cell] = run
        end
        if session_notebook isa Tuple && run.process_exited
            session_notebook[2].process_status = ProcessStatus.no_process
        end
        return run
    end

    current_workspace = WorkspaceManager.get_workspace((session, notebook))
    new_workspace_name = WorkspaceManager.create_emptyworkspacemodule(current_workspace.pid)
    workspace = WorkspaceManager.Workspace(;
        pid=current_workspace.pid,
        log_channel=current_workspace.log_channel, 
        module_name=new_workspace_name,
        original_LOAD_PATH=current_workspace.original_LOAD_PATH,
        original_ACTIVE_PROJECT=current_workspace.original_ACTIVE_PROJECT,
    )
    update_save_run!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, dependency_mod=Cell[intersection_path...], workspace_override=workspace, old_workspace_name_override=current_workspace.module_name, send_notebook_changes=false, run_async=false, save=false, run_single_fn! = run_single_rest!)

    if isempty(rest_formatted_errors)
        Dict(out_symbol => WorkspaceManager.eval_fetch_in_workspace(workspace, out_symbol) for out_symbol in outputs)
    else
        Dict(
            :errored => true,
            :errors => Dict(cell.cell_id => error_output.output_formatted[1] for (cell, error_output) ∈ rest_formatted_errors)
        )
    end
end
get_notebook_output(session::ServerSession, notebook::Notebook, topology::NotebookTopology, inputs::Dict{Symbol, Any}, outputs::Vector{Symbol}) = get_notebook_output(session, notebook, topology, inputs, Set(outputs))

function get_notebook_call(session::ServerSession, notebook::Notebook, name::Symbol, args, kwargs)
    fn_symbol = :($(name)($(args...); $([:($k=$v) for (k, v) ∈ kwargs]...)))
    try
        return WorkspaceManager.eval_fetch_in_workspace((session, notebook), fn_symbol)
    catch exs
        return Dict(
            :errored => true,
            :errors => [PlutoRunner.format_output(CapturedException(exs, []))[1]]
        )
    end
end

function get_notebook_static_function(session::ServerSession, notebook::Notebook, topology::NotebookTopology, inputs::Vector{Symbol}, outputs::Vector{Symbol})
    output_cells = where_assigned(notebook, topology, Set(outputs))
    output_cell = output_cells[1]
    
    input_cells = (input -> where_assigned(notebook, topology, Set([input]))[1]).(inputs)

    function_name = Symbol("eval_" * string(outputs[1]))
    function_params = (x -> Expr(:kw, :($x), WorkspaceManager.eval_fetch_in_workspace((session, notebook), x))).(inputs)

    necessary_cells = recursive_parents(notebook, topology, output_cell)

    cell_ordering = topological_order(notebook, topology, [necessary_cells..., output_cell])

    cell_expressions = (cell -> Meta.parse(cell.code)).(filter(cell_ordering.runnable) do cell
        (cell ∈ necessary_cells && cell ∉ input_cells) || cell ∈ output_cells
    end)

    :(
        function $function_name($(function_params...))
            $(cell_expressions...)
        end
    )
end

end
