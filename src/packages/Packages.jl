
import .ExpressionExplorer: external_package_names
import .PkgCompat
import .PkgCompat: select, is_stdlib

const tiers = [
	Pkg.PRESERVE_ALL,
	Pkg.PRESERVE_DIRECT,
	Pkg.PRESERVE_SEMVER,
	Pkg.PRESERVE_NONE,
]

const pkg_token = Token()

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

function external_package_names(topology::NotebookTopology)::Set{Symbol}
    union!(Set{Symbol}(), external_package_names.(c.module_usings_imports for c in values(topology.codes))...)
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
function sync_nbpkg_core(notebook::Notebook, old_topology::NotebookTopology, new_topology::NotebookTopology; on_terminal_output::Function=((args...) -> nothing), lag::Real=0)
    
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

        iolistener = let
            busy_packages = notebook.nbpkg_ctx_instantiated ? added : new_packages
            IOListener(callback=(s -> on_terminal_output(busy_packages, s)))
        end
        
        # We remember which Pkg.Types.PreserveLevel was used. If it's too low, we will recommend/require a notebook restart later.
        local used_tier = Pkg.PRESERVE_ALL
        
        if !isready(pkg_token)
            println(iolistener.buffer, "Waiting for other notebooks to finish Pkg operations...")
            trigger(iolistener)
        end

        can_skip = isempty(removed) && isempty(added) && notebook.nbpkg_ctx_instantiated

        if !can_skip
            return withtoken(pkg_token) do
                PkgCompat.refresh_registry_cache()

                if !notebook.nbpkg_ctx_instantiated
                    resolve_with_auto_fixes(notebook, iolistener)
                end
                
                to_add = filter(PkgCompat.package_exists, added)
                to_remove = filter(removed) do p
                    haskey(PkgCompat.project(notebook.nbpkg_ctx).dependencies, p)
                end
                @debug "PlutoPkg:" notebook.path to_add to_remove
                
                if !isempty(to_remove)
                    # See later comment
                    mkeys() = Set(filter(!is_stdlib, [m.name for m in values(PkgCompat.dependencies(notebook.nbpkg_ctx))]))
                    old_manifest_keys = mkeys()

                    Pkg.rm(notebook.nbpkg_ctx, [
                        Pkg.PackageSpec(name=p)
                        for p in to_remove
                    ])

                    notebook.nbpkg_install_time_ns = nothing # we lose our estimate of install time
                    # We record the manifest before and after, to prevent recommending a reboot when nothing got removed from the manifest (e.g. when removing GR, but leaving Plots), or when only stdlibs got removed.
                    new_manifest_keys = mkeys()
                    
                    # TODO: we might want to upgrade other packages now that constraints have loosened? Does this happen automatically?
                end

                
                # TODO: instead of Pkg.PRESERVE_ALL, we actually want:
                # "Pkg.PRESERVE_DIRECT, but preserve exact verisons of Base.loaded_modules"
                
                if !isempty(to_add)
                    start_time = time_ns()
                    startlistening(iolistener)
                    PkgCompat.withio(notebook.nbpkg_ctx, IOContext(iolistener.buffer, :color => true)) do
                        withinteractive(false) do
                            # We temporarily clear the "semver-compatible" [deps] entries, because Pkg already respects semver, unless it doesn't, in which case we don't want to force it.
                            notebook.nbpkg_ctx = PkgCompat.clear_auto_compat_entries(notebook.nbpkg_ctx)

                            try
                                for tier in [
                                    Pkg.PRESERVE_ALL,
                                    Pkg.PRESERVE_DIRECT,
                                    Pkg.PRESERVE_SEMVER,
                                    Pkg.PRESERVE_NONE,
                                ]
                                    used_tier = tier

                                    try
                                        Pkg.add(notebook.nbpkg_ctx, [
                                            Pkg.PackageSpec(name=p)
                                            for p in to_add
                                        ]; preserve=used_tier)
                                        
                                        break
                                    catch e
                                        if used_tier == Pkg.PRESERVE_NONE
                                            # give up
                                            rethrow(e)
                                        end
                                    end
                                end
                            finally
                                notebook.nbpkg_ctx = PkgCompat.write_auto_compat_entries(notebook.nbpkg_ctx)
                            end

                            # Now that Pkg is set up, the notebook process will call `using Package`, which can take some time. We write this message to the io, to notify the user.
                            println(iolistener.buffer, "\e[32m\e[1mLoading\e[22m\e[39m packages...")
                        end
                    end
                    notebook.nbpkg_install_time_ns = notebook.nbpkg_install_time_ns === nothing ? nothing : (notebook.nbpkg_install_time_ns + (time_ns() - start_time))
                    @debug "PlutoPkg: done" notebook.path 
                end

                should_instantiate = !notebook.nbpkg_ctx_instantiated || !isempty(to_add) || !isempty(to_remove)
                if should_instantiate
                    start_time = time_ns()
                    startlistening(iolistener)
                    PkgCompat.withio(notebook.nbpkg_ctx, IOContext(iolistener.buffer, :color => true)) do
                        @debug "PlutoPkg: Instantiating" notebook.path 
                        
                        # Pkg.instantiate assumes that the environment to be instantiated is active, so we will have to modify the LOAD_PATH of this Pluto server
                        # We could also run the Pkg calls on the notebook process, but somehow I think that doing it on the server is more charming, though it requires this workaround.
                        env_dir = PkgCompat.env_dir(notebook.nbpkg_ctx)
                        pushfirst!(LOAD_PATH, env_dir)

                        # update registries if this is the first time
                        PkgCompat.update_registries(; force=false)
                        # instantiate without forcing registry update
                        PkgCompat.instantiate(notebook.nbpkg_ctx; update_registry=false)
                        
                        @assert LOAD_PATH[1] == env_dir
                        popfirst!(LOAD_PATH)
                    end
                    notebook.nbpkg_install_time_ns = notebook.nbpkg_install_time_ns === nothing ? nothing : (notebook.nbpkg_install_time_ns + (time_ns() - start_time))
                    notebook.nbpkg_ctx_instantiated = true
                end

                stoplistening(iolistener)

                return (
                    did_something=👺 || (
                        should_instantiate || (use_plutopkg_old != use_plutopkg_new)
                    ),
                    used_tier=used_tier,
                    # changed_versions=Dict{String,Pair}(),
                    restart_recommended=👺 || (
                        (!isempty(to_remove) && old_manifest_keys != new_manifest_keys) ||
                        used_tier != Pkg.PRESERVE_ALL
                    ),
                    restart_required=👺 || (
                        used_tier ∈ [Pkg.PRESERVE_SEMVER, Pkg.PRESERVE_NONE]
                    ),
                )
            end
        end
    end
    return (
        did_something=👺 || (use_plutopkg_old != use_plutopkg_new),
        used_tier=Pkg.PRESERVE_ALL,
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
	try
        pkg_result = (take_token ? withtoken : (f, _) -> f())(notebook.executetoken) do
			function iocallback(pkgs, s)
				notebook.nbpkg_busy_packages = pkgs
				for p in pkgs
					notebook.nbpkg_terminal_outputs[p] = s
				end
                update_nbpkg_cache!(notebook)
				send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
			end
			 sync_nbpkg_core(notebook, old_topology, new_topology; on_terminal_output=iocallback, lag = session.options.server.simulated_pkg_lag)
		end

		if pkg_result.did_something
			@debug "PlutoPkg: success!" notebook.path pkg_result 

			if pkg_result.restart_recommended
				notebook.nbpkg_restart_recommended_msg = "Yes, something changed during regular sync."
				@debug "PlutoPkg: Notebook restart recommended" notebook.path notebook.nbpkg_restart_recommended_msg
			end
			if pkg_result.restart_required
				notebook.nbpkg_restart_required_msg = "Yes, something changed during regular sync."
				@debug "PlutoPkg: Notebook restart REQUIRED" notebook.path notebook.nbpkg_restart_required_msg
			end

			notebook.nbpkg_busy_packages = String[]
            update_nbpkg_cache!(notebook)
			send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
			save && save_notebook(session, notebook)
		end
	catch e
		bt = catch_backtrace()
		old_packages = try String.(keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies)); catch; ["unknown"] end
		new_packages = try String.(external_package_names(new_topology)); catch; ["unknown"] end
		@warn """
		PlutoPkg: Failed to add/remove packages! Resetting package environment...
		""" PLUTO_VERSION VERSION old_packages new_packages exception=(e, bt)
		# TODO: send to user

		error_text = sprint(showerror, e, bt)
		for p in notebook.nbpkg_busy_packages
            old = get(notebook.nbpkg_terminal_outputs, p, "")
			notebook.nbpkg_terminal_outputs[p] = old * "\n\n\nPkg error!\n\n" * error_text
		end
		notebook.nbpkg_busy_packages = String[]
        update_nbpkg_cache!(notebook)
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))

		# Clear the embedded Project and Manifest and require a restart from the user.
		reset_nbpkg(notebook, new_topology; keep_project=false, save=save)
		notebook.nbpkg_restart_required_msg = "Yes, because sync_nbpkg_core failed. \n\n$(error_text)"
        notebook.nbpkg_install_time_ns = nothing
        notebook.nbpkg_ctx_instantiated = false
        update_nbpkg_cache!(notebook)
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))

		save && save_notebook(session, notebook)
	end
