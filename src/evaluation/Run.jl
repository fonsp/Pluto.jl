import REPL:ends_with_semicolon
import .Configuration
import .ExpressionExplorer: FunctionNameSignaturePair, is_joined_funcname, UsingsImports, external_package_names
import .WorkspaceManager: macroexpand_in_workspace

Base.push!(x::Set{Cell}) = x

"Run given cells and all the cells that depend on them, based on the topology information before and after the changes."
function run_reactive!(session::ServerSession, notebook::Notebook, old_topology::NotebookTopology, new_topology::NotebookTopology, roots::Vector{Cell}; deletion_hook::Function=WorkspaceManager.move_vars, persist_js_state::Bool=false, already_in_run::Bool=false, already_run::Vector{Cell}=Cell[])::TopologicalOrder
  if !already_in_run && length(already_run) == 0
		# make sure that we're the only `run_reactive!` being executed - like a semaphor
		take!(notebook.executetoken)

		old_workspace_name, new_workspace_name = WorkspaceManager.bump_workspace_module((session, notebook))

		if !is_resolved(new_topology)
			unresolved_topology = new_topology
			new_topology = notebook.topology = resolve_topology(session, notebook, unresolved_topology, old_workspace_name)

			# update cache and save notebook because the dependencies might have changed after expanding macros
			update_dependency_cache!(notebook)
			session.options.server.disable_writing_notebook_files || save_notebook(notebook)
		end
	else
		workspace = WorkspaceManager.get_workspace((session, notebook))
		old_workspace_name = new_workspace_name = workspace.module_name
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

	# save the old topological order - we'll delete variables assigned from it and re-evalutate its cells
	old_order = topological_order(notebook, old_topology, roots)

	old_runnable = old_order.runnable
	to_delete_vars = union!(Set{Symbol}(), defined_variables(old_topology, old_runnable)...)
	to_delete_funcs = union!(Set{Tuple{UUID,FunctionName}}(), defined_functions(old_topology, old_runnable)...)

	# get the new topological order
	new_order = topological_order(notebook, new_topology, union(roots, keys(old_order.errable)))
	to_run_raw = setdiff(union(new_order.runnable, old_order.runnable), keys(new_order.errable))::Vector{Cell} # TODO: think if old error cell order matters

	# find (indirectly) deactivated cells and update their status
	deactivated = filter(c -> c.running_disabled, notebook.cells)
	indirectly_deactivated = collect(topological_order(notebook, new_topology, deactivated))
	for cell in indirectly_deactivated
		cell.running = false
		cell.queued = false
		cell.depends_on_disabled_cells = true
	end

	to_run = setdiff(to_run_raw, indirectly_deactivated, already_run)

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
	send_notebook_changes_throttled, flush_notebook_changes = throttled(1.0 / 20) do
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
	end
	send_notebook_changes_throttled()

	# we do this only if we just switched to a new workspace
	if !already_in_run
		# delete new variables that will be defined by a cell
		new_runnable = new_order.runnable
		to_delete_vars = union!(to_delete_vars, defined_variables(new_topology, new_runnable)...)
		to_delete_funcs = union!(to_delete_funcs, defined_functions(new_topology, new_runnable)...)

		# delete new variables in case a cell errors (then the later cells show an UndefVarError)
		new_errable = keys(new_order.errable)
		to_delete_vars = union!(to_delete_vars, defined_variables(new_topology, new_errable)...)
		to_delete_funcs = union!(to_delete_funcs, defined_functions(new_topology, new_errable)...)

		to_reimport = union!(Set{Expr}(), map(c -> new_topology.codes[c].module_usings_imports.usings, setdiff(notebook.cells, to_run))...)
		deletion_hook((session, notebook), old_workspace_name, nothing, to_delete_vars, to_delete_funcs, to_reimport; to_run=to_run) # `deletion_hook` defaults to `WorkspaceManager.move_vars`

		delete!.([notebook.bonds], to_delete_vars)
	end

	local any_interrupted = false
	for (i, cell) in enumerate(to_run)

		cell.queued = false
		cell.running = true
		send_notebook_changes_throttled()

		if any_interrupted || notebook.wants_to_interrupt
			relay_reactivity_error!(cell, InterruptException())
		else
			run = run_single!(
				(session, notebook), cell, 
				new_topology.nodes[cell], new_topology.codes[cell]; 
				persist_js_state=(persist_js_state || cell ∉ roots)
			)
			any_interrupted |= run.interrupted
		end
		
		cell.running = false

		implicit_usings = collect_implicit_usings(new_topology, cell)
		if !is_resolved(new_topology) && can_help_resolve_cells(new_topology, cell)
			notebook.topology = new_new_topology = resolve_topology(session, notebook, new_topology, old_workspace_name)

			if !isempty(implicit_usings)
				new_soft_definitions = WorkspaceManager.collect_soft_definitions((session, notebook), implicit_usings)
				notebook.topology = new_new_topology = with_new_soft_definitions(new_new_topology, cell, new_soft_definitions)
			end

			# update cache and save notebook because the dependencies might have changed after expanding macros
			update_dependency_cache!(notebook)
			session.options.server.disable_writing_notebook_files || save_notebook(notebook)

			return run_reactive!(session, notebook, new_topology, new_new_topology, to_run; deletion_hook=deletion_hook, persist_js_state=persist_js_state, already_in_run=true, already_run=to_run[1:i])
		elseif !isempty(implicit_usings)
			new_soft_definitions = WorkspaceManager.collect_soft_definitions((session, notebook), implicit_usings)
			notebook.topology = new_new_topology = with_new_soft_definitions(new_topology, cell, new_soft_definitions)

			# update cache and save notebook because the dependencies might have changed after expanding macros
			update_dependency_cache!(notebook)
			session.options.server.disable_writing_notebook_files || save_notebook(notebook)

			return run_reactive!(session, notebook, new_topology, new_new_topology, to_run; deletion_hook=deletion_hook, persist_js_state=persist_js_state, already_in_run=true, already_run=to_run[1:i])
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
function run_single!(session_notebook::Union{Tuple{ServerSession,Notebook},WorkspaceManager.Workspace}, cell::Cell, reactive_node::ReactiveNode, expr_cache::ExprAnalysisCache; persist_js_state::Bool=false)
	run = WorkspaceManager.eval_format_fetch_in_workspace(
		session_notebook, 
		expr_cache.parsedcode, 
		cell.cell_id, 
		ends_with_semicolon(cell.code), 
		expr_cache.function_wrapped ? (filter(!is_joined_funcname, reactive_node.references), reactive_node.definitions) : nothing,
		cell.cell_dependencies.contains_user_defined_macrocalls,
	)
	set_output!(cell, run, expr_cache; persist_js_state=persist_js_state)
	if session_notebook isa Tuple && run.process_exited
		session_notebook[2].process_status = ProcessStatus.no_process
	end
	return run
