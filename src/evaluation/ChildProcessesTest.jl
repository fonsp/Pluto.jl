### A Pluto.jl notebook ###
# v0.17.7

using Markdown
using InteractiveUtils

# ╔═╡ ed5616e7-2126-4393-b192-764ca6c053fa
ChildProcesses = let
	include("./ChildProcesses.jl")
end

# ╔═╡ 6ff77f91-ee9c-407c-a243-09fc7e555d73
function with_process(fn)
	process = ChildProcesses.create_child_process()
	try
		fn(process)
	finally
		close(process)
	end
end

# ╔═╡ 730cfe5e-1541-4c08-8d4a-86d1f9e4115e
with_process() do process
	@info "hiiii"
	ChildProcesses.call(process, :(1 + 1))
end

# ╔═╡ 6ab96c70-ad5d-4614-9a77-2d44d1085567
# with_process() do process
# 	ChildProcesses.call(process, :(1 + 1))
# end

# ╔═╡ de602aaa-704c-45c4-8b7b-fc58e41236ce
begin
	struct FakeProcess <: Base.AbstractPipe
		in::IO
		out::IO
	end
	eval(:(Base.process_running(::FakeProcess) = true))
	eval(:(Base.pipe_writer(process::FakeProcess) = process.in))
	eval(:(Base.pipe_reader(process::FakeProcess) = process.out))
end

# ╔═╡ 49fdc8a3-0e1a-42f0-acc4-b823eec91d31
md"---"

# ╔═╡ 95c5a5bc-db23-4ad3-8ae8-81bc8f0edfd4
import BenchmarkTools

# ╔═╡ ced9d1e9-7075-4ff2-8ca2-6a349f2a69c4
# let
# 	stream = PipeBuffer()
# 	BenchmarkTools.@benchmark begin
# 		input = Dict(:x => 1)
# 		ChildProcesses.send_message($stream, ChildProcesses.to_binary(input))
# 		output = ChildProcesses.from_binary(ChildProcesses.read_message($stream))
		
# 		if input != output
# 			throw("Waoh, input and output should match but didn't!")
# 		end
# 	end
# end

# ╔═╡ 4baac7f2-60fe-4a6f-8612-2acf80c43ef3
let
	process = ChildProcesses.create_child_process()
	
	benchmark = BenchmarkTools.@benchmark begin
		ChildProcesses.call($process, :(1 + 1))
	end

	kill(process)
	
	benchmark
end

# ╔═╡ ae150877-7ea7-4049-ae7b-7ada459731ad
md"""# Appendix"""

# ╔═╡ be18d157-6b55-4eaa-99fe-c398e992a9fa
md"### @task_result"

# ╔═╡ 12578b59-0161-4e72-afef-825166a62121
struct Pending end

# ╔═╡ 34d90560-5a3e-4c7f-8126-35e1a6153aa1
struct Result value end

# ╔═╡ 83540498-f317-4d8b-8dc6-80a93247b3b2
struct Failure error end

# ╔═╡ a5d0660b-1bed-4623-950d-3b58fe9fec4b
md"""### Imports"""

# ╔═╡ 7e613bd2-616a-4687-8af5-a22c7a747d97
import Serialization

# ╔═╡ d30e1e1b-fa6f-4fbc-bccb-1fcfc7b829df
import UUIDs: UUID, uuid4

# ╔═╡ f7d14367-27d7-41a5-9f6a-79cf5e721a7d
import PlutoUI

# ╔═╡ fe669218-18c3-46c7-80e8-7b1ab6fa77d2
import PlutoLinks: @ingredients, @use_task

# ╔═╡ f9675ee0-e728-420b-81bd-22e57583c587
import PlutoHooks: @use_effect, @use_ref, @use_state, @use_memo

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
BenchmarkTools = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
PlutoHooks = "0ff47ea0-7a50-410d-8455-4348d5de0774"
PlutoLinks = "0ff47ea0-7a50-410d-8455-4348d5de0420"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
Serialization = "9e88b42a-f829-5b0c-bbe9-9e923198166b"
UUIDs = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[compat]
BenchmarkTools = "~1.2.0"
PlutoHooks = "~0.0.3"
PlutoLinks = "~0.1.1"
PlutoUI = "~0.7.16"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[BenchmarkTools]]
deps = ["JSON", "Logging", "Printf", "Profile", "Statistics", "UUIDs"]
git-tree-sha1 = "61adeb0823084487000600ef8b1c00cc2474cd47"
uuid = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
version = "1.2.0"