end

function writebackup(notebook::Notebook)
    backup_path = backup_filename(notebook.path)
    Pluto.readwrite(notebook.path, backup_path)

    @info "Backup saved to" backup_path

    backup_path
end

"""
Run `Pkg.resolve` on the notebook's package environment. Keep trying more and more invasive strategies to fix problems until the operation succeeds.
"""
function resolve_with_auto_fixes(notebook::Notebook, iolistener::IOListener)
    
    notebook.nbpkg_ctx = PkgCompat.clear_stdlib_compat_entries(notebook.nbpkg_ctx)
    
    PkgCompat.withio(notebook.nbpkg_ctx, IOContext(iolistener.buffer, :color => true)) do
        withinteractive(false) do
            try
                Pkg.resolve(notebook.nbpkg_ctx)
            catch e
                @warn "Failed to resolve Pkg environment. Updating registries and trying again..." exception=e
                
                PkgCompat.update_registries(; force=true)
                try
                    Pkg.resolve(notebook.nbpkg_ctx)
                catch e
                    @warn "Failed to resolve Pkg environment. Removing Manifest and trying again..." exception=e
                    
                    reset_nbpkg(notebook; keep_project=true, save=false, backup=false)
                    try
                        Pkg.resolve(notebook.nbpkg_ctx)
                    catch e
                        @warn "Failed to resolve Pkg environment. Removing Project compat entries and Manifest and trying again..." exception=e
                        
                        reset_nbpkg(notebook; keep_project=true, save=false, backup=false)
                        notebook.nbpkg_ctx = PkgCompat.clear_compat_entries(notebook.nbpkg_ctx)
                        
                        Pkg.resolve(notebook.nbpkg_ctx)
                    end
                end
            end
        end
    end
