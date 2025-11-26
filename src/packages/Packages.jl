
import ExpressionExplorer: external_package_names
import .PkgCompat
import .PkgCompat: select, is_stdlib
import Logging
import LoggingExtras
import .Configuration: CompilerOptions, _merge_notebook_compiler_options, _convert_to_flags

const tiers = unique((
    Pkg.PRESERVE_ALL_INSTALLED,
	Pkg.PRESERVE_ALL,
	Pkg.PRESERVE_DIRECT,
	Pkg.PRESERVE_SEMVER,
	Pkg.PRESERVE_NONE,
))

const pkg_token = Token()

_default_cleanup() = nothing

# This list appears multiple times in our codebase. Be sure to match edits everywhere.
function use_plutopkg(topology::NotebookTopology)
    !any(values(topology.nodes)) do node
        Symbol("Pkg.activate") ∈ node.references ||
        Symbol("Pkg.API.activate") ∈ node.references ||
        Symbol("Pkg.develop") ∈ node.references ||
        Symbol("Pkg.API.develop") ∈ node.references ||
        Symbol("Pkg.add") ∈ node.references ||
        Symbol("Pkg.API.add") ∈ node.references ||
        # https://juliadynamics.github.io/DrWatson.jl/dev/project/#DrWatson.quickactivate
        Symbol("quickactivate") ∈ node.references ||
        Symbol("@quickactivate") ∈ node.references ||
        Symbol("DrWatson.@quickactivate") ∈ node.references ||
        Symbol("DrWatson.quickactivate") ∈ node.references
    end
end

PkgCompat.project_file(notebook::Notebook) = PkgCompat.project_file(PkgCompat.env_dir(notebook.nbpkg_ctx))
PkgCompat.manifest_file(notebook::Notebook) = PkgCompat.manifest_file(PkgCompat.env_dir(notebook.nbpkg_ctx))


