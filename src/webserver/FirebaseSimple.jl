### A Pluto.jl notebook ###
# v0.12.11

using Markdown
using InteractiveUtils

# ╔═╡ d948dc6e-2de1-11eb-19e7-cb3bb66353b6
md"# Immer"

# ╔═╡ 3a99e22d-42d6-4b2d-9381-022b41b0e852
md"### wrappath"

# ╔═╡ aad7ab32-eecf-4aad-883d-1c802cad6c0c
md"### =="

# ╔═╡ f658a72d-871d-49b3-9b73-7efedafbd7a6
md"### convert(::Type{Dict}, ::JSONPatch)"

# ╔═╡ 921a130e-b028-4f91-b077-3bd79dcb6c6d
function force_convert_key(::Dict{T,<:Any}, value) where T
  T(value)
end

# ╔═╡ daf9ec12-2de1-11eb-3a8d-59d9c2753134
md"## Diff"

# ╔═╡ db116c0a-2de1-11eb-2a56-872af797c547
abstract type JSONPatch end

# ╔═╡ 73631aea-5e93-4da2-a32d-649029660d4e
Patches = Array{JSONPatch, 1}

# ╔═╡ 0fd3e910-abcc-4421-9d0b-5cfb90034338
NoChanges = Patches()

# ╔═╡ bd0d46bb-3e58-4522-bae0-83eb799196c4
PatchPath = AbstractVector{Any}

# ╔═╡ 831d84a6-1c71-4e68-8c7c-27d9093a82c4
function wrappath(path::PatchPath, patches::Vector{JSONPatch})
	map(patches) do patch
		wrappath(path, patch)
	end
end

# ╔═╡ db2d8a3e-2de1-11eb-02b8-9ffbfaeff61c
struct AddPatch <: JSONPatch
	path::PatchPath
	value::Any
end

# ╔═╡ 2ad11c73-4691-4283-8f98-3d2a87926b99
function wrappath(path, patch::AddPatch)
	AddPatch([path..., patch.path...], patch.value)
end

# ╔═╡ f649f67c-aab0-4d35-a799-f398e5f3ecc4
function Base.:(==)(a::AddPatch, b::AddPatch)
	a.value == b.value && a.path == b.path
end

# ╔═╡ 230bafe2-aaa7-48f0-9fd1-b53956281684
function Base.convert(::Type{Dict}, patch::AddPatch)
	Dict(:op => :add, :path => patch.path, :value => patch.value)
end

# ╔═╡ ffe9b3d9-8e35-4a31-bab2-8787a4140594
struct RemovePatch <: JSONPatch
	path::PatchPath
end

# ╔═╡ 5513ea3b-9498-426c-98cb-7dc23d32f72e
function wrappath(path, patch::RemovePatch)
	RemovePatch([path..., patch.path...])
end

# ╔═╡ 63087738-d70c-46f5-b072-21cd8953df35
function Base.:(==)(a::RemovePatch, b::RemovePatch)
	a.path == b.path
end

# ╔═╡ b48e2c08-a94a-4247-877d-949d92dde626
function Base.convert(::Type{Dict}, patch::RemovePatch)
	Dict(:op => :remove, :path => patch.path)
end

# ╔═╡ 894de8a7-2757-4d7a-a2be-1069fa872911
struct ReplacePatch <: JSONPatch
	path::PatchPath
	value::Any
end

# ╔═╡ 0c2d6da1-cad3-4c9f-93e9-922457083945
function wrappath(path, patch::ReplacePatch)
	ReplacePatch([path..., patch.path...], patch.value)
end

# ╔═╡ aa81974a-7254-45e0-9bfe-840c4793147f
function Base.:(==)(a::ReplacePatch, b::ReplacePatch)
	a.path == b.path && a.value == b.value
end

# ╔═╡ fafcb8b8-cde9-4f99-9bab-8128025953a4
function Base.convert(::Type{Dict}, patch::ReplacePatch)
	Dict(:op => :replace, :path => patch.path, :value => patch.value)
end

# ╔═╡ 07eeb122-6706-4544-a007-1c8d6581eec8
Base.convert(Dict, AddPatch([:x, :y], 10))

# ╔═╡ c59b30b9-f702-41f1-bb2e-1736c8cd5ede
Base.convert(Dict, RemovePatch([:x, :y]))

