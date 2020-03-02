include("./Notebook.jl")
include("./ExploreExpression.jl")


module ModuleManager
    workspace_count = 0

    get_workspace(id=workspace_count) = Core.eval(ModuleManager, Symbol("workspace", id))

    function make_workspace()
        global workspace_count += 1
        # TODO: define `expr` directly, but it's more readable right now
        code = "module workspace$(workspace_count) end"
        expr = Meta.parse(code)
        Core.eval(ModuleManager, expr)
    end
    make_workspace() # so that there's immediately something to work with

    forbiddenmoves = [:eval, :include, Symbol("#eval"), Symbol("include")]

    function move_vars(from_index::Integer, to_index::Integer, to_delete::Set{Symbol}=Set{Symbol}())
        println("Moving workspace!")
        println("Deleting:")
        println(to_delete)
        old_workspace = get_workspace(from_index)
        new_workspace = get_workspace(to_index)
        Core.eval(new_workspace, Meta.parse("import ..workspace$(from_index)"))

        for symbol in names(old_workspace, all=true, imported=true)
            if !(symbol in forbiddenmoves) && symbol != Symbol("workspace",from_index - 1) && symbol != Symbol("workspace",from_index)
                if symbol in to_delete
                    Core.eval(old_workspace, Meta.parse("$symbol = nothing"))
                else
                    # Core.eval(ModuleManager, Meta.parse("workspace$(to_index).$symbol = workspace$(from_index).$symbol"))
                    Core.eval(new_workspace, Meta.parse("$symbol = workspace$(from_index).$symbol"))
                    # Core.eval(old_workspace, Meta.parse("$symbol = nothing"))
                end
            end
        end
    end

    function delete_vars(to_delete::Set{Symbol}=Set{Symbol}())
        if !isempty(to_delete)
            from = workspace_count
            make_workspace()
            move_vars(from, from+1, to_delete)
        end
    end
end


"Run a cell and all the cells that depend on it"
function run_cell(notebook::Notebook, cell::Cell)
    if cell.parsedcode === nothing
        cell.parsedcode = Meta.parse(cell.code, raise=false)
    end

    old_modified_symbols = cell.modified_symbols
    old_dependent = try
        dependent_cells(notebook, cell)
    catch e
        # must be array, not set, to maintain order with `union`
        Cell[]
    end

    symstate = ExploreExpression.compute_symbolreferences(cell.parsedcode)
    referenced, modified = symstate.references, symstate.assignments

    # TODO: assert that cell doesn't modify variables which are modified by other cells
    # TODO: remove all variables that the cell used to modify
    # this way, those which it assigns to will get re-added, and cyclic references will throw an error

    cell.modified_symbols = modified
    cell.referenced_symbols = referenced

    setdiff(old_modified_symbols, cell.modified_symbols) |> ModuleManager.delete_vars


    will_update = try
        new_dependent = dependent_cells(notebook, cell)
        union(old_dependent, new_dependent)
    catch err
        # cell.parsedcode = Expr(:call, :error, sprint(showerror, err))
        cell.output = nothing
        cell.errormessage = sprint(showerror, err)
        # Don't run this cell. We set its output directly and stop the method prematurely.
        # Must be array, not set, to maintain order with `union`
        return [cell]
    end


    for to_eval in will_update
        try
            to_eval.output = Core.eval(ModuleManager.get_workspace(), to_eval.parsedcode)
            to_eval.errormessage = nothing

        catch err
            # TODO: errored symbols should be deleted, leading to errors at referencers, which is good
            to_eval.output = nothing
            to_eval.errormessage = sprint(showerror, err)
        end
        # display(to_eval.output)
        # TODO: capture stdout and display it somehwere, but let's keep using the actual terminal for now
    end

    return will_update
end


"Cells to be evaluated in a single reactive cell run, in order - including the given cell"
function dependent_cells(notebook::Notebook, root::Cell)::Array{Cell, 1}
    entries = Array{Cell, 1}()
    exits = Array{Cell, 1}()

    function dfs(cell::Cell)
        if cell in exits
            return
        elseif cell in entries
            throw(ArgumentError("Circular reference"))
        end

        push!(entries, cell)

        dfs.(referencing_cells(notebook, cell.modified_symbols))

        push!(exits, cell)
    end

    dfs(root)
    return reverse(exits)
end


"Return cells that reference any of the given symbols - does *not* recurse"
function referencing_cells(notebook::Notebook, symbols::Set{Symbol})
    return filter(notebook.cells) do cell
        return any(s in symbols for s in cell.referenced_symbols)
    end
end