"""
```julia
sync_nbpkg_core(notebook::Notebook; on_terminal_output::Function=((args...) -> nothing))
```

Update the notebook package environment to match the notebook's code. This will:
- Add packages that should be added (because they are imported in a cell).
- Remove packages that are no longer needed.
- Make sure that the environment is instantiated.
- Detect the use of `Pkg.activate` and enable/disabled nbpkg accordingly.
"""
function sync_nbpkg_core(
    notebook::Notebook, 
    old_topology::NotebookTopology, 
    new_topology::NotebookTopology; 
    on_terminal_output::Function=((args...) -> nothing), 
    cleanup_iolistener::Ref{Function}=Ref{Function}(_default_cleanup),
    lag::Real=0,
    compiler_options::CompilerOptions=CompilerOptions(),
)
    pkg_status = Status.report_business_started!(notebook.status_tree, :pkg)
    Status.report_business_started!(pkg_status, :analysis)
    
    👺 = false

    use_plutopkg_old = notebook.nbpkg_ctx !== nothing
    use_plutopkg_new = use_plutopkg(new_topology)
    
    if !use_plutopkg_old && use_plutopkg_new
        @debug "PlutoPkg: Started using PlutoPkg!! HELLO reproducibility!" notebook.path

        👺 = true
        notebook.nbpkg_ctx = PkgCompat.create_empty_ctx()
        notebook.nbpkg_install_time_ns = 0
    end
    if use_plutopkg_old && !use_plutopkg_new
        @debug "PlutoPkg: Stopped using PlutoPkg 💔😟😢" notebook.path

        no_packages_loaded_yet = (
            notebook.nbpkg_restart_required_msg === nothing &&
            notebook.nbpkg_restart_recommended_msg === nothing &&
            all(PkgCompat.is_stdlib, keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies))
        )
        👺 = !no_packages_loaded_yet
        notebook.nbpkg_ctx = nothing
        notebook.nbpkg_install_time_ns = nothing
    end
    if !use_plutopkg_new
        notebook.nbpkg_install_time_ns = nothing
        notebook.nbpkg_ctx_instantiated = true
    end
    
    (lag > 0) && sleep(lag * (0.5 + rand())) # sleep(0) would yield to the process manager which we dont want

    if use_plutopkg_new
        @assert notebook.nbpkg_ctx !== nothing
        
        PkgCompat.mark_original!(notebook.nbpkg_ctx)

        old_packages = String.(keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies))
        new_packages = String.(external_package_names(new_topology)) # search all cells for imports and usings
        
        removed = setdiff(old_packages, new_packages)
        added = setdiff(new_packages, old_packages)
        can_skip = isempty(removed) && isempty(added) && notebook.nbpkg_ctx_instantiated

        iolistener = let
            busy_packages = notebook.nbpkg_ctx_instantiated ? union(added, removed) : new_packages
            report_to = ["nbpkg_sync", busy_packages...]
            IOListener(callback=(s -> on_terminal_output(report_to, freeze_loading_spinners(s))))
        end
        cleanup_iolistener[] = () -> stoplistening(iolistener)



        Status.report_business_finished!(pkg_status, :analysis)
        
        # We remember which Pkg.Types.PreserveLevel was used. If it's too low, we will recommend/require a notebook restart later.
        local used_tier = first(tiers)
        if !can_skip
            # We have a global lock, `pkg_token`, on Pluto-managed Pkg operations, which is shared between all notebooks. If this lock is not ready right now then that means that we are going to wait at the `withtoken(pkg_token)` line below. 
            # We want to report that we are waiting, with a best guess of why.
            wait_business = if !isready(pkg_token)
                reg = !PkgCompat._updated_registries_compat[]
                
                # Print something in the terminal logs
                phasemessage(iolistener, "Waiting for $(reg ? "the package registry to update" : "other notebooks to finish Pkg operations")")
                trigger(iolistener) # manual trigger because we did not start listening yet
                
                # Create a business item
                Status.report_business_started!(pkg_status, 
                    reg ? :registry_update : :waiting_for_others
                )
            end
            
            return withtoken(pkg_token) do
                withlogcapture(iolistener) do

                    let # Status stuff
                        isnothing(wait_business) || Status.report_business_finished!(wait_business)
                        
                        if !notebook.nbpkg_ctx_instantiated
                            Status.report_business_planned!(pkg_status, :instantiate1)
                            Status.report_business_planned!(pkg_status, :resolve)
                            Status.report_business_planned!(pkg_status, :precompile)
                        end
                        
                        isempty(removed) || Status.report_business_planned!(pkg_status, :remove)
                        isempty(added) || Status.report_business_planned!(pkg_status, :add)
                        if !isempty(added) || !isempty(removed)
                            Status.report_business_planned!(pkg_status, :instantiate2)
                            Status.report_business_planned!(pkg_status, :precompile)
                        end
                    end
                    
                    should_precompile_later = false
                    
                    PkgCompat.refresh_registry_cache()
                    PkgCompat.clear_stdlib_compat_entries!(notebook.nbpkg_ctx)
                    
                    
                    should_instantiate_initially = !notebook.nbpkg_ctx_instantiated
                    if should_instantiate_initially
                        
                        should_precompile_later = true
                        
                        # First, we instantiate. This will:
                        # - Verify that the Manifest can be parsed and is in the correct format (important for compat across Julia versions). If not, we will fix it by deleting the Manifest.
                        # - If no Manifest exists, resolve the environment and create one.
                        # - Start downloading all registered packages, artifacts.
                        # - Start downloading all unregistered packages, which are added through a URL. This also makes the Project.tomls of those packages available.
                        # - Precompile all packages.                    
                        Status.report_business!(pkg_status, :instantiate1) do
                            with_auto_fixes(notebook) do
                                _instantiate(notebook, iolistener)
                            end
                        end
                        
                        # Second, we resolve. This will:
                        # - Verify that the Manifest contains a correct dependency tree (e.g. all versions exists in a registry). If not, we will fix it using `with_auto_fixes`
                        # - If we are tracking local packages by path (] dev), their Project.tomls are reparsed and everything is updated.
                        Status.report_business!(pkg_status, :resolve) do
                            with_auto_fixes(notebook) do
                                _resolve(notebook, iolistener)
                            end
                        end
                    end
                    
                    to_add = filter(PkgCompat.package_exists, added)
                    to_remove = filter(removed) do p
                        haskey(PkgCompat.project(notebook.nbpkg_ctx).dependencies, p)
                    end
                    @debug "PlutoPkg:" notebook.path to_add to_remove
                    
                    if !isempty(to_remove)
                        Status.report_business_started!(pkg_status, :remove)
                        # See later comment
                        mkeys() = Set(filter(!is_stdlib, [m.name for m in values(PkgCompat.dependencies(notebook.nbpkg_ctx))]))
                        old_manifest_keys = mkeys()

                        with_io_setup(notebook, iolistener) do
                            Pkg.rm(notebook.nbpkg_ctx, [
                                Pkg.PackageSpec(name=p)
                                for p in to_remove
                            ])
                        end

                        notebook.nbpkg_install_time_ns = nothing # we lose our estimate of install time
                        # We record the manifest before and after, to prevent recommending a reboot when nothing got removed from the manifest (e.g. when removing GR, but leaving Plots), or when only stdlibs got removed.
                        new_manifest_keys = mkeys()
                        
                        # TODO: we might want to upgrade other packages now that constraints have loosened? Does this happen automatically?
                        Status.report_business_finished!(pkg_status, :remove)
                    end

                    
                    # TODO: instead of Pkg.PRESERVE_ALL, we actually want:
                    # "Pkg.PRESERVE_DIRECT, but preserve exact verisons of Base.loaded_modules"
                    
                    if !isempty(to_add)
                        Status.report_business_started!(pkg_status, :add)
                        start_time = time_ns()
                        with_io_setup(notebook, iolistener) do
                            phasemessage(iolistener, "Adding packages")
                            
                            # We temporarily clear the "semver-compatible" [deps] entries, because Pkg already respects semver, unless it doesn't, in which case we don't want to force it.
                            PkgCompat.clear_auto_compat_entries!(notebook.nbpkg_ctx)

                            try
                                for tier in tiers
                                    used_tier = tier

                                    try
                                        withenv("JULIA_PKG_PRECOMPILE_AUTO" => 0) do
                                            Pkg.add(notebook.nbpkg_ctx, [
                                                Pkg.PackageSpec(name=p)
                                                for p in to_add
                                            ]; preserve=used_tier)
                                        end

                                        break
                                    catch e
                                        if used_tier == Pkg.PRESERVE_NONE
                                            # give up
                                            rethrow(e)
                                        end
                                    end
                                end
                            finally
                                PkgCompat.write_auto_compat_entries!(notebook.nbpkg_ctx)
                            end

                            # Now that Pkg is set up, the notebook process will call `using Package`, which can take some time. We write this message to the io, to notify the user.
                            println(iolistener.buffer, "\e[32m\e[1mLoading\e[22m\e[39m packages...")
                        end
                    
                        notebook.nbpkg_install_time_ns = notebook.nbpkg_install_time_ns === nothing ? nothing : (notebook.nbpkg_install_time_ns + (time_ns() - start_time))
                        Status.report_business_finished!(pkg_status, :add)
                        @debug "PlutoPkg: done" notebook.path 
                    end

                    should_instantiate_again = !notebook.nbpkg_ctx_instantiated || !isempty(to_add) || !isempty(to_remove)
                    
                    if should_instantiate_again
                        should_precompile_later = true
                        Status.report_business!(pkg_status, :instantiate2) do
                            _instantiate(notebook, iolistener)
                        end
                    end
                    
                    if should_precompile_later
                        Status.report_business!(pkg_status, :precompile) do
                            _precompile(notebook, iolistener, compiler_options)
                        end
                    end

                    stoplistening(iolistener)
                    Status.report_business_finished!(pkg_status)

                    return (;
                        did_something=👺 || (
                            should_instantiate_initially || should_instantiate_again || (use_plutopkg_old != use_plutopkg_new)
                        ),
                        used_tier=used_tier,
                        # changed_versions=Dict{String,Pair}(),
                        restart_recommended=👺 || (
                            (!isempty(to_remove) && old_manifest_keys != new_manifest_keys) ||
                            used_tier ∉ (Pkg.PRESERVE_ALL, Pkg.PRESERVE_ALL_INSTALLED)
                        ),
                        restart_required=👺 || (
                            used_tier ∈ (Pkg.PRESERVE_SEMVER, Pkg.PRESERVE_NONE)
                        ),
                    )
                end
            end
        end
    end
    Status.report_business_finished!(pkg_status)

    return (
        did_something=👺 || (use_plutopkg_old != use_plutopkg_new),
        used_tier=Pkg.PRESERVE_ALL_INSTALLED,
        # changed_versions=Dict{String,Pair}(),
        restart_recommended=👺 || false,
        restart_required=👺 || false,
    )
