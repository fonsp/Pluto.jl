### A Pluto.jl notebook ###
# v0.18.0

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
end

# ╔═╡ 17a6af91-6978-4878-af60-d619c44e6363
begin
	import Pkg
	eval(quote
		Pkg.add(url="https://github.com/paulgb/PenPlots.jl")
	end)
	using PenPlots
end

# ╔═╡ c065248a-25cb-4f4b-a048-482344e80b7a
using Triangulate

# ╔═╡ 3027890b-196b-4a65-9f17-0180d21f6beb
using HypertextLiteral

# ╔═╡ 42b04181-4784-4906-b869-dea036f1afb7
using CoordinateTransformations

# ╔═╡ 440e84f1-b479-4b63-a869-27d74930b08f
using Rotations

# ╔═╡ 017246d7-756f-4e06-b5fb-eabe28c0683e
using Interpolations

# ╔═╡ d9f51e7e-bcab-4fbb-87ca-b5e7fd06bde4
using LinearAlgebra

# ╔═╡ ba23cd4b-9c51-4b3b-888f-e170fd4edbdd
using BenchmarkTools

# ╔═╡ dc30e200-edd3-457c-9cb9-56a34f6a112c
using PlutoUI

# ╔═╡ 264dad85-32a2-42f5-80b6-6644112ab8a1
using Printf

# ╔═╡ e6d06f83-18d1-4bbe-8e12-15814316441b
using StaticArrays

# ╔═╡ e9010ab3-cdb4-49f9-b2c3-705437ea5ebf
points = [
	0.0 0
	1.0 0
	0.0 1
]

# ╔═╡ 034c5094-f107-4ed2-bd9d-b964b4ad669d
let n=10,raster=10
    triin=Triangulate.TriangulateIO()
    triin.pointlist=hcat(unique([ Cdouble[rand(1:raster)/raster, rand(1:raster)/raster] for i in 1:n])...)
    display(triin)
    (triout, vorout)=Triangulate.triangulate("Q", triin)
end

# ╔═╡ 4b89fc14-755d-4df3-a800-05c5a089b3db
let n=10,raster=10
    hcat(unique([ Cdouble[rand(1:raster)/raster, rand(1:raster)/raster] for i in 1:n])...)
end

# ╔═╡ 288decf2-88ca-4a74-bde0-7b39ddb7f88a
function to_triangulate_mat(ps::AbstractVector{<:SVector})
	# const output_type = eltype(eltype(ps))
	# output_type = Float64
	A = Matrix{Float64}(undef, length(eltype(ps)), length(ps))
	for (i,p) in enumerate(ps)
		@inbounds A[:,i] .= p
	end
	A
end

# ╔═╡ 6eb00ffe-9b67-4ad5-a00e-86d02f673664
aa = rand(2,10)

# ╔═╡ d71c5ee2-f360-11ea-2753-a132fa41871a
reinterpret(Vector{SVector{Float64,2}}, aa)

# ╔═╡ cff314d6-7e2d-42d7-b4ab-30b76cac82bc
reinterpret(10, SVector{Float64,2}, aa)

# ╔═╡ 976d9aa3-bf54-4630-980b-bfa063a56819
function triangulate_raw(ps::AbstractVector{<:SVector}; switches::String="Q")
	mat = to_triangulate_mat(ps)
    triin=Triangulate.TriangulateIO()
    triin.pointlist=mat
    Triangulate.triangulate(switches, triin)
end

# ╔═╡ 83fee9f6-106a-4ca7-b93f-15b9038cde8b
function triangulate(args...; kwargs...)
	t, v = triangulate_raw(args...; kwargs...)

	z = t.trianglelist
	[
		SVector{4,Int}(z[1,j], z[2,j], z[3,j], z[1,j] )
		for j in 1:size(z,2)
	]
end

# ╔═╡ a97e2c01-2245-479f-8d1f-bf660f23d767
n(prefix::String, value::Float64) = "$(prefix)$(@sprintf("%.15f",value))"

# ╔═╡ a223cf19-8dc7-4e74-8a30-48475b2c8196
n(prefix::String, value::Bool) = prefix

# ╔═╡ e4275a7e-a03d-4181-91e8-06361fc80d96
n(prefix::String, value::Nothing) = ""

# ╔═╡ 00549702-11c7-49c0-a928-88251eb7d186
# let n=10,raster=10
#     triin=Triangulate.TriangulateIO()
#     triin.pointlist=hcat(unique([ Cdouble[rand(1:raster)/raster, rand(1:raster)/raster] for i in 1:n])...)
#     display(triin)
#     Triangulate.triangulate("Qa38.986q18.986037025490717", triin)[1].trianglelist
# end

