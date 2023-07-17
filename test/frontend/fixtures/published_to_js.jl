### A Pluto.jl notebook ###
# v0.19.27

using Markdown
using InteractiveUtils

# ╔═╡ 2d69377e-23f8-11ee-116b-fb6a8f328528
begin
	using Pkg
	Pkg.activate(temp=true)
	# the latest versions of these packages:
	Pkg.add(url="https://github.com/JuliaPluto/AbstractPlutoDingetjes.jl", rev="main")
	Pkg.add("HypertextLiteral")
end

# ╔═╡ 2ea26a4b-2d1e-4bcb-8b7b-cace79f7926a
begin
	using AbstractPlutoDingetjes.Display: published_to_js
	using HypertextLiteral
end

# ╔═╡ 043829fc-af3a-40b9-bb4f-f848ab50eb25
a = [1,2,3];

# ╔═╡ 2f4609fd-7361-4048-985a-2cc74bb25606
@htl """
<script>
const a = JSON.stringify($(published_to_js(a))) + " MAGIC!"
return html`<div id='to_cell_output'>\${a}</div>`
</script>
"""

# ╔═╡ 28eba9fd-0416-49b8-966e-03a381c19ca7
b = [4,5,6];

# ╔═╡ 0a4e8a19-6d43-4161-bb8c-1ebf8f8f68ba
@info @htl """
<script>
const a = JSON.stringify($(published_to_js(b))) + " MAGIC!"
return html`<div id='to_cell_log'>\${a}</div>`
</script>
"""

# ╔═╡ Cell order:
# ╠═2d69377e-23f8-11ee-116b-fb6a8f328528
# ╠═2ea26a4b-2d1e-4bcb-8b7b-cace79f7926a
# ╠═043829fc-af3a-40b9-bb4f-f848ab50eb25
# ╠═2f4609fd-7361-4048-985a-2cc74bb25606
# ╠═28eba9fd-0416-49b8-966e-03a381c19ca7
# ╠═0a4e8a19-6d43-4161-bb8c-1ebf8f8f68ba
