module WorkspaceManager
import UUIDs: UUID
import ..Pluto: Configuration, Notebook, Cell, ServerSession, ExpressionExplorer, pluto_filename, trycatch_expr, Token, withtoken, tamepath, project_relative_path, putnotebookupdates!, UpdateMessage
import ..Configuration: CompilerOptions
import ..Pluto.ExpressionExplorer: FunctionName
import ..PlutoRunner
import Distributed

"Contains the Julia process (in the sense of `Distributed.addprocs`) to evaluate code in. Each notebook gets at most one `Workspace` at any time, but it can also have no `Workspace` (it cannot `eval` code in this case)."
mutable struct Workspace
    pid::Integer
    log_channel::Distributed.RemoteChannel
    module_name::Symbol
    dowork_token::Token
end

"These expressions get evaluated inside every newly create module inside a `Workspace`."
const workspace_preamble = [
    :(using Main.PlutoRunner, Main.PlutoRunner.Markdown, Main.PlutoRunner.InteractiveUtils),
    :(show, showable, showerror, repr, string, print, println), # https://github.com/JuliaLang/julia/issues/18181
]

"These expressions get evaluated whenever a new `Workspace` process is created."
const process_preamble = [
    :(ccall(:jl_exit_on_sigint, Cvoid, (Cint,), 0)),
    :(include($(project_relative_path("src", "runner", "Loader.jl")))),
    :(ENV["GKSwstype"] = "nul"), 
    :(ENV["JULIA_REVISE_WORKER_ONLY"] = "1"), 
]

const moduleworkspace_count = Ref(0)
const workspaces = Dict{UUID,Workspace}()


"""Create a workspace for the notebook, optionally in a separate process.

`new_process`: Should future workspaces be created on a separate process (`true`) or on the same one (`false`)?
Only workspaces on a separate process can be stopped during execution. Windows currently supports `true`
only partially: you can't stop cells on Windows.
"""
function make_workspace((session, notebook)::Tuple{ServerSession, Notebook})::Workspace
    pid = if session.options.evaluation.workspace_use_distributed
        create_workspaceprocess(;compiler_options=_merge_notebook_compiler_options(notebook, session.options.compiler))
    else
        pid = Distributed.myid()
        if !(isdefined(Main, :PlutoRunner) && Main.PlutoRunner isa Module)
            # we make PlutoRunner available in Main, right now it's only defined inside this Pluto module.
            @eval Main begin
                PlutoRunner = $(PlutoRunner)
            end
        end
        pid
    end

    log_channel = Core.eval(Main, quote
        $(Distributed).RemoteChannel(() -> eval(:(Main.PlutoRunner.log_channel)), $pid)
    end)
    module_name = create_emptyworkspacemodule(pid)
    workspace = Workspace(pid, log_channel, module_name, Token())

    @async start_relaying_logs((session, notebook), log_channel)
    cd_workspace(workspace, notebook.path)

    return workspace
end

function start_relaying_logs((session, notebook)::Tuple{ServerSession, Notebook}, log_channel::Distributed.RemoteChannel)
    while true
        try
            next_log = take!(log_channel)
            putnotebookupdates!(session, notebook, UpdateMessage(:log, next_log, notebook))
        catch e
            if !isopen(log_channel)
                break
            end
            @error "Failed to relay log" exception=(e, catch_backtrace())
        end
    end
end

"Call `cd(\$path)` inside the workspace. This is done when creating a workspace, and whenever the notebook changes path."
function cd_workspace(workspace, path::AbstractString)
    eval_in_workspace(workspace, quote
        cd($(path |> dirname))
        Sys.set_process_title("Pluto - " * $(path |> basename))
    end)
end

# TODO: move to PlutoRunner
function create_emptyworkspacemodule(pid::Integer)::Symbol
    id = (moduleworkspace_count[] += 1)
    
    new_workspace_name = if Distributed.myid() == 1
        Symbol("workspace", id)
    else
        Symbol("workspace", id, "_", Distributed.myid())
    end
    workspace_creation = :(module $(new_workspace_name) $(workspace_preamble...) end)
    
    Distributed.remotecall_eval(Main, [pid], workspace_creation)
    Distributed.remotecall_eval(Main, [pid], :(PlutoRunner.set_current_module($(new_workspace_name |> QuoteNode))))
    
    new_workspace_name
end