end

function set_output!(cell::Cell, run, expr_cache::ExprAnalysisCache; persist_js_state::Bool=false)
	cell.output = CellOutput(
		body=run.output_formatted[1],
		mime=run.output_formatted[2],
		rootassignee=ends_with_semicolon(expr_cache.code) ? nothing : ExpressionExplorer.get_rootassignee(expr_cache.parsedcode),
		last_run_timestamp=time(),
		persist_js_state=persist_js_state,
	)
	cell.published_objects = run.published_objects
	cell.runtime = run.runtime
	cell.errored = run.errored
	cell.running = cell.queued = false
end

will_run_code(notebook::Notebook) = notebook.process_status != ProcessStatus.no_process && notebook.process_status != ProcessStatus.waiting_to_restart

is_macro_identifier(symbol::Symbol) = startswith(string(symbol), "@")

function with_new_soft_definitions(topology::NotebookTopology, cell::Cell, soft_definitions)
    old_node = topology.nodes[cell]
    new_node = union!(ReactiveNode(), old_node, ReactiveNode(soft_definitions=soft_definitions))
    NotebookTopology(codes=topology.codes, nodes=merge(topology.nodes, Dict(cell => new_node)), unresolved_cells=topology.unresolved_cells)
end

collect_implicit_usings(topology::NotebookTopology, cell::Cell) = ExpressionExplorer.collect_implicit_usings(topology.codes[cell].module_usings_imports)

"Tells whether or not a cell can 'unlock' the resolution of other cells"
function can_help_resolve_cells(topology::NotebookTopology, cell::Cell)
    cell_code = topology.codes[cell]
    cell_node = topology.nodes[cell]
    !isempty(cell_code.module_usings_imports.imports) ||
	!isempty(cell_code.module_usings_imports.usings) ||
	any(is_macro_identifier, cell_node.funcdefs_without_signatures)
end

