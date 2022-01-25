### A Pluto.jl notebook ###
# v0.17.5

using Markdown
using InteractiveUtils

# ╔═╡ 273c7c85-8178-44a7-99f0-581754aeb8c8
begin
	"""
	Mark a vector as being append-only: let Firebasey know that it can diff this array simply by comparing lengths, without looking at its contents.

	It was made specifically for logs: Logs are always appended, OR the whole log stream is reset. AppendonlyMarker is like SubArray (a view into another array) except we agree to only ever append to the source array. This way, firebase can just look at the index and diff based on that.
	"""
	struct AppendonlyMarker{T} <: AbstractVector{T}
		mutable_source::Vector{T}
		length_at_time_of_creation::Int
	end
	AppendonlyMarker(arr) = AppendonlyMarker(arr, length(arr))
	
	# Poor mans vector-proxy
	# I think this is enough for Pluto to show, and for msgpack to pack
	function Base.size(arr::AppendonlyMarker)
		return (arr.length_at_time_of_creation,)
	end
	Base.getindex(arr::AppendonlyMarker, index::Int) = arr.mutable_source[index]
	Base.iterate(arr::AppendonlyMarker, args...) = Base.iterate(arr.mutable_source, args...)
end

# ╔═╡ 183cef1f-bfe9-42cd-8239-49e9ed00a7b6
md"""
## AppendonlyMarker(s)

Example of how to solve performance problems with Firebasey:
We make a new type with a specific diff function.
It might be very specific per problem, but that's fine for performance problems (I think).
It also keeps the performance solutions as separate modules/packages to whatever it is you're actually modeling.
"""

# ╔═╡ 971709de-074e-49cf-8bd4-9c675b037dfd
md"## `@skip_as_script`"

# ╔═╡ 9fce9aa9-d3c6-4134-9692-8a8756fa3cff
function is_inside_pluto(m::Module)
	if isdefined(m, :PlutoForceDisplay)
		return m.PlutoForceDisplay
	else
		isdefined(m, :PlutoRunner) && parentmodule(m) == Main
	end
end

# ╔═╡ db9167c4-7ba7-42e1-949b-0ad18e2d7b25
"""
	@skip_as_script expression

Marks a expression as Pluto-only, which means that it won't be executed when running outside Pluto. Do not use this for your own projects.
"""
macro skip_as_script(ex)
	if is_inside_pluto(__module__)
		esc(ex)
	else
		nothing
	end
end

# ╔═╡ 35d3bcd7-af51-466a-b4c4-cc055e74d01d
@skip_as_script appendonly_1, appendonly_2 = let
	array_1 = [1,2,3,4]
	appendonly_1 = AppendonlyMarker(array_1)
	push!(array_1, 5)
	appendonly_2 = AppendonlyMarker(array_1)

	appendonly_1, appendonly_2
end;

# ╔═╡ 1017f6cc-58ac-4c7b-a6d0-a03f5e387f1b
@skip_as_script appendonly_1_large, appendonly_2_large = let
	large_array_1 = [
		Dict{String,Any}(
			"x" => 1,
			"y" => [1,2,3,4],
			"z" => "hi",
		)
		for i in 1:10000
	];
	appendonly_1 = AppendonlyMarker(large_array_1)
	push!(large_array_1, Dict("x" => 5))
	appendonly_2 = AppendonlyMarker(large_array_1)

	appendonly_1, appendonly_2
end;

# ╔═╡ 33facb62-af28-4e94-946d-545637f320e9
"The opposite of `@skip_as_script`"
macro only_as_script(ex) is_inside_pluto(__module__) ? nothing : esc(ex) end

# ╔═╡ 092c4b11-8b75-446f-b3ad-01fa858daebb
# Only define this in Pluto - assume we are `using Test` otherwise
begin
	@skip_as_script begin
		import Pkg
		Pkg.activate(mktempdir())
		Pkg.add(Pkg.PackageSpec(name="PlutoTest"))
		using PlutoTest
	end
	# Do nothing inside pluto (so we don't need to have Test as dependency)
	# test/Firebasey is `using Test` before including this file
	@only_as_script begin
		if !isdefined(@__MODULE__, Symbol("@test"))
			macro test(e...) nothing; end
			macro test_throws(e...) nothing; end
			macro test_broken(e...) nothing; end
			macro testset(e...) nothing; end
		end
	end
