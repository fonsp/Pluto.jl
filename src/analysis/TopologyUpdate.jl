import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, SymbolsState, FunctionNameSignaturePair

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
	
	updated_codes = Dict{Cell,ExprAnalysisCache}()
	updated_nodes = Dict{Cell,ReactiveNode}()
	
	for cell in cells
		old_code = old_topology.codes[cell]
		if old_code.code !== cell.code
			new_code = updated_codes[cell] = ExprAnalysisCache(notebook, cell)
			new_symstate = new_code.parsedcode |>
				ExpressionExplorer.try_compute_symbolreferences
			new_reactive_node = ReactiveNode(new_symstate)

			updated_nodes[cell] = new_reactive_node
		elseif old_code.forced_expr_id !== nothing
			# reset computer code
			updated_codes[cell] = ExprAnalysisCache(old_code; forced_expr_id=nothing, function_wrapped=false)
		end
	end
	
	
	old_cells = all_cells(old_topology)
	removed_cells = setdiff(old_cells, notebook.cells)
	if isempty(removed_cells)
		# We can keep identity
		new_codes = merge(old_topology.codes, updated_codes)
		new_nodes = merge(old_topology.nodes, updated_nodes)
	else
		new_codes = merge(setdiffkeys(old_topology.codes, removed_cells), updated_codes)
		new_nodes = merge(setdiffkeys(old_topology.nodes, removed_cells), updated_nodes)
	end
	
	unresolved_cells = if isempty(updated_nodes) && isempty(removed_cells)
		old_topology.unresolved_cells
	else
		# The new set of unresolved cells is...
		new_unresolved_set = setdiff!(
			union!(
				Set{Cell}(),
				# all cells that were unresolved before...
				old_topology.unresolved_cells,
				# ...plus all cells that changed...
				keys(updated_nodes),
			),
			# ...minus cells that were removed...
			removed_cells, 
			# ...minus cells that changed, which do not use any macros.
			(c for (c,n) in updated_nodes if isempty(n.macrocalls))
		)
		ImmutableSet{Cell}(new_unresolved_set; skip_copy=true)
	end

	cell_order = if old_cells == notebook.cells
		old_topology.cell_order
	else
		ImmutableVector(notebook.cells)
	end
	
	NotebookTopology(;
		nodes=new_nodes,
		codes=new_codes,
		unresolved_cells, 
		cell_order,
	)
end
