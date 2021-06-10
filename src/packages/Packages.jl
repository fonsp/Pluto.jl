
import .ExpressionExplorer: external_package_names
import .PkgCompat
import .PkgCompat: select, is_stdlib, write_auto_compat_entries!, clear_auto_compat_entries!

const tiers = [
	Pkg.PRESERVE_ALL,
	Pkg.PRESERVE_DIRECT,
	Pkg.PRESERVE_SEMVER,
	Pkg.PRESERVE_NONE,
]

const pkg_token = Token()


function use_plutopkg(topology::NotebookTopology)
    !any(values(topology.nodes)) do node
        Symbol("Pkg.activate") ∈ node.references ||
        Symbol("Pkg.API.activate") ∈ node.references ||
        Symbol("Pkg.add") ∈ node.references ||
        Symbol("Pkg.API.add") ∈ node.references
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
function sync_nbpkg_core(notebook::Notebook; on_terminal_output::Function=((args...) -> nothing))
    ctx = notebook.nbpkg_ctx

    👺 = false

    use_plutopkg_old = ctx !== nothing
    use_plutopkg_new = use_plutopkg(notebook.topology)
    
    if !use_plutopkg_old && use_plutopkg_new
        @info "Started using PlutoPkg!! HELLO reproducibility!"

        👺 = true
        ctx = notebook.nbpkg_ctx = PkgCompat.create_empty_ctx()
    end
    if use_plutopkg_old && !use_plutopkg_new
        @info "Stopped using PlutoPkg 💔😟😢"

        no_packages_loaded_yet = (
            notebook.nbpkg_restart_required_msg === nothing &&
            notebook.nbpkg_restart_recommended_msg === nothing &&
            all(PkgCompat.is_stdlib, keys(PkgCompat.project(ctx).dependencies))
        )
        👺 = !no_packages_loaded_yet
        ctx = notebook.nbpkg_ctx = nothing
    end
    

    if ctx !== nothing
        PkgCompat.mark_original!(ctx)

        old_packages = String.(keys(PkgCompat.project(ctx).dependencies))
        new_packages = String.(external_package_names(notebook.topology)) # search all cells for imports and usings
        
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
                    PkgCompat.withio(ctx, IOContext(iolistener.buffer, :color => true)) do
                        try
                            Pkg.resolve(ctx)
                        catch
                            reset_nbpkg(notebook; keep_project=true, save=false, backup=false)
                            Pkg.resolve(ctx)
                        end
                    end
                end

                to_remove = filter(removed) do p
                    haskey(PkgCompat.project(ctx).dependencies, p)
                end
                if !isempty(to_remove)
                    @debug to_remove
                    # See later comment
                    mkeys() = filter(!is_stdlib, [m.name for m in values(PkgCompat.dependencies(ctx))])
                    old_manifest_keys = mkeys()

                    Pkg.rm(ctx, [
                        Pkg.PackageSpec(name=p)
                        for p in to_remove
                    ])

                    # We record the manifest before and after, to prevent recommending a reboot when nothing got removed from the manifest (e.g. when removing GR, but leaving Plots), or when only stdlibs got removed.
                    new_manifest_keys = mkeys()
                    
                    # TODO: we might want to upgrade other packages now that constraints have loosened? Does this happen automatically?
                end

                
                # TODO: instead of Pkg.PRESERVE_ALL, we actually want:
                # "Pkg.PRESERVE_DIRECT, but preserve exact verisons of Base.loaded_modules"

                to_add = filter(PkgCompat.package_exists, added)
                
                if !isempty(to_add)
                    @debug to_add
                    startlistening(iolistener)

                    PkgCompat.withio(ctx, IOContext(iolistener.buffer, :color => true)) do
                        # We temporarily clear the "semver-compatible" [deps] entries, because Pkg already respects semver, unless it doesn't, in which case we don't want to force it.
                        clear_auto_compat_entries!(ctx)

                        try
                            for tier in [
                                Pkg.PRESERVE_ALL,
                                Pkg.PRESERVE_DIRECT,
                                Pkg.PRESERVE_SEMVER,
                                Pkg.PRESERVE_NONE,
                            ]
                                used_tier = tier

                                try
                                    Pkg.add(ctx, [
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
                            write_auto_compat_entries!(ctx)
                        end

                        # Now that Pkg is set up, the notebook process will call `using Package`, which can take some time. We write this message to the io, to notify the user.
                        println(iolistener.buffer, "\e[32m\e[1mLoading\e[22m\e[39m packages...")
                    end

                    @debug "PlutoPkg done"
                end

                should_instantiate = !notebook.nbpkg_ctx_instantiated || !isempty(to_add) || !isempty(to_remove)
                if should_instantiate
                    startlistening(iolistener)
                    PkgCompat.withio(ctx, IOContext(iolistener.buffer, :color => true)) do
                        # @info "Resolving"
                        # Pkg.resolve(ctx)
                        @debug "Instantiating"
                        
                        # Pkg.instantiate assumes that the environment to be instantiated is active, so we will have to modify the LOAD_PATH of this Pluto server
                        # We could also run the Pkg calls on the notebook process, but somehow I think that doing it on the server is more charming, though it requires this workaround.
                        env_dir = PkgCompat.env_dir(notebook.nbpkg_ctx)
                        pushfirst!(LOAD_PATH, env_dir)

                        # update registries if this is the first time
                        PkgCompat.update_registries(ctx)
                        # instantiate without forcing registry update
                        PkgCompat.instantiate(ctx; update_registry=false)
                        
                        @assert LOAD_PATH[1] == env_dir
                        popfirst!(LOAD_PATH)
                    end
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
function sync_nbpkg(session, notebook; save::Bool=true)
	try
		pkg_result = withtoken(notebook.executetoken) do
			function iocallback(pkgs, s)
				notebook.nbpkg_busy_packages = pkgs
				for p in pkgs
					notebook.nbpkg_terminal_outputs[p] = s
				end
				send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
			end
			sync_nbpkg_core(notebook; on_terminal_output=iocallback)
		end

		if pkg_result.did_something
			@debug "PlutoPkg: success!" pkg_result

			if pkg_result.restart_recommended
				@debug "PlutoPkg: Notebook restart recommended"
				notebook.nbpkg_restart_recommended_msg = "yes"
			end
			if pkg_result.restart_required
				@debug "PlutoPkg: Notebook restart REQUIRED"
				notebook.nbpkg_restart_required_msg = "yes"
			end

			notebook.nbpkg_busy_packages = String[]
			send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
			save && save_notebook(notebook)
		end
	catch e
		bt = catch_backtrace()
		old_packages = String.(keys(PkgCompat.project(notebook.nbpkg_ctx).dependencies))
		new_packages = String.(external_package_names(notebook.topology))
		@error """
		PlutoPkg: Failed to add/remove packages! resetting package environment...
		""" PLUTO_VERSION VERSION old_packages new_packages exception=(e, bt)
		# TODO: send to user

		error_text = sprint(showerror, e, bt)
		for p in notebook.nbpkg_busy_packages
			nbpkg_terminal_outputs[p] += "\n\n\nPkg error!\n\n" * error_text
		end
		notebook.nbpkg_busy_packages = String[]
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))

		# Clear the embedded Project and Manifest and require a restart from the user.
		reset_nbpkg(notebook; keep_project=false, save=save)
		notebook.nbpkg_restart_required_msg = "yes"
        notebook.nbpkg_ctx_instantiated = false
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))

		save && save_notebook(notebook)
	end