# ╔═╡ 7feeee3a-3aec-47ce-b8d7-74a0d9b0b381
Base.convert(Dict, ReplacePatch([:x, :y], 10))

# ╔═╡ 9a364714-edb1-4bca-9387-a8bbacccd10d
struct CopyPatch <: JSONPatch
	path::PatchPath
	from::PatchPath
end

# ╔═╡ 84c87031-7733-4d1f-aa90-f8ab71506251
function wrappath(path, patch::CopyPatch)
	CopyPatch([path..., patch.path...], patch.from)
end

# ╔═╡ 31188a03-76ba-40cf-a333-4d339ce37711
function Base.:(==)(a::CopyPatch, b::CopyPatch)
	a.path == b.path && a.from == b.from
end

# ╔═╡ 9321d3be-cb91-4406-9dc7-e5c38f7d377c
struct MovePatch <: JSONPatch
	path::PatchPath 
	from::PatchPath
end

# ╔═╡ 8f265a33-3a2d-4508-9477-ca62e8ce3c12
function wrappath(path, patch::MovePatch)
	MovePatch([path..., patch.path...], patch.from)
end

# ╔═╡ 7524a9e8-1a6d-4851-b50e-19415f25a84b
function Base.:(==)(a::MovePatch, b::MovePatch)
	a.path == b.path && a.from == b.from
end

# ╔═╡ db75df12-2de1-11eb-0726-d1995cebd382
function diff(old::T, new::T, comparedeep::Bool=false)::Patches where T
	if comparedeep == false
		if old == new
			# []
			NoChanges
		else
			[ReplacePatch([], new)]
		end
	else
# 		changes = filter(!isnothing, [
# 			atpath(
# 				[property], 
# 				diff(getproperty(old, property), getproperty(new, property))
# 			)
# 			for property
# 			in fieldnames(T)
# 		])

# 		if (
# 			!isempty(changes) &&
# 			changes isa AbstractArray &&
# 			all(x ->
# 				x isa AtPath &&
# 				x.value isa Change &&
# 				length(x.path) == 1
# 			, changes)
# 		)
# 			UpdateChange(changes)
# 		else
# 			changes
# 		end
		throw("Not now")
	end
end

# ╔═╡ db8ba47c-2de1-11eb-3775-c95eae15f759
# diff(old::Cell, new::Cell) = diff(old, new, old.id == new.id)

# ╔═╡ dbb0ba44-2de1-11eb-1c0c-61c9d8b50fde
# diff(old::Notebook, new::Notebook) = diff(old, new, old.id == new.id)

# ╔═╡ dbc7f97a-2de1-11eb-362f-055a734d1a9e
function diff(o1::AbstractDict, o2::AbstractDict)::Patches
	changes = []
	for key in keys(o1) ∪ keys(o2)
		for change in diff(get(o1, key, nothing), get(o2, key, nothing))
			push!(changes, wrappath([key], change))
		end
	end
	changes
end

# ╔═╡ 67ade214-2de3-11eb-291d-135a397d629b
function diff(o1, o2)::Patches
	[ReplacePatch([], o2)]
end

# ╔═╡ b8c58aa4-c24d-48a3-b2a8-7c01d50a3349
function diff(o1::Nothing, o2)::Patches
	[AddPatch([], o2)]
end

# ╔═╡ 5ab390f9-3b0c-4978-9e21-2aaa61db2ce4
function diff(o1, o2::Nothing)::Patches
	[RemovePatch([])]
end

# ╔═╡ 09f53db0-21ae-490b-86b5-414eba403d57
function diff(o1::Nothing, o2::Nothing)::Patches
	NoChanges
end

# ╔═╡ dd312598-2de1-11eb-144c-f92ed6484f5d
md"## Update"

# ╔═╡ d2af2a4b-8982-4e43-9fd7-0ecfdfb70511
STRICT = false

# ╔═╡ 48a45941-2489-4666-b4e5-88d3f82e5145
function getpath(value, path)
	if length(path) == 0
		return value
	end
	
	current = path[firstindex(path)]
	rest = path[firstindex(path)+1:lastindex(path)]
	if value isa AbstractDict
    key = force_convert_key(value, current)
		getpath(getindex(value, key), rest)
	else
		getpath(getproperty(value, Symbol(current)), rest)
	end