# ╔═╡ 84d06013-be32-4722-ab5b-61ff9ef84fbe
function build_switches(; 
		max_area::Union{Float64,Nothing}=nothing, 
		min_angle::Union{Float64,Nothing}=nothing,
		quiet::Bool=true,
	)
	@assert isnothing(min_angle) || min_angle < 28.6 "Oh ohhh"

	string(
		n("Q", quiet),
		n("a", max_area),
		n("q", min_angle),
	)
end

# ╔═╡ bd7b2e9f-205f-4999-b6b7-288f448c70bf
function triangulate_true(args...; kwargs...)
	t, v = triangulate_raw(args...; switches=build_switches(;kwargs...))

	pl = t.pointlist
	new_pl = [
		SVector{2,Float64}(pl[1,j], pl[2,j] )
		for j in 1:size(pl,2)
	]
	tl = t.trianglelist
	new_tl = [
		SVector{4,Int}(tl[1,j], tl[2,j], tl[3,j], tl[1,j] )
		for j in 1:size(tl,2)
	]
	new_pl, new_tl
end

# ╔═╡ 19da2136-a5e4-476e-95a9-853960e3a50f
macro label_bind(name::Symbol, ex::Expr)
	quote
		@htl("""
		<code style='font-weight: bold'>$($(String(name)))</code>: $(@bind $(name) $(esc(ex)))
		""")
	end
end

# ╔═╡ 8e4955bb-59cd-4f15-91af-c6ccf675f1b3
@label_bind max_area PlutoUI.Experimental.transformed_value(
					x -> 10^x, 
					Slider(LinRange(-0.5,4,100); default=4)
			)

# ╔═╡ 5d1c8f91-f0b9-4a5d-9463-0438c57b271f
@label_bind min_angle Slider(0:.1:28)

# ╔═╡ ce02fd38-a690-426e-a10e-e768fc222981
xx = 30 .* randn(SVector{2,Float64},10)

# ╔═╡ 4c755e8a-3568-43a9-b730-aa1f3eea353c
triangulate_raw(xx; switches="Q")[1]

# ╔═╡ 4ba3975c-a449-4c6d-8ef2-d3106f091efd
Path([
	SVector(1,2),
	SVector(2,2),
	SVector(1.2,1),
	SVector(1,1.9),
])

# ╔═╡ f49f35fc-5005-4baf-be54-cb3a46fc2479
# xx = [10000*SVector(p...) for p in small_dot.points[20:end]]

# ╔═╡ 17c2953f-96ff-409c-949e-561158bcf6c2
const fillable_tri = 20*randn(SVector{2,Float64},3)

# ╔═╡ f63083d5-eb82-4f65-8799-c2cc59385ab0
@bind fill_angle Slider(LinRange(0,2π,500))

# ╔═╡ 90c00e90-13ba-4b32-a85c-d6fd5394164b
rotate_90(p::SVector{2,<:Real}) = SVector(-p[2], p[1])

# ╔═╡ d235e2f7-47c0-49e3-b000-1027413dd6a5
dot([1,1], rotate_90(SVector(0.5,0.5)))

# ╔═╡ 9c72e77e-7cd3-4dc0-9e98-d2a4101329ac
dot([1,0], rotate_90(SVector(0.5,0.5)))

# ╔═╡ ebb7519b-97b9-4a24-bd43-dec89a93fab4


# ╔═╡ 6e23ba2a-ceff-411c-94c1-c16e293a5b9b
minabs(a,b) = abs(a) < abs(b) ? a : b

# ╔═╡ 28162e97-0166-45d4-b07d-0ecf228e9707
function fill_with_pattern(triangle_corners; step::Real=1.5, direction)
	a, b, c = triangle_corners

	AB = b - a
	AC = c - a
	BC = c - b

	crossAB = rotate_90(AB)

	z1, z2 = dot(rotate_90(direction), AC), dot(rotate_90(direction), BC)
	# @info "asdf" z1 z2

	# if z1 == 0
	# 	if 
	# 	return fill_with_pattern((b,c,a); step, direction)
	# end
	# if z2 == 0
	# 	# that's fine
	# end
	if z1 < 0
		return fill_with_pattern((c,b,a); step, direction)
	end
	if z2 > 0
		return fill_with_pattern((a,c,b); step, direction)
	end

	# direction = @something(direction, crossAB)
	
	
	# if dot(AB,AC) < 0
	# 	return fill_with_pattern((b,a,c))
	# end
	# if dot(-AB,BC) < 0
	# 	return fill_with_pattern((a,c,b))
	# end
	ABlength = norm(AB)
	AClength = norm(AC)
	BClength = norm(BC)

	direction *= ABlength / norm(direction)

	step_AB = step / abs(dot(crossAB,direction)) * ABlength
	map(step_AB/2:step_AB:1) do x
		s = a + x * AB

		yAC = x * dot(AC,crossAB) / dot(direction,rotate_90(AC))
		yBC = -(1-x) * dot(BC,crossAB) / dot(direction,rotate_90(BC))
		
		eAC = s + (
			z1 == 0 ? yBC : 
			z2 == 0 ? yAC : 
			minabs(yAC, yBC)
		) * direction
		# eAC = s + yAC * direction
		Path([s,eAC])
	end
