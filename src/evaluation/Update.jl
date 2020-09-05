import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts

"Update the cell's caches, i.e. parse code and collect metadata."
function update_caches!(notebook::Notebook, cells)
    for cell in cells
        if cell.parsedcode === nothing
            cell.parsedcode = parse_custom(notebook, cell)
            cell.module_usings = ExpressionExplorer.compute_usings(cell.parsedcode)
            cell.rootassignee = ExpressionExplorer.get_rootassignee(cell.parsedcode)
        end
    end
end

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
    updated_symstates = Dict(
        cell => ExpressionExplorer.try_compute_symbolreferences(cell.parsedcode) for cell in cells
    )
    new_symstates = merge(old_topology.symstates, updated_symstates)

    # Update the combined collection of function definitions, where multiple specialisations of a function are combined into a single `SymbolsState`.
    new_funcdefs = union((symstate.funcdefs for (k, symstate) in new_symstates)...)
    new_topology = NotebookTopology(new_symstates, new_funcdefs)

    for cell in cells
        finish_cache!(new_topology, cell)
    end

    new_topology
end

"Account for globals referenced in function calls by including `SymbolsState`s from called functions in the cell itself."
function finish_cache!(topology::NotebookTopology, cell::Cell)
    calls = all_indirect_calls(topology, topology[cell])
    calls = union!(calls, keys(topology[cell].funcdefs)) # _assume_ that all defined functions are called inside the cell to trigger eager reactivity.
    filter!(in(keys(topology.combined_funcdefs)), calls)

    union!(
        topology[cell].references,
        (topology.combined_funcdefs[func].references for func in calls)...,
    )
    union!(
        topology[cell].assignments,
        (topology.combined_funcdefs[func].assignments for func in calls)...,
    )

    add_funcnames!(topology, cell, calls)
end

"""Add method calls and definitions as symbol references and definition, resp.

Will add `Module.func` (stored as `Symbol[:Module, :func]`) as Symbol("Module.func") (which is not the same as the expression `:(Module.func)`)."""
function add_funcnames!(topology::NotebookTopology, cell::Cell, calls::Set{Vector{Symbol}})
    push!(topology[cell].references, (topology[cell].funccalls .|> join_funcname_parts)...)
    push!(topology[cell].assignments, (keys(topology[cell].funcdefs) .|> join_funcname_parts)...)

    union!(
        topology[cell].references,
        (topology.combined_funcdefs[func].funccalls .|> join_funcname_parts for func in calls)...,
    )
    union!(
        topology[cell].assignments,
        (
            keys(topology.combined_funcdefs[func].funcdefs) .|> join_funcname_parts for func in calls
        )...,
    )
end
