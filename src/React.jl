include("./Notebook.jl")
include("./ExploreExpression.jl")


module ModuleManager
    workspace_count = 0

    function make_workspace()
        # TODO: define `expr` directly, but it's more readable right now
        code = "module workspace$(workspace_count + 1) end"
        expr = Meta.parse(code)
        Core.eval(ModuleManager, expr)
        global workspace_count += 1
    end
    make_workspace() # so that there's immediately something to work with

    get_workspace(id=workspace_count) = Core.eval(ModuleManager, Symbol("workspace", id))
end


"Run a cell and all the cells that depend on it"
function run_cell(notebook::Notebook, cell::Cell)
    if cell.parsedcode === nothing
        cell.parsedcode = Meta.parse(cell.code, raise=false)
    end

    modified = ExploreExpression.modified(cell.parsedcode)
    referenced = ExploreExpression.referenced(cell.parsedcode)

    # TODO: assert that cell doesn't modify variables which are modified by other cells
    # TODO: remove all variables that the cell used to modify
    # this way, those which it assigns to will get re-added, and cyclic references will throw an error

    cell.modified_symbols = modified
    cell.referenced_symbols = referenced

    dependent = dependent_cells(notebook, cell) # TODO: catch recursive error

    for to_eval in dependent
        try
            to_eval.output = Core.eval(ModuleManager.get_workspace(), to_eval.parsedcode)
            to_eval.errormessage = nothing
        catch err
            # TODO: errored symbols should be deleted, leading to errors at referencers, which is good
            to_eval.output = nothing
            to_eval.errormessage = sprint(showerror, err)
        end
        display(to_eval.output)
        # TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
    end

    return dependent
end


"Cells to be evaluated in a single reactive cell run, in order - including the given cell"
function dependent_cells(notebook::Notebook, root::Cell)
    entries = Array{Cell, 1}()
    exits = Array{Cell, 1}()

    function dfs(cell::Cell)
        if cell in exits
            return
        elseif cell in entries
            throw(ArgumentError("Recursive reactivity is not allowed"))
        end

        push!(entries, cell)

        dfs.(referencing_cells(notebook, cell.modified_symbols))

        push!(exits, cell)
    end

    dfs(root)
    return reverse(exits)
end


"Return cells that reference any of the given symbols - does *not* recurse"
function referencing_cells(notebook::Notebook, symbols::Array{Symbol, 1})
    return filter(notebook.cells) do cell
        return any(s in symbols for s in cell.referenced_symbols)
    end
end