end

# ╔═╡ 61e0b87d-e07c-4e4e-a9e3-889dc865d0dd
LinRange(fillable_tri[1], fillable_tri[2], 10)

# ╔═╡ 8407ef41-63ed-4cf6-a069-33010f1914cb
"Split a `Path` into the single-line paths that it consists of, but check the return type..."
split_lines(p::Path)::Vector{Tuple{Point,Point}} = [
	# Use `extrema` to "sort" the two points (which just works apparently!). This will canonalize the result.
	extrema((p.points[i], p.points[i+1]))
	for i in 1:length(p.points)-1
]

# ╔═╡ abe6e1b4-ccf0-4abd-81c5-4f0b0df7fe94
flatmap(args...) = vcat(map(args...)...)

# ╔═╡ b294fc41-eb86-44dc-b608-96d538189a10
function without_duplicate_lines(paths::MultiPath)::MultiPath
	original_lines = flatmap(split_lines, paths)
	unique_lines = Set(original_lines)

	sort([Path([l...]) for l in unique_lines])
end

# ╔═╡ d1820c35-6acd-41fd-9138-ca37bdbb8126
result = let
	pl, tl = triangulate_true(xx; max_area, min_angle)
	
		
	[
		without_duplicate_lines([
			Path(pl[t])
			for t in tl
		])...,
		# [
		# 	Path(200 .* (degree_rotation(rand(0:359)),) .* (small_dot.points) .+ (x,))
		# 	for x in xx
		# ]...,
		flatmap(tl) do t
			fill_with_pattern(
				pl[t]; 
				step=rand(.5:.1:5), 
				direction=degree_rotation(rand(0:359)) * SVector(1,0)
			)
			
		end...
	]
end

# ╔═╡ 84da64fc-a35e-45bf-bcdc-83a7f163621b
result .|> length |> sum

# ╔═╡ 21b0614e-ba9f-4301-a622-6f07fcb9583f
without_duplicate_lines(result) .|> length |> sum

# ╔═╡ 4c5f697c-6ec9-492f-9fda-03aa31ec7362


# ╔═╡ 798f75b7-cfb9-4bf3-bb0c-9a8d063d1c9c
random_subset(xs) = xs[rand(Bool, length(xs))]

# ╔═╡ 667feb4c-d64f-4cf3-b454-8612a09dfdb4
small_triangle = Path([
	SVector(-.1, -.1),
	SVector(0, .07),
	SVector(.1, -.1),
	SVector(-.1, -.1),
] .* .2)

# ╔═╡ f107a173-ebbb-45b9-967f-a99f010cb3fb
small_dot = Path([
	0.01 * x * SVector(cos(x*2π), sin(x*2π))
	for x in LinRange(0,2,100)
])

# ╔═╡ fa475a5f-280d-4d80-ba1d-502ede1ce971
[
	fill_with_pattern(
		fillable_tri; 
		step=2, 
		direction=SVector(cos(fill_angle),sin(fill_angle))
	)...,
	[
		Path(200 .* (degree_rotation(rand(0:0)),) .* (small_dot.points) .+ (x,))
		for x in fillable_tri
	]...,
]

# ╔═╡ 2874c51f-bdee-4070-b129-a40d5f674a1a
[
	[
		Path(xx[t])
		for t in triangulate(xx; switches="Q")
	]...,
	[
		Path(small_dot.points .+ (x,))
		for x in xx
	]...,
]

# ╔═╡ d2a13df5-abed-4bde-b5b9-ccd1dd0818ba
xx

# ╔═╡ daaecfe6-f443-468b-a176-e631b75d5ddd
triangulate_raw(xx; switches="QiC")

# ╔═╡ 7021d17f-5710-4faf-a1cf-54b37ce0bbc7


# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
BenchmarkTools = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
CoordinateTransformations = "150eb455-5306-5404-9cee-2592286d6298"
HypertextLiteral = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
Interpolations = "a98d9a8b-a2ab-59e6-89dd-64a1c18fca59"
LinearAlgebra = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"
PenPlots = "61246389-3d51-4c70-b82d-266223a1b313"
Pkg = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
Printf = "de0858da-6303-5e67-8744-51eddeeeb8d7"
Rotations = "6038ab10-8711-5258-84ad-4b1120ba62dc"
StaticArrays = "90137ffa-7385-5640-81b9-e52037218182"
Triangulate = "f7e6ffb2-c36d-4f8f-a77e-16e897189344"

