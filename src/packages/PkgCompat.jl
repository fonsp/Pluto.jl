module PkgCompat

export package_versions, package_completions

import Pkg
import Pkg.Types: VersionRange, PackageEntry, VersionSpec, VersionBound

import ..Pluto

# Should be in Base
flatmap(args...) = vcat(map(args...)...)

# Should be in Base
function select(f::Function, xs)
	for x ∈ xs
		if f(x)
			return x
		end
	end
	nothing
end


#=

NOTE ABOUT PUBLIC/INTERNAL PKG API

Pkg.jl exposes lots of API, but only some of it is "public": guaranteed to remain available. API is public if it is listed here:
https://pkgdocs.julialang.org/v1/api/

In this file, I labeled functions by their status using 🐸, ⚠️, etc.

A status in brackets (like this) means that it is only called within this file, and the fallback might be in a caller function.

---

I tried to only use public API, except:
- I use the `Pkg.Types.Context` value as first argument for many functions, since the server process manages multiple notebook processes, each with their own package environment. We could get rid of this, by settings `Base.ACTIVE_PROJECT[]` before and after each Pkg call. (This is temporarily activating the notebook environment.) This does have a performance impact, since the project and manifest caches are regenerated every time.
- https://github.com/JuliaLang/Pkg.jl/issues/2607 seems to be impossible with the current public API.
- Some functions try to use internal API for optimization/better features.

=#



# This is needed as the internal API handling package opeartions has changed between 1.6 and 1.8
function handle_package_input!(pkg::Pkg.Types.PackageSpec) 
	@static if isdefined(Pkg.API, :handle_package_input!)
		Pkg.API.handle_package_input!(pkg)
	else
		pkg
	end
end

###
# CONTEXT
###


const PkgContext = if isdefined(Pkg, :Context)
	Pkg.Context
elseif isdefined(Pkg, :Types) && isdefined(Pkg.Types, :Context)
	Pkg.Types.Context
elseif isdefined(Pkg, :API) && isdefined(Pkg.API, :Context)
	Pkg.API.Context
else
	Pkg.Types.Context
end

# 🐸 "Public API", but using PkgContext
load_ctx(env_dir)::PkgContext = PkgContext(env=Pkg.Types.EnvCache(joinpath(env_dir, "Project.toml")))

# 🐸 "Public API", but using PkgContext
create_empty_ctx()::PkgContext = load_ctx(mktempdir())

# ⚠️ Internal API with fallback
function load_ctx(original::PkgContext)
	new = load_ctx(env_dir(original))
	
	try
		new.env.original_project = original.env.original_project
		new.env.original_manifest = original.env.original_manifest
	catch e
		@warn "Pkg compat: failed to set original_project" exception=(e,catch_backtrace())
	end
	
	new
end

# ⚠️ Internal API with fallback
function mark_original!(ctx::PkgContext)
	try
		ctx.env.original_project = deepcopy(ctx.env.project)
		ctx.env.original_manifest = deepcopy(ctx.env.manifest)
	catch e
		@warn "Pkg compat: failed to set original_project" exception=(e,catch_backtrace())
	end
end

# ⚠️ Internal API with fallback
function is_original(ctx::PkgContext)::Bool
	try
		ctx.env.original_project == ctx.env.project &&
		ctx.env.original_manifest == ctx.env.manifest
	catch e
		@warn "Pkg compat: failed to get original_project" exception=(e,catch_backtrace())
		false
	end
end



# 🐸 "Public API", but using PkgContext
env_dir(ctx::PkgContext) = dirname(ctx.env.project_file)

project_file(x::AbstractString) = joinpath(x, "Project.toml")
manifest_file(x::AbstractString) = joinpath(x, "Manifest.toml")
project_file(ctx::PkgContext) = joinpath(env_dir(ctx), "Project.toml")
manifest_file(ctx::PkgContext) = joinpath(env_dir(ctx), "Manifest.toml")
function read_project_file(x)::String
	path = project_file(x)
	isfile(path) ? read(path, String) : ""
end
function read_manifest_file(x)::String
	path = manifest_file(x)
	isfile(path) ? read(path, String) : ""
end


# ⚠️ Internal API with fallback
function withio(f::Function, ctx::PkgContext, io::IO)
    @static if :io ∈ fieldnames(PkgContext)
        old_io = ctx.io
        ctx.io = io
        result = try
			f()
		finally
        	ctx.io = old_io
			nothing
		end
        result
    else
        f()
    end
