module WorkspaceManager
import UUIDs: UUID
import ..Pluto: Notebook, PKG_ROOT_DIR
import ..PlutoFormatter
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

"Should future workspaces be created on a separate process (`true`) or on the same one (`false`)?

Only workspaces on a separate process can be stopped during execution. Windows currently supports `true` only partially: you can't stop cells on Windows."
function set_default_distributed(val::Bool)
    global default_distributed = val
end

function reset_default_distributed()
    global default_distributed = Sys.iswindows() ? false : true
end

reset_default_distributed()

"These expressions get executed whenever a new workspace is created."
workspace_preamble = [
    :(using Markdown), 
    :(ENV["GKSwstype"] = "nul"), 
    :(show, showable, showerror, repr, string), # https://github.com/JuliaLang/julia/issues/18181
]

process_preamble = [
    :(ccall(:jl_exit_on_sigint, Cvoid, (Cint,), 0)),
    :(include($(joinpath(PKG_ROOT_DIR, "src", "notebookserver", "FormatOutput.jl")))),
    :(import REPL.REPLCompletions: completions, complete_path, completion_text),
]

moduleworkspace_count = 0
workspaces = Dict{UUID,Workspace}()


"Create a workspace for the notebook, optionally in a separate process."
function make_workspace(notebook::Notebook, new_process = default_distributed)::Workspace
    pid = if new_process
        create_workspaceprocess()
    else
        pid = Distributed.myid()
        # for some reason the PlutoFormatter might not be available in Main unless we include the file
        # (even though this is the main process)
        if !Distributed.remotecall_eval(Main, pid, :(isdefined(Main, :PlutoFormatter) && PlutoFormatter isa Module))
            Distributed.remotecall_eval(Main, [pid], :(include($(joinpath(PKG_ROOT_DIR, "src", "notebookserver", "FormatOutput.jl")))))
        end
        pid
    end

    
    module_name = create_emptyworkspacemodule(pid)
    
    workspace = Workspace(pid, module_name)
    workspaces[notebook.uuid] = workspace
    return workspace
end

function create_emptyworkspacemodule(pid::Integer)
    global moduleworkspace_count += 1
    id = moduleworkspace_count
    
    new_workspace_name = Symbol("workspace", id)
    workspace_creation = :(module $(new_workspace_name) $(workspace_preamble...) end)
    
    Distributed.remotecall_eval(Main, [pid], workspace_creation)
    
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
    # TODO: test

    # TODO
    # for s in names(workspace.workspace_module)
    #     try
    #         Core.eval(workspace.workspace_module, :($s = nothing))
    #     catch end
    # end
    
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
function eval_fetch_in_workspace(notebook::Notebook, expr)::NamedTuple{(:output_formatted, :errored, :interrupted),Tuple{Tuple{String,MIME},Bool,Bool}}
    eval_fetch_in_workspace(get_workspace(notebook), expr)
end

