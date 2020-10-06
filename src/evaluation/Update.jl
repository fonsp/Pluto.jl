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
	updated_symstates = Dict(cell => ExpressionExplorer.try_compute_symbolreferences(cell.parsedcode) for cell in cells)
	new_symstates = merge(old_topology.symstates, updated_symstates)

	new_topology = NotebookTopology(new_symstates)

	for cell in cells
		merge_functions_into_symstate!(new_topology[cell])
	end
	
	new_topology
end

"Account for globals referenced in function calls by including `SymbolsState`s from defined functions in the cell itself."
function merge_functions_into_symstate!(symstate::SymbolsState)
	# re c   u     r         s                            e
	for (_, body_symstate) in symstate.funcdefs
		merge_functions_into_symstate!(body_symstate)
	end

	add_funcnames!(symstate)
	union!(symstate, (symstate for (_, symstate) in symstate.funcdefs)...)
end

"""Add method calls and definitions as symbol references and definition, resp.

Will add `Module.func` (stored as `Symbol[:Module, :func]`) as Symbol("Module.func") (which is not the same as the expression `:(Module.func)`)."""
function add_funcnames!(symstate::SymbolsState)
	push!(symstate.references, (symstate.funccalls .|> join_funcname_parts)...)
	push!(symstate.assignments, (join_funcname_parts(namesig.name) for namesig ∈ keys(symstate.funcdefs))...)
end