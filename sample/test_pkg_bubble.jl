### A Pluto.jl notebook ###
# v0.17.5

using Markdown
using InteractiveUtils

# ╔═╡ f16ef748-7c86-11ec-10a5-830de8dd2a2e
md"""
# Package Managment AST tests

- `Random` or `Downloads` indicates the name should be parsed as package name
- Single letter names are for everything that shouldn't be parsed
- Random `Base` thrown in to make sure it is not parsed
"""

# ╔═╡ e99b72b2-8939-430c-b8b3-25155559e7dc
macro >(expr) end

# ╔═╡ e7f324d7-e4b0-498a-a8a2-f94f52a9453d
@> using Random

# ╔═╡ fb917588-1499-433b-aeba-e6833346c968
@> using Random: a as x

# ╔═╡ d4f1ec8b-7597-45bf-9cea-4770802d516b
@> using Random.A.B

# ╔═╡ a68c8859-d7dd-4e8d-9996-f81216b84355
@> using Random.B.C: X

# ╔═╡ 589ee4e7-8fec-424a-82f7-cf0a700bf20a
@> using .A.B.C: X

# ╔═╡ 5e9f4f30-39f5-4c1d-b94d-4d937d37c47f
@> using Random.B.C, Downloads.K

# ╔═╡ 55449e27-c8db-4593-bc3b-0011179c6b20
@> import Random

# ╔═╡ 91b12b1c-1590-421e-8904-6b728bbf004d
@> import Base

# ╔═╡ 9d42b339-f64d-4ce8-b765-0ebd060dec55
@> import Random: a, b

# ╔═╡ d555a75d-eed6-4cb8-82a0-53f84ceb982a
@> import Random: A as Z

# ╔═╡ db8041c4-645c-4af9-8d33-aa4dfd45ea5f
@> import Random as X, Downloads as Y, .A

# ╔═╡ 42a5bed8-c761-4e9d-907d-25d49157647b
@> import Random, Base, .A as X

# ╔═╡ 7c4496e7-5b21-4748-9877-bff4a7ae5752
@> import .A: X, Y

# ╔═╡ 04faa311-541d-44c7-a189-e390c5cbdef9
@> import .A

# ╔═╡ 3490d653-47da-4cea-939e-076ad38558d7
@> import .A as X, ..A as Y

# ╔═╡ 1fc087ca-70b3-43d2-8793-70131227329f
@> import ..A

# ╔═╡ 7150f6b7-aa4f-44bf-a751-9c34c4a1c981
md"---"

# ╔═╡ b371f04d-0a89-4aa9-a03a-7c903270fd20
md"---"

# ╔═╡ 3749489b-49d3-4187-a2f6-1dddc0e97f92
@> import Random as 

# ╔═╡ ed56bd75-8d7d-45ec-a3f9-c440141f7633
@> import NotExisting

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Downloads = "f43a241f-c20a-4ad4-852c-f6b1247861c6"
Random = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[ArgTools]]
uuid = "0dad84c5-d112-42e6-8d28-ef12dabb789f"

[[Artifacts]]
uuid = "56f22d72-fd6d-98f1-02f0-08ddc0907c33"

[[Downloads]]
deps = ["ArgTools", "LibCURL", "NetworkOptions"]
uuid = "f43a241f-c20a-4ad4-852c-f6b1247861c6"

[[LibCURL]]
deps = ["LibCURL_jll", "MozillaCACerts_jll"]
uuid = "b27032c2-a3e7-50c8-80cd-2d36dbcbfd21"

[[LibCURL_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll", "Zlib_jll", "nghttp2_jll"]
uuid = "deac9b47-8bc7-5906-a0fe-35ac56dc84c0"

[[LibSSH2_jll]]
deps = ["Artifacts", "Libdl", "MbedTLS_jll"]
uuid = "29816b5a-b9ab-546f-933c-edad1886dfa8"

[[Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[MbedTLS_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "c8ffd9c3-330d-5841-b78e-0817d7145fa1"

[[MozillaCACerts_jll]]
uuid = "14a3606d-f60d-562e-9121-12d972cd8159"

[[NetworkOptions]]
uuid = "ca575930-c2e3-43a9-ace4-1e988b2c1908"

[[Random]]
deps = ["Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[Zlib_jll]]
deps = ["Libdl"]
uuid = "83775a58-1f1d-513f-b197-d71354ab007a"

[[nghttp2_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850ede-7688-5339-a07c-302acd2aaf8d"
"""

# ╔═╡ Cell order:
# ╟─f16ef748-7c86-11ec-10a5-830de8dd2a2e
# ╟─e99b72b2-8939-430c-b8b3-25155559e7dc
# ╠═55449e27-c8db-4593-bc3b-0011179c6b20
# ╠═9d42b339-f64d-4ce8-b765-0ebd060dec55
# ╠═d555a75d-eed6-4cb8-82a0-53f84ceb982a
# ╠═db8041c4-645c-4af9-8d33-aa4dfd45ea5f
# ╠═42a5bed8-c761-4e9d-907d-25d49157647b
# ╠═7c4496e7-5b21-4748-9877-bff4a7ae5752
# ╠═04faa311-541d-44c7-a189-e390c5cbdef9
# ╠═3490d653-47da-4cea-939e-076ad38558d7
# ╠═1fc087ca-70b3-43d2-8793-70131227329f
# ╟─7150f6b7-aa4f-44bf-a751-9c34c4a1c981
# ╠═e7f324d7-e4b0-498a-a8a2-f94f52a9453d
# ╠═fb917588-1499-433b-aeba-e6833346c968
# ╠═d4f1ec8b-7597-45bf-9cea-4770802d516b
# ╠═a68c8859-d7dd-4e8d-9996-f81216b84355
# ╠═589ee4e7-8fec-424a-82f7-cf0a700bf20a
# ╠═5e9f4f30-39f5-4c1d-b94d-4d937d37c47f
# ╟─b371f04d-0a89-4aa9-a03a-7c903270fd20
# ╠═3749489b-49d3-4187-a2f6-1dddc0e97f92
# ╠═ed56bd75-8d7d-45ec-a3f9-c440141f7633
# ╠═91b12b1c-1590-421e-8904-6b728bbf004d
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002