end

# ╔═╡ 752b2da3-ff24-4758-8843-186368069888
function update!(value, patches::Array{JSONPatch})
	for patch in patches
		update!(value, patch)
	end
	return value
end

# ╔═╡ 3e285076-1d97-4728-87cf-f71b22569e57
md"### update! AddPatch"

# ╔═╡ a11e4082-4ff4-4c1b-9c74-c8fa7dcceaa6
md"*Should throw in strict mode*"

# ╔═╡ dd87ca7e-2de1-11eb-2ec3-d5721c32f192
function update!(value, patch::AddPatch)
	if length(patch.path) == 0
		throw("Impossible")
	else
		last = patch.path[lastindex(patch.path)]
		rest = patch.path[firstindex(patch.path):lastindex(patch.path)-1]
		subvalue = getpath(value, rest)
		if subvalue isa AbstractDict
      key = force_convert_key(subvalue, last)
			if STRICT
				@assert get(subvalue, key, nothing) === nothing
			end
			subvalue[key] = patch.value
		else
      key = Symbol(last)
			if STRICT
				@assert getproperty(subvalue, key) === nothing
			end
			setproperty!(subvalue, key, patch.value)
		end
	end
	return value
end

# ╔═╡ be6b6fc4-e12a-4cef-81d8-d5115fda50b7
md"### update! ReplacePatch"

# ╔═╡ 6509d62e-77b6-499c-8dab-4a608e44720a
function update!(value, patch::ReplacePatch)
	if length(patch.path) == 0
		throw("Impossible")
	else
		last = patch.path[lastindex(patch.path)]
		rest = patch.path[firstindex(patch.path):lastindex(patch.path)-1]
		subvalue = getpath(value, rest)
		if subvalue isa AbstractDict
      key = force_convert_key(subvalue, last)
			if STRICT
				@assert get(subvalue, key, nothing) !== nothing
			end
			subvalue[key] = patch.value
		else
      key = Symbol(last)
			if STRICT
				@assert getproperty(subvalue, key) !== nothing
			end
			setproperty!(subvalue, key, patch.value)
		end
	end
	return value
end

# ╔═╡ f3ef354b-b480-4b48-8358-46dbf37e1d95
md"### update! RemovePatch"

# ╔═╡ ddaf5b66-2de1-11eb-3348-b905b94a984b
function update!(value, patch::RemovePatch)
	if length(patch.path) == 0
		throw("Impossible")
	else
		last = patch.path[lastindex(patch.path)]
		rest = patch.path[firstindex(patch.path):lastindex(patch.path)-1]
		subvalue = getpath(value, rest)
		if subvalue isa AbstractDict
      key = force_convert_key(subvalue, last)
			if STRICT
				@assert get(subvalue, key, nothing) !== nothing
			end
			delete!(subvalue, key)
		else
      key = Symbol(last)
			if STRICT
				@assert getproperty(subvalue, key) !== nothing
			end
			setproperty!(subvalue, key, nothing)
		end
	end
	return value
end

# ╔═╡ e55d1cea-2de1-11eb-0d0e-c95009eedc34
md"## Testing"

# ╔═╡ e598832a-2de1-11eb-3831-371aa2e54828
abstract type TestResult end

# ╔═╡ e5b46afe-2de1-11eb-0de5-6d571c0fbbcf
const Code = Any

# ╔═╡ e5dbaf38-2de1-11eb-13a9-a994ac40bf9f
struct Pass <: TestResult
	expr::Code
end

# ╔═╡ e616c708-2de1-11eb-2e66-f972030a7ec5
abstract type Fail <: TestResult end

# ╔═╡ e6501fda-2de1-11eb-33ba-4bb34dc13d00
struct Wrong <: Fail
	expr::Code
	result
end

# ╔═╡ e66c8454-2de1-11eb-1d79-499e6873d0d2
struct Error <: Fail
	expr::Code
	error
end

