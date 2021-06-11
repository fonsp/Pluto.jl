import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, SymbolsState, FunctionNameSignaturePair

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
	
	updated_codes = Dict{Cell,ExprAnalysisCache}()
	updated_nodes = Dict{Cell,ReactiveNode}()
	unresolved_cells = Dict{Cell,SymbolsState}()
	for cell in cells
		new_code = if !(
			haskey(old_topology.codes, cell) && 
			old_topology.codes[cell].code === cell.code
		)
			updated_codes[cell] = ExprAnalysisCache(notebook, cell)
		else
			old_topology.codes[cell]
		end

		new_symstate = new_code.parsedcode |>
			ExpressionExplorer.try_compute_symbolreferences

		if isempty(new_symstate.macrocalls)
			updated_nodes[cell] = ReactiveNode(new_symstate)
		else
			# The unresolved cells are the cells for wich we cannot create
			# a ReactiveNode yet, because they contains macrocalls.
			unresolved_cells[cell] = new_symstate
		end
	end
	new_codes = merge(old_topology.codes, updated_codes)
	new_nodes = merge(old_topology.nodes, updated_nodes)

	for removed_cell in setdiff(keys(old_topology.nodes), notebook.cells)
		delete!(new_nodes, removed_cell)
		delete!(new_codes, removed_cell)
	end

	NotebookTopology(nodes=new_nodes, codes=new_codes, unresolved_cells=unresolved_cells)
end