end

"""
```julia
sync_nbpkg(session::ServerSession, notebook::Notebook; save::Bool=true)
```

In addition to the steps performed by [`sync_nbpkg_core`](@ref):
- Capture terminal outputs and store them in the `notebook`
- Update the clients connected to `notebook`
- `try` `catch` and reset the package environment on failure.
"""
function sync_nbpkg(session, notebook, old_topology::NotebookTopology, new_topology::NotebookTopology; save::Bool=true, take_token::Bool=true)
    @assert will_run_pkg(notebook)

    cleanup_iolistener = Ref{Function}(_default_cleanup)
	try
        Status.report_business_started!(notebook.status_tree, :pkg)
        
        pkg_result = (take_token ? withtoken : (f, _) -> f())(notebook.executetoken) do
			function iocallback(pkgs, s)
				notebook.nbpkg_busy_packages = pkgs
				for p in pkgs
					notebook.nbpkg_terminal_outputs[p] = s
				end
                # incoming IO is a good sign that something might have changed, so we update the cache.
                update_nbpkg_cache!(notebook)
                
                # This is throttled "automatically":
                # If io is coming in very fast, then it won't build up a queue of updates for the client. That's because `send_notebook_changes!` is a blocking call, including the websocket transfer. So this `iocallback` function will only return when the last message has been sent.
                # The nice thing is that IOCallback is not actually implemented as a callback when IO comes in, but it is an async loop that sleeps, maybe calls iocallback with the latest buffer content, and repeats. So a blocking iocallback avoids overflowing the queue.
				send_notebook_changes!(ClientRequest(; session, notebook))
			end
			sync_nbpkg_core(
                notebook, 
                old_topology, 
                new_topology; 
                on_terminal_output=iocallback, 
                cleanup_iolistener,
                lag=session.options.server.simulated_pkg_lag,
                compiler_options=_merge_notebook_compiler_options(notebook, session.options.compiler),
            )
		end

		if pkg_result.did_something
			@debug "PlutoPkg: success!" notebook.path pkg_result
            
            if _has_executed_effectful_code(session, notebook)
                if pkg_result.restart_recommended
                    notebook.nbpkg_restart_recommended_msg = "Yes, something changed during regular sync."
                    @debug "PlutoPkg: Notebook restart recommended" notebook.path notebook.nbpkg_restart_recommended_msg
                end
                if pkg_result.restart_required
                    notebook.nbpkg_restart_required_msg = "Yes, something changed during regular sync."
                    @debug "PlutoPkg: Notebook restart REQUIRED" notebook.path notebook.nbpkg_restart_required_msg
                end
            end

			notebook.nbpkg_busy_packages = String[]
            update_nbpkg_cache!(notebook)
			send_notebook_changes!(ClientRequest(; session, notebook))
			save && save_notebook(session, notebook)
		end
	catch e
		bt = catch_backtrace()
		Status.report_business_finished!(notebook.status_tree, :pkg, false)
		old_packages = try String.(keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies)); catch; ["unknown"] end
		new_packages = try String.(external_package_names(new_topology)); catch; ["unknown"] end
		@warn """
		PlutoPkg: Failed to add/remove packages! Resetting package environment...
		""" PLUTO_VERSION VERSION old_packages new_packages exception=(e, bt)
		# TODO: send to user
        showerror(stderr, e, bt)
        
        
		error_text = e isa PrecompilationFailedException ? e.msg : sprint(showerror, e, bt)
		for p in notebook.nbpkg_busy_packages
            old = get(notebook.nbpkg_terminal_outputs, p, "")
			notebook.nbpkg_terminal_outputs[p] = old * "\n\n\e[1mPkg error!\e[22m\n" * error_text
		end
		notebook.nbpkg_busy_packages = String[]
        update_nbpkg_cache!(notebook)
		send_notebook_changes!(ClientRequest(; session, notebook))

		# Clear the embedded Project and Manifest and require a restart from the user.
		reset_nbpkg!(notebook, new_topology; keep_project=false, save=save)
		notebook.nbpkg_restart_required_msg = "Yes, because sync_nbpkg_core failed. \n\n$(error_text)"
        notebook.nbpkg_install_time_ns = nothing
        notebook.nbpkg_ctx_instantiated = false
        update_nbpkg_cache!(notebook)
		send_notebook_changes!(ClientRequest(; session, notebook))

		save && save_notebook(session, notebook)
	finally
        cleanup_iolistener[]()
        Status.report_business_finished!(notebook.status_tree, :pkg)
    end