# ╔═╡ e699ae9a-2de1-11eb-3ff0-c31222ac399e
function Base.show(io::IO, mime::MIME"text/html", value::Pass)
	show(io, mime, HTML("""
		<div
			style="
				display: flex;
				flex-direction: row;
				align-items: center;
				/*background-color: rgb(208, 255, 209)*/
			"
		>
			<div
				style="
					width: 12px;
					height: 12px;
					border-radius: 50%;
					background-color: green;
				"
			></div>
			<div style="min-width: 12px"></div>
			<code
				class="language-julia"
				style="
					flex: 1;
					background-color: transparent;
					filter: grayscale(1) brightness(0.8);
				"
			>$(value.expr)</code>
		</div>
	"""))
end

# ╔═╡ e6c17fae-2de1-11eb-1397-1b1cdfcc387c
function Base.show(io::IO, mime::MIME"text/html", value::Wrong)
	show(io, mime, HTML("""
		<div
			style="
				display: flex;
				flex-direction: row;
				align-items: center;
				/*background-color: rgb(208, 255, 209)*/
			"
		>
			<div
				style="
					width: 12px;
					height: 12px;
					border-radius: 50%;
					background-color: red;
				"
			></div>
			<div style="min-width: 12px"></div>
			<code
				class="language-julia"
				style="
					flex: 1;
					background-color: transparent;
					filter: grayscale(1) brightness(0.8);
				"
			>$(value.expr)</code>
		</div>
	"""))
end

# ╔═╡ e705bd90-2de1-11eb-3759-3d59a90e6e44
function Base.show(io::IO, mime::MIME"text/html", value::Error)
	show(io, mime, HTML("""
		<div
			style="
				display: flex;
				flex-direction: row;
				align-items: center;
				/*background-color: rgb(208, 255, 209)*/
			"
		>
			<div
				style="
					width: 12px;
					height: 12px;
					border-radius: 50%;
					background-color: red;
				"
			></div>
			<div style="width: 12px"></div>
			<div>
				<code
					class="language-julia"
					style="
						background-color: transparent;
						filter: grayscale(1) brightness(0.8);
					"
				>$(value.expr)</code>
				<div style="
					font-family: monospace;
					font-size: 12px;
					color: red;
					padding-left: 8px;
				">Error: $(value.error)</div>
			</div>
			
		</div>
	"""))
end

# ╔═╡ e748600a-2de1-11eb-24be-d5f0ecab8fa4
macro test(expr)	
	quote				
		expr_raw = $(expr |> QuoteNode)
		try
			result = $(esc(expr))
			if result == true
				Pass(expr_raw)
			else
				Wrong(expr_raw, result)
			end
		catch e
			Error(expr_raw, e)
		end
		
		# Base.@locals()
	end
end

# ╔═╡ c3e4738f-4568-4910-a211-6a46a9d447ee
@test update!(Dict(:y => "x"), AddPatch([:x], "-")) == Dict(:y => "x", :x => "-")

# ╔═╡ 0f094932-10e5-40f9-a3fc-db27a85b4999
@test update!(Dict(:x => "x"), AddPatch([:x], "-")) == Dict(:x => "-")

# ╔═╡ a560fdca-ee12-469c-bda5-62d7203235b8
@test update!(Dict(:x => "x"), ReplacePatch([:x], "-")) == Dict(:x => "-")

# ╔═╡ 01e3417e-334e-4a8d-b086-4bddc42737b3
@test update!(Dict(:y => "x"), ReplacePatch([:x], "-")) == Dict(:x => "-", :y => "x")

# ╔═╡ 96a80a23-7c56-4c41-b489-15bc1c4e3700
@test update!(Dict(:x => "x"), RemovePatch([:x])) == Dict()

# ╔═╡ fac65755-2a2a-4a3c-b5a8-fc4f6d256754
@test update!(Dict(:y => "x"), RemovePatch([:x])) == Dict(:y => "x")

# ╔═╡ e8d0c98a-2de1-11eb-37b9-e1df3f5cfa25
md"## DisplayOnly"

# ╔═╡ e907d862-2de1-11eb-11a9-4b3ac37cb0f3
function displayonly(m::Module)
	if isdefined(m, :PlutoForceDisplay)
		return m.PlutoForceDisplay
	else
		isdefined(m, :PlutoRunner) && parentmodule(m) == Main
	end
end

# ╔═╡ e924a0be-2de1-11eb-2170-71d56e117af2
"""
	@displayonly expression

Marks a expression as Pluto-only,
this won't be executed when running outside Pluto.
"""
macro displayonly(ex) displayonly(__module__) ? esc(ex) : nothing end

