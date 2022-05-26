import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, SymbolsState, FunctionNameSignaturePair

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
	
	updated_codes = Dict{Cell,ExprAnalysisCache}()
	updated_nodes = Dict{Cell,ReactiveNode}()
	unresolved_cells = copy(old_topology.unresolved_cells.c)
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

		new_reactive_node = get(updated_nodes, cell, old_topology.nodes[cell])
		if !isempty(new_reactive_node.macrocalls)
			# The unresolved cells are the cells for wich we cannot create
			# a ReactiveNode yet, because they contains macrocalls.
			push!(unresolved_cells, cell) 
		else
			pop!(unresolved_cells, cell, nothing)
		end
	end
	new_codes = merge(old_topology.codes, updated_codes)
	new_nodes = merge(old_topology.nodes, updated_nodes)

	for removed_cell in setdiff(keys(old_topology.nodes), notebook.cells)
		delete_unsafe!(new_nodes, removed_cell)
		delete_unsafe!(new_codes, removed_cell)
		delete!(unresolved_cells, removed_cell)
	end
	
	# TODO: this could be cached in a better way if it matters
	cell_order = notebook.cells == old_topology.cell_order ?
		old_topology.cell_order : # if the order is the same, we can reuse the old one
		ImmutableVector(notebook.cells) # (this will do a shallow copy)
	
	NotebookTopology(;
		nodes=new_nodes, 
		codes=new_codes, 
		unresolved_cells=ImmutableSet(unresolved_cells; skip_copy=true), 
		cell_order
	)
end