[compat]
BenchmarkTools = "~1.3.1"
CoordinateTransformations = "~0.6.2"
HypertextLiteral = "~0.9.3"
Interpolations = "~0.13.5"
PlutoUI = "~0.7.34"
Rotations = "~1.2.0"
StaticArrays = "~1.3.4"
Triangulate = "~2.1.1"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.7.0"
manifest_format = "2.0"

[[deps.AbstractPlutoDingetjes]]
deps = ["Pkg"]
git-tree-sha1 = "8eaf9f1b4921132a4cff3f36a1d9ba923b14a481"
uuid = "6e696c72-6542-2067-7265-42206c756150"
version = "1.1.4"

[[deps.Adapt]]
deps = ["LinearAlgebra"]
git-tree-sha1 = "af92965fb30777147966f58acb05da51c5616b5f"
uuid = "79e6a3ab-5dfb-504d-930d-738a2a938a0e"
version = "3.3.3"

[[deps.ArgTools]]
uuid = "0dad84c5-d112-42e6-8d28-ef12dabb789f"

[[deps.Artifacts]]
uuid = "56f22d72-fd6d-98f1-02f0-08ddc0907c33"

[[deps.AxisAlgorithms]]
deps = ["LinearAlgebra", "Random", "SparseArrays", "WoodburyMatrices"]
git-tree-sha1 = "66771c8d21c8ff5e3a93379480a2307ac36863f7"
uuid = "13072b0f-2c55-5437-9ae7-d433b7a33950"
version = "1.0.1"