# ╔═╡ 664cd334-91c7-40dd-a2bf-0da720307cfc
@displayonly notebook1 = Dict(
	:x => 1,
	:y => 2,
)

# ╔═╡ e7e8d076-2de1-11eb-0214-8160bb81370a
@test notebook1 == deepcopy(notebook1)

# ╔═╡ b7fa5625-6178-4da8-a889-cd4f014f43ba
@displayonly notebook2 = Dict(
	:y => 4,
	:z => 5
)

# ╔═╡ dbdd1df0-2de1-11eb-152f-8d1af1ad02fe
@displayonly notebook1_to_notebook2 = diff(notebook1, notebook2)

# ╔═╡ e78b7408-2de1-11eb-2f1a-3f0783049c7d
@test to_jsonpatch(flatten(notebook1_to_notebook2)) == test_jsonpatch

# ╔═╡ e7c85c1c-2de1-11eb-1a2a-65f8f21e4a05
@test update(notebook1, from_jsonpatch(to_jsonpatch(notebook1_to_notebook2))) == notebook2

# ╔═╡ 595fdfd4-3960-4fbd-956c-509c4cf03473
@displayonly @test update!(deepcopy(notebook1), notebook1_to_notebook2) == notebook2

# ╔═╡ e9d2eba8-2de1-11eb-16bf-bd2a16537a97
@displayonly x = 2

# ╔═╡ ea45104e-2de1-11eb-3248-5dd833d350e4
@displayonly @test 1 + 1 == x

# ╔═╡ ea6650bc-2de1-11eb-3016-4542c5c333a5
@displayonly @test 1 + 1 + 1 == x

# ╔═╡ ea934d9c-2de1-11eb-3f1d-3b60465decde
@displayonly @test throw("Oh my god") == x

