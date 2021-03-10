module PkgTools

export package_versions, package_completions

import Pkg
import Pkg.Types: VersionRange

function getfirst(f::Function, xs)
	for x ∈ xs
		if f(x)
			return x
		end
	end
	error("Not found")
end

create_empty_ctx() = Pkg.Types.Context(env=Pkg.Types.EnvCache(joinpath(mktempdir(),"Project.toml")))

# TODO: technically this is not constant
const registry_paths = @static if isdefined(Pkg.Types, :registries)
	Pkg.Types.registries()
else
	registry_specs = Pkg.Types.collect_registries()
	[s.path for s in registry_specs]
end

const registries = map(registry_paths) do r
	r => Pkg.Types.read_registry(joinpath(r, "Registry.toml"))
end

const stdlibs = readdir(Pkg.Types.stdlib_dir())::Vector{String}

is_stdlib(package_name::AbstractString) = package_name ∈ stdlibs
is_stdlib(pkg::Pkg.Types.PackageEntry) = pkg.version === nothing && (pkg.name ∈ stdlibs)

# TODO: should this be the notebook context? it only matters for which registry is used
const global_ctx = Pkg.Types.Context()

###
# Package names
###

function registered_package_completions(partial_name::AbstractString)
	# compat
	@static if hasmethod(Pkg.REPLMode.complete_remote_package, (String,))
		Pkg.REPLMode.complete_remote_package(partial_name)
	else
		Pkg.REPLMode.complete_remote_package(partial_name, 1, length(partial_name))[1]
	end
end

function package_completions(partial_name::AbstractString)::Vector{String}
	String[
		filter(s -> startswith(s, partial_name), stdlibs);
		registered_package_completions(partial_name)
	]
end


###
# Package versions
###

function registries_path(registries::Vector, package_name::AbstractString)::Union{Nothing,String}
	for (rpath, r) in registries
		packages = values(r["packages"])
		ds = Iterators.filter(d -> d["name"] == package_name, packages)
		if !isempty(ds)
			return joinpath(rpath, first(ds)["path"])
		end
	end
end

function package_versions_from_path(registry_entry_fullpath::AbstractString; ctx=global_ctx)::Vector{VersionNumber}
	# compat
    (@static if hasmethod(Pkg.Operations.load_versions, (String,))
        Pkg.Operations.load_versions(registry_entry_fullpath)
    else
        Pkg.Operations.load_versions(ctx, registry_entry_fullpath)
    end) |> keys |> collect |> sort!
end

function package_versions(package_name::AbstractString)::Vector
    if package_name ∈ stdlibs
        ["stdlib"]
    else
        p = registries_path(registries, package_name)
        if p === nothing
            []
        else
            package_versions_from_path(p)
        end
    end
end

package_exists(package_name::AbstractString) =
    package_name ∈ stdlibs || 
    registries_path(registries, package_name) !== nothing

get_manifest_entry(ctx::Pkg.Types.Context, package_name::AbstractString) = 
    getfirst(e -> e.name == package_name, values(ctx.env.manifest))

function get_manifest_version(ctx, package_name)
    if package_name ∈ stdlibs
        "stdlib"
    else
        entry = get_manifest_entry(ctx, package_name)
        entry.version
    end
end

end