end


###
# REGISTRIES
###

# (⛔️ Internal API)
"Return paths to all installed registries."
_get_registry_paths() = @static if isdefined(Pkg, :Types) && isdefined(Pkg.Types, :registries)
	Pkg.Types.registries()
elseif isdefined(Pkg, :Registry) && isdefined(Pkg.Registry, :reachable_registries)
	registry_specs = Pkg.Registry.reachable_registries()
	[s.path for s in registry_specs]
elseif isdefined(Pkg, :Types) && isdefined(Pkg.Types, :collect_registries)
	registry_specs = Pkg.Types.collect_registries()
	[s.path for s in registry_specs]
else
	String[]
end

# (⛔️ Internal API)
_get_registries() = map(_get_registry_paths()) do r
	@static if isdefined(Pkg, :Registry) && isdefined(Pkg.Registry, :RegistryInstance)
		Pkg.Registry.RegistryInstance(r)
	else
		r => Pkg.Types.read_registry(joinpath(r, "Registry.toml"))
	end
end

# (⛔️ Internal API)
"Contains all registries as `Pkg.Types.Registry` structs."
const _parsed_registries = Ref(_get_registries())

# (⛔️ Internal API)
"Re-parse the installed registries from disk."
function refresh_registry_cache()
	_parsed_registries[] = _get_registries()
end

# ⚠️✅ Internal API with fallback
const _updated_registries_compat = @static if isdefined(Pkg, :UPDATED_REGISTRY_THIS_SESSION) && Pkg.UPDATED_REGISTRY_THIS_SESSION isa Ref{Bool}
	Pkg.UPDATED_REGISTRY_THIS_SESSION
else
	Ref(false)
end

# ✅ Public API
function update_registries(; force::Bool=false)
	if force || !_updated_registries_compat[]
		Pkg.Registry.update()
		try
			refresh_registry_cache()
		catch
		end
		_updated_registries_compat[] = true		
	end
end

# ✅ Public API
"""
Check when the registries were last updated. If it is recent (max 7 days), `Pkg.UPDATED_REGISTRY_THIS_SESSION` is set to `true`, which will prevent Pkg from doing an automatic registry update.

Returns the new value of `Pkg.UPDATED_REGISTRY_THIS_SESSION`.
"""
function check_registry_age(max_age_ms = 1000.0 * 60 * 60 * 24 * 7)::Bool
	paths = _get_registry_paths()
	isempty(paths) && return _updated_registries_compat[]
	
	ages = map(paths) do p
		try
			mtime(p)
		catch
			zero(time())
		end
	end
	
	if all(ages .> time() - max_age_ms)
		_updated_registries_compat[] = true
	end
	_updated_registries_compat[]
end


###
# Instantiate
###

# ⚠️✅ Internal API with fallback
function instantiate(ctx; update_registry::Bool)
	@static if hasmethod(Pkg.instantiate, Tuple{}, (:update_registry,))
		Pkg.instantiate(ctx; update_registry)
	else
		Pkg.instantiate(ctx)
	end
end


###
# Standard Libraries
###

# (⚠️ Internal API with fallback)
_stdlibs() = try
	stdlibs = values(Pkg.Types.stdlibs())
	T = eltype(stdlibs)
	if T == String
		stdlibs
	elseif T <: Tuple{String,Any}
		first.(stdlibs)
	else
		error()
	end
catch e
	@warn "Pkg compat: failed to load standard libraries." exception=(e,catch_backtrace())

	String["CRC32c", "Future", "Sockets", "MbedTLS_jll", "Random", "ArgTools", "libLLVM_jll", "GMP_jll", "Pkg", "Serialization", "LibSSH2_jll", "SHA", "OpenBLAS_jll", "REPL", "LibUV_jll", "nghttp2_jll", "Unicode", "Profile", "SparseArrays", "LazyArtifacts", "CompilerSupportLibraries_jll", "Base64", "Artifacts", "PCRE2_jll", "Printf", "p7zip_jll", "UUIDs", "Markdown", "TOML", "OpenLibm_jll", "Test", "MPFR_jll", "Mmap", "SuiteSparse", "LibGit2", "LinearAlgebra", "Logging", "NetworkOptions", "LibGit2_jll", "LibOSXUnwind_jll", "Dates", "LibUnwind_jll", "Libdl", "LibCURL_jll", "dSFMT_jll", "Distributed", "InteractiveUtils", "Downloads", "SharedArrays", "SuiteSparse_jll", "LibCURL", "Statistics", "Zlib_jll", "FileWatching", "DelimitedFiles", "Tar", "MozillaCACerts_jll"]