end

function _has_executed_effectful_code(session::ServerSession, notebook::Notebook)
    workspace = WorkspaceManager.get_workspace((session, notebook); allow_creation=false)
    workspace === nothing ? false : workspace.has_executed_effectful_code
end
    

function writebackup(notebook::Notebook)
    backup_path = backup_filename(notebook.path)
    Pluto.readwrite(notebook.path, backup_path)

    @info "Backup saved to" backup_path

    backup_path
end


function _instantiate(notebook::Notebook, iolistener::IOListener)
    start_time = time_ns()
    with_io_setup(notebook, iolistener) do
        phasemessage(iolistener, "Instantiating")
        @debug "PlutoPkg: Instantiating" notebook.path 
        
        # update registries if this is the first time
        PkgCompat.update_registries(; force=false)
        
        # Pkg.instantiate assumes that the environment to be instantiated is active, so we will have to modify the LOAD_PATH of this Pluto server
        # We could also run the Pkg calls on the notebook process, but somehow I think that doing it on the server is more charming, though it requires this workaround.
        env_dir = PkgCompat.env_dir(notebook.nbpkg_ctx)
        pushfirst!(LOAD_PATH, env_dir)
        
        try
            # instantiate without forcing registry update
            PkgCompat.instantiate(notebook.nbpkg_ctx; update_registry=false, allow_autoprecomp=false)
        finally
            # reset the LOAD_PATH
            if LOAD_PATH[1] == env_dir
                popfirst!(LOAD_PATH)
            else
                @warn "LOAD_PATH modified during Pkg.instantiate... this is unexpected!"
            end
        end
    end
    notebook.nbpkg_install_time_ns = notebook.nbpkg_install_time_ns === nothing ? nothing : (notebook.nbpkg_install_time_ns + (time_ns() - start_time))
    notebook.nbpkg_ctx_instantiated = true
