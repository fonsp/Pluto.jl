import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, FunctionNameSignaturePair

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
	
	updated_codes = Dict{Cell,ExprAnalysisCache}()
	for cell in cells
		if !(
			haskey(old_topology.codes, cell) && 
			old_topology.codes[cell].code === cell.code
		)
			updated_codes[cell] = ExprAnalysisCache(notebook, cell)
		end
	end
	new_codes = merge(old_topology.codes, updated_codes)

	cells_symstates = (cell => (new_codes[cell].parsedcode 
				    |> ExpressionExplorer.try_compute_symbolreferences) for cell in cells)
	updated_nodes = Dict{Cell,ReactiveNode}(cell => ReactiveNode(symstate)
																					for (cell, symstate) in cells_symstates 
																					if isempty(symstate.macrocalls))
	new_nodes = merge(old_topology.nodes, updated_nodes)

	# The unresolved cells are the cells for wich we cannot create
	# a ReactiveNode yet, because they contains macrocalls.
	unresolved_cells = [cell_symstate
			    for cell_symstate in cells_symstates 
			    if !isempty(cell_symstate.second.macrocalls)]

	# DONE (performance): deleted cells should not stay in the topology
	for removed_cell in setdiff(keys(old_topology.nodes), notebook.cells)
		delete!(new_nodes, removed_cell)
		delete!(new_codes, removed_cell)
	end

	NotebookTopology(nodes=new_nodes, codes=new_codes, unresolved_cells=unresolved_cells)
end
