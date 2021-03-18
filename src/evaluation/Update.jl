import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, FunctionNameSignaturePair
import REPL: ends_with_semicolon

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
	
	updated_codes = DefaultDict{Cell,ExprAnalysisCache}(ExprAnalysisCache, Dict{Cell,ExprAnalysisCache}(cell => (
			ExprAnalysisCache(notebook, cell)
		) for cell in notebook.cells))

	updated_nodes = DefaultDict{Cell,ReactiveNode}(ReactiveNode, Dict{Cell,ReactiveNode}(cell => (
			updated_codes[cell].parsedcode |> 
			ExpressionExplorer.try_compute_symbolreferences |> 
			ReactiveNode
		) for cell in cells))
	
	new_codes = merge(old_topology.codes, updated_codes)
	new_nodes = merge(old_topology.nodes, updated_nodes)

	# DONE (performance): deleted cells should not stay in the topology
	for removed_cell in setdiff(keys(old_topology.nodes), notebook.cells)
		delete!(new_nodes, removed_cell)
		delete!(new_codes, removed_cell)
	end

	NotebookTopology(nodes=new_nodes, codes=new_codes)
end
