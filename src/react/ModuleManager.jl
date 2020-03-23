module ModuleManager
    import UUIDs: UUID
    import ..Pluto: Notebook

    "These expressions get executed whenever a new workspace is created."
    workspace_preamble = [:(using Markdown), :(ENV["GKSwstype"] = "nul")]
    
    workspace_counts = Dict{UUID,Int64}()
    next_count() = maximum(values(workspace_counts) ∪ [0]) + 1

    function get_workspace_id(notebook::Notebook)
        if haskey(workspace_counts, notebook.uuid)
            workspace_counts[notebook.uuid]
        else
            make_workspace(notebook)
        end
    end

    function get_workspace_at(id::Int64)
        Core.eval(ModuleManager, Symbol("workspace", id))
    end

    function get_workspace(notebook::Notebook)
        get_workspace_at(get_workspace_id(notebook))
    end

    function make_workspace(notebook::Notebook)
        id = workspace_counts[notebook.uuid] = next_count()
        
        new_workspace_name = Symbol("workspace", id)
        workspace_creation = :(module $(new_workspace_name) $(workspace_preamble...) end)
        
        # We suppress this warning:
        # Expr(:module, true, :workspace1, Expr(:block, #= Symbol("/mnt/c/dev/julia/Pluto.jl/src/React.jl"):13 =#, #= Symbol("/mnt/c/dev/julia/Pluto.jl/src/React.jl"):13 =#, Expr(:using, Expr(:., :Markdown))))
        # ** incremental compilation may be broken for this module **

        # TODO: a more elegant way?
        # TODO: check for other warnings
        original_stderr = stderr
        (rd, wr) = redirect_stderr();

        Core.eval(ModuleManager, workspace_creation)

        redirect_stderr(original_stderr)
        close(wr)
        close(rd)

        id
    end

    forbiddenmove(sym::Symbol) = sym == :eval || sym == :include || string(sym)[1] == '#'

    function move_vars(notebook::Notebook, old_index::Integer, new_index::Integer, to_delete::Set{Symbol}=Set{Symbol}(), module_usings::Set{Expr}=Set{Expr}())
        old_workspace = get_workspace_at(old_index)
        old_workspace_name = Symbol("workspace", old_index)
        new_workspace = get_workspace_at(new_index)
        new_workspace_name = Symbol("workspace", new_index)
        Core.eval(new_workspace, :(import ..($(old_workspace_name))))
        
        for mu in module_usings
            # modules are 'cached'
            # there seems to be little overhead for this, but this should be tested
            Core.eval(new_workspace, mu)
        end
        
        for symbol in names(old_workspace, all=true, imported=true)
            if !forbiddenmove(symbol) && symbol != Symbol("workspace",old_index - 1) && symbol != Symbol("workspace",old_index)
                if symbol in to_delete
                    try
                        Core.eval(old_workspace, :($(symbol) = nothing))
                    catch; end # sometimes impossible, eg. when $symbol was constant
                else
                    Core.eval(new_workspace, :($(symbol) = $(old_workspace_name).$(symbol)))
                end
            end
        end
    end

    function delete_vars(notebook::Notebook, to_delete::Set{Symbol}=Set{Symbol}(), module_usings::Set{Expr}=Set{Expr}())
        if !isempty(to_delete)
            old_index = get_workspace_id(notebook)
            new_index = make_workspace(notebook)
            move_vars(notebook, old_index, new_index, to_delete, module_usings)
        end
    end
end