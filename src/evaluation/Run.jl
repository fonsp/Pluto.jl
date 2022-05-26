import REPL:ends_with_semicolon
import .Configuration
import .ExpressionExplorer: FunctionNameSignaturePair, is_joined_funcname, UsingsImports, external_package_names
import .WorkspaceManager: macroexpand_in_workspace

Base.push!(x::Set{Cell}) = x

"Run given cells and all the cells that depend on them, based on the topology information before and after the changes."
function run_reactive!(
	session::ServerSession, 
	notebook::Notebook, 
	old_topology::NotebookTopology, new_topology::NotebookTopology, 
	roots::Vector{Cell}; 
	deletion_hook::Function = WorkspaceManager.move_vars, 
	user_requested_run::Bool = true, 
	already_in_run::Bool = false, 
	already_run::Vector{Cell} = Cell[],
	send_notebook_changes::Bool=true,
	
	dependency_mod::Union{Vector{Cell}, Nothing}=nothing,
	workspace_override::Union{WorkspaceManager.Workspace, Nothing}=nothing,
	old_workspace_name_override=nothing,
	run_single_fn! = run_single!
)::TopologicalOrder
    if !already_in_run
        # make sure that we're the only `run_reactive!` being executed - like a semaphor
        take!(notebook.executetoken)
    else
        @assert !isready(notebook.executetoken) "run_reactive!(; already_in_run=true) was called when no reactive run was launched."
    end

	removed_cells = setdiff(keys(old_topology.nodes), keys(new_topology.nodes))
	roots = Cell[roots..., removed_cells...]

	# by setting the reactive node and expression caches of deleted cells to "empty", we are essentially pretending that those cells still exist, but now have empty code. this makes our algorithm simpler.
	new_topology = NotebookTopology(
		nodes=merge(
			new_topology.nodes,
			Dict(cell => ReactiveNode() for cell in removed_cells),
		),
		codes=merge(
			new_topology.codes,
			Dict(cell => ExprAnalysisCache() for cell in removed_cells)
		),
		unresolved_cells=new_topology.unresolved_cells,
	)

	# is the workspace being overridden? (by REST API)
	old_workspace_name, _ = if isnothing(workspace_override)
		# if not, then bump the workspace module as usual
		old_workspace_name, new_workspace_name = WorkspaceManager.bump_workspace_module((session, notebook))
		workspace = WorkspaceManager.get_workspace((session, notebook))
		old_workspace_name, new_workspace_name
	else
		# otherwise use the provided workspace instead
		workspace = workspace_override
		old_workspace_name, new_workspace_name = old_workspace_name_override, workspace.module_name
	end

    if !is_resolved(new_topology)
        unresolved_topology = new_topology
        new_topology = notebook.topology = resolve_topology(session, notebook, unresolved_topology, old_workspace_name; current_roots = setdiff(roots, already_run))

        # update cache and save notebook because the dependencies might have changed after expanding macros
        update_dependency_cache!(notebook)
        save_notebook(session, notebook)
    end

    removed_cells = setdiff(keys(old_topology.nodes), keys(new_topology.nodes))
    roots = Cell[roots..., removed_cells...]

    # by setting the reactive node and expression caches of deleted cells to "empty", we are essentially pretending that those cells still exist, but now have empty code. this makes our algorithm simpler.
    new_topology = NotebookTopology(
        nodes = merge(
            new_topology.nodes,
            Dict(cell => ReactiveNode() for cell in removed_cells),
        ),
        codes = merge(
            new_topology.codes,
            Dict(cell => ExprAnalysisCache() for cell in removed_cells)
        ),
        unresolved_cells = new_topology.unresolved_cells,
        cell_order = new_topology.cell_order,
    )

    # save the old topological order - we'll delete variables assigned from it and re-evalutate its cells unless the cells have already run previously in the reactive run
    old_order = topological_order(old_topology, roots)

    old_runnable = setdiff(old_order.runnable, already_run)
    to_delete_vars = union!(Set{Symbol}(), defined_variables(old_topology, old_runnable)...)
    to_delete_funcs = union!(Set{Tuple{UUID,FunctionName}}(), defined_functions(old_topology, old_runnable)...)

    # get the new topological order
    new_order = topological_order(new_topology, union(roots, keys(old_order.errable)))
    new_runnable = setdiff(new_order.runnable, already_run)
    to_run_raw = setdiff(union(new_runnable, old_runnable), keys(new_order.errable))::Vector{Cell} # TODO: think if old error cell order matters

    # find (indirectly) deactivated cells and update their status
    deactivated = filter(c -> c.running_disabled, notebook.cells)
    indirectly_deactivated = collect(topological_order(new_topology, deactivated))
    for cell in indirectly_deactivated
        cell.running = false
        cell.queued = false
        cell.depends_on_disabled_cells = true
    end

    to_run = setdiff(to_run_raw, indirectly_deactivated)

	# custom dependency modification through a set intersection
	#   "trim" down the amount of code to run for REST API
	if !isnothing(dependency_mod)
		to_run = intersect(to_run, dependency_mod)
	end

	# change the bar on the sides of cells to "queued"
	for cell in to_run
		cell.queued = true
		cell.depends_on_disabled_cells = false
	end
	for (cell, error) in new_order.errable
		cell.running = false
		cell.queued = false
		relay_reactivity_error!(cell, error)
	end

	# Send intermediate updates to the clients at most 20 times / second during a reactive run. (The effective speed of a slider is still unbounded, because the last update is not throttled.)
	# flush_send_notebook_changes_throttled, 
	send_notebook_changes_throttled, flush_notebook_changes = if send_notebook_changes
		throttled(1.0 / 20) do
			send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
		end
	else
		# don't do anything when asked to send notebook changes
		do_nothing = (args...; kwargs...) -> ()
		do_nothing, do_nothing
	end
	send_notebook_changes_throttled()

    # delete new variables that will be defined by a cell unless this cell has already run in the current reactive run
    to_delete_vars = union!(to_delete_vars, defined_variables(new_topology, new_runnable)...)
    to_delete_funcs = union!(to_delete_funcs, defined_functions(new_topology, new_runnable)...)

    # delete new variables in case a cell errors (then the later cells show an UndefVarError)
    new_errable = keys(new_order.errable)
    to_delete_vars = union!(to_delete_vars, defined_variables(new_topology, new_errable)...)
    to_delete_funcs = union!(to_delete_funcs, defined_functions(new_topology, new_errable)...)

	to_reimport = union!(Set{Expr}(), map(c -> new_topology.codes[c].module_usings_imports.usings, setdiff(notebook.cells, to_run))...)
	deletion_hook(workspace, old_workspace_name, nothing, to_delete_vars, to_delete_funcs, to_reimport; to_run=to_run) # `deletion_hook` defaults to `WorkspaceManager.move_vars`

    delete!.([notebook.bonds], to_delete_vars)

    local any_interrupted = false
    for (i, cell) in enumerate(to_run)

		cell.queued = false
		cell.running = true
		# Important to not use empty! here because AppendonlyMarker requires a new array identity.
		# Eventually we could even make AppendonlyArray to enforce this but idk if it's worth it. yadiyadi.
		cell.logs = []
		send_notebook_changes_throttled()

		if any_interrupted || notebook.wants_to_interrupt
			relay_reactivity_error!(cell, InterruptException())
		else
			run = run_single_fn!(
				workspace, cell, 
				new_topology.nodes[cell], new_topology.codes[cell]; 
				user_requested_run=(user_requested_run && cell ∈ roots)
			)
			any_interrupted |= run.interrupted
		end
		
        cell.running = false

        defined_macros_in_cell = defined_macros(new_topology, cell) |> Set{Symbol}

        # Also set unresolved the downstream cells using the defined macros
        if !isempty(defined_macros_in_cell)
            new_topology = set_unresolved(new_topology, where_referenced(notebook, new_topology, defined_macros_in_cell))
        end

        implicit_usings = collect_implicit_usings(new_topology, cell)
        if !is_resolved(new_topology) && can_help_resolve_cells(new_topology, cell)
            notebook.topology = new_new_topology = resolve_topology(session, notebook, new_topology, old_workspace_name)

			if !isempty(implicit_usings)
				new_soft_definitions = WorkspaceManager.collect_soft_definitions(workspace, implicit_usings)
				notebook.topology = new_new_topology = with_new_soft_definitions(new_new_topology, cell, new_soft_definitions)
			end

            # update cache and save notebook because the dependencies might have changed after expanding macros
            update_dependency_cache!(notebook)
            save_notebook(session, notebook)

			return run_reactive!(session, notebook, new_topology, new_new_topology, to_run; deletion_hook, user_requested_run, already_in_run = true, already_run = to_run[1:i], dependency_mod, workspace_override, old_workspace_name_override)
		elseif !isempty(implicit_usings)
			new_soft_definitions = WorkspaceManager.collect_soft_definitions(workspace, implicit_usings)
			notebook.topology = new_new_topology = with_new_soft_definitions(new_topology, cell, new_soft_definitions)

            # update cache and save notebook because the dependencies might have changed after expanding macros
            update_dependency_cache!(notebook)
            save_notebook(session, notebook)

			return run_reactive!(session, notebook, new_topology, new_new_topology, to_run; deletion_hook, user_requested_run, already_in_run = true, already_run = to_run[1:i], dependency_mod, workspace_override, old_workspace_name_override)
		end
	end

    notebook.wants_to_interrupt = false
    flush_notebook_changes()
    # allow other `run_reactive!` calls to be executed
    put!(notebook.executetoken)
    return new_order
