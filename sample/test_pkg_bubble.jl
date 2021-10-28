### A Pluto.jl notebook ###
# v0.16.4

using Markdown
using InteractiveUtils

# ╔═╡ f7dfc33e-6ff8-44d6-a88e-bea5834a9d27
import A1
using A2

# ╔═╡ 360ee541-cbc4-4df6-bdc5-ea23fe08abdd
import A1, B1, .C1, D1.E1
using A2, B2, .C2, D2.E2

# ╔═╡ 8a4eff2d-5dbc-4056-a81b-da0618503467
import A1: b1, c1
using A2: b2, c2

# ╔═╡ 393a7816-0fa0-4f74-8fe7-c8d8d8c7e868
import A1.B1: b1, c1
using A2.B2: b2, c2

# ╔═╡ c1b5da89-c9a3-439c-8bee-2a8690265796
import .A1
using .A2

# ╔═╡ daf52b3f-513c-45de-a232-bda50e45b326
import .A1: x1
using .A2: x2

# ╔═╡ 6a90ece9-e7ad-404e-a3b0-4d484821f461
import ..A1
using ..A2

# ╔═╡ 4206dd87-a9e9-4f2c-865f-bec68d199b55
import A1.B1
using A2.B2

# ╔═╡ eb7ba436-d23b-4e97-af92-81271fa76989
import A1.B1.C1
using A2.B2.C2

# ╔═╡ 4f1d3da9-370c-42c2-9d17-a3caffca638d
import A1.B1.C1.D1
using A2.B2.C2.D2

# ╔═╡ Cell order:
# ╠═f7dfc33e-6ff8-44d6-a88e-bea5834a9d27
# ╠═360ee541-cbc4-4df6-bdc5-ea23fe08abdd
# ╠═8a4eff2d-5dbc-4056-a81b-da0618503467
# ╠═393a7816-0fa0-4f74-8fe7-c8d8d8c7e868
# ╠═c1b5da89-c9a3-439c-8bee-2a8690265796
# ╠═daf52b3f-513c-45de-a232-bda50e45b326
# ╠═6a90ece9-e7ad-404e-a3b0-4d484821f461
# ╠═4206dd87-a9e9-4f2c-865f-bec68d199b55
# ╠═eb7ba436-d23b-4e97-af92-81271fa76989
# ╠═4f1d3da9-370c-42c2-9d17-a3caffca638d