function eval_fetch_in_workspace(workspace::Workspace, expr)::NamedTuple{(:output_formatted, :errored, :interrupted),Tuple{Tuple{String,MIME},Bool,Bool}}
    # We wrap the expression in a try-catch block, because we want to capture and format the exception on the worker itself.
    wrapped = :(ans = try
        # We want to eval `expr` in the global scope, try introduced a local scope.
        Core.eval($(workspace.module_name), $(expr |> QuoteNode))
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

            return (output_formatted = PlutoFormatter.format_output(InterruptException()), errored = true, interrupted = true)
        catch assertionerr
            showerror(stderr, exs)
            return (output_formatted = PlutoFormatter.format_output(exs), errored = true, interrupted = true)
        end
    end

    # instead of fetching the output value (which might not make sense in our context, since the user can define structs, types, functions, etc), we format the cell output on the worker, and fetch the formatted output.
    # This also means that very big objects are not duplicated in RAM.
    fetcher = :((output_formatted = PlutoFormatter.format_output(ans), errored = isa(ans, CapturedException), interrupted = false))

    try
        result = Distributed.remotecall_eval(Main, workspace.workspace_pid, fetcher)
        return result
    catch ex
        rethrow(ex)
    end
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
        @warn "Cells in this workspace can't be stopped, because it is not running in a separate workspace. Use `set_default_distributed` to control whether future workspaces are generated in a separate process."
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


# "Delete all methods of the functions from the workspace."
# function delete_funcs(notebook::Notebook, to_delete::Set{Symbol})
#     delete_funcs(get_workspace(notebook), to_delete)
# end

# function delete_funcs(workspace::ModuleWorkspace, to_delete::Set{Symbol})
#     for funcname in to_delete
#         try
#             func = Core.eval(workspace.workspace_module, funcname)
#             for m in methods(func).ms
#                 Base.delete_method(m)
#             end
#         catch ex
#             if !(ex isa UndefVarError)
#                 rethrow(ex)
#             end
#         end
#     end
# end

# function delete_funcs(workspace::ProcessWorkspace, to_delete::Set{Symbol})
#     isempty(to_delete) && return
#     e = :(for funcname in $to_delete
#         try
#             func = Core.eval(Main, funcname)
#             for m in methods(func).ms
#                 Base.delete_method(m)
#             end
#         catch ex
#             if !(ex isa UndefVarError)
#                 rethrow(ex)
#             end
#         end
#     end)
#     eval_in_workspace(workspace, e)
# end

function move_vars(notebook::Notebook, old_workspace_name::Symbol, new_workspace_name::Symbol, vars_to_move::Set{Symbol}=Set{Symbol}(), module_imports_to_move::Set{Expr}=Set{Expr}(); invert_vars_set=false)
    move_vars(get_workspace(notebook), old_workspace_name, new_workspace_name, vars_to_move, module_imports_to_move, invert_vars_set=invert_vars_set)
end

function move_vars(workspace::Workspace, old_workspace_name::Symbol, new_workspace_name::Symbol, vars_to_move::Set{Symbol}=Set{Symbol}(), module_imports_to_move::Set{Expr}=Set{Expr}(); invert_vars_set=false)
    deleter = quote
        old_workspace_name = $(old_workspace_name |> QuoteNode)
        new_workspace_name = $(new_workspace_name |> QuoteNode)
        old_workspace = Core.eval(Main, old_workspace_name)
        new_workspace = Core.eval(Main, new_workspace_name)

        Core.eval(new_workspace, :(import ..($(old_workspace_name))))

        old_names = names(old_workspace, all=true, imported=true)
        vars_to_move = if $invert_vars_set
            setdiff(old_names, $vars_to_move)
        else
            $vars_to_move
        end

        for symbol in old_names
            if symbol in vars_to_move
                # var will not be redefined in the new workspace, move it over
                if !(symbol == :eval || symbol == :include || string(symbol)[1] == '#' || startswith(string(symbol), "workspace"))
                    try
                        val = Core.eval(old_workspace, symbol)

                        # Expose the variable in the scope of `new_workspace`
                        Core.eval(new_workspace, :(import ..($(old_workspace_name)).$(symbol)))
                    catch ex
                        @warn "Failed to move variable $(symbol) to new workspace:"
                        showerror(stderr, ex, stacktrace(backtrace()))
                    end
                end
            else
                # var will be redefined - unreference the value so that GC can snoop it

                # free memory for other variables
                # & delete methods created in the old module:
                # for example, the old module might extend an imported function: 
                # `import Base: show; show(io::IO, x::Flower) = print(io, "🌷")`
                # when you delete/change this cell, you want this extension to disappear.
                if isdefined(old_workspace, symbol)
                    val = Core.eval(old_workspace, symbol)

                    if val isa Function
                        try
                            ms = methods(val).ms

                            Base.delete_method.(filter(m -> startswith(nameof(m.module) |> string, "workspace"), ms))
                        catch ex
                            @warn "Failed to delete methods for $(symbol)"
                            showerror(stderr, ex, stacktrace(backtrace()))
                        end
                    end

                    try
                        # it could be that `symbol ∈ vars_to_move`, but the _value_ has already been moved to the new reference in `new_module`.
                        # so clearing the value of this reference does not affect the reference in `new_workspace`.
                        Core.eval(old_workspace, :($(symbol) = nothing))
                    catch; end # sometimes impossible, eg. when $symbol was constant
                end
            end
        end
    end

    Distributed.remotecall_eval(Main, [workspace.workspace_pid], deleter)
end


"Fake deleting variables by adding them to the workspace's blacklist."
function delete_vars(notebook::Notebook, to_delete::Set{Symbol}, module_imports_to_move::Set{Expr}=Set{Expr}())
    delete_vars(get_workspace(notebook), to_delete)
end

function delete_vars(workspace::Workspace, to_delete::Set{Symbol}, module_imports_to_move::Set{Expr}=Set{Expr}())
    old_workspace_name = workspace.module_name
    new_workspace_name = create_emptyworkspacemodule(workspace.workspace_pid)

    workspace.module_name = new_workspace_name

    move_vars(workspace, old_workspace_name, new_workspace_name, to_delete, module_imports_to_move; invert_vars_set=true)
end


end