end

run_reactive_async!(session::ServerSession, notebook::Notebook, to_run::Vector{Cell}; kwargs...) = run_reactive_async!(session, notebook, notebook.topology, notebook.topology, to_run; kwargs...)

function run_reactive_async!(session::ServerSession, notebook::Notebook, old::NotebookTopology, new::NotebookTopology, to_run::Vector{Cell}; run_async::Bool=true, kwargs...)::Union{Task,TopologicalOrder}
	maybe_async(run_async) do 
		run_reactive!(session, notebook, old, new, to_run; kwargs...)
	end
end

function maybe_async(f::Function, async::Bool)
	run_task = @asynclog f()
	if async
		run_task
	else
		fetch(run_task)
	end
end

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

"Run a single cell non-reactively, set its output, return run information."
function run_single!(
	session_notebook::Union{Tuple{ServerSession,Notebook},WorkspaceManager.Workspace}, 
	cell::Cell, 
	reactive_node::ReactiveNode, 
	expr_cache::ExprAnalysisCache; 
	user_requested_run::Bool=true
)
	run = WorkspaceManager.eval_format_fetch_in_workspace(
		session_notebook, 
		expr_cache.parsedcode, 
		cell.cell_id, 
		ends_with_semicolon(cell.code), 
		expr_cache.function_wrapped ? (filter(!is_joined_funcname, reactive_node.references), reactive_node.definitions) : nothing,
		expr_cache.forced_expr_id,
		user_requested_run,
		collect(keys(cell.published_objects)),
	)
	set_output!(cell, run, expr_cache; persist_js_state=!user_requested_run)
	if session_notebook isa Tuple && run.process_exited
		session_notebook[2].process_status = ProcessStatus.no_process
	end
	return run
