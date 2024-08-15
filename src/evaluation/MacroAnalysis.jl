# Macro Analysis & Topology Resolution (see https://github.com/fonsp/Pluto.jl/pull/1032)

import .WorkspaceManager: macroexpand_in_workspace

const lazymap = Base.Generator

function defined_variables(topology::NotebookTopology, cells)
	lazymap(cells) do cell
		topology.nodes[cell].definitions
	end
end

function defined_functions(topology::NotebookTopology, cells)
	lazymap(cells) do cell
		((cell.cell_id, namesig.name) for namesig in topology.nodes[cell].funcdefs_with_signatures)
	end
end

is_macro_identifier(symbol::Symbol) = startswith(string(symbol), "@")

function with_new_soft_definitions(topology::NotebookTopology, cell::Cell, soft_definitions)
    old_node = topology.nodes[cell]
    new_node = union!(ReactiveNode(), old_node, ReactiveNode(soft_definitions=soft_definitions))
    NotebookTopology(
		codes=topology.codes, 
		nodes=merge(topology.nodes, Dict(cell => new_node)), 
		unresolved_cells=topology.unresolved_cells,
		cell_order=topology.cell_order,
        disabled_cells=topology.disabled_cells,
	)
end

collect_implicit_usings(topology::NotebookTopology, cell::Cell) =
    ExpressionExplorerExtras.collect_implicit_usings(topology.codes[cell].module_usings_imports)

function cells_with_deleted_macros(old_topology::NotebookTopology, new_topology::NotebookTopology)
    old_macros = mapreduce(c -> defined_macros(old_topology, c), union!, all_cells(old_topology); init=Set{Symbol}())
    new_macros = mapreduce(c -> defined_macros(new_topology, c), union!, all_cells(new_topology); init=Set{Symbol}())
    removed_macros = setdiff(old_macros, new_macros)

    PlutoDependencyExplorer.where_referenced(old_topology, removed_macros)
end

"Returns the set of macros names defined by this cell"
defined_macros(topology::NotebookTopology, cell::Cell) = defined_macros(topology.nodes[cell])
defined_macros(node::ReactiveNode) = union!(filter(is_macro_identifier, node.funcdefs_without_signatures), filter(is_macro_identifier, node.definitions)) # macro definitions can come from imports

"Tells whether or not a cell can 'unlock' the resolution of other cells"
function can_help_resolve_cells(topology::NotebookTopology, cell::Cell)
    cell_code = topology.codes[cell]
    cell_node = topology.nodes[cell]
    macros = defined_macros(cell_node)

	!isempty(cell_code.module_usings_imports.usings) ||
		(!isempty(macros) && any(calls -> !disjoint(calls, macros), topology.nodes[c].macrocalls for c in topology.unresolved_cells))
end

# Sorry couldn't help myself - DRAL
abstract type Result end
struct Success <: Result
	result
end
struct Failure <: Result
	error
end
struct Skipped <: Result end

