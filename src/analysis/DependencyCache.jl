import UUIDs: UUID

"""
Gets a dictionary of all symbols and the respective cells which are dependent on the given cell.

Changes in the given cell cause re-evaluation of these cells.
Note that only direct dependents are given here, not indirect dependents.
"""
function downstream_cells_map(cell::Cell, topology::NotebookTopology)::Dict{Symbol,Vector{Cell}}
    defined_symbols = let node = topology.nodes[cell]
        node.definitions ∪ Iterators.filter(!_is_anon_function_name, node.funcdefs_without_signatures)
    end
    return Dict{Symbol,Vector{Cell}}(
        sym => PlutoDependencyExplorer.where_referenced(topology, Set([sym]))
        for sym in defined_symbols
    )
end

_is_anon_function_name(s::Symbol) = startswith(String(s), "__ExprExpl_anon__")

"""
Gets a dictionary of all symbols and the respective cells on which the given cell depends.

Changes in these cells cause re-evaluation of the given cell.
Note that only direct dependencies are given here, not indirect dependencies.
"""
function upstream_cells_map(cell::Cell, topology::NotebookTopology)::Dict{Symbol,Vector{Cell}}
    referenced_symbols = topology.nodes[cell].references
    return Dict{Symbol,Vector{Cell}}(
        sym => PlutoDependencyExplorer.where_assigned(topology, Set([sym]))
        for sym in referenced_symbols
    )
end

"Fills cell dependency information for display in the GUI"
function update_dependency_cache!(cell::Cell, topology::NotebookTopology)
    cell.cell_dependencies = CellDependencies(
        downstream_cells_map(cell, topology), 
        upstream_cells_map(cell, topology), 
        PlutoDependencyExplorer.cell_precedence_heuristic(topology, cell),
    )
end

"Fills dependency information on notebook and cell level."
function update_dependency_cache!(notebook::Notebook, topology::NotebookTopology=notebook.topology)
    notebook._cached_topological_order = topological_order(notebook)
    
    if notebook._cached_cell_dependencies_source !== topology
        notebook._cached_cell_dependencies_source = topology
        
        for cell in all_cells(topology)
            update_dependency_cache!(cell, topology)
        end
        
        notebook._cached_cell_dependencies = Dict{UUID,Dict{String,Any}}(
            id => Dict{String,Any}(
                "cell_id" => cell.cell_id,
                "downstream_cells_map" => Dict{String,Vector{UUID}}(
                    String(s) => cell_id.(r)
                    for (s, r) in cell.cell_dependencies.downstream_cells_map
                ),
                "upstream_cells_map" => Dict{String,Vector{UUID}}(
                    String(s) => cell_id.(r)
                    for (s, r) in cell.cell_dependencies.upstream_cells_map
                ),
                "precedence_heuristic" => cell.cell_dependencies.precedence_heuristic,
            )
            for (id, cell) in notebook.cells_dict
        )
    end
end