end

# ⚠️ Internal API with fallback
is_stdlib(package_name::AbstractString) = package_name ∈ _stdlibs()

global_ctx = PkgContext()

###
# Package names
###

# ⚠️ Internal API with fallback
function package_completions(partial_name::AbstractString)::Vector{String}
	String[
		filter(s -> startswith(s, partial_name), collect(_stdlibs()));
		_registered_package_completions(partial_name)
	]
end

# (⚠️ Internal API with fallback)
function _registered_package_completions(partial_name::AbstractString)::Vector{String}
	# compat
	try
		@static if hasmethod(Pkg.REPLMode.complete_remote_package, (String,))
			Pkg.REPLMode.complete_remote_package(partial_name)
		else
			Pkg.REPLMode.complete_remote_package(partial_name, 1, length(partial_name))[1]
		end
	catch e
		@warn "Pkg compat: failed to autocomplete packages" exception=(e,catch_backtrace())
		String[]
	end
end

###
# Package versions
###

# (⛔️ Internal API)
"""
Return paths to all found registry entries of a given package name.

# Example
```julia
julia> Pluto.PkgCompat._registry_entries("Pluto")
1-element Vector{String}:
 "/Users/fons/.julia/registries/General/P/Pluto"
```
"""
function _registry_entries(package_name::AbstractString, registries::Vector=_parsed_registries[])::Vector{String}
	flatmap(registries) do (rpath, r)
		packages = values(r["packages"])
		String[
			joinpath(rpath, d["path"])
			for d in packages
			if d["name"] == package_name
		]
	end
end

# (⛔️ Internal API)
function _package_versions_from_path(registry_entry_fullpath::AbstractString)::Vector{VersionNumber}
	# compat
    vd = @static if isdefined(Pkg, :Operations) && isdefined(Pkg.Operations, :load_versions) && hasmethod(Pkg.Operations.load_versions, (String,))
        Pkg.Operations.load_versions(registry_entry_fullpath)
    else
        Pkg.Operations.load_versions(PkgContext(), registry_entry_fullpath)
    end
	vd |> keys |> collect
end

# ⚠️ Internal API with fallback
# See https://github.com/JuliaLang/Pkg.jl/issues/2607
"""
Return all registered versions of the given package. Returns `["stdlib"]` for standard libraries, and a `Vector{VersionNumber}` for registered packages.
"""
function package_versions(package_name::AbstractString)::Vector
    if is_stdlib(package_name)
        ["stdlib"]
    else
		try
			@static(if isdefined(Pkg, :Registry) && isdefined(Pkg.Registry, :uuids_from_name)
				flatmap(_parsed_registries[]) do reg
					uuids_with_name = Pkg.Registry.uuids_from_name(reg, package_name)
					flatmap(uuids_with_name) do u
						pkg = get(reg, u, nothing)
						if pkg !== nothing
							info = Pkg.Registry.registry_info(pkg)
							collect(keys(info.version_info))
						else
							[]
						end
					end
				end
			else
				ps = _registry_entries(package_name)
				flatmap(_package_versions_from_path, ps)
			end) |> sort
		catch e
			@warn "Pkg compat: failed to get installable versions." exception=(e,catch_backtrace())
			["latest"]
		end
    end
end

# ⚠️ Internal API with fallback
"Does a package with this name exist in one of the installed registries?"
package_exists(package_name::AbstractString)::Bool =
    package_versions(package_name) |> !isempty

# 🐸 "Public API", but using PkgContext
function dependencies(ctx)
	try
		# ctx.env.manifest
		@static if hasmethod(Pkg.dependencies, (PkgContext,))
			Pkg.dependencies(ctx)
		else
			Pkg.dependencies(ctx.env)
		end
	catch e
		if !occursin(r"expected.*exist.*manifest", sprint(showerror, e))
			@error """
			Pkg error: you might need to use

			Pluto.reset_notebook_environment(notebook_path)

			to reset this notebook's environment.

			Before doing so, consider sending your notebook file to https://github.com/fonsp/Pluto.jl/issues together with the following info:
			""" Pluto.PLUTO_VERSION VERSION exception=(e,catch_backtrace())
		end

		Dict()
	
	end