function _merge_notebook_compiler_options(notebook::Notebook, options::CompilerOptions)
    if notebook.compiler_options === nothing
        return options
    end

    kwargs = Dict{Symbol, Any}()
    for each in fieldnames(CompilerOptions)
        # 1. not specified by notebook options
        # 2. notebook specified project options
        # 3. general notebook specified options
        if getfield(notebook.compiler_options, each) === nothing
            kwargs[each] = getfield(options, each)
        elseif each === :project
            # some specified processing for notebook project
            # paths
            kwargs[:project] = _resolve_notebook_project_path(notebook.path, notebook.compiler_options.project)
        else
            kwargs[each] = getfield(notebook.compiler_options, each)
        end
    end
    return CompilerOptions(;kwargs...)
end

function _resolve_notebook_project_path(notebook_path::String, path::String)
    # 1. notebook project specified as abspath, return
    # 2. notebook project specified startswith "@", expand via `Base.load_path_expand`
    # 3. notebook project specified as relative path, always assume it's relative to
    #    the notebook.
    if isabspath(path)
        return tamepath(path)
    elseif startswith(path, "@")
        return Base.load_path_expand(path)
    else
        return tamepath(joinpath(dirname(notebook_path), path))
    end
end

function _convert_to_flags(options::CompilerOptions)
    option_list = []

    for name in fieldnames(CompilerOptions)
        flagname = if name == :startup_file
            "--startup-file"
        elseif name == :history_file
            "--history-file"
        else
            string("--", name)
        end
        value = getfield(options, name)
        if value !== nothing
            push!(option_list, string(flagname, "=", value))
        end
    end

    return option_list
end

# NOTE: this function only start a worker process using given
# compiler options, it does not resolve paths for notebooks
# compiler configurations passed to it should be resolved before this
function create_workspaceprocess(;compiler_options=CompilerOptions())::Integer
    pid = Distributed.addprocs(1; exeflags=_convert_to_flags(compiler_options)) |> first

    for expr in process_preamble
        Distributed.remotecall_eval(Main, [pid], expr)
    end

    # so that we NEVER break the workspace with an interrupt 🤕
    @async Distributed.remotecall_eval(Main, [pid],
        :(while true
            try
                wait()
            catch end
        end))

    pid
end

"Return the `Workspace` of `notebook`; will be created if none exists yet."
function get_workspace(session_notebook::Tuple{ServerSession, Notebook})::Workspace
    session, notebook = session_notebook
    if haskey(workspaces, notebook.notebook_id)
        workspaces[notebook.notebook_id]
    else
        workspaces[notebook.notebook_id] = make_workspace(session_notebook)
    end
end
get_workspace(workspace::Workspace)::Workspace = workspace

"Try our best to delete the workspace. `ProcessWorkspace` will have its worker process terminated."
function unmake_workspace(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace})
    workspace = get_workspace(session_notebook)

    if workspace.pid != Distributed.myid()
        filter!(p -> p.second.pid != workspace.pid, workspaces)
        interrupt_workspace(workspace; verbose=false)
        if workspace.pid != Distributed.myid()
            Distributed.rmprocs(workspace.pid)
        end
    end
end


"Evaluate expression inside the workspace - output is fetched and formatted, errors are caught and formatted. Returns formatted output and error flags.

`expr` has to satisfy `ExpressionExplorer.is_toplevel_expr`."
function eval_format_fetch_in_workspace(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace}, expr::Expr, cell_id::UUID, ends_with_semicolon::Bool=false)::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{PlutoRunner.MimedOutput,Bool,Bool,Union{UInt64,Missing}}}
    workspace = get_workspace(session_notebook)

    # if multiple notebooks run on the same process, then we need to `cd` between the different notebook paths
    if workspace.pid == Distributed.myid() && session_notebook isa Tuple
        cd_workspace(workspace, session_notebook[2].path)
    end
    
    # We wrap the expression in a try-catch block, because we want to capture and format the exception on the worker itself.
    wrapped = trycatch_expr(expr, workspace.module_name, cell_id)

    # run the code 🏃‍♀️
    
    # a try block (on this process) to catch an InterruptException
    take!(workspace.dowork_token)
    try
        # we use [pid] instead of pid to prevent fetching output
        Distributed.remotecall_eval(Main, [workspace.pid], wrapped)
        put!(workspace.dowork_token)
    catch exs
        # We don't use a `finally` because the token needs to be back asap
        put!(workspace.dowork_token)
        try
            @assert exs isa CompositeException
            ex = exs.exceptions |> first
            @assert ex isa Distributed.RemoteException
            @assert ex.pid == workspace.pid
            @assert ex.captured.ex isa InterruptException

            return (output_formatted = PlutoRunner.format_output(CapturedException(InterruptException(), [])), errored = true, interrupted = true, runtime = missing)
        catch assertionerr
            showerror(stderr, exs)
            return (output_formatted = PlutoRunner.format_output(CapturedException(exs, [])), errored = true, interrupted = true, runtime = missing)
        end
    end

    format_fetch_in_workspace(workspace, cell_id, ends_with_semicolon)