end

"""
Reset the package environment of a notebook. This will remove the `Project.toml` and `Manifest.toml` files from the notebook's secret package environment folder, and if `save` is `true`, it will then save the notebook without embedded Project and Manifest.

If `keep_project` is `true` (default `false`), the `Project.toml` file will be kept, but the `Manifest.toml` file will be removed.

This function is useful when we are not able to resolve/activate/instantiate a notebook's environment after loading, which happens when e.g. the environment was created on a different OS or Julia version.
"""
function reset_nbpkg(notebook::Notebook, topology::Union{NotebookTopology,Nothing}=nothing; keep_project::Bool=false, backup::Bool=true, save::Bool=true)
    backup && save && writebackup(notebook)

    if notebook.nbpkg_ctx !== nothing
        p = PkgCompat.project_file(notebook)
        m = PkgCompat.manifest_file(notebook)
        keep_project || (isfile(p) && rm(p))
        isfile(m) && rm(m)

        notebook.nbpkg_ctx = PkgCompat.load_ctx(PkgCompat.env_dir(notebook.nbpkg_ctx))
    else
        notebook.nbpkg_ctx = use_plutopkg(something(topology, notebook.topology)) ? PkgCompat.create_empty_ctx() : nothing
    end

    save && save_notebook(notebook)
end

function update_nbpkg_core(notebook::Notebook; level::Pkg.UpgradeLevel=Pkg.UPLEVEL_MAJOR, on_terminal_output::Function=((args...) -> nothing))
    if notebook.nbpkg_ctx !== nothing
        PkgCompat.mark_original!(notebook.nbpkg_ctx)

        old_packages = String.(keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies))

        iolistener = let
            # we don't know which packages will be updated, so we send terminal output to all installed packages
            IOListener(callback=(s -> on_terminal_output(old_packages, s)))
        end
        
        # We remember which Pkg.Types.PreserveLevel was used. If it's too low, we will recommend/require a notebook restart later.
        local used_tier = Pkg.PRESERVE_ALL
        
        if !isready(pkg_token)
            println(iolistener.buffer, "Waiting for other notebooks to finish Pkg operations...")
            trigger(iolistener)
        end

        return withtoken(pkg_token) do
            PkgCompat.refresh_registry_cache()

            if !notebook.nbpkg_ctx_instantiated
                resolve_with_auto_fixes(notebook, iolistener)
            end

            startlistening(iolistener)

            PkgCompat.withio(notebook.nbpkg_ctx, IOContext(iolistener.buffer, :color => true)) do
                # We temporarily clear the "semver-compatible" [deps] entries, because it is difficult to update them after the update 🙈. TODO
                notebook.nbpkg_ctx = PkgCompat.clear_auto_compat_entries(notebook.nbpkg_ctx)

                try
                    ###
                    Pkg.update(notebook.nbpkg_ctx; level=level)
                    ###
                finally
                    notebook.nbpkg_ctx = PkgCompat.write_auto_compat_entries(notebook.nbpkg_ctx)
                end
            end

            stoplistening(iolistener)

            🐧 = !PkgCompat.is_original(notebook.nbpkg_ctx)
            (
                did_something=🐧,
                restart_recommended=🐧,
                restart_required=🐧,
            )
        end
    end
    (
        did_something=false,
        restart_recommended=false,
        restart_required=false,
    )
end


function update_nbpkg(session, notebook::Notebook; level::Pkg.UpgradeLevel=Pkg.UPLEVEL_MAJOR, backup::Bool=true, save::Bool=true)
    bp = if backup && save
        writebackup(notebook)
    end

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
				send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
			end
			update_nbpkg_core(notebook; level=level, on_terminal_output=iocallback)
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
		notebook.nbpkg_busy_packages = String[]
        update_nbpkg_cache!(notebook)
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
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
