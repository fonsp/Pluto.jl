module WorkspaceManager
import UUIDs: UUID
import ..Pluto: Notebook, PKG_ROOT_DIR, format_output
import Distributed

abstract type AbstractWorkspace end

mutable struct ModuleWorkspace <: AbstractWorkspace
    name::Symbol
    workspace_module::Module
    deleted_vars::Set{Symbol}
end

mutable struct ProcessWorkspace <: AbstractWorkspace
    workspace_pid::Int64
    dowork_token::Channel{Nothing}
    deleted_vars::Set{Symbol}
end

ProcessWorkspace(workspace_pid::Int64) = let
    t = Channel{Nothing}(1)
    put!(t, nothing)
    ProcessWorkspace(workspace_pid, t, Set{Symbol}())
end

default_workspace_method = ProcessWorkspace

"The workspace method to be used for all future workspace creations. ModuleWorkspace` is lightest, `ProcessWorkspace` can always terminate."
function set_default_workspace_method(method::Type{<:AbstractWorkspace})
    global default_workspace_method = method
end

"These expressions get executed whenever a new workspace is created."
workspace_preamble = [:(using Markdown), :(ENV["GKSwstype"] = "nul")]

moduleworkspace_count = 0
workspaces = Dict{UUID, AbstractWorkspace}()


"Create a workspace for the notebook using the `default_workspace_method`."
make_workspace(notebook::Notebook)::AbstractWorkspace = make_workspace(notebook, Val(default_workspace_method))

function make_workspace(notebook::Notebook, ::Val{ModuleWorkspace})::ModuleWorkspace
    global moduleworkspace_count += 1
    id = moduleworkspace_count
    
    new_workspace_name = Symbol("workspace", id)
    workspace_creation = :(module $(new_workspace_name) $(workspace_preamble...) end)
    
    # We suppress this warning:
    # Expr(:module, true, :workspace1, Expr(:block, #= Symbol("/mnt/c/dev/julia/Pluto.jl/src/React.jl"):13 =#, #= Symbol("/mnt/c/dev/julia/Pluto.jl/src/React.jl"):13 =#, Expr(:using, Expr(:., :Markdown))))
    # ** incremental compilation may be broken for this module **

    # TODO: a more elegant way?
    # TODO: check for other warnings
    original_stderr = stderr
    (rd, wr) = redirect_stderr();

    m = Core.eval(WorkspaceManager, workspace_creation)

    redirect_stderr(original_stderr)
    close(wr)
    close(rd)

    workspace = ModuleWorkspace(new_workspace_name, m, Set{Symbol}())
    workspaces[notebook.uuid] = workspace
    workspace
end

function make_workspace(notebook::Notebook, ::Val{ProcessWorkspace})::ProcessWorkspace
    pid = Distributed.addprocs(1) |> first

    workspace = ProcessWorkspace(pid)
    workspaces[notebook.uuid] = workspace

    eval_in_workspace.([workspace], workspace_preamble)
    # TODO: we could also import Pluto
    eval_in_workspace(workspace, :(include($(joinpath(PKG_ROOT_DIR, "src", "notebookserver", "FormatOutput.jl")))))
    # For Windows?
    eval_in_workspace(workspace, :(ccall(:jl_exit_on_sigint, Cvoid, (Cint,), 0)))

    # so that we NEVER break the workspace with an interrupt 🤕
    @async eval_in_workspace(workspace, 
        :(while true
            try
                wait()
            catch end
        end))

    workspace
end

"Try our best to delete the workspace. `ProcessWorkspace` will have its worker process terminated."
unmake_workspace(notebook::Notebook) = unmake_workspace(get_workspace(notebook))

function unmake_workspace(workspace::ProcessWorkspace)
    # TODO: verify that nothing is running
    Distributed.rmprocs([workspace.workspace_pid])
end

function unmake_workspace(workspace::ModuleWorkspace)
    # TODO: test
    for s in names(workspace.workspace_module)
        try
            Core.eval(workspace.workspace_module, :($s = nothing))
        catch end
    end
end

function get_workspace(notebook::Notebook)::AbstractWorkspace
    if haskey(workspaces, notebook.uuid)
        workspaces[notebook.uuid]
    else
        workspaces[notebook.uuid] = make_workspace(notebook)
    end
end

"Evaluate expression inside the workspace - output is fetched and formatted, errors are caught and formatted. Returns formatted output and error flags."
function eval_fetch_in_workspace(notebook::Notebook, expr)::NamedTuple{(:output_formatted, :errored, :interrupted),Tuple{Tuple{String, MIME},Bool,Bool}}
    eval_fetch_in_workspace(get_workspace(notebook), expr)
end

function eval_fetch_in_workspace(workspace::ProcessWorkspace, expr)::NamedTuple{(:output_formatted, :errored, :interrupted),Tuple{Tuple{String, MIME},Bool,Bool}}
    # We wrap the expression in a try-catch block, because we want to capture and format the exception on the worker itself.
    wrapped = :(ans = try
        # We want to eval `expr` in the global scope, try introduced a local scope.
        Core.eval(Main, $(expr |> QuoteNode))
    catch ex
        bt = stacktrace(catch_backtrace())
        CapturedException(ex, bt)
    end)

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

            return (output_formatted=format_output(InterruptException()), errored=true, interrupted=true)
        catch assertionerr
            showerror(stderr, exs)
            return (output_formatted=format_output(exs), errored=true, interrupted=true)
        end
    end

    # instead of fetching the output value (which might not make sense in our context, since the user can define structs, types, functions, etc), we format the cell output on the worker, and fetch the formatted output.
    # This also means that very big objects are not duplicated in RAM.
    fetcher = :((output_formatted=format_output(ans), errored=isa(ans, CapturedException), interrupted=false))

    # token = take!(workspace.dowork_token)
    try
        result = Distributed.remotecall_eval(Main, workspace.workspace_pid, fetcher)
        # put!(workspace.dowork_token, token)
        return result
    catch ex
        # put!(workspace.dowork_token, token)
        rethrow(ex)
    end