# ╔═╡ Cell order:
# ╟─d948dc6e-2de1-11eb-19e7-cb3bb66353b6
# ╟─3a99e22d-42d6-4b2d-9381-022b41b0e852
# ╟─831d84a6-1c71-4e68-8c7c-27d9093a82c4
# ╟─2ad11c73-4691-4283-8f98-3d2a87926b99
# ╟─5513ea3b-9498-426c-98cb-7dc23d32f72e
# ╟─0c2d6da1-cad3-4c9f-93e9-922457083945
# ╟─84c87031-7733-4d1f-aa90-f8ab71506251
# ╟─8f265a33-3a2d-4508-9477-ca62e8ce3c12
# ╟─aad7ab32-eecf-4aad-883d-1c802cad6c0c
# ╟─f649f67c-aab0-4d35-a799-f398e5f3ecc4
# ╟─63087738-d70c-46f5-b072-21cd8953df35
# ╟─aa81974a-7254-45e0-9bfe-840c4793147f
# ╟─31188a03-76ba-40cf-a333-4d339ce37711
# ╟─7524a9e8-1a6d-4851-b50e-19415f25a84b
# ╟─f658a72d-871d-49b3-9b73-7efedafbd7a6
# ╟─07eeb122-6706-4544-a007-1c8d6581eec8
# ╠═230bafe2-aaa7-48f0-9fd1-b53956281684
# ╟─c59b30b9-f702-41f1-bb2e-1736c8cd5ede
# ╠═b48e2c08-a94a-4247-877d-949d92dde626
# ╟─7feeee3a-3aec-47ce-b8d7-74a0d9b0b381
# ╠═fafcb8b8-cde9-4f99-9bab-8128025953a4
# ╠═921a130e-b028-4f91-b077-3bd79dcb6c6d
# ╟─daf9ec12-2de1-11eb-3a8d-59d9c2753134
# ╟─0fd3e910-abcc-4421-9d0b-5cfb90034338
# ╠═db116c0a-2de1-11eb-2a56-872af797c547
# ╟─73631aea-5e93-4da2-a32d-649029660d4e
# ╟─bd0d46bb-3e58-4522-bae0-83eb799196c4
# ╠═db2d8a3e-2de1-11eb-02b8-9ffbfaeff61c
# ╠═ffe9b3d9-8e35-4a31-bab2-8787a4140594
# ╠═894de8a7-2757-4d7a-a2be-1069fa872911
# ╠═9a364714-edb1-4bca-9387-a8bbacccd10d
# ╠═9321d3be-cb91-4406-9dc7-e5c38f7d377c
# ╟─db75df12-2de1-11eb-0726-d1995cebd382
# ╠═db8ba47c-2de1-11eb-3775-c95eae15f759
# ╠═dbb0ba44-2de1-11eb-1c0c-61c9d8b50fde
# ╠═dbc7f97a-2de1-11eb-362f-055a734d1a9e
# ╠═67ade214-2de3-11eb-291d-135a397d629b
# ╠═b8c58aa4-c24d-48a3-b2a8-7c01d50a3349
# ╠═5ab390f9-3b0c-4978-9e21-2aaa61db2ce4
# ╠═09f53db0-21ae-490b-86b5-414eba403d57
# ╟─664cd334-91c7-40dd-a2bf-0da720307cfc
# ╟─b7fa5625-6178-4da8-a889-cd4f014f43ba
# ╟─dbdd1df0-2de1-11eb-152f-8d1af1ad02fe
# ╠═595fdfd4-3960-4fbd-956c-509c4cf03473
# ╟─dd312598-2de1-11eb-144c-f92ed6484f5d
# ╠═d2af2a4b-8982-4e43-9fd7-0ecfdfb70511
# ╟─48a45941-2489-4666-b4e5-88d3f82e5145
# ╟─752b2da3-ff24-4758-8843-186368069888
# ╟─3e285076-1d97-4728-87cf-f71b22569e57
# ╟─c3e4738f-4568-4910-a211-6a46a9d447ee
# ╟─a11e4082-4ff4-4c1b-9c74-c8fa7dcceaa6
# ╟─0f094932-10e5-40f9-a3fc-db27a85b4999
# ╟─dd87ca7e-2de1-11eb-2ec3-d5721c32f192
# ╟─be6b6fc4-e12a-4cef-81d8-d5115fda50b7
# ╟─a560fdca-ee12-469c-bda5-62d7203235b8
# ╟─01e3417e-334e-4a8d-b086-4bddc42737b3
# ╟─6509d62e-77b6-499c-8dab-4a608e44720a
# ╟─f3ef354b-b480-4b48-8358-46dbf37e1d95
# ╠═96a80a23-7c56-4c41-b489-15bc1c4e3700
# ╠═fac65755-2a2a-4a3c-b5a8-fc4f6d256754
# ╟─ddaf5b66-2de1-11eb-3348-b905b94a984b
# ╟─e55d1cea-2de1-11eb-0d0e-c95009eedc34
# ╟─e598832a-2de1-11eb-3831-371aa2e54828
# ╟─e5b46afe-2de1-11eb-0de5-6d571c0fbbcf
# ╟─e5dbaf38-2de1-11eb-13a9-a994ac40bf9f
# ╟─e616c708-2de1-11eb-2e66-f972030a7ec5
# ╟─e6501fda-2de1-11eb-33ba-4bb34dc13d00
# ╟─e66c8454-2de1-11eb-1d79-499e6873d0d2
# ╟─e699ae9a-2de1-11eb-3ff0-c31222ac399e
# ╟─e6c17fae-2de1-11eb-1397-1b1cdfcc387c
# ╟─e705bd90-2de1-11eb-3759-3d59a90e6e44
# ╟─e748600a-2de1-11eb-24be-d5f0ecab8fa4
# ╟─e78b7408-2de1-11eb-2f1a-3f0783049c7d
# ╟─e7c85c1c-2de1-11eb-1a2a-65f8f21e4a05
# ╟─e7e8d076-2de1-11eb-0214-8160bb81370a
# ╟─e8d0c98a-2de1-11eb-37b9-e1df3f5cfa25
# ╟─e907d862-2de1-11eb-11a9-4b3ac37cb0f3
# ╟─e924a0be-2de1-11eb-2170-71d56e117af2
# ╟─e9d2eba8-2de1-11eb-16bf-bd2a16537a97
# ╟─ea45104e-2de1-11eb-3248-5dd833d350e4
# ╟─ea6650bc-2de1-11eb-3016-4542c5c333a5
# ╟─ea934d9c-2de1-11eb-3f1d-3b60465decde