end

function set_output!(cell::Cell, run, expr_cache::ExprAnalysisCache; persist_js_state::Bool=false)
	cell.output = CellOutput(
		body=run.output_formatted[1],
		mime=run.output_formatted[2],
		rootassignee=if ends_with_semicolon(expr_cache.code)
			nothing
		else
			try 
				ExpressionExplorer.get_rootassignee(expr_cache.parsedcode)
			catch _
				# @warn "Error in get_rootassignee" expr=expr_cache.parsedcode
				nothing
			end
		end,
		last_run_timestamp=time(),
		persist_js_state=persist_js_state,
		has_pluto_hook_features=run.has_pluto_hook_features,
	)
	cell.published_objects = let
		old_published = cell.published_objects
		new_published = run.published_objects
		for (k,v) in old_published
			if haskey(new_published, k)
				new_published[k] = v
			end
		end
		new_published
	end
	
	cell.runtime = run.runtime
	cell.errored = run.errored
	cell.running = cell.queued = false
end

will_run_code(notebook::Notebook) = notebook.process_status != ProcessStatus.no_process && notebook.process_status != ProcessStatus.waiting_to_restart

is_macro_identifier(symbol::Symbol) = startswith(string(symbol), "@")

function with_new_soft_definitions(topology::NotebookTopology, cell::Cell, soft_definitions)
    old_node = topology.nodes[cell]
    new_node = union!(ReactiveNode(), old_node, ReactiveNode(soft_definitions=soft_definitions))
    NotebookTopology(
		codes=topology.codes, 
		nodes=merge(topology.nodes, Dict(cell => new_node)), 
		unresolved_cells=topology.unresolved_cells,
		cell_order=topology.cell_order,
	)
end

collect_implicit_usings(topology::NotebookTopology, cell::Cell) = ExpressionExplorer.collect_implicit_usings(topology.codes[cell].module_usings_imports)

