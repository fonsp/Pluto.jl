import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, FunctionNameSignaturePair

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
	# TODO (performance): deleted cells should not stay in the topology

	updated_nodes = Dict(cell => (
			cell.parsedcode |> 
			ExpressionExplorer.try_compute_symbolreferences |> 
			ReactiveNode
		) for cell in cells)::Dict{Cell,ReactiveNode}
	
	new_nodes = merge(old_topology.nodes, updated_nodes)

	NotebookTopology(new_nodes)
end
