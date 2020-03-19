module ModuleManager
    "These expressions get executed whenever a new workspace is created."
    workspace_preamble = [:(using Markdown), :(ENV["GKSwstype"] = "nul")]
    
    workspace_count = 0

    get_workspace(id=workspace_count) = Core.eval(ModuleManager, Symbol("workspace", id))

    function make_workspace()
        global workspace_count += 1
        
        new_workspace_name = Symbol("workspace", workspace_count)
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
    end
    make_workspace() # so that there's immediately something to work with

    forbiddenmove(sym::Symbol) = sym == :eval || sym == :include || string(sym)[1] == '#'

    function move_vars(old_index::Integer, new_index::Integer, to_delete::Set{Symbol}=Set{Symbol}(), module_usings::Set{Expr}=Set{Expr}())
        old_workspace = get_workspace(old_index)
        old_workspace_name = Symbol("workspace", old_index)
        new_workspace = get_workspace(new_index)
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

    function delete_vars(to_delete::Set{Symbol}=Set{Symbol}(), module_usings::Set{Expr}=Set{Expr}())
        if !isempty(to_delete)
            old_index = workspace_count
            make_workspace()
            move_vars(old_index, old_index+1, to_delete, module_usings)
        end
    end
end