"Returns the set of macros names defined by this cell"
defined_macros(topology::NotebookTopology, cell::Cell) = defined_macros(topology.nodes[cell])
defined_macros(node::ReactiveNode) = filter(is_macro_identifier, node.funcdefs_without_signatures) ∪ filter(is_macro_identifier, node.definitions) # macro definitions can come from imports

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
		try_macroexpand(module_name::Union{Nothing,Symbol}=nothing) = begin
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
		if unresolved_topology.nodes[cell].macrocalls ⊆ ExpressionExplorer.can_macroexpand
			return Skipped()
		end

		result = macroexpand_cell(cell)
		if result isa Success
			(expr, computer_id) = result.result
			expanded_node = ExpressionExplorer.try_compute_symbolreferences(expr) |> ReactiveNode
			function_wrapped = ExpressionExplorer.can_be_function_wrapped(expr)
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
			end

			result = try
				analyze_macrocell(cell)
			catch error
				@error "Macro call expansion failed with a non-macroexpand error" error
				Failure(error)
			end
			if result isa Success
				(new_node, function_wrapped, forced_expr_id) = result.result
				union!(new_node.macrocalls, unresolved_topology.nodes[cell].macrocalls)
				union!(new_node.references, new_node.macrocalls)
				new_nodes[cell] = new_node

				# set function_wrapped to the function wrapped analysis of the expanded expression.
				new_codes[cell] = ExprAnalysisCache(unresolved_topology.codes[cell]; forced_expr_id, function_wrapped)
			else
				if result isa Failure
					@debug "Expansion failed" err=result.error
				end
				push!(still_unresolved_nodes, cell)
			end
	end

	all_nodes = merge(unresolved_topology.nodes, new_nodes)
	all_codes = merge(unresolved_topology.codes, new_codes)

	NotebookTopology(
		nodes=all_nodes, 
		codes=all_codes, 
		unresolved_cells=ImmutableSet(still_unresolved_nodes; skip_copy=true),
		cell_order=unresolved_topology.cell_order,
	)
end

"""Tries to add information about macro calls without running any code, using knowledge about common macros.
So, the resulting reactive nodes may not be absolutely accurate. If you can run code in a session, use `resolve_topology` instead.
"""
function static_macroexpand(topology::NotebookTopology, cell::Cell)
	new_node = ExpressionExplorer.maybe_macroexpand(topology.codes[cell].parsedcode; recursive=true) |>
		ExpressionExplorer.try_compute_symbolreferences |> ReactiveNode
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
	)
end

###
# CONVENIENCE FUNCTIONS
###


"Do all the things!"
function update_save_run!(
	session::ServerSession, 
	notebook::Notebook, 
	cells::Vector{Cell}; 
	save::Bool=true, 
	run_async::Bool=false, 
	prerender_text::Bool=false, 
	kwargs...
)
	old = notebook.topology
	new = notebook.topology = updated_topology(old, notebook, cells) # macros are not yet resolved

	update_dependency_cache!(notebook)
	save && save_notebook(session, notebook)

	# _assume `prerender_text == false` if you want to skip some details_
	to_run_online = if !prerender_text
		cells
	else
		# this code block will run cells that only contain text offline, i.e. on the server process, before doing anything else
		# this makes the notebook load a lot faster - the front-end does not have to wait for each output, and perform costly reflows whenever one updates
		# "A Workspace on the main process, used to prerender markdown before starting a notebook process for speedy UI."
		original_pwd = pwd()
		offline_workspace = WorkspaceManager.make_workspace(
			(
				ServerSession(),
				notebook,
			),
			is_offline_renderer=true,
		)

		new = notebook.topology = static_resolve_topology(new)

		to_run_offline = filter(c -> !c.running && is_just_text(new, c) && is_just_text(old, c), cells)
		for cell in to_run_offline
			run_single!(offline_workspace, cell, new.nodes[cell], new.codes[cell])
		end
		
		cd(original_pwd)
		setdiff(cells, to_run_offline)
	end
	
	# this setting is not officially supported (default is `false`), so you can skip this block when reading the code
	if !session.options.evaluation.run_notebook_on_load && prerender_text
		# these cells do something like settings up an environment, we should always run them
		setup_cells = filter(notebook.cells) do c
			cell_precedence_heuristic(notebook.topology, c) < DEFAULT_PRECEDENCE_HEURISTIC
		end
		
		# for the remaining cells, clear their topology info so that they won't run as dependencies
		old = notebook.topology
		to_remove = setdiff(to_run_online, setup_cells)
		notebook.topology = NotebookTopology(
			nodes=setdiffkeys(old.nodes, to_remove),
			codes=setdiffkeys(old.codes, to_remove),
			unresolved_cells=setdiff(old.unresolved_cells, to_remove),
			cell_order=old.cell_order,
		)
		
		# and don't run them
		to_run_online = to_run_online ∩ setup_cells
	end

	maybe_async(run_async) do
		sync_nbpkg(session, notebook; save=(save && !session.options.server.disable_writing_notebook_files))
		if !(isempty(to_run_online) && session.options.evaluation.lazy_workspace_creation) && will_run_code(notebook)
			# not async because that would be double async
			run_reactive_async!(session, notebook, old, new, to_run_online; run_async=false, kwargs...)
			# run_reactive_async!(session, notebook, old, new, to_run_online; deletion_hook=deletion_hook, run_async=false, kwargs...)
		end
	end
