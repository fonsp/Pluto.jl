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

"Run a cell and all the cells that depend on it"
function run_reactive!(initiator, notebook::Notebook, cell::Cell)
    cell.parsedcode = Meta.parse(cell.code, raise=false)
    cell.module_usings = ExploreExpression.compute_usings(cell.parsedcode)

    old_modified = cell.modified_symbols
    symstate = ExploreExpression.compute_symbolreferences(cell.parsedcode)
    all_modified = old_modified ∪ symstate.assignments

    # During the upcoming search, we will temporarily use `all_modified` instead of `symstate.assignments`
    # as this cell's set of assignments. This way, any variables that were deleted by this cell change
    # will be deleted, and the cells that depend on the deleted variable will be run again. (Leading to errors.)
    cell.modified_symbols = all_modified
    cell.referenced_symbols = symstate.references

    modifiers = where_modified(notebook, all_modified)
    remodified = length(modifiers) > 1 ? modifiers : []

    dependency_info = dependent_cells.([notebook], union(modifiers, [cell]))
    will_update = union((d[1] for d in dependency_info)...)
    cyclic = union((d[2] for d in dependency_info)...)

    module_usings = union((c.module_usings for c in notebook.cells)...)
    to_delete = union(old_modified, (c.modified_symbols for c in will_update)...)
    
    ModuleManager.delete_vars(to_delete, module_usings)

    cell.modified_symbols = symstate.assignments

    for to_run in will_update
        putnotebookupdates!(notebook, clientupdate_cell_running(initiator, notebook, to_run))
    end
    # 😴 small nap to allow the pending updates to be sent by the other task
    # sleep(0.005)

    for to_run in will_update
        if to_run in remodified
            modified_multiple = let
                other_modifiers = setdiff(modifiers, [to_run])
                union((to_run.modified_symbols ∩ c.modified_symbols for c in other_modifiers)...)
            end
            relay_error!(to_run, "Multiple definitions for $(join(modified_multiple, ", ", " and "))")
        elseif to_run in cyclic
            modified_cyclic = let
                referenced_during_cycle = union((c.referenced_symbols for c in cyclic)...)
                modified_during_cycle = union((c.modified_symbols for c in cyclic)...)
                
                referenced_during_cycle ∩ modified_during_cycle
            end
            relay_error!(to_run, "Cyclic references: $(join(modified_cyclic, ", ", " and "))")
        else
            run_single!(to_run)
        end
        putnotebookupdates!(notebook, clientupdate_cell_output(initiator, notebook, to_run))
        # sleep(0.001)
    end

    return will_update
end


function run_single!(cell::Cell)
    # if isa(cell.parsedcode, Expr) && cell.parsedcode.head == :using
    #     # Don't run this cell. We set its output directly and stop the method prematurely.
    #     relay_error!(cell, "Use `import` instead of `using`.\nSupport for `using` will be added soon.")
    #     return
    # end

    try
        relay_output!(cell, Core.eval(ModuleManager.get_workspace(), cell.parsedcode))
        # TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
    catch err
        bt = stacktrace(catch_backtrace())
        relay_error!(cell, err, bt)
    end
end


"Cells to be evaluated in a single reactive cell run, in order - including the given cell"
function dependent_cells(notebook::Notebook, root::Cell)
    entries = Cell[]
    exits = Cell[]
    cyclic = Set{Cell}()

    function dfs(cell::Cell)
        if cell in exits
            return
        elseif length(entries) > 0 && entries[end] == cell
            return # a cell referencing itself is legal
        elseif cell in entries
            currently_entered = setdiff(entries, exits)
            detected_cycle = currently_entered[findfirst(currently_entered .== [cell]):end]
            cyclic = union(cyclic, detected_cycle)
            return
        end

        push!(entries, cell)
        dfs.(where_referenced(notebook, cell.modified_symbols))
        push!(exits, cell)
    end

    dfs(root)
    return reverse(exits), cyclic
end


"Return cells that reference any of the given symbols - does *not* recurse"
function where_referenced(notebook::Notebook, symbols::Set{Symbol})
    return filter(notebook.cells) do cell
        return any(s in symbols for s in cell.referenced_symbols)
    end
end


"Return cells that modify any of the given symbols"
function where_modified(notebook::Notebook, symbols::Set{Symbol})
    return filter(notebook.cells) do cell
        return any(s in symbols for s in cell.modified_symbols)
    end
end