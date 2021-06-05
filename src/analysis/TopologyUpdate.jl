import .ExpressionExplorer
import .ExpressionExplorer: join_funcname_parts, FunctionNameSignaturePair
import REPL: ends_with_semicolon

"Return a copy of `old_topology`, but with recomputed results from `cells` taken into account."
function updated_topology(old_topology::NotebookTopology, notebook::Notebook, cells)
	
	updated_codes = Dict{Cell,ExprAnalysisCache}()
	updated_nodes = Dict{Cell,ReactiveNode}()
	for cell in cells
		if !(
			haskey(old_topology.codes, cell) && 
			old_topology.codes[cell].code === cell.code
		)
			parsedcode = parse_custom(notebook, cell)
			new_node = parsedcode |>
				ExpressionExplorer.try_compute_symbolreferences |>
				ReactiveNode
			using_imports = ExpressionExplorer.compute_usings_imports(parsedcode)
			new_code = ExprAnalysisCache(
				code=cell.code,
				parsedcode=parsedcode,
				module_usings_imports=using_imports,
				function_wrapped=isempty(filter(funcname -> !startswith(string(funcname), "anon"), new_node.funcdefs_without_signatures)) &&
					:eval ∉ new_node.references && :include ∉ new_node.references &&
					isempty(using_imports.usings) && isempty(using_imports.imports) &&
					ExpressionExplorer.can_be_function_wrapped(parsedcode)
			)

			updated_nodes[cell] = new_node
			updated_codes[cell] = new_code
		end
	end
	new_codes = merge(old_topology.codes, updated_codes)
	new_nodes = merge(old_topology.nodes, updated_nodes)

	# DONE (performance): deleted cells should not stay in the topology
	for removed_cell in setdiff(keys(old_topology.nodes), notebook.cells)
		delete!(new_nodes, removed_cell)
		delete!(new_codes, removed_cell)
	end

	NotebookTopology(nodes=new_nodes, codes=new_codes)
end