end

update_save_run!(session::ServerSession, notebook::Notebook, cell::Cell; kwargs...) = update_save_run!(session, notebook, [cell]; kwargs...)
update_run!(args...) = update_save_run!(args...; save=false)

function notebook_differences(from::Notebook, to::Notebook)
	old_codes = Dict(
		id => c.code
		for (id,c) in from.cells_dict
	)
	new_codes = Dict(
		id => c.code
		for (id,c) in to.cells_dict
	)

	(
		# it's like D3 joins: https://observablehq.com/@d3/learn-d3-joins#cell-528
		added = setdiff(keys(new_codes), keys(old_codes)),
		removed = setdiff(keys(old_codes), keys(new_codes)),
		changed = let
			remained = keys(old_codes) ∩ keys(new_codes)
			filter(id -> old_codes[id] != new_codes[id], remained)
		end,
		
		order_changed = from.cell_order != to.cell_order,
		nbpkg_changed = !is_nbpkg_equal(from.nbpkg_ctx, to.nbpkg_ctx),
	)
end

notebook_differences(from_filename::String, to_filename::String) = notebook_differences(load_notebook_nobackup(from_filename), load_notebook_nobackup(to_filename))

"""
Read the notebook file at `notebook.path`, and compare the read result with the notebook's current state. Any changes will be applied to the running notebook, i.e. code changes are run, removed cells are removed, etc.

Returns `false` if the file could not be parsed, `true` otherwise.
"""
function update_from_file(session::ServerSession, notebook::Notebook; kwargs...)::Bool
	include_nbpg = !session.options.server.auto_reload_from_file_ignore_pkg
	
	just_loaded = try
		load_notebook_nobackup(notebook.path)
	catch e
		@error "Skipping hot reload because loading the file went wrong" exception=(e,catch_backtrace())
		return false
	end::Notebook
	
	new_codes = Dict(
		id => c.code
		for (id,c) in just_loaded.cells_dict
	)

	d = notebook_differences(notebook, just_loaded)
	
	added = d.added
	removed = d.removed
	changed = d.changed
	
	# @show added removed changed
	
	cells_changed = !(isempty(added) && isempty(removed) && isempty(changed))
	order_changed = d.order_changed
	nbpkg_changed = d.nbpkg_changed
		
	something_changed = cells_changed || order_changed || (include_nbpg && nbpkg_changed)
	
	if something_changed
		@info "Reloading notebook from file and applying changes!"
		notebook.last_hot_reload_time = time()
	end

	for c in added
		notebook.cells_dict[c] = just_loaded.cells_dict[c]
	end
	for c in removed
		delete!(notebook.cells_dict, c)
	end
	for c in changed
		notebook.cells_dict[c].code = new_codes[c]
	end

	notebook.cell_order = just_loaded.cell_order
	
	if include_nbpg && nbpkg_changed
		@info "nbpkgs not equal" (notebook.nbpkg_ctx isa Nothing) (just_loaded.nbpkg_ctx isa Nothing)
		
		if (notebook.nbpkg_ctx isa Nothing) != (just_loaded.nbpkg_ctx isa Nothing)
			@info "nbpkg status changed, overriding..."
			notebook.nbpkg_ctx = just_loaded.nbpkg_ctx
		else
			@info "Old new project" PkgCompat.read_project_file(notebook) PkgCompat.read_project_file(just_loaded)
			@info "Old new manifest" PkgCompat.read_manifest_file(notebook) PkgCompat.read_manifest_file(just_loaded)
			
			write(PkgCompat.project_file(notebook), PkgCompat.read_project_file(just_loaded))
			write(PkgCompat.manifest_file(notebook), PkgCompat.read_manifest_file(just_loaded))
		end
		notebook.nbpkg_restart_required_msg = "Yes, because the file was changed externally and the embedded Pkg changed."
	end
	
	if something_changed
		update_save_run!(session, notebook, Cell[notebook.cells_dict[c] for c in union(added, changed)]; kwargs...) # this will also update nbpkg
	end
	
	return true
end