end

function _precompile(notebook::Notebook, iolistener::IOListener, compiler_options::CompilerOptions)
    start_time = time_ns()
    with_io_setup(notebook, iolistener) do
        phasemessage(iolistener, "Precompiling")
        @debug "PlutoPkg: Precompiling" notebook.path 
        
        env_dir = PkgCompat.env_dir(notebook.nbpkg_ctx)
        precompile_isolated(env_dir; 
            io=iolistener.buffer,
            compiler_options,
        )
    end
    notebook.nbpkg_install_time_ns = notebook.nbpkg_install_time_ns === nothing ? nothing : (notebook.nbpkg_install_time_ns + (time_ns() - start_time))
end

function _resolve(notebook::Notebook, iolistener::IOListener)
    startlistening(iolistener)
    with_io_setup(notebook, iolistener) do
        phasemessage(iolistener, "Resolving")
        @debug "PlutoPkg: Resolving" notebook.path 
        Pkg.resolve(notebook.nbpkg_ctx)
    end
end


"""
Run `f` (e.g. `Pkg.instantiate`) on the notebook's package environment. Keep trying more and more invasive strategies to fix problems until the operation succeeds.
"""
function with_auto_fixes(f::Function, notebook::Notebook)
    try
        f()
    catch e
        @info "Operation failed. Updating registries and trying again..." exception=e
        
        PkgCompat.update_registries(; force=true)
        
        # TODO: check for resolver errors around stdlibs and fix them by doing `up Statistics`
        
        
        
        
        try
            f()
        catch e
            # this is identical to Pkg.update, right?
            @warn "Operation failed. Removing Manifest and trying again..." exception=e
            
            reset_nbpkg!(notebook; keep_project=true, save=false, backup=false)
            notebook.nbpkg_ctx_instantiated = false
            try
                f()
            catch e
                @warn "Operation failed. Removing Project compat entries and Manifest and trying again..." exception=(e, catch_backtrace())
                
                reset_nbpkg!(notebook; keep_project=true, save=false, backup=false)
                PkgCompat.clear_compat_entries!(notebook.nbpkg_ctx)
                notebook.nbpkg_ctx_instantiated = false
                
                f()
            end
        end
    end
end

