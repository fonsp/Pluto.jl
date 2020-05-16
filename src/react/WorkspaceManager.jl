module WorkspaceManager
import UUIDs: UUID
import ..Pluto: Notebook, PKG_ROOT_DIR
import ..PlutoRunner
import Distributed

mutable struct Workspace
    workspace_pid::Integer
    module_name::Symbol
    dowork_token::Channel{Nothing}
end

Workspace(workspace_pid::Integer, module_name::Symbol) = let
    t = Channel{Nothing}(1)
    put!(t, nothing)
    Workspace(workspace_pid, module_name, t)
end

"These expressions get executed whenever a new workspace is created."
const workspace_preamble = [
    :(using Markdown, Main.PlutoRunner), 
    :(ENV["GKSwstype"] = "nul"), 
    :(show, showable, showerror, repr, string, print, println), # https://github.com/JuliaLang/julia/issues/18181
]

const process_preamble = [
    :(ccall(:jl_exit_on_sigint, Cvoid, (Cint,), 0)),
    :(include($(joinpath(PKG_ROOT_DIR, "src", "runner", "PlutoRunner.jl")))),
]

moduleworkspace_count = 0
workspaces = Dict{UUID,Workspace}()


"""Create a workspace for the notebook, optionally in a separate process.

`new_process`: Should future workspaces be created on a separate process (`true`) or on the same one (`false`)? Only workspaces on a separate process can be stopped during execution. Windows currently supports `true` only partially: you can't stop cells on Windows. _Defaults to `ENV["PLUTO_WORKSPACE_USE_DISTRIBUTED"]`_"""
function make_workspace(notebook::Notebook, new_process = (ENV["PLUTO_WORKSPACE_USE_DISTRIBUTED"] == "true"))::Workspace
    pid = if new_process
        create_workspaceprocess()
    else
        pid = Distributed.myid()
        # for some reason the PlutoRunner might not be available in Main unless we include the file
        # (even though this is the main process)
        if !Distributed.remotecall_eval(Main, pid, :(isdefined(Main, :PlutoRunner) && PlutoRunner isa Module))
            for expr in process_preamble
                Distributed.remotecall_eval(Main, [pid], expr)
            end
        end
        pid
    end
    
    module_name = create_emptyworkspacemodule(pid)
    
    workspace = Workspace(pid, module_name)
    workspaces[notebook.uuid] = workspace
    return workspace
end

function create_emptyworkspacemodule(pid::Integer)::Symbol
    global moduleworkspace_count += 1
    id = moduleworkspace_count
    
    new_workspace_name = Symbol("workspace", id)
    workspace_creation = :(module $(new_workspace_name) $(workspace_preamble...) end)
    
    Distributed.remotecall_eval(Main, [pid], workspace_creation)
    Distributed.remotecall_eval(Main, [pid], :(PlutoRunner.set_current_module($(new_workspace_name |> QuoteNode))))
    
    new_workspace_name
end

function create_workspaceprocess()::Integer
    pid = Distributed.addprocs(1) |> first

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

"Try our best to delete the workspace. `ProcessWorkspace` will have its worker process terminated."
unmake_workspace(notebook::Notebook) = unmake_workspace(get_workspace(notebook))

function unmake_workspace(workspace::Workspace)
    token = take!(workspace.dowork_token)

    # TODO: verify that nothing is running
    if workspace.workspace_pid != Distributed.myid()
        Distributed.rmprocs([workspace.workspace_pid])
    end
    put!(workspace.dowork_token, token)
end

"Return the `Workspace` of `notebook`; will be created if none exists yet."
function get_workspace(notebook::Notebook)::Workspace
    if haskey(workspaces, notebook.uuid)
        workspaces[notebook.uuid]
    else
        workspaces[notebook.uuid] = make_workspace(notebook)
    end
end

"Evaluate expression inside the workspace - output is fetched and formatted, errors are caught and formatted. Returns formatted output and error flags."
function eval_fetch_in_workspace(notebook::Notebook, expr::Any, cell_id::UUID, ends_with_semicolon::Bool=false)::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{Tuple{String,MIME},Bool,Bool,Union{UInt64, Missing}}}
    eval_fetch_in_workspace(get_workspace(notebook), expr, ends_with_semicolon)
end

function eval_fetch_in_workspace(workspace::Workspace, expr::Any, cell_id::UUID, ends_with_semicolon::Bool=false)::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{Tuple{String,MIME},Bool,Bool,Union{UInt64, Missing}}}
    # nasty fix:
    if expr isa Expr && expr.head == :toplevel
        expr.head = :block
    end

    timed_expr = if expr isa Expr && expr.head === :module
        # Modules can only be defined at top level, so we need another eval. (i think)
        # This adds extra runtime, so we don't time.
        quote
            (eval($(expr |> QuoteNode)), missing)
        end
    else
        # For normal expressions:
        # similar to @time source code
        quote
            local elapsed_ns = time_ns()
            local result = ( $(expr) )
            elapsed_ns = time_ns() - elapsed_ns
            (result, elapsed_ns)
        end
    end
    
    # We wrap the expression in a try-catch block, because we want to capture and format the exception on the worker itself.
    wrapped = quote
        ans, runtime = try
            # We eval `expr` in the global scope of the workspace module:
            Core.eval($(workspace.module_name), $(timed_expr |> QuoteNode))
        catch ex
            bt = stacktrace(catch_backtrace())
            CapturedException(ex, bt), missing
        end
        setindex!(Main.PlutoRunner.cell_results, WeakRef(ans), $(cell_id))
    end

    # run the code 🏃‍♀️
    # we use [pid] instead of pid to prevent fetching output

    # another try block to catch an InterruptException
    token = take!(workspace.dowork_token)
    try
        Distributed.remotecall_eval(Main, [workspace.workspace_pid], wrapped)
        put!(workspace.dowork_token, token)
    catch exs
        # We don't use a `finally` because the token needs to be back asap
        put!(workspace.dowork_token, token)
        try
            @assert exs isa CompositeException
            ex = exs.exceptions |> first
            @assert ex isa Distributed.RemoteException
            @assert ex.pid == workspace.workspace_pid
            @assert ex.captured.ex isa InterruptException

            return (output_formatted = PlutoRunner.format_output(InterruptException()), errored = true, interrupted = true, runtime=missing)
        catch assertionerr
            showerror(stderr, exs)
            return (output_formatted = PlutoRunner.format_output(exs), errored = true, interrupted = true, runtime=missing)
        end
    end

    # instead of fetching the output value (which might not make sense in our context, since the user can define structs, types, functions, etc), we format the cell output on the worker, and fetch the formatted output.
    # This also means that very big objects are not duplicated in RAM.
    return Distributed.remotecall_eval(Main, workspace.workspace_pid, :(PlutoRunner.fetch_formatted_result($cell_id, $ends_with_semicolon)))
