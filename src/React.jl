include("./Notebook.jl")
include("./Symbols.jl")


module ModuleManager
    module_count = 0

    function make_module()
        code = "module module$(module_count + 1) end"
        expr = Meta.parse(code)
        Core.eval(ModuleManager, expr)
        global module_count += 1
    end
    make_module() # so that there's immediately something to work with

    get_module(id=module_count) = Core.eval(ModuleManager, Meta.parse("module$id"))
end


"Run a cell and all the cells that depend on it"
function run_cell(notebook::Notebook, cell::Cell)
    if cell.parsedcode === nothing
        cell.parsedcode = Meta.parse(cell.code)
    end

    modified = Symbols.modified(cell.parsedcode)
    referenced = Symbols.referenced(cell.parsedcode)

    # TODO: assert that cell doesn't modify variables which are modified by other cells
    # TODO: remove all variables that the cell used to modify
    # this way, those which it assigns to will get re-added, and cyclic references will throw an error

    cell.modified_symbols = modified
    cell.referenced_symbols = referenced

    dependent = dependent_cells(notebook, cell) # TODO: catch recursive error

    for to_eval in dependent
        to_eval.output = Core.eval(ModuleManager.get_module(), to_eval.parsedcode)
        display(to_eval.output)
        # TODO: capture display(), println(), throw() and such
        # TODO: exception handling
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
        [dfs(c) for c in referencing_cells(notebook, cell.modified_symbols)]
        push!(exits, cell)
    end

    dfs(root)
    return reverse(exits)
end


"Cells that reference given symbols - does *not* recurse"
function referencing_cells(notebook::Notebook, symbols::Array{Symbol, 1})
    function references(cell::Cell)
        return any(symbol in symbols for symbol in cell.referenced_symbols)
    end

    return filter(references, notebook.cells)
end