"""
Reset the package environment of a notebook. This will remove the `Project.toml` and `Manifest.toml` files from the notebook's secret package environment folder, and if `save` is `true`, it will then save the notebook without embedded Project and Manifest.

If `keep_project` is `true` (default `false`), the `Project.toml` file will be kept, but the `Manifest.toml` file will be removed.

This function is useful when we are not able to resolve/activate/instantiate a notebook's environment after loading, which happens when e.g. the environment was created on a different OS or Julia version.
"""
function reset_nbpkg!(notebook::Notebook, topology::Union{NotebookTopology,Nothing}=nothing; keep_project::Bool=false, backup::Bool=true, save::Bool=true)
    backup && save && writebackup(notebook)

    if notebook.nbpkg_ctx !== nothing
        p = PkgCompat.project_file(notebook)
        m = PkgCompat.manifest_file(notebook)
        keep_project || (isfile(p) && rm(p))
        isfile(m) && rm(m)

        PkgCompat.load_ctx!(notebook.nbpkg_ctx, PkgCompat.env_dir(notebook.nbpkg_ctx))
    else
        notebook.nbpkg_ctx = if use_plutopkg(something(topology, notebook.topology))
            PkgCompat.load_empty_ctx!(notebook.nbpkg_ctx)
        else
            nothing
        end
    end

    save && save_notebook(notebook)
end

function update_nbpkg_core(
    notebook::Notebook; 
    level::Pkg.UpgradeLevel=Pkg.UPLEVEL_MAJOR, 
    on_terminal_output::Function=((args...) -> nothing),
    cleanup_iolistener::Ref{Function}=Ref{Function}(default_cleanup),
    compiler_options::CompilerOptions=CompilerOptions(),
)
    if notebook.nbpkg_ctx !== nothing
        PkgCompat.mark_original!(notebook.nbpkg_ctx)

        old_packages = String.(keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies))

        iolistener = let
            # we don't know which packages will be updated, so we send terminal output to all installed packages
            report_to = ["nbpkg_update", old_packages...]
            IOListener(callback=(s -> on_terminal_output(report_to, freeze_loading_spinners(s))))
        end
        cleanup_iolistener[] = () -> stoplistening(iolistener)
        
        if !isready(pkg_token)
            phasemessage(iolistener, "Waiting for other notebooks to finish Pkg operations")
            trigger(iolistener)
        end

        return withtoken(pkg_token) do
            withlogcapture(iolistener) do
                PkgCompat.refresh_registry_cache()
                PkgCompat.clear_stdlib_compat_entries!(notebook.nbpkg_ctx)

                if !notebook.nbpkg_ctx_instantiated
                    with_auto_fixes(notebook) do
                        _instantiate(notebook, iolistener)
                    end
                
                    with_auto_fixes(notebook) do
                        _resolve(notebook, iolistener)
                    end
                end

                with_io_setup(notebook, iolistener) do
                    phasemessage(iolistener, "Updating packages")
                    # We temporarily clear the "semver-compatible" [deps] entries, because it is difficult to update them after the update 🙈. TODO
                    PkgCompat.clear_auto_compat_entries!(notebook.nbpkg_ctx)
                    
                    try
                        ###
                        withenv("JULIA_PKG_PRECOMPILE_AUTO" => 0) do
                            Pkg.update(notebook.nbpkg_ctx; level=level)
                        end
                        ###
                    finally
                        PkgCompat.write_auto_compat_entries!(notebook.nbpkg_ctx)
                    end
                end


                PkgCompat.refresh_registry_cache()
                🐧 = !PkgCompat.is_original(notebook.nbpkg_ctx)
                should_instantiate_again = !notebook.nbpkg_ctx_instantiated || 🐧
                
                if should_instantiate_again
                    # Status.report_business!(pkg_status, :instantiate2) do
                    _instantiate(notebook, iolistener)
                    _precompile(notebook, iolistener, compiler_options)
                    # end
                end

                stoplistening(iolistener)

                (
                    did_something=🐧,
                    restart_recommended=🐧,
                    restart_required=🐧,
                )
            end
        end
    end
    (
        did_something=false,
        restart_recommended=false,
        restart_required=false,
    )
end