end

"Evaluate expression inside the workspace - output is not fetched, errors are rethrown. For internal use."
function eval_in_workspace(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace}, expr)
    workspace = get_workspace(session_notebook)
    
    Distributed.remotecall_eval(Main, [workspace.pid], :(Core.eval($(workspace.module_name), $(expr |> QuoteNode))))
    nothing
end

function format_fetch_in_workspace(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace}, cell_id, ends_with_semicolon, showmore_id::Union{PlutoRunner.ObjectID, Nothing}=nothing)
    workspace = get_workspace(session_notebook)
    
    # instead of fetching the output value (which might not make sense in our context, since the user can define structs, types, functions, etc), we format the cell output on the worker, and fetch the formatted output.
    withtoken(workspace.dowork_token) do
        Distributed.remotecall_eval(Main, workspace.pid, :(PlutoRunner.formatted_result_of($cell_id, $ends_with_semicolon, $showmore_id)))
    end
end

"Evaluate expression inside the workspace - output is returned. For internal use."
function eval_fetch_in_workspace(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace}, expr)
    workspace = get_workspace(session_notebook)
    
    Distributed.remotecall_eval(Main, workspace.pid, :(Core.eval($(workspace.module_name), $(expr |> QuoteNode))))
end

"Fake deleting variables by moving to a new module without re-importing them."
function delete_vars(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace}, to_delete::Set{Symbol}, funcs_to_delete::Set{Tuple{UUID,FunctionName}}, module_imports_to_move::Set{Expr}; kwargs...)
    workspace = get_workspace(session_notebook)

    old_workspace_name = workspace.module_name
    new_workspace_name = create_emptyworkspacemodule(workspace.pid)

    workspace.module_name = new_workspace_name
    Distributed.remotecall_eval(Main, [workspace.pid], :(PlutoRunner.set_current_module($(new_workspace_name |> QuoteNode))))

    Distributed.remotecall_eval(Main, [workspace.pid], :(PlutoRunner.move_vars($(old_workspace_name |> QuoteNode), $(new_workspace_name |> QuoteNode), $to_delete, $funcs_to_delete, $module_imports_to_move)))
end

"Force interrupt (SIGINT) a workspace, return whether successful"
function interrupt_workspace(session_notebook::Union{Tuple{ServerSession,Notebook},Workspace}; verbose=true)::Bool
    workspace = get_workspace(session_notebook)

    if Sys.iswindows()
        verbose && @warn "Unfortunately, stopping cells is currently not supported on Windows :(
        Maybe the Windows Subsystem for Linux is right for you:
        https://docs.microsoft.com/en-us/windows/wsl"
        return false
    end
    if workspace.pid == Distributed.myid()
        verbose && @warn """Cells in this workspace can't be stopped, because it is not running in a separate workspace. Use `ENV["PLUTO_WORKSPACE_USE_DISTRIBUTED"]` to control whether future workspaces are generated in a separate process."""
        return false
    end
    if isready(workspace.dowork_token)
        verbose && @info "Tried to stop idle workspace - ignoring."
        return true
    end

    # You can force kill a julia process by pressing Ctrl+C five times 🙃
    # But this is not very consistent, so we will just keep pressing Ctrl+C until the workspace isn't running anymore.
    # TODO: this will also kill "pending" evaluations, and any evaluations started within 100ms of the kill. A global "evaluation count" would fix this.
    # TODO: listen for the final words of the remote process on stdout/stderr: "Force throwing a SIGINT"
    try
        verbose && @info "Sending interrupt to process $(workspace.pid)"
        Distributed.interrupt(workspace.pid)

        delay = 5.0 # seconds
        parts = 100

        for _ in 1:parts
            sleep(delay / parts)
            if isready(workspace.dowork_token)
                verbose && println("Cell interrupted!")
                return true
            end
        end

        verbose && println("Still running... starting sequence")
        while !isready(workspace.dowork_token)    
            for _ in 1:5
                verbose && print(" 🔥 ")
                Distributed.interrupt(workspace.pid)
                sleep(0.2)
            end
            sleep(1.5)
        end
        verbose && println()
        verbose && println("Cell interrupted!")
        true
    catch ex
        if !(ex isa KeyError)
            @warn "Interrupt failed for unknown reason"
            showerror(ex, stacktrace(catch_backtrace()))
        end
        false
    end
end

end