"""We still have 'unresolved' macrocalls, use the current and maybe previous workspace to do macro-expansions.

You can optionally specify the roots for the current reactive run. If a cell macro contains only macros that will
be re-defined during this reactive run, we don't expand yet and expect the `can_help_resolve_cells` function above
to be true for the cell defining the macro, triggering a new topology resolution without needing to fallback to the
previous workspace.
"""
function resolve_topology(
	session::ServerSession,
	notebook::Notebook,
	unresolved_topology::NotebookTopology,
	old_workspace_name::Symbol;
	current_roots::Vector{Cell}=Cell[],
)::NotebookTopology


	sn = (session, notebook)

	function macroexpand_cell(cell)
		function try_macroexpand(module_name::Symbol=Symbol(""))
			success, result = macroexpand_in_workspace(sn, unresolved_topology.codes[cell].parsedcode, cell.cell_id, module_name)
			if success
				Success(result)
			else
				Failure(result)
			end
		end

		result = try_macroexpand()
		if result isa Success
			result
		else
			if (result.error isa LoadError && result.error.error isa UndefVarError) || result.error isa UndefVarError
				try_macroexpand(old_workspace_name)
			else
				result
			end
		end
	end

	function analyze_macrocell(cell::Cell)
		if unresolved_topology.nodes[cell].macrocalls ⊆ ExpressionExplorerExtras.can_macroexpand
			return Skipped()
		end

		result = macroexpand_cell(cell)
		if result isa Success
			(expr, computer_id) = result.result
			expanded_node = ExpressionExplorer.compute_reactive_node(ExpressionExplorerExtras.pretransform_pluto(expr))
			function_wrapped = ExpressionExplorerExtras.can_be_function_wrapped(expr)
			Success((expanded_node, function_wrapped, computer_id))
		else
			result
		end
	end

	run_defined_macros = mapreduce(c -> defined_macros(unresolved_topology, c), union!, current_roots; init=Set{Symbol}())

	# create new node & new codes for macrocalled cells
	new_nodes = Dict{Cell,ReactiveNode}()
	new_codes = Dict{Cell,ExprAnalysisCache}()
	still_unresolved_nodes = Set{Cell}()

	for cell in unresolved_topology.unresolved_cells
		if unresolved_topology.nodes[cell].macrocalls ⊆ run_defined_macros
			# Do not try to expand if a newer version of the macro is also scheduled to run in the
			# current run. The recursive reactive runs will take care of it.
			push!(still_unresolved_nodes, cell)
			continue
		end

		result = try
			if will_run_code(notebook)
				analyze_macrocell(cell)
			else
				Failure(ErrorException("shutdown"))
			end
		catch error
			@error "Macro call expansion failed with a non-macroexpand error" exception=(error,catch_backtrace()) cell.code
			Failure(error)
		end
		if result isa Success
			(new_node, function_wrapped, forced_expr_id) = result.result
			union!(new_node.macrocalls, unresolved_topology.nodes[cell].macrocalls)
			union!(new_node.references, new_node.macrocalls)
			new_nodes[cell] = new_node

			# set function_wrapped to the function wrapped analysis of the expanded expression.
			new_codes[cell] = ExprAnalysisCache(unresolved_topology.codes[cell]; forced_expr_id, function_wrapped)
		elseif result isa Skipped
			# Skipped because it has already been resolved during ExpressionExplorer.
		else
			@debug "Could not resolve" result cell.code
			push!(still_unresolved_nodes, cell)
		end
	end

	all_nodes = merge(unresolved_topology.nodes, new_nodes)
	all_codes = merge(unresolved_topology.codes, new_codes)
	
	new_unresolved_cells = if length(still_unresolved_nodes) == length(unresolved_topology.unresolved_cells)
		# then they must equal, and we can skip creating a new one to preserve identity:
		unresolved_topology.unresolved_cells
	else
		PlutoDependencyExplorer.ImmutableSet(still_unresolved_nodes; skip_copy=true)
	end

	NotebookTopology(;
		nodes=all_nodes, 
		codes=all_codes, 
		unresolved_cells=new_unresolved_cells,
		cell_order=unresolved_topology.cell_order,
        disabled_cells=unresolved_topology.disabled_cells,
	)
end

"""Tries to add information about macro calls without running any code, using knowledge about common macros.
So, the resulting reactive nodes may not be absolutely accurate. If you can run code in a session, use `resolve_topology` instead.
"""
function static_macroexpand(topology::NotebookTopology, cell::Cell)
	new_node = ExpressionExplorer.compute_reactive_node(
		ExpressionExplorerExtras.pretransform_pluto(
			ExpressionExplorerExtras.maybe_macroexpand_pluto(
				topology.codes[cell].parsedcode; recursive=true
			)
		)
	)
	union!(new_node.macrocalls, topology.nodes[cell].macrocalls)

	new_node
end

"The same as `resolve_topology` but does not require custom code execution, only works with a few `Base` & `PlutoRunner` macros"
function static_resolve_topology(topology::NotebookTopology)
	new_nodes = Dict{Cell,ReactiveNode}(cell => static_macroexpand(topology, cell) for cell in topology.unresolved_cells)
	all_nodes = merge(topology.nodes, new_nodes)

	NotebookTopology(
		nodes=all_nodes, 
		codes=topology.codes, 
		unresolved_cells=topology.unresolved_cells,
		cell_order=topology.cell_order,
        disabled_cells=topology.disabled_cells,
	)
end