end

# ╔═╡ 06492e8d-4500-4efe-80ee-55bf1ee2348c
@skip_as_script @test length([AppendonlyMarker([1,2,3])...]) == 3

# ╔═╡ 2284ae12-5b8c-4542-81fa-c4d34f2483e7
@skip_as_script @test length([AppendonlyMarker([1,2,3], 1)...]) == 1

# ╔═╡ dc5cd268-9cfb-49bf-87fb-5b7db4fa6e3c
md"## Import Firebasey when running inside notebook"

# ╔═╡ 0c2f23d8-8e98-47b7-9c4f-5daa70a6c7fb
# OH how I wish I would put in the time to refactor with fromFile or SOEMTGHINLAS LDKJ JULIA WHY ARE YOU LIKE THIS GROW UP
@skip_as_script Firebasey = let
	wrapper_module = Module()
	Core.eval(wrapper_module, :(module Firebasey
			include("Firebasey.jl")
		end
	))
	wrapper_module.Firebasey
end

# ╔═╡ 2903d17e-c6fd-4cea-8585-4db26a00b0e7
function Firebasey.diff(a::AppendonlyMarker, b::AppendonlyMarker)
	if a.mutable_source !== b.mutable_source
		[Firebasey.ReplacePatch([], b)]
	else
		if a.length_at_time_of_creation > b.length_at_time_of_creation
			throw(ErrorException("Not really supposed to diff AppendonlyMarker with the original being longer than the next version (you know, 'append only' and al)"))
		end
		
		map(a.length_at_time_of_creation+1:b.length_at_time_of_creation) do index
			Firebasey.AddPatch([index], b.mutable_source[index])
		end
	end
end

# ╔═╡ 8537488d-2ff9-42b7-8bfc-72d43fca713f
@skip_as_script @test array_diff(appendonly_1, appendonly_2) == [Firebasey.AddPatch([5], 5)]

# ╔═╡ 70179239-357a-424d-bac3-3a1431aff536
var"@track" = Firebasey.var"@track"

# ╔═╡ 37fe8c10-09f0-4f72-8cfd-9ce044c78c13
@skip_as_script @track for _ in 1:1000 array_diff(appendonly_1_large, appendonly_2_large) end

# ╔═╡ Cell order:
# ╟─183cef1f-bfe9-42cd-8239-49e9ed00a7b6
# ╠═273c7c85-8178-44a7-99f0-581754aeb8c8
# ╠═2903d17e-c6fd-4cea-8585-4db26a00b0e7
# ╠═35d3bcd7-af51-466a-b4c4-cc055e74d01d
# ╠═1017f6cc-58ac-4c7b-a6d0-a03f5e387f1b
# ╠═06492e8d-4500-4efe-80ee-55bf1ee2348c
# ╠═2284ae12-5b8c-4542-81fa-c4d34f2483e7
# ╠═8537488d-2ff9-42b7-8bfc-72d43fca713f
# ╠═37fe8c10-09f0-4f72-8cfd-9ce044c78c13
# ╟─971709de-074e-49cf-8bd4-9c675b037dfd
# ╟─9fce9aa9-d3c6-4134-9692-8a8756fa3cff
# ╟─db9167c4-7ba7-42e1-949b-0ad18e2d7b25
# ╟─33facb62-af28-4e94-946d-545637f320e9
# ╟─dc5cd268-9cfb-49bf-87fb-5b7db4fa6e3c
# ╠═0c2f23d8-8e98-47b7-9c4f-5daa70a6c7fb
# ╠═70179239-357a-424d-bac3-3a1431aff536
# ╠═092c4b11-8b75-446f-b3ad-01fa858daebb
