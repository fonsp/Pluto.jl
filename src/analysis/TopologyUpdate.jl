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

	new_unresolved_set = setdiff!(
		union!(
			Set{Cell}(),
			# all cells that were unresolved before, and did not change code...
			Iterators.filter(old_topology.unresolved_cells) do c
				!haskey(updated_nodes, c)
			end,
			# ...plus all cells that changed, and now use a macrocall...
			Iterators.filter(cells) do c
				!isempty(new_nodes[c].macrocalls)
			end,
		),
		# ...minus cells that were removed.
		removed_cells,
	)

	new_disabled_set = setdiff!(
		union!(
			Set{Cell}(),
			# all cells that were disabled before...
			old_topology.disabled_cells,
			# ...plus all cells that changed...
			cells,
		),
		# ...minus cells that changed and are not disabled.
		Iterators.filter(!is_disabled, cells),
	)

	unresolved_cells = if new_unresolved_set == old_topology.unresolved_cells
		old_topology.unresolved_cells
	else
		ImmutableSet(new_unresolved_set; skip_copy=true)
	end

	disabled_cells = if new_disabled_set == old_topology.disabled_cells
		old_topology.disabled_cells
	else
		ImmutableSet(new_disabled_set; skip_copy=true)
	end

	cell_order = if old_cells == notebook.cells
		old_topology.cell_order
	else
		ImmutableVector(notebook.cells) # makes a copy
	end
	
	NotebookTopology(;
		nodes=new_nodes,
		codes=new_codes,
		unresolved_cells, 
        disabled_cells,
		cell_order,
	)
end