end

"Evaluate expression inside the workspace - output is not fetched, errors are rethrown. For internal use."
function eval_in_workspace(notebook::Notebook, expr)
    eval_in_workspace(get_workspace(notebook), expr)
end

function eval_in_workspace(workspace::Workspace, expr)
    # token = take!(workspace.dowork_token)
    try
        Distributed.remotecall_eval(Main, [workspace.workspace_pid], :(Core.eval($(workspace.module_name), $(expr |> QuoteNode))))
        # put!(workspace.dowork_token, token)
    catch ex
        # put!(workspace.dowork_token, token)
        rethrow(ex)
    end
    nothing
end


# "Interrupt (Ctrl+C) a workspace, return whether succesful."
# function interrupt_workspace(notebook::Notebook)::Bool
#     interrupt_workspace(WorkspaceManager.get_workspace(notebook))
# end

# function interrupt_workspace(workspace::ModuleWorkspace)
#     @warn "Unfortunately, a `ModuleWorkspace` can't be interrupted. Use a `ProcessWorkspace` instead."
#     false
# end

# function interrupt_workspace(workspace::ProcessWorkspace)
#     if Sys.iswindows()
#         @warn "Unfortunately, stopping cells is currently not supported on Windows.
#         Maybe the Windows Subsystem for Linux is right for you:
#         https://docs.microsoft.com/en-us/windows/wsl"
#         return false
#     end
#     println("Sending interrupt to $(workspace.workspace_pid)")
#     Distributed.interrupt(workspace.workspace_pid)
#     true
# end

"Force interrupt (SIGINT) a workspace, return whether succesful"
function kill_workspace(notebook::Notebook)::Bool
    kill_workspace(WorkspaceManager.get_workspace(notebook))
end

function kill_workspace(workspace::Workspace)
    if Sys.iswindows()
        @warn "Unfortunately, stopping cells is currently not supported on Windows :(
        Maybe the Windows Subsystem for Linux is right for you:
        https://docs.microsoft.com/en-us/windows/wsl"
        return false
    end
    if workspace.workspace_pid == Distributed.myid()
        @warn """Cells in this workspace can't be stopped, because it is not running in a separate workspace. Use `ENV["PLUTO_WORKSPACE_USE_DISTRIBUTED"]` to control whether future workspaces are generated in a separate process."""
    end

    # You can force kill a julia process by pressing Ctrl+C five times 🙃
    # But this is not very consistent, so we will just keep pressing Ctrl+C until the workspace isn't running anymore.
    # TODO: this will also kill "pending" evaluations, and any evaluations started within 100ms of the kill. A global "evaluation count" would fix this.
    # TODO: listen for the final words of the remote process on stdout/stderr: "Force throwing a SIGINT"
    if isready(workspace.dowork_token)
        @info "Tried to stop idle workspace - ignoring."
        return true
    end
    @info "Sending interrupt to process $(workspace.workspace_pid)"
    Distributed.interrupt(workspace.workspace_pid)

    delay = 5.0 # seconds
    parts = 100

    for _ in 1:parts
        sleep(delay / parts)
        if isready(workspace.dowork_token)
            println("Cell interrupted!")
            return true
        end
    end

    println("Still running... starting sequence")
    while !isready(workspace.dowork_token)    
        for _ in 1:5
            print(" 🔥 ")
            Distributed.interrupt(workspace.workspace_pid)
            sleep(0.2)
        end
        sleep(1.5)
    end
    println()
    println("Cell interrupted!")
    true
end

"Fake deleting variables by moving to a new module without re-importing them."
function delete_vars(notebook::Notebook, to_delete::Set{Symbol}, funcs_to_delete::Set{Vector{Symbol}}, module_imports_to_move::Set{Expr}; kwargs...)
    delete_vars(get_workspace(notebook), to_delete, funcs_to_delete, module_imports_to_move; kwargs...)
end

function delete_vars(workspace::Workspace, to_delete::Set{Symbol}, funcs_to_delete::Set{Vector{Symbol}}, module_imports_to_move::Set{Expr}; kwargs...)
    old_workspace_name = workspace.module_name
    new_workspace_name = create_emptyworkspacemodule(workspace.workspace_pid)

    workspace.module_name = new_workspace_name
    Distributed.remotecall_eval(Main, [workspace.workspace_pid], :(PlutoRunner.set_current_module($(new_workspace_name |> QuoteNode))))

    Distributed.remotecall_eval(Main, [workspace.workspace_pid], :(PlutoRunner.move_vars($(old_workspace_name |> QuoteNode), $(new_workspace_name |> QuoteNode), $to_delete, $funcs_to_delete, $module_imports_to_move)))
end


end
