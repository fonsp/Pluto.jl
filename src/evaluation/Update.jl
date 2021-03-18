import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, FunctionNameSignaturePair
import REPL: ends_with_semicolon

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

	updated_nodes = Dict{Cell,ReactiveNode}(cell => (
			new_codes[cell].parsedcode |> 
			ExpressionExplorer.try_compute_symbolreferences |> 
			ReactiveNode
		) for cell in cells)

	new_nodes = merge(old_topology.nodes, updated_nodes)

	# DONE (performance): deleted cells should not stay in the topology
	for removed_cell in setdiff(keys(old_topology.nodes), notebook.cells)
		delete!(new_nodes, removed_cell)
		delete!(new_codes, removed_cell)
	end

	NotebookTopology(nodes=new_nodes, codes=new_codes)
end
