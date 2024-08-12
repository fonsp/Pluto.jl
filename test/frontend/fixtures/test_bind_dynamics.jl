### A Pluto.jl notebook ###
# v0.19.45

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

# ╔═╡ a0fe4e4d-eee5-4420-bd58-3f12749a9ed1
@bind reset_xs html"<input id=reset_xs_button type=button value=reset_xs>"

# ╔═╡ 58db6bd4-58a6-11ef-3795-fd6e57eceb68
@bind x html"""<div>
<script>
const div = currentScript.parentElement
const btn = div.querySelector("button")

let start_time = 0
let max_duration = 1000

const set = (x) => {
		div.value = x
		div.dispatchEvent(new CustomEvent("input"))
}

function go() { 
	if(Date.now() - start_time < max_duration) {
		set(div.value + 1)
		requestAnimationFrame(go)
	} else {
		set("done")
	}
}

btn.onclick = () => {
	div.value = 0
	start_time = Date.now()
	go()
}
</script>
<button id=add_x_button>Start</button>
</div>"""

# ╔═╡ 8568c646-0233-4a95-8332-2351e9c56027
@bind withsleep html"<input id=withsleep type=checkbox checked>"

# ╔═╡ 8a20fa4a-ac02-4a37-a54e-e4224628db66
x

# ╔═╡ 29f1d840-574e-463c-87d3-4b938e123493
begin
	reset_xs
	xs = []
end

# ╔═╡ 3155b6e0-8e19-4583-b2ab-4ab2db1f10b9
md"""
Click **reset_xs**.

Click **Start**.

The cell below should give: `1,done`.

Not: `1,2,done` or something like that. That means that an intermediate bond value (`2`) found its way through: [https://github.com/fonsp/Pluto.jl/issues/1891](https://github.com/fonsp/Pluto.jl/issues/1891)
"""

# ╔═╡ 029e1d1c-bf42-4e2c-a141-1e2eecc0800d
begin
	withsleep && sleep(1.5)
	push!(xs, x)
	xs_done = true

	join(xs[2:end], ",") |> Text
end

# ╔═╡ Cell order:
# ╟─a0fe4e4d-eee5-4420-bd58-3f12749a9ed1
# ╟─58db6bd4-58a6-11ef-3795-fd6e57eceb68
# ╟─8568c646-0233-4a95-8332-2351e9c56027
# ╠═8a20fa4a-ac02-4a37-a54e-e4224628db66
# ╟─3155b6e0-8e19-4583-b2ab-4ab2db1f10b9
# ╠═029e1d1c-bf42-4e2c-a141-1e2eecc0800d
# ╠═29f1d840-574e-463c-87d3-4b938e123493
