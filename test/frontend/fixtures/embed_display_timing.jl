### A Pluto.jl notebook ###
# v0.19.14

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

# ╔═╡ 0e39aa1c-642b-11ed-2499-d99202c91254
using HypertextLiteral

# ╔═╡ 1241fb5d-7bc6-4c2c-8412-0a4d6d0bc2c5
PlutoRunner._EmbeddableDisplay_enable_html_shortcut[] = false

# ╔═╡ f89045ea-0336-433e-9f39-7904457afa5e
@bind zzz @htl("""
<div>
	$(embed_display(@htl("""
	<find-me>
	<script>
		await new Promise((r) => {
			setTimeout(r, 2000)
		})
		return html`<input value="the secret">`
	</script>
	</find-me>
	""")))
	<script>
		const div = currentScript.parentElement
		const findme = div.querySelector("find-me")
		const input = findme.firstElementChild

		console.log(input, findme.innerHTML)
		div.value = `you found \${input.value ?? `❌☎️🔴`}`
		
	</script>
</div>
""")

# ╔═╡ ff94081d-7bbc-4034-b27b-506d786d4269
zzz

# ╔═╡ d9fde035-d1f0-4acc-b8e8-d5d9ac0c5511
# @htl("""
# <div>
# $([
# 	embed_display(@htl("x"))
# 	for i in 1:100
# ])
# </div>
# """)

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
HypertextLiteral = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"

[compat]
HypertextLiteral = "~0.9.4"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.8.0"
manifest_format = "2.0"
project_hash = "fc304fba520d81fb78ea25b98f5762b4591b1182"

[[deps.HypertextLiteral]]
deps = ["Tricks"]
git-tree-sha1 = "c47c5fa4c5308f27ccaac35504858d8914e102f9"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.4"

[[deps.Tricks]]
git-tree-sha1 = "6bac775f2d42a611cdfcd1fb217ee719630c4175"
uuid = "410a4b4d-49e4-4fbc-ab6d-cb71b17b3775"
version = "0.1.6"
"""

# ╔═╡ Cell order:
# ╠═0e39aa1c-642b-11ed-2499-d99202c91254
# ╠═1241fb5d-7bc6-4c2c-8412-0a4d6d0bc2c5
# ╠═ff94081d-7bbc-4034-b27b-506d786d4269
# ╠═f89045ea-0336-433e-9f39-7904457afa5e
# ╠═d9fde035-d1f0-4acc-b8e8-d5d9ac0c5511
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002