function update_nbpkg(session, notebook::Notebook; level::Pkg.UpgradeLevel=Pkg.UPLEVEL_MAJOR, backup::Bool=true, save::Bool=true)
    @assert will_run_pkg(notebook)

    bp = if backup && save
        writebackup(notebook)
    end
    cleanup_iolistener = Ref{Function}(_default_cleanup)

    try
		pkg_result = withtoken(notebook.executetoken) do
            original_outputs = deepcopy(notebook.nbpkg_terminal_outputs)
			function iocallback(pkgs, s)
				notebook.nbpkg_busy_packages = pkgs
				for p in pkgs
                    original = get(original_outputs, p, "")
					notebook.nbpkg_terminal_outputs[p] = original * "\n\n" * s
				end
                update_nbpkg_cache!(notebook)
				send_notebook_changes!(ClientRequest(; session, notebook))
			end
			update_nbpkg_core(
                notebook; 
                level, 
                on_terminal_output=iocallback,
                cleanup_iolistener,
                compiler_options=_merge_notebook_compiler_options(notebook, session.options.compiler),
            )
		end

		if pkg_result.did_something
			if pkg_result.restart_recommended
				notebook.nbpkg_restart_recommended_msg = "Yes, something changed during regular update_nbpkg."
				@debug "PlutoPkg: Notebook restart recommended" notebook.path notebook.nbpkg_restart_recommended_msg
			end
			if pkg_result.restart_required
				notebook.nbpkg_restart_required_msg = "Yes, something changed during regular update_nbpkg."
				@debug "PlutoPkg: Notebook restart REQUIRED" notebook.path notebook.nbpkg_restart_required_msg
			end
		else
            !isnothing(bp) && isfile(bp) && rm(bp)
        end
	finally
        cleanup_iolistener[]()
		notebook.nbpkg_busy_packages = String[]
        update_nbpkg_cache!(notebook)
		send_notebook_changes!(ClientRequest(; session, notebook))
		save && save_notebook(session, notebook)
	end
end

nbpkg_cache(ctx::Union{Nothing,PkgContext}) = ctx === nothing ? Dict{String,String}() : Dict{String,String}(
    x => string(PkgCompat.get_manifest_version(ctx, x)) for x in keys(PkgCompat.project(ctx).dependencies)
)

function update_nbpkg_cache!(notebook::Notebook)
    notebook.nbpkg_installed_versions_cache = nbpkg_cache(notebook.nbpkg_ctx)
    notebook
end

function is_nbpkg_equal(a::Union{Nothing,PkgContext}, b::Union{Nothing,PkgContext})::Bool
    if (a isa Nothing) != (b isa Nothing)
        the_other = something(a, b)
        
        ptoml_contents = PkgCompat.read_project_file(the_other)
        the_other_is_empty = isempty(strip(ptoml_contents))
        
        if the_other_is_empty
            # then both are essentially 'empty' environments, i.e. equal
            true
        else
            # they are different
            false
        end
    elseif a isa Nothing
        true
    else
        ptoml_contents_a = strip(PkgCompat.read_project_file(a))
        ptoml_contents_b = strip(PkgCompat.read_project_file(b))
        
        if ptoml_contents_a == ptoml_contents_b == ""
            true
        else
            mtoml_contents_a = strip(PkgCompat.read_project_file(a))
            mtoml_contents_b = strip(PkgCompat.read_project_file(b))
            
            (ptoml_contents_a == ptoml_contents_b) && (mtoml_contents_a == mtoml_contents_b)
        end
    end
end

function with_io_setup(f::Function, notebook::Notebook, iolistener::IOListener)
    startlistening(iolistener)
    PkgCompat.withio(notebook.nbpkg_ctx, IOContext(iolistener.buffer, :color => true, :sneaky_enable_tty => true)) do
        withinteractive(false) do
            f()
        end
    end
end

withlogcapture(f::Function, iolistener::IOListener) = 
    Logging.with_logger(f, LoggingExtras.TeeLogger(
        Logging.current_logger(),
        Logging.ConsoleLogger(IOContext(iolistener.buffer, :color => true), Logging.Info)
    ))


const is_interactive_defined = isdefined(Base, :is_interactive) && !Base.isconst(Base, :is_interactive)
function withinteractive(f::Function, value::Bool)
    old_value = isinteractive()
    @static if is_interactive_defined
        Core.eval(Base, :(is_interactive = $value))
    end
    try
        f()
    finally
        @static if is_interactive_defined
            Core.eval(Base, :(is_interactive = $old_value))
        end
    end
end