[[deps.Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[deps.BenchmarkTools]]
deps = ["JSON", "Logging", "Printf", "Profile", "Statistics", "UUIDs"]
git-tree-sha1 = "4c10eee4af024676200bc7752e536f858c6b8f93"
uuid = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
version = "1.3.1"

[[deps.Calculus]]
deps = ["LinearAlgebra"]
git-tree-sha1 = "f641eb0a4f00c343bbc32346e1217b86f3ce9dad"
uuid = "49dc2e85-a5d0-5ad3-a950-438e2897f1b9"
version = "0.5.1"

[[deps.ChainRulesCore]]
deps = ["Compat", "LinearAlgebra", "SparseArrays"]
git-tree-sha1 = "f9982ef575e19b0e5c7a98c6e75ee496c0f73a93"
uuid = "d360d2e6-b24c-11e9-a2a3-2a2ae2dbcce4"
version = "1.12.0"

[[deps.ChangesOfVariables]]
deps = ["ChainRulesCore", "LinearAlgebra", "Test"]
git-tree-sha1 = "bf98fa45a0a4cee295de98d4c1462be26345b9a1"
uuid = "9e997f8a-9a97-42d5-a9f1-ce6bfc15e2c0"
version = "0.1.2"

[[deps.ColorTypes]]
deps = ["FixedPointNumbers", "Random"]
git-tree-sha1 = "024fe24d83e4a5bf5fc80501a314ce0d1aa35597"
uuid = "3da002f7-5984-5a60-b8a6-cbb66c0b333f"
version = "0.11.0"

[[deps.Colors]]
deps = ["ColorTypes", "FixedPointNumbers", "Reexport"]
git-tree-sha1 = "417b0ed7b8b838aa6ca0a87aadf1bb9eb111ce40"
uuid = "5ae59095-9a9b-59fe-a467-6f913c188581"
version = "0.12.8"

[[deps.Compat]]
deps = ["Base64", "Dates", "DelimitedFiles", "Distributed", "InteractiveUtils", "LibGit2", "Libdl", "LinearAlgebra", "Markdown", "Mmap", "Pkg", "Printf", "REPL", "Random", "SHA", "Serialization", "SharedArrays", "Sockets", "SparseArrays", "Statistics", "Test", "UUIDs", "Unicode"]
git-tree-sha1 = "44c37b4636bc54afac5c574d2d02b625349d6582"
uuid = "34da2185-b29b-5c13-b0c7-acf172513d20"
version = "3.41.0"

[[deps.CompilerSupportLibraries_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "e66e0078-7015-5450-92f7-15fbd957f2ae"

[[deps.CoordinateTransformations]]
deps = ["LinearAlgebra", "StaticArrays"]
git-tree-sha1 = "681ea870b918e7cff7111da58791d7f718067a19"
uuid = "150eb455-5306-5404-9cee-2592286d6298"
version = "0.6.2"

[[deps.DataAPI]]
git-tree-sha1 = "cc70b17275652eb47bc9e5f81635981f13cea5c8"
uuid = "9a962f9c-6df0-11e9-0e5d-c546b8b5ee8a"
version = "1.9.0"

[[deps.DataValueInterfaces]]
git-tree-sha1 = "bfc1187b79289637fa0ef6d4436ebdfe6905cbd6"
uuid = "e2d170a0-9d28-54be-80f0-106bbe20a464"
version = "1.0.0"

[[deps.Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[deps.DelimitedFiles]]
deps = ["Mmap"]
uuid = "8bb1440f-4735-579b-a4ab-409b98df4dab"

[[deps.Distributed]]
deps = ["Random", "Serialization", "Sockets"]
uuid = "8ba89e20-285c-5b6f-9357-94700520ee1b"

[[deps.DocStringExtensions]]
deps = ["LibGit2"]
git-tree-sha1 = "b19534d1895d702889b219c382a6e18010797f0b"
uuid = "ffbed154-4ef7-542d-bbb7-c09d3a79fcae"
version = "0.8.6"

[[deps.Downloads]]
deps = ["ArgTools", "LibCURL", "NetworkOptions"]
uuid = "f43a241f-c20a-4ad4-852c-f6b1247861c6"

[[deps.DualNumbers]]
deps = ["Calculus", "NaNMath", "SpecialFunctions"]
git-tree-sha1 = "84f04fe68a3176a583b864e492578b9466d87f1e"
uuid = "fa6b7ba4-c1ee-5f82-b5fc-ecf0adba8f74"
version = "0.6.6"

[[deps.EarCut_jll]]
deps = ["Artifacts", "JLLWrappers", "Libdl", "Pkg"]
git-tree-sha1 = "3f3a2501fa7236e9b911e0f7a588c657e822bb6d"
uuid = "5ae413db-bbd1-5e63-b57d-d24a61df00f5"
version = "2.2.3+0"

[[deps.FixedPointNumbers]]
deps = ["Statistics"]
git-tree-sha1 = "335bfdceacc84c5cdf16aadc768aa5ddfc5383cc"
uuid = "53c48c17-4a7d-5ca2-90c5-79b7896eea93"
version = "0.8.4"

[[deps.GeometryBasics]]
deps = ["EarCut_jll", "IterTools", "LinearAlgebra", "StaticArrays", "StructArrays", "Tables"]
git-tree-sha1 = "58bcdf5ebc057b085e58d95c138725628dd7453c"
uuid = "5c1252a2-5f33-56bf-86c9-59e7332b4326"
version = "0.4.1"

[[deps.Hyperscript]]
deps = ["Test"]
git-tree-sha1 = "8d511d5b81240fc8e6802386302675bdf47737b9"
uuid = "47d2ed2b-36de-50cf-bf87-49c2cf4b8b91"
version = "0.0.4"

[[deps.HypertextLiteral]]
git-tree-sha1 = "2b078b5a615c6c0396c77810d92ee8c6f470d238"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.3"

[[deps.IOCapture]]
deps = ["Logging", "Random"]
git-tree-sha1 = "f7be53659ab06ddc986428d3a9dcc95f6fa6705a"
uuid = "b5f81e59-6552-4d32-b1f0-c071b021bf89"
version = "0.2.2"

[[deps.InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[deps.Interpolations]]
deps = ["AxisAlgorithms", "ChainRulesCore", "LinearAlgebra", "OffsetArrays", "Random", "Ratios", "Requires", "SharedArrays", "SparseArrays", "StaticArrays", "WoodburyMatrices"]
git-tree-sha1 = "b15fc0a95c564ca2e0a7ae12c1f095ca848ceb31"
uuid = "a98d9a8b-a2ab-59e6-89dd-64a1c18fca59"
version = "0.13.5"

[[deps.InverseFunctions]]
deps = ["Test"]
git-tree-sha1 = "a7254c0acd8e62f1ac75ad24d5db43f5f19f3c65"
uuid = "3587e190-3f89-42d0-90ee-14403ec27112"
version = "0.1.2"

[[deps.IrrationalConstants]]
git-tree-sha1 = "7fd44fd4ff43fc60815f8e764c0f352b83c49151"
uuid = "92d709cd-6900-40b7-9082-c6be49f344b6"
version = "0.1.1"

[[deps.IterTools]]
git-tree-sha1 = "fa6287a4469f5e048d763df38279ee729fbd44e5"
uuid = "c8e1da08-722c-5040-9ed9-7db0dc04731e"
version = "1.4.0"

[[deps.IteratorInterfaceExtensions]]
git-tree-sha1 = "a3f24677c21f5bbe9d2a714f95dcd58337fb2856"
uuid = "82899510-4779-5014-852e-03e436cf321d"
version = "1.0.0"

[[deps.JLLWrappers]]
deps = ["Preferences"]
git-tree-sha1 = "abc9885a7ca2052a736a600f7fa66209f96506e1"
uuid = "692b3bcd-3c85-4b1f-b108-f13ce0eb3210"
version = "1.4.1"

[[deps.JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "3c837543ddb02250ef42f4738347454f95079d4e"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.3"

[[deps.LibCURL]]
deps = ["LibCURL_jll", "MozillaCACerts_jll"]
uuid = "b27032c2-a3e7-50c8-80cd-2d36dbcbfd21"

[[deps.LibCURL_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll", "Zlib_jll", "nghttp2_jll"]
uuid = "deac9b47-8bc7-5906-a0fe-35ac56dc84c0"

[[deps.LibGit2]]
deps = ["Base64", "NetworkOptions", "Printf", "SHA"]
uuid = "76f85450-5226-5b5a-8eaa-529ad045b433"

[[deps.LibSSH2_jll]]
deps = ["Artifacts", "Libdl", "MbedTLS_jll"]
uuid = "29816b5a-b9ab-546f-933c-edad1886dfa8"

[[deps.Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[deps.LinearAlgebra]]
deps = ["Libdl", "libblastrampoline_jll"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[deps.LogExpFunctions]]
deps = ["ChainRulesCore", "ChangesOfVariables", "DocStringExtensions", "InverseFunctions", "IrrationalConstants", "LinearAlgebra"]
git-tree-sha1 = "e5718a00af0ab9756305a0392832c8952c7426c1"
uuid = "2ab3a3ac-af41-5b50-aa03-7779005ae688"
version = "0.3.6"

[[deps.Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[deps.Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[deps.MbedTLS_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "c8ffd9c3-330d-5841-b78e-0817d7145fa1"

[[deps.Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[deps.MozillaCACerts_jll]]
uuid = "14a3606d-f60d-562e-9121-12d972cd8159"

[[deps.NaNMath]]
git-tree-sha1 = "b086b7ea07f8e38cf122f5016af580881ac914fe"
uuid = "77ba4419-2d1f-58cd-9bb1-8ffee604a2e3"
version = "0.3.7"

[[deps.NetworkOptions]]
uuid = "ca575930-c2e3-43a9-ace4-1e988b2c1908"

[[deps.OffsetArrays]]
deps = ["Adapt"]
git-tree-sha1 = "043017e0bdeff61cfbb7afeb558ab29536bbb5ed"
uuid = "6fe1bfb0-de20-5000-8ca7-80f57d26f881"
version = "1.10.8"

[[deps.OpenBLAS_jll]]
deps = ["Artifacts", "CompilerSupportLibraries_jll", "Libdl"]
uuid = "4536629a-c528-5b80-bd46-f80d51c5b363"

[[deps.OpenLibm_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "05823500-19ac-5b8b-9628-191a04bc5112"

[[deps.OpenSpecFun_jll]]
deps = ["Artifacts", "CompilerSupportLibraries_jll", "JLLWrappers", "Libdl", "Pkg"]
git-tree-sha1 = "13652491f6856acfd2db29360e1bbcd4565d04f1"
uuid = "efe28fd5-8261-553b-a9e1-b2916fc3738e"
version = "0.5.5+0"

[[deps.Parsers]]
deps = ["Dates"]
git-tree-sha1 = "13468f237353112a01b2d6b32f3d0f80219944aa"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.2.2"

[[deps.PenPlots]]
deps = ["Base64", "Colors", "GeometryBasics", "LinearAlgebra", "Random", "Rotations", "StaticArrays"]
git-tree-sha1 = "547aedc234db13379e3c9f9528a3ff8f1a232e9f"
repo-rev = "master"
repo-url = "https://github.com/paulgb/PenPlots.jl"
uuid = "61246389-3d51-4c70-b82d-266223a1b313"
version = "0.1.0"

[[deps.Pkg]]
deps = ["Artifacts", "Dates", "Downloads", "LibGit2", "Libdl", "Logging", "Markdown", "Printf", "REPL", "Random", "SHA", "Serialization", "TOML", "Tar", "UUIDs", "p7zip_jll"]
uuid = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"

[[deps.PlutoUI]]
deps = ["AbstractPlutoDingetjes", "Base64", "ColorTypes", "Dates", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "Markdown", "Random", "Reexport", "UUIDs"]
git-tree-sha1 = "8979e9802b4ac3d58c503a20f2824ad67f9074dd"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.34"

[[deps.Preferences]]
deps = ["TOML"]
git-tree-sha1 = "2cf929d64681236a2e074ffafb8d568733d2e6af"
uuid = "21216c6a-2e73-6563-6e65-726566657250"
version = "1.2.3"

[[deps.Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[deps.Profile]]
deps = ["Printf"]
uuid = "9abbd945-dff8-562f-b5e8-e1ebf5ef1b79"

[[deps.Quaternions]]
deps = ["DualNumbers", "LinearAlgebra"]
git-tree-sha1 = "adf644ef95a5e26c8774890a509a55b7791a139f"
uuid = "94ee1d12-ae83-5a48-8b1c-48b8ff168ae0"
version = "0.4.2"

[[deps.REPL]]
deps = ["InteractiveUtils", "Markdown", "Sockets", "Unicode"]
uuid = "3fa0cd96-eef1-5676-8a61-b3b8758bbffb"

[[deps.Random]]
deps = ["SHA", "Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[deps.Ratios]]
deps = ["Requires"]
git-tree-sha1 = "01d341f502250e81f6fec0afe662aa861392a3aa"
uuid = "c84ed2f1-dad5-54f0-aa8e-dbefe2724439"
version = "0.4.2"

[[deps.Reexport]]
git-tree-sha1 = "45e428421666073eab6f2da5c9d310d99bb12f9b"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.2.2"

[[deps.Requires]]
deps = ["UUIDs"]
git-tree-sha1 = "838a3a4188e2ded87a4f9f184b4b0d78a1e91cb7"
uuid = "ae029012-a4dd-5104-9daa-d747884805df"
version = "1.3.0"

[[deps.Rotations]]
deps = ["LinearAlgebra", "Quaternions", "Random", "StaticArrays", "Statistics"]
git-tree-sha1 = "405148000e80f70b31e7732ea93288aecb1793fa"
uuid = "6038ab10-8711-5258-84ad-4b1120ba62dc"
version = "1.2.0"

[[deps.SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"

[[deps.Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[deps.SharedArrays]]
deps = ["Distributed", "Mmap", "Random", "Serialization"]
uuid = "1a1011a3-84de-559e-8e89-a11a2f7dc383"

[[deps.Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[deps.SparseArrays]]
deps = ["LinearAlgebra", "Random"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"

[[deps.SpecialFunctions]]
deps = ["ChainRulesCore", "IrrationalConstants", "LogExpFunctions", "OpenLibm_jll", "OpenSpecFun_jll"]
git-tree-sha1 = "8d0c8e3d0ff211d9ff4a0c2307d876c99d10bdf1"
uuid = "276daf66-3868-5448-9aa4-cd146d93841b"
version = "2.1.2"

[[deps.StaticArrays]]
deps = ["LinearAlgebra", "Random", "Statistics"]
git-tree-sha1 = "a635a9333989a094bddc9f940c04c549cd66afcf"
uuid = "90137ffa-7385-5640-81b9-e52037218182"
version = "1.3.4"

[[deps.Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"

[[deps.StructArrays]]
deps = ["Adapt", "DataAPI", "StaticArrays", "Tables"]
git-tree-sha1 = "d21f2c564b21a202f4677c0fba5b5ee431058544"
uuid = "09ab397b-f2b6-538f-b94a-2f83cf4a842a"
version = "0.6.4"

[[deps.TOML]]
deps = ["Dates"]
uuid = "fa267f1f-6049-4f14-aa54-33bafae1ed76"

[[deps.TableTraits]]
deps = ["IteratorInterfaceExtensions"]
git-tree-sha1 = "c06b2f539df1c6efa794486abfb6ed2022561a39"
uuid = "3783bdb8-4a98-5b6b-af9a-565f29a5fe9c"
version = "1.0.1"

[[deps.Tables]]
deps = ["DataAPI", "DataValueInterfaces", "IteratorInterfaceExtensions", "LinearAlgebra", "TableTraits", "Test"]
git-tree-sha1 = "bb1064c9a84c52e277f1096cf41434b675cd368b"
uuid = "bd369af6-aec1-5ad0-b16a-f7cc5008161c"
version = "1.6.1"

[[deps.Tar]]
deps = ["ArgTools", "SHA"]
uuid = "a4e569a6-e804-4fa4-b0f3-eef7a1d5b13e"

[[deps.Test]]
deps = ["InteractiveUtils", "Logging", "Random", "Serialization"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[deps.Triangle_jll]]
deps = ["Artifacts", "JLLWrappers", "Libdl", "Pkg"]
git-tree-sha1 = "bfdd9ef1004eb9d407af935a6f36a4e0af711369"
uuid = "5639c1d2-226c-5e70-8d55-b3095415a16a"
version = "1.6.1+0"

[[deps.Triangulate]]
deps = ["DocStringExtensions", "Libdl", "Printf", "Test", "Triangle_jll"]
git-tree-sha1 = "0b011b75202d936d2f1af6215bf3b6cce26f2b7b"
uuid = "f7e6ffb2-c36d-4f8f-a77e-16e897189344"
version = "2.1.1"

[[deps.UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[deps.Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"

[[deps.WoodburyMatrices]]
deps = ["LinearAlgebra", "SparseArrays"]
git-tree-sha1 = "de67fa59e33ad156a590055375a30b23c40299d3"
uuid = "efce3f68-66dc-5838-9240-27a6d6f5f9b6"
version = "0.5.5"

[[deps.Zlib_jll]]
deps = ["Libdl"]
uuid = "83775a58-1f1d-513f-b197-d71354ab007a"

[[deps.libblastrampoline_jll]]
deps = ["Artifacts", "Libdl", "OpenBLAS_jll"]
uuid = "8e850b90-86db-534c-a0d3-1478176c7d93"

[[deps.nghttp2_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850ede-7688-5339-a07c-302acd2aaf8d"

[[deps.p7zip_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "3f19e933-33d8-53b3-aaab-bd5110c3b7a0"
"""

# ╔═╡ Cell order:
# ╠═d71c5ee2-f360-11ea-2753-a132fa41871a
# ╟─d1820c35-6acd-41fd-9138-ca37bdbb8126
# ╠═e9010ab3-cdb4-49f9-b2c3-705437ea5ebf
# ╠═17a6af91-6978-4878-af60-d619c44e6363
# ╠═c065248a-25cb-4f4b-a048-482344e80b7a
# ╠═034c5094-f107-4ed2-bd9d-b964b4ad669d
# ╠═4b89fc14-755d-4df3-a800-05c5a089b3db
# ╠═288decf2-88ca-4a74-bde0-7b39ddb7f88a
# ╠═6eb00ffe-9b67-4ad5-a00e-86d02f673664
# ╠═cff314d6-7e2d-42d7-b4ab-30b76cac82bc
# ╠═976d9aa3-bf54-4630-980b-bfa063a56819
# ╠═4c755e8a-3568-43a9-b730-aa1f3eea353c
# ╠═83fee9f6-106a-4ca7-b93f-15b9038cde8b
# ╠═a97e2c01-2245-479f-8d1f-bf660f23d767
# ╠═a223cf19-8dc7-4e74-8a30-48475b2c8196
# ╠═e4275a7e-a03d-4181-91e8-06361fc80d96
# ╠═00549702-11c7-49c0-a928-88251eb7d186
# ╠═84d06013-be32-4722-ab5b-61ff9ef84fbe
# ╠═bd7b2e9f-205f-4999-b6b7-288f448c70bf
# ╠═3027890b-196b-4a65-9f17-0180d21f6beb
# ╠═42b04181-4784-4906-b869-dea036f1afb7
# ╠═440e84f1-b479-4b63-a869-27d74930b08f
# ╟─19da2136-a5e4-476e-95a9-853960e3a50f
# ╟─8e4955bb-59cd-4f15-91af-c6ccf675f1b3
# ╟─5d1c8f91-f0b9-4a5d-9463-0438c57b271f
# ╠═ce02fd38-a690-426e-a10e-e768fc222981
# ╠═4ba3975c-a449-4c6d-8ef2-d3106f091efd
# ╠═f49f35fc-5005-4baf-be54-cb3a46fc2479
# ╠═17c2953f-96ff-409c-949e-561158bcf6c2
# ╠═f63083d5-eb82-4f65-8799-c2cc59385ab0
# ╠═fa475a5f-280d-4d80-ba1d-502ede1ce971
# ╠═90c00e90-13ba-4b32-a85c-d6fd5394164b
# ╠═d235e2f7-47c0-49e3-b000-1027413dd6a5
# ╠═9c72e77e-7cd3-4dc0-9e98-d2a4101329ac
# ╠═ebb7519b-97b9-4a24-bd43-dec89a93fab4
# ╠═28162e97-0166-45d4-b07d-0ecf228e9707
# ╠═6e23ba2a-ceff-411c-94c1-c16e293a5b9b
# ╠═61e0b87d-e07c-4e4e-a9e3-889dc865d0dd
# ╠═017246d7-756f-4e06-b5fb-eabe28c0683e
# ╠═d9f51e7e-bcab-4fbb-87ca-b5e7fd06bde4
# ╠═8407ef41-63ed-4cf6-a069-33010f1914cb
# ╠═ba23cd4b-9c51-4b3b-888f-e170fd4edbdd
# ╠═b294fc41-eb86-44dc-b608-96d538189a10
# ╠═21b0614e-ba9f-4301-a622-6f07fcb9583f
# ╠═84da64fc-a35e-45bf-bcdc-83a7f163621b
# ╠═abe6e1b4-ccf0-4abd-81c5-4f0b0df7fe94
# ╠═4c5f697c-6ec9-492f-9fda-03aa31ec7362
# ╠═dc30e200-edd3-457c-9cb9-56a34f6a112c
# ╠═264dad85-32a2-42f5-80b6-6644112ab8a1
# ╠═798f75b7-cfb9-4bf3-bb0c-9a8d063d1c9c
# ╠═2874c51f-bdee-4070-b129-a40d5f674a1a
# ╠═667feb4c-d64f-4cf3-b454-8612a09dfdb4
# ╠═f107a173-ebbb-45b9-967f-a99f010cb3fb
# ╠═d2a13df5-abed-4bde-b5b9-ccd1dd0818ba
# ╠═daaecfe6-f443-468b-a176-e631b75d5ddd
# ╠═e6d06f83-18d1-4bbe-8e12-15814316441b
# ╠═7021d17f-5710-4faf-a1cf-54b37ce0bbc7
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