end

function writebackup(notebook::Notebook)
    backup_path = backup_filename(notebook.path)
    Pluto.readwrite(notebook.path, backup_path)

    @info "Backup saved to" backup_path

    backup_path
end

function reset_nbpkg(notebook::Notebook; keep_project::Bool=false, backup::Bool=true, save::Bool=true)
    backup && save && writebackup(notebook)

    if notebook.nbpkg_ctx !== nothing
        p = PkgCompat.project_file(notebook)
        m = PkgCompat.manifest_file(notebook)
        keep_project || isfile(p) && rm(p)
        isfile(m) && rm(m)
    end
    notebook.nbpkg_ctx = use_plutopkg(notebook.topology) ? PkgCompat.create_empty_ctx() : nothing

    save && save_notebook(notebook)
end

function update_nbpkg_core(notebook::Notebook; level::Pkg.UpgradeLevel=Pkg.UPLEVEL_MAJOR, on_terminal_output::Function=((args...) -> nothing))
    ctx = notebook.nbpkg_ctx

    if ctx !== nothing
        PkgCompat.mark_original!(ctx)

        old_packages = String.(keys(PkgCompat.project(ctx).dependencies))

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
                PkgCompat.withio(ctx, IOContext(iolistener.buffer, :color => true)) do
                    Pkg.resolve(ctx)
                end
            end

            startlistening(iolistener)

            PkgCompat.withio(ctx, IOContext(iolistener.buffer, :color => true)) do
                # We temporarily clear the "semver-compatible" [deps] entries, because it is difficult to update them after the update 🙈. TODO
                clear_auto_compat_entries!(ctx)

                try
                    ###
                    Pkg.update(ctx; level=level)
                    ###
                finally
                    write_auto_compat_entries!(ctx)
                end
            end

            stoplistening(iolistener)

            🐧 = !PkgCompat.is_original(ctx)
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
    if backup && save
        bp = writebackup(notebook)
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
				send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
			end
			update_nbpkg_core(notebook; level=level, on_terminal_output=iocallback)
		end

		if pkg_result.did_something
			if pkg_result.restart_recommended
				@debug "PlutoPkg: Notebook restart recommended"
				notebook.nbpkg_restart_recommended_msg = "yes"
			end
			if pkg_result.restart_required
				@debug "PlutoPkg: Notebook restart REQUIRED"
				notebook.nbpkg_restart_required_msg = "yes"
			end
		else
            isfile(bp) && rm(bp)
        end
	finally
		notebook.nbpkg_busy_packages = String[]
		send_notebook_changes!(ClientRequest(session=session, notebook=notebook))
		save && save_notebook(notebook)
	end
end

"A polling system to watch for writes to an IOBuffer. Up-to-date content will be passed as string to the `callback` function."
Base.@kwdef struct IOListener
    callback::Function
    buffer::IOBuffer=IOBuffer()
    interval::Real=1.0/60
    running::Ref{Bool}=Ref(false)
    last_size::Ref{Int}=Ref(-1)
end
function trigger(listener::IOListener)
    new_size = listener.buffer.size
    if new_size > listener.last_size[]
        listener.last_size[] = new_size
        new_contents = String(listener.buffer.data[1:new_size])
        listener.callback(new_contents)
    end
end
function startlistening(listener::IOListener)
    if !listener.running[]
        listener.running[] = true
        @async while listener.running[]
            trigger(listener)
            sleep(listener.interval)
        end
    end
end
function stoplistening(listener::IOListener)
    if listener.running[]
        listener.running[] = false
        trigger(listener)
    end
end