end

function eval_fetch_in_workspace(workspace::ModuleWorkspace, expr)::NamedTuple{(:output_formatted, :errored, :interrupted),Tuple{Tuple{String, MIME},Bool,Bool}}
    ans = try
        Core.eval(workspace.workspace_module, expr)
    catch ex
        bt = stacktrace(catch_backtrace())
        CapturedException(ex, bt)
    end
    
    format_output(ans), isa(ans, CapturedException)
end

"Evaluate expression inside the workspace - output is not fetched, errors are rethrown. For internal use."
function eval_in_workspace(notebook::Notebook, expr)
    eval_in_workspace(get_workspace(notebook), expr)
end

function eval_in_workspace(workspace::ProcessWorkspace, expr)
    # token = take!(workspace.dowork_token)
    try
        Distributed.remotecall_eval(Main, [workspace.workspace_pid], expr)
        # put!(workspace.dowork_token, token)
    catch ex
        # put!(workspace.dowork_token, token)
        rethrow(ex)
    end
    nothing
end

function eval_in_workspace(workspace::ModuleWorkspace, expr)
    Core.eval(workspace.workspace_module, expr)
    nothing
end

# "Interrupt (Ctrl+C) a workspace, return whether succesful."
# function interrupt_workspace(initiator, notebook::Notebook)::Bool
#     interrupt_workspace(initiator, WorkspaceManager.get_workspace(notebook))
# end

# function interrupt_workspace(initiator, workspace::ModuleWorkspace)
#     @warn "Unfortunately, a `ModuleWorkspace` can't be interrupted. Use a `ProcessWorkspace` instead."
#     false
# end

# function interrupt_workspace(initiator, workspace::ProcessWorkspace)
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
function kill_workspace(initiator, notebook::Notebook)::Bool
    kill_workspace(initiator, WorkspaceManager.get_workspace(notebook))
end

function kill_workspace(initiator, workspace::ModuleWorkspace)
    @warn "Unfortunately, a `ModuleWorkspace` can't be interrupted. Use a `ProcessWorkspace` instead."
    false
end

function kill_workspace(initiator, workspace::ProcessWorkspace)
    if Sys.iswindows()
        @warn "Unfortunately, stopping cells is currently not supported on Windows :(
        Maybe the Windows Subsystem for Linux is right for you:
        https://docs.microsoft.com/en-us/windows/wsl"
        return false
    end
    # You can force kill a julia process by pressing Ctrl+C four times 🙃
    # But this is not very consistent, so we will just keep pressing Ctrl+C until the workspace isn't running anymore.
    # TODO: this will also kill "pending" evaluations, and any evaluations started within 100ms of the kill. A global "evaluation count" would fix this.
    # TODO: listen for the final words of the remote process on stdout/stderr:
    
    @info "Sending interrupt to process $(workspace.workspace_pid)"
    Distributed.interrupt(workspace.workspace_pid)

    delay = 5.0 # seconds
    parts = 100

    for _ in 1:parts
        sleep(delay/parts)
        if isready(workspace.dowork_token)
            println("Cell interrupted!")
            return true
        end
    end

    println("Still running... starting sequence")
    while !isready(workspace.dowork_token)    
        print(" 🔥 ")
        for _ in 1:1
            Distributed.interrupt(workspace.workspace_pid)
            sleep(0.001)
        end
        sleep(0.2)
    end
    println()
    println("Cell interrupted!")
    true
end


"Delete all methods of the functions from the workspace."
function delete_funcs(notebook::Notebook, to_delete::Set{Symbol})
    delete_funcs(get_workspace(notebook), to_delete)
end

function delete_funcs(workspace::ModuleWorkspace, to_delete::Set{Symbol})
    for funcname in to_delete
        try
            func = Core.eval(workspace.workspace_module, funcname)
            for m in methods(func).ms
                Base.delete_method(m)
            end
        catch ex
            if !(ex isa UndefVarError)
                rethrow(ex)
            end
        end
    end
end

function delete_funcs(workspace::ProcessWorkspace, to_delete::Set{Symbol})
    isempty(to_delete) && return
    e = :(for funcname in $to_delete
        try
            func = Core.eval(Main, funcname)
            for m in methods(func).ms
                Base.delete_method(m)
            end
        catch ex
            if !(ex isa UndefVarError)
                rethrow(ex)
            end
        end
    end)
    eval_in_workspace(workspace, e)
end

"Fake deleting variables by adding them to the workspace's blacklist."
function delete_vars(notebook::Notebook, to_delete::Set{Symbol})
    delete_vars(get_workspace(notebook), to_delete)
end

function delete_vars(workspace, to_delete::Set{Symbol})
    workspace.deleted_vars = workspace.deleted_vars ∪ to_delete
end

"Remove variables for the workspace's blacklist."
function undelete_vars(notebook::Notebook, to_undelete::Set{Symbol})
    undelete_vars(get_workspace(notebook), to_undelete)
end

function undelete_vars(workspace, to_undelete::Set{Symbol})
    workspace.deleted_vars = setdiff(workspace.deleted_vars, to_undelete)
end


end