[[Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[FileWatching]]
uuid = "7b1f6079-737a-58dc-b8bc-7a2ca5c1b5ee"

[[Hyperscript]]
deps = ["Test"]
git-tree-sha1 = "8d511d5b81240fc8e6802386302675bdf47737b9"
uuid = "47d2ed2b-36de-50cf-bf87-49c2cf4b8b91"
version = "0.0.4"

[[HypertextLiteral]]
git-tree-sha1 = "5efcf53d798efede8fee5b2c8b09284be359bf24"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.2"

[[IOCapture]]
deps = ["Logging", "Random"]
git-tree-sha1 = "f7be53659ab06ddc986428d3a9dcc95f6fa6705a"
uuid = "b5f81e59-6552-4d32-b1f0-c071b021bf89"
version = "0.2.2"

[[InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "8076680b162ada2a031f707ac7b4953e30667a37"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.2"

[[Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[LinearAlgebra]]
deps = ["Libdl"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[Parsers]]
deps = ["Dates"]
git-tree-sha1 = "d911b6a12ba974dabe2291c6d450094a7226b372"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.1.1"

[[PlutoHooks]]
deps = ["FileWatching", "InteractiveUtils", "Markdown", "UUIDs"]
git-tree-sha1 = "f297787f7d7507dada25f6769fe3f08f6b9b8b12"
uuid = "0ff47ea0-7a50-410d-8455-4348d5de0774"
version = "0.0.3"

[[PlutoLinks]]
deps = ["FileWatching", "InteractiveUtils", "Markdown", "PlutoHooks", "UUIDs"]
git-tree-sha1 = "5f45fc68dd9eb422358a8008e3fb8df3c01d8ab8"
uuid = "0ff47ea0-7a50-410d-8455-4348d5de0420"
version = "0.1.1"

[[PlutoUI]]
deps = ["Base64", "Dates", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "Markdown", "Random", "Reexport", "UUIDs"]
git-tree-sha1 = "4c8a7d080daca18545c56f1cac28710c362478f3"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.16"

[[Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[Profile]]
deps = ["Printf"]
uuid = "9abbd945-dff8-562f-b5e8-e1ebf5ef1b79"

[[Random]]
deps = ["Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[Reexport]]
git-tree-sha1 = "45e428421666073eab6f2da5c9d310d99bb12f9b"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.2.2"

[[SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[SparseArrays]]
deps = ["LinearAlgebra", "Random"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"

[[Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"

[[Test]]
deps = ["InteractiveUtils", "Logging", "Random", "Serialization"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"
"""

# ╔═╡ Cell order:
# ╠═730cfe5e-1541-4c08-8d4a-86d1f9e4115e
# ╠═ed5616e7-2126-4393-b192-764ca6c053fa
# ╠═6ff77f91-ee9c-407c-a243-09fc7e555d73
# ╠═6ab96c70-ad5d-4614-9a77-2d44d1085567
# ╠═de602aaa-704c-45c4-8b7b-fc58e41236ce
# ╟─49fdc8a3-0e1a-42f0-acc4-b823eec91d31
# ╠═95c5a5bc-db23-4ad3-8ae8-81bc8f0edfd4
# ╠═ced9d1e9-7075-4ff2-8ca2-6a349f2a69c4
# ╠═4baac7f2-60fe-4a6f-8612-2acf80c43ef3
# ╠═ae150877-7ea7-4049-ae7b-7ada459731ad
# ╟─be18d157-6b55-4eaa-99fe-c398e992a9fa
# ╠═12578b59-0161-4e72-afef-825166a62121
# ╠═34d90560-5a3e-4c7f-8126-35e1a6153aa1
# ╠═83540498-f317-4d8b-8dc6-80a93247b3b2
# ╟─a5d0660b-1bed-4623-950d-3b58fe9fec4b
# ╠═7e613bd2-616a-4687-8af5-a22c7a747d97
# ╠═d30e1e1b-fa6f-4fbc-bccb-1fcfc7b829df
# ╠═f7d14367-27d7-41a5-9f6a-79cf5e721a7d
# ╠═fe669218-18c3-46c7-80e8-7b1ab6fa77d2
# ╠═f9675ee0-e728-420b-81bd-22e57583c587
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
