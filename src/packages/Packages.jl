
import .ExpressionExplorer: external_package_names
import .PkgTools
import .PkgTools: getfirst

function external_package_names(topology::NotebookTopology)::Set{Symbol}
    union!(Set{Symbol}(), external_package_names.(c.module_usings_imports for (c, _) in topology.nodes)...)
end

const tiers = [
	Pkg.PRESERVE_ALL,
	Pkg.PRESERVE_DIRECT,
	Pkg.PRESERVE_SEMVER,
	Pkg.PRESERVE_NONE,
]

const pkg_token = Token()


function write_semver_compat_entries!(ctx::Pkg.Types.Context)
    for p in keys(ctx.env.project.deps)
        if !haskey(ctx.env.project.compat, p)
            entry = getfirst(e -> e.name == p, values(ctx.env.manifest))
            if entry.version !== nothing
                ctx.env.project.compat[p] = "^" * string(entry.version)
            end
        end
    end
    Pkg.Types.write_env(ctx.env)
end


function clear_semver_compat_entries!(ctx::Pkg.Types.Context)
    for p in keys(ctx.env.project.compat)
        entry = getfirst(e -> e.name == p, values(ctx.env.manifest))
        if entry.version !== nothing
            if ctx.env.project.compat[p] == "^" * string(entry.version)
                delete!(ctx.env.project.compat, p)
            end
        end
    end
    Pkg.Types.write_env(ctx.env)
end


function use_plutopkg(topology::NotebookTopology)
    !any(values(topology.nodes)) do node
        Symbol("Pkg.activate") ∈ node.references ||
        Symbol("Pkg.API.activate") ∈ node.references
    end
end


function update_nbpkg(notebook::Notebook, old::NotebookTopology, new::NotebookTopology)
    ctx = notebook.nbpkg_ctx

    👺 = false

    use_plutopkg_new = use_plutopkg(new)
    if ctx === nothing && use_plutopkg_new
        # start using PlutoPkg!!

        ctx = notebook.nbpkg_ctx = Pkg.Types.Context(env=Pkg.Types.EnvCache(joinpath(mktempdir(),"Project.toml")))
        👺 = true
    end
    if ctx !== nothing && !use_plutopkg_new
        # stop using PlutoPkg 💔😟😢

        👺 = !(keys(ctx.env.project.deps) ⊆ PkgTools.stdlibs)
        ctx = notebook.nbpkg_ctx = nothing
    end
    

    if ctx !== nothing

        new_packages = String.(external_package_names(new))
        
        removed = setdiff(keys(ctx.env.project.deps), new_packages)
        added = setdiff(new_packages, keys(ctx.env.project.deps))
        
        local used_tier = Pkg.PRESERVE_ALL
        
        withtoken(pkg_token) do
            to_remove = filter(removed) do p
                haskey(ctx.env.project.deps, p)
            end
            if !isempty(to_remove)
                Pkg.rm(ctx, [
                    Pkg.PackageSpec(name=p)
                    for p in to_remove
                ])
                # TODO: we might want to upgrade other packages now that constraints have loosened???
            end
            
            # TODO: instead of Pkg.PRESERVE_ALL, we actually want:
            # Pkg.PRESERVE_DIRECT, but preserve exact verisons of Base.loaded_modules

            to_add = filter(PkgTools.package_exists, added)
            if !isempty(to_add)
                # We temporarily clear the "semver-compatible" [deps] entries, because Pkg already respects semver, unless it doesn't, in which case we don't want to force it
                clear_semver_compat_entries!(ctx)

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

                write_semver_compat_entries!(ctx)
            end

            (did_something=👺 || (!isempty(to_add) || !isempty(to_remove)),
                used_tier=used_tier,
                # changed_versions=Dict{String,Pair}(),
                restart_recommended=👺 || (!isempty(to_remove) || used_tier != Pkg.PRESERVE_ALL),
                restart_required=👺 || (used_tier ∈ [Pkg.PRESERVE_SEMVER, Pkg.PRESERVE_NONE]),)
        end
    else
        (did_something=👺 || false,
            used_tier=Pkg.PRESERVE_ALL,
            # changed_versions=Dict{String,Pair}(),
            restart_recommended=👺 || false,
            restart_required=👺 || false,)
    end
end