"We still have 'unresolved' macrocalls, use the current workspace to do macro-expansions"
function resolve_topology(session::ServerSession, notebook::Notebook, unresolved_topology::NotebookTopology, old_workspace_name::Symbol)
	sn = (session, notebook)

	function macroexpand_cell(cell)
		try_macroexpand(module_name::Union{Nothing,Symbol}=nothing) =
			macroexpand_in_workspace(sn, unresolved_topology.codes[cell].parsedcode, cell.cell_id, module_name)

		res = try_macroexpand()
		if (res isa LoadError && res.error isa UndefVarError) || res isa UndefVarError
			res = try_macroexpand(old_workspace_name)
		end
		res
	end

	function analyze_macrocell(cell::Cell, current_symstate)
		if unresolved_topology.nodes[cell].macrocalls ⊆ ExpressionExplorer.can_macroexpand
			return current_symstate, true
		end

		result = macroexpand_cell(cell)
		if result isa Exception
			# if expansion failed, we use the "shallow" symbols state
			@debug "Expansion failed" err=result
			current_symstate, false
		else # otherwise, we use the expanded expression + the list of macrocalls
			expanded_symbols_state = ExpressionExplorer.try_compute_symbolreferences(result)
			expanded_symbols_state, true
		end
	end

	# create new node & new codes for macrocalled cells
	new_nodes = Dict{Cell,ReactiveNode}()
	still_unresolved_nodes = Dict{Cell,SymbolsState}()
	for (cell, current_symstate) in unresolved_topology.unresolved_cells
			(new_symstate, succeeded) = analyze_macrocell(cell, current_symstate)
			if succeeded
				new_node = ReactiveNode(new_symstate)
				union!(new_node.macrocalls, unresolved_topology.nodes[cell].macrocalls)
				union!(new_node.references, new_node.macrocalls)
				new_nodes[cell] = new_node
			else
				still_unresolved_nodes[cell] = current_symstate
			end
	end

	all_nodes = merge(unresolved_topology.nodes, new_nodes)

	NotebookTopology(nodes=all_nodes, codes=unresolved_topology.codes, unresolved_cells=still_unresolved_nodes)
end

function static_macroexpand(topology::NotebookTopology, cell::Cell, old_symstate)
	new_symstate = ExpressionExplorer.maybe_macroexpand(topology.codes[cell].parsedcode; recursive=true) |>
		ExpressionExplorer.try_compute_symbolreferences
	union!(new_symstate.macrocalls, old_symstate.macrocalls)

	ReactiveNode(new_symstate)
end

"The same as `resolve_topology` but does not require custom code execution, only works with a few `Base` & `PlutoRunner` macros"
function static_resolve_topology(topology::NotebookTopology)
	new_nodes = Dict{Cell,ReactiveNode}(cell => static_macroexpand(topology, cell, symstate) for (cell, symstate) in topology.unresolved_cells)
	all_nodes = merge(topology.nodes, new_nodes)

	NotebookTopology(nodes=all_nodes, codes=topology.codes, unresolved_cells=topology.unresolved_cells)
end

###
# CONVENIENCE FUNCTIONS
###


"Do all the things!"
function update_save_run!(session::ServerSession, notebook::Notebook, cells::Array{Cell,1}; save::Bool=true, run_async::Bool=false, prerender_text::Bool=false, kwargs...)
	old = notebook.topology
	new = notebook.topology = updated_topology(old, notebook, cells) # macros are not yet resolved

	update_dependency_cache!(notebook)
	session.options.server.disable_writing_notebook_files || (save && save_notebook(notebook))

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
			force_offline=true,
		)

		new = notebook.topology = static_resolve_topology(new)

		to_run_offline = filter(c -> !c.running && is_just_text(new, c) && is_just_text(old, c), cells)
		for cell in to_run_offline
			run_single!(offline_workspace, cell, new.nodes[cell], new.codes[cell])
		end
		
		cd(original_pwd)
		setdiff(cells, to_run_offline)
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

function update_from_file(session::ServerSession, notebook::Notebook; kwargs...)
	include_nbpg = !session.options.server.auto_reload_from_file_ignore_pkg
	
	just_loaded = try
		load_notebook_nobackup(notebook.path)
	catch e
		@error "Skipping hot reload because loading the file went wrong" exception=(e,catch_backtrace())
		return
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
		notebook.nbpkg_restart_required_msg = "yes"
	end
	
	if something_changed
		update_save_run!(session, notebook, Cell[notebook.cells_dict[c] for c in union(added, changed)]; kwargs...) # this will also update nbpkg
	end
end



"""
throttled(f::Function, timeout::Real)

Return a function that when invoked, will only be triggered at most once
during `timeout` seconds.
The throttled function will run as much as it can, without ever
going more than once per `wait` duration.

This throttle is 'leading' and has some other properties that are specifically designed for our use in Pluto, see the tests.

Inspired by FluxML
See: https://github.com/FluxML/Flux.jl/blob/8afedcd6723112ff611555e350a8c84f4e1ad686/src/utils.jl#L662
"""
function throttled(f::Function, timeout::Real)
    tlock = ReentrantLock()
    iscoolnow = Ref(false)
    run_later = Ref(false)

    function flush()
        lock(tlock) do
            run_later[] = false
            f()
        end
    end

    function schedule()
        @async begin
            sleep(timeout)
            if run_later[]
                flush()
            end
            iscoolnow[] = true
        end
    end
    schedule()

    function throttled_f()
        if iscoolnow[]
            iscoolnow[] = false
            flush()
            schedule()
        else
            run_later[] = true
        end
    end

    return throttled_f, flush
end
