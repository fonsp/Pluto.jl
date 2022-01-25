### A Pluto.jl notebook ###
# v0.17.7

using Markdown
using InteractiveUtils

# ╔═╡ 03cbe047-96c6-456f-8adb-8d80390a1742
md"""
# ChildProcesses Benchmark

To run this you must be running ChildProcesses enabled Pluto (so you can `Distributed`)
"""

# ╔═╡ 8e626d50-b8a1-4353-9193-9297d91d6352
import Distributed

# ╔═╡ 808241a9-c7ea-4ca0-9a8b-74658c50a48a
import BenchmarkTools

# ╔═╡ 9b582916-0fd7-4024-9877-1014417c545e
# Act like you a package, quick!
ChildProcesses = @eval Main module ChildProcesses2
	include("../src/evaluation/ChildProcessesNotebook.jl")
end

# ╔═╡ f2e2a5de-57dd-4ae7-9860-efa693ef786a


# ╔═╡ 7a3e1cc4-b188-42f2-96c7-931f20ccfa34
expr_to_test = quote
	$(fill(1, 1000))
end

# ╔═╡ 1326fab3-c8ef-4b0d-a17e-36cbcb7a5275
md"## Distributed.remotecall_eval"

# ╔═╡ 3af58ffa-1d51-42b8-b70e-83a160011ede
let
	(pid,) = Distributed.addprocs(1)
	
	benchmark = BenchmarkTools.@benchmark begin
		Distributed.remotecall_eval(Main, [$pid], $expr_to_test)
	end

	Distributed.rmprocs([pid])
	benchmark
end

# ╔═╡ 0a632e40-73b2-4816-b846-089af80f76cc
md"## ChildProcesses.call"

# ╔═╡ 5c8e1389-94c3-4abc-a9fd-698e7013bcf6
let
	process = ChildProcesses.create_child_process()
	
	benchmark = BenchmarkTools.@benchmark begin
		ChildProcesses.call($process, $expr_to_test)
	end

	kill(process)
	benchmark
end

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
BenchmarkTools = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
Distributed = "8ba89e20-285c-5b6f-9357-94700520ee1b"

[compat]
BenchmarkTools = "~1.2.2"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[BenchmarkTools]]
deps = ["JSON", "Logging", "Printf", "Profile", "Statistics", "UUIDs"]
git-tree-sha1 = "940001114a0147b6e4d10624276d56d531dd9b49"
uuid = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
version = "1.2.2"

[[Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[Distributed]]
deps = ["Random", "Serialization", "Sockets"]
uuid = "8ba89e20-285c-5b6f-9357-94700520ee1b"

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

[[Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[Parsers]]
deps = ["Dates"]
git-tree-sha1 = "92f91ba9e5941fc781fecf5494ac1da87bdac775"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.2.0"

[[Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[Profile]]
deps = ["Printf"]
uuid = "9abbd945-dff8-562f-b5e8-e1ebf5ef1b79"

[[Random]]
deps = ["Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[SparseArrays]]
deps = ["LinearAlgebra", "Random"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"

[[Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"

[[UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"
"""

# ╔═╡ Cell order:
# ╠═03cbe047-96c6-456f-8adb-8d80390a1742
# ╠═8e626d50-b8a1-4353-9193-9297d91d6352
# ╠═808241a9-c7ea-4ca0-9a8b-74658c50a48a
# ╠═9b582916-0fd7-4024-9877-1014417c545e
# ╟─f2e2a5de-57dd-4ae7-9860-efa693ef786a
# ╠═7a3e1cc4-b188-42f2-96c7-931f20ccfa34
# ╟─1326fab3-c8ef-4b0d-a17e-36cbcb7a5275
# ╠═3af58ffa-1d51-42b8-b70e-83a160011ede
# ╟─0a632e40-73b2-4816-b846-089af80f76cc
# ╠═5c8e1389-94c3-4abc-a9fd-698e7013bcf6
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
