### A Pluto.jl notebook ###
# v0.19.29

using Markdown
using InteractiveUtils

# ╔═╡ e28131d9-9877-4b44-8213-9e6c041b5da5
md"""
one
"""

# ╔═╡ ef63b97e-700d-11ee-2997-7bf929019c2d
[[html"""
<div class="zo">
i should not be red
</div>

<x>two</x>

<div style="color: green;">safe</div>


<script>
window.I_DID_SOMETHING_DANGEROUS = true
return html`<div style="color: red;">DANGER</div>`
</script>


<style>
.zo {
	color: red;
}
</style>
"""]]

# ╔═╡ 99e2bfea-4e5d-4d94-bd96-77be7b04811d
html"three"

# ╔═╡ 76e68adf-16ab-4e88-a601-3177f34db6ec
122 + 1

# ╔═╡ 873d58c2-8590-4bb3-bf9c-596b1cdbe402
let
	stuff = html"""
four <script>
return html`<div style="color: red;">DANGER</div>`
</script>
"""
	@info stuff
end

# ╔═╡ 55c74b79-41a6-461e-99c4-a61994673824
modify me to make me safe

# ╔═╡ f5209e95-761d-4861-a00d-b7e33a1b3d69


# ╔═╡ Cell order:
# ╠═e28131d9-9877-4b44-8213-9e6c041b5da5
# ╠═ef63b97e-700d-11ee-2997-7bf929019c2d
# ╠═99e2bfea-4e5d-4d94-bd96-77be7b04811d
# ╠═76e68adf-16ab-4e88-a601-3177f34db6ec
# ╠═873d58c2-8590-4bb3-bf9c-596b1cdbe402
# ╠═55c74b79-41a6-461e-99c4-a61994673824
# ╠═f5209e95-761d-4861-a00d-b7e33a1b3d69
