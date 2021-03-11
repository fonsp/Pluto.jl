### A Pluto.jl notebook ###
# v0.14.0

using Markdown
using InteractiveUtils

# ╔═╡ 0a94d493-b39e-494d-a07a-aad920932657
x = 123

# ╔═╡ d5b0b562-827c-11eb-1d30-73468d4d48ae
x

# ╔═╡ d4b68b5c-058b-4257-b04e-29560455657f
trigger(name::Symbol, value::Any) = put!(
	PlutoRunner.bond_triggers_channel, 
	Dict(
		"name" => name,
		"value" => value,
		))

# ╔═╡ 1fcff234-c9f7-4d9a-bc66-c7c1ea43a9b9
@async for i in 1:30
	trigger(:x, i)
end

# ╔═╡ Cell order:
# ╠═0a94d493-b39e-494d-a07a-aad920932657
# ╠═d5b0b562-827c-11eb-1d30-73468d4d48ae
# ╠═1fcff234-c9f7-4d9a-bc66-c7c1ea43a9b9
# ╠═d4b68b5c-058b-4257-b04e-29560455657f
