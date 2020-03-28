module WorkspaceManager
import UUIDs: UUID
import ..Pluto: Notebook


mutable struct Workspace
    name::Symbol
    workspace_module::Module
    deleted_vars::Set{Symbol}
end

"These expressions get executed whenever a new workspace is created."
workspace_preamble = [:(using Markdown), :(ENV["GKSwstype"] = "nul")]

workspace_count = 0
workspaces = Dict{UUID, Workspace}()


function make_workspace(notebook::Notebook)
    global workspace_count += 1
    id = workspace_count
    
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

    workspace = Workspace(new_workspace_name, m, Set{Symbol}())
    workspaces[notebook.uuid] = workspace
    workspace
end

function get_workspace(notebook::Notebook)::Workspace
    if haskey(workspaces, notebook.uuid)
        workspaces[notebook.uuid]
    else
        workspaces[notebook.uuid] = make_workspace(notebook)
    end
end

function delete_funcs(notebook::Notebook, to_delete::Set{Symbol})
    # TODO: treat methods separately
    ws = get_workspace(notebook)
    for funcname in to_delete
        try
            func = Core.eval(ws.workspace_module, funcname)
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

function delete_vars(notebook::Notebook, to_delete::Set{Symbol})
    # TODO: treat methods separately
    ws = get_workspace(notebook)
    ws.deleted_vars = ws.deleted_vars ∪ to_delete
end

function undelete_vars(notebook::Notebook, to_undelete::Set{Symbol})
    ws = get_workspace(notebook)
    ws.deleted_vars = setdiff(ws.deleted_vars, to_undelete)
end
end