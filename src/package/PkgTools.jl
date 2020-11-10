module PkgTools

export package_versions, package_completions

import Pkg


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

const stdlibs = readdir(Pkg.Types.stdlib_dir())
# TODO: what even is this
const ctx = Pkg.Types.Context()

###
# Package names
###

function registered_package_completions(partial_name::AbstractString)
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

function package_versions_from_path(registry_entry_fullpath::AbstractString)::Vector{VersionNumber}
    (@static if hasmethod(Pkg.Operations.load_versions, (String,))
        Pkg.Operations.load_versions(registry_entry_fullpath)
    else
        Pkg.Operations.load_versions(ctx, registry_entry_fullpath)
    end) |> keys |> collect |> sort!
end

function package_versions(package_name::String)::Vector
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

end