
import .ExpressionExplorer: external_package_names

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

function update_project_pkg(notebook::Notebook, old::NotebookTopology, new::NotebookTopology)
    ctx = notebook.project_pkg_ctx
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
            

            # TODO: check if packages exist
            to_add = added
            if !isempty(to_add)
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
                
                ## This code adds compat entries for packages:
                # TODO: disabled because sometimes we need to Pkg.PRESERVE_NONE sometimes (this is easier to fix than to explain)

                # for p in to_add
                # 	entry = first(e -> e.name == p, values(ctx.env.manifest))
                # 	if entry.version !== nothing
                # 		ctx.env.project.compat[p] = "^" * string(entry.version)
                # 	end
                # end
                # Pkg.Types.write_env(ctx.env)
            end

            (did_something=(!isempty(to_add) || !isempty(to_remove)),
                used_tier=used_tier,
                # changed_versions=Dict{String,Pair}(),
                restart_recommended=(!isempty(to_remove) || used_tier != Pkg.PRESERVE_ALL),
                restart_required=(used_tier ∈ [Pkg.PRESERVE_SEMVER, Pkg.PRESERVE_NONE]),)
        end
    else
        (did_something=false,
            used_tier=Pkg.PRESERVE_ALL,
            # changed_versions=Dict{String,Pair}(),
            restart_recommended=false,
            restart_required=false,)
    end
end
