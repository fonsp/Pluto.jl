module PkgCompat

export package_versions, package_completions

import Pkg
import Pkg.Types: VersionRange

# Should be in Base
flatmap(args...) = vcat(map(args...)...)

# Should be in Base
function select(f::Function, xs)
	for x ∈ xs
		if f(x)
			return x
		end
	end
	error("Not found")
end


create_empty_ctx()::Pkg.Types.Context = Pkg.Types.Context(env=Pkg.Types.EnvCache(joinpath(mktempdir(),"Project.toml")))

"Return paths to all installed registries."
_get_registry_paths() = @static if isdefined(Pkg.Types, :registries)
	Pkg.Types.registries()
else
	registry_specs = Pkg.Types.collect_registries()
	[s.path for s in registry_specs]
end

_get_registries() = map(_get_registry_paths()) do r
	r => Pkg.Types.read_registry(joinpath(r, "Registry.toml"))
end

"Contains all registries as `Pkg.Types.Registry` structs."
const parsed_registries = Ref(_get_registries())

"Re-parse the installed registries from disk."
function refresh_registry_cache()
	parsed_registries[] = _get_registries()
end

is_stdlib(package_name::AbstractString) = package_name ∈ values(Pkg.Types.stdlibs())
is_stdlib(pkg::Pkg.Types.PackageEntry) = pkg.version === nothing && (pkg.name ∈ values(Pkg.Types.stdlibs()))

# TODO: should this be the notebook context? it only matters for which registry is used
global_ctx = Pkg.Types.Context()

###
# Package names
###

function package_completions(partial_name::AbstractString)::Vector{String}
	String[
		filter(s -> startswith(s, partial_name), collect(values(Pkg.Types.stdlibs())));
		_registered_package_completions(partial_name)
	]
end

function _registered_package_completions(partial_name::AbstractString)
	# compat
	@static if hasmethod(Pkg.REPLMode.complete_remote_package, (String,))
		Pkg.REPLMode.complete_remote_package(partial_name)
	else
		Pkg.REPLMode.complete_remote_package(partial_name, 1, length(partial_name))[1]
	end
end

###
# Package versions
###

"""
Return paths to all found registry entries of a given package name.

# Example
```julia
julia> Pluto.PkgCompat._registry_entries("Pluto")
1-element Vector{String}:
 "/Users/fons/.julia/registries/General/P/Pluto"
```
"""
function _registry_entries(package_name::AbstractString, registries::Vector=parsed_registries[])::Vector{String}
	flatmap(registries) do (rpath, r)
		packages = values(r["packages"])
		String[
			joinpath(rpath, d["path"])
			for d in packages
			if d["name"] == package_name
		]
	end
end

function _package_versions_from_path(registry_entry_fullpath::AbstractString; ctx=global_ctx)::Vector{VersionNumber}
	# compat
    (@static if hasmethod(Pkg.Operations.load_versions, (String,))
        Pkg.Operations.load_versions(registry_entry_fullpath)
    else
        Pkg.Operations.load_versions(ctx, registry_entry_fullpath)
    end) |> keys |> collect |> sort!
end

"""
Return all registered versions of the given package. Returns `["stdlib"]` for standard libraries, and a `Vector{VersionNumber}` for registered packages.
"""
function package_versions(package_name::AbstractString)::Vector
    if is_stdlib(package_name)
        ["stdlib"]
    else
        ps = _registry_entries(package_name)
		flatmap(_package_versions_from_path, ps)
    end
end

"Does a package with this name exist in one of the installed registries?"
package_exists(package_name::AbstractString)::Bool =
    is_stdlib(package_name) || 
    _registry_entries(package_name) |> !isempty

"Find a package in the manifest."
_get_manifest_entry(ctx::Pkg.Types.Context, package_name::AbstractString) = 
    select(e -> e.name == package_name, values(Pkg.dependencies(ctx)))

function get_manifest_version(ctx, package_name)
    if is_stdlib(package_name)
        "stdlib"
    else
        entry = _get_manifest_entry(ctx, package_name)
        entry.version
    end
end

end