end

function project(ctx::PkgContext)
	@static if hasmethod(Pkg.project, (PkgContext,))
		Pkg.project(ctx)
	else
		Pkg.project(ctx.env)
	end
end

# 🐸 "Public API", but using PkgContext
"Find a package in the manifest. Return `nothing` if not found."
_get_manifest_entry(ctx::PkgContext, package_name::AbstractString) = 
    select(e -> e.name == package_name, values(dependencies(ctx)))

# ⚠️ Internal API with fallback
"""
Find a package in the manifest given its name, and return its installed version. Return `"stdlib"` for a standard library, and `nothing` if not found.
"""
function get_manifest_version(ctx::PkgContext, package_name::AbstractString)
    if is_stdlib(package_name)
        "stdlib"
    else
        entry = _get_manifest_entry(ctx, package_name)
		entry === nothing ? nothing : entry.version
    end
end

is_custom_pkgstr(package_name, pkg_str) = pkg_str !== "add $package_name"


###
# PkgData
###
Base.@kwdef struct PkgData{F <: Function}
	installed_version::Union{Nothing, VersionNumber} = nothing
	pkgfunc::F = Pkg.add
	spec::Pkg.Types.PackageSpec
	pkgstr::String
end

PkgData(v::AbstractString, pkgfunc::Function, spec::Pkg.Types.PackageSpec, pkgstr::String) = PkgData(VersionNumber(v), pkgfunc, spec, pkgstr)

const _PKGDATA_FIELDS = fieldnames(PkgData) # This is used to avoid fieldnames runtime impact and the need of generated function, see https://discourse.julialang.org/t/slowness-of-fieldnames-and-propertynames/55364
function PkgData(p::PkgData; kwargs...)
	args = map(_PKGDATA_FIELDS) do field
		get(kwargs, field, getfield(p,field))
	end
	PkgData(args...)
end

function PkgData(pkgstr::AbstractString; kwargs...)
	spec, pkgfunc = validate_pkgstr(nothing, pkgstr)
	PkgData(; pkgfunc, spec, pkgstr, kwargs...)
end

has_custom_pkg_str(p::PkgData) = p.spec.name === nothing || p.pkgstr !== "add $(p.spec.name)"
is_dev(p::PkgData) = startswith(p.pkgstr, "dev")

function to_js_dict(p::PkgData)
	Dict{String, Any}(
		"installed_version" => p.installed_version,
		"pkg_str" => p.pkgstr,
		"has_custom_pkg_str" => has_custom_pkg_str(p),
		"is_dev" => is_dev(p),
	)
end


const VERSIONBOUND_WILDCARD = UInt32(888)
# This is a slightly modified version of `Base.print(io::IO, r::VersionRange)` from Pkg. It is used to generate the compat entries
# Since we are only supporting Julia ≥ 1.6, we are gonna exploit the compat
# hyphen ranges for specifically requested package versions. To more easily identify
# what entries are automatically added by Pluto, we are gonna use special
# numbers in the compat entries. We always enter the full 3 semver digits for
# both lower and upper bound, and use 888 as wildcard for the non-provided
# upper-bound semver digits.
function compat_entry_string(r::VersionRange, manifest_version::VersionNumber)
	io = IOBuffer()
	m, n = r.lower.n, r.upper.n
    if (m, n) == (0, 0)
		# This is the case where no version specifier was given
		print(io, '~')
		print(io, manifest_version)
    else
		lower = r.lower
		# We modify the upper versionbound to always have all three digits printed, putting `888` to the undefined ones of the upper
		upper = VersionBound(Tuple(i > n ? VERSIONBOUND_WILDCARD : r.upper.t[i] for i ∈ 1:3))
        join(io, lower.t, '.')
		print(io, " - ")
		join(io, upper.t, '.')
    end
	return String(take!(io))
end

"""
Given an intended `package_name` and `pkg_str`, verify that `pkg_str` is a valid string to install the intended package using the PkgREPL 
"""
function validate_pkgstr(package_name::Union{String,Nothing}, pkg_str::String)
    pkgspec, func = parse_pkgstr(pkg_str)
    # We check that the package name is consistent with the provided command, but we skip packagespec without names (ones provided with urls or paths)
    if pkgspec.name !== nothing && package_name !== nothing && package_name !== pkgspec.name 
		error("The package name extracted from the command ($(pkgspec.name)) differs from the provided one ($(package_name)). Please correct the command")
	end
    
    # We only support add and develop as commands for the moment
    func ∉ (Pkg.add, Pkg.develop) && error("Only add and develop commands are currently supported, please modify your command")
    # If nothing else failed, we just return an empty string
    return pkgspec, func
end

"""
Take a string and extract the Pkg.API function `func` and PackageSpec `pkg_spec` that would be executed by pasting `pkg_str` in the PkgREPL
"""
function parse_pkgstr(pkg_str::String)
    statements = try
        Pkg.REPLMode.parse(pkg_str)
    catch
        error("The provided command is not valid, please modify your command")
    end
    # We check that no more than 1 statement come out of the parsing
    length(statements) > 1 && error("The provided command includes multiple statements, please provide a single statement")
    command = Pkg.REPLMode.Command(statements[1])
    # We check for single package
    args = command.arguments
    length(args) > 1 && error("The provided commands adds multiple packages, please only provide a command for $package_name")
    # We extract and pre-process the package_spec
    pkgspec = args[1]
	handle_package_input!(pkgspec)
    # We also extract the extracted function from the command
    func = command.spec.api
    return pkgspec, func
end

###
# WRITING COMPAT ENTRIES
###


_project_key_order = ["name", "uuid", "keywords", "license", "desc", "deps", "compat"]
project_key_order(key::String) =
    something(findfirst(x -> x == key, _project_key_order), length(_project_key_order) + 1)

# ✅ Public API
function _modify_compat(f!::Function, ctx::PkgContext)::PkgContext
	toml = Pkg.TOML.parsefile(project_file(ctx))
	compat = get!(Dict, toml, "compat")

	f!(compat)

	isempty(compat) && delete!(toml, "compat")

	write(project_file(ctx), sprint() do io
		Pkg.TOML.print(io, toml; sorted=true, by=(key -> (project_key_order(key), key)))
	end)
	
	return load_ctx(ctx)
end


# ✅ Public API
"""
Add any missing [`compat`](https://pkgdocs.julialang.org/v1/compatibility/) entries to the `Project.toml` for all direct dependencies. This serves as a 'fallback' in case someone (with a different Julia version) opens your notebook without being able to load the `Manifest.toml`. Return the new `PkgContext`.

The automatic compat entry is: `"~" * string(installed_version)`.
"""
function write_auto_compat_entries(ctx::PkgContext)::PkgContext
	_modify_compat(ctx) do compat
		for p in keys(project(ctx).dependencies)
			if !haskey(compat, p)
				m_version = get_manifest_version(ctx, p)
				if m_version !== nothing && !is_stdlib(p)
					compat[p] = "~" * string(VersionNumber(m_version.major, m_version.minor, m_version.patch))  # drop build number
				end
			end
		end
	end
end


# ✅ Public API
"""
Remove any automatically-generated [`compat`](https://pkgdocs.julialang.org/v1/compatibility/) entries from the `Project.toml`. This will undo the effects of [`write_auto_compat_entries`](@ref) but leave other (e.g. manual) compat entries intact. Return the new `PkgContext`.
"""
function clear_auto_compat_entries(ctx::PkgContext)::PkgContext
	if isfile(project_file(ctx))
		_modify_compat(ctx) do compat
			for p in keys(compat)
				m_version = get_manifest_version(ctx, p)
				if m_version !== nothing && !is_stdlib(p)
					if compat[p] == "~" * string(m_version)
						delete!(compat, p)
					end
				end
			end
		end
	else
		ctx
	end
end

# ✅ Public API
"""
Remove any [`compat`](https://pkgdocs.julialang.org/v1/compatibility/) entries from the `Project.toml` for standard libraries. These entries are created when an old version of Julia uses a package that later became a standard library, like https://github.com/JuliaPackaging/Artifacts.jl. Return the new `PkgContext`.
"""
function clear_stdlib_compat_entries(ctx::PkgContext)::PkgContext
	if isfile(project_file(ctx))
		_modify_compat(ctx) do compat
			for p in keys(compat)
				if is_stdlib(p)
					@info "Removing compat entry for stdlib" p
					delete!(compat, p)
				end
			end
		end
	else
		ctx
	end
end


end
