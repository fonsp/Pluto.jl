### A Pluto.jl notebook ###
# v0.19.30

#> [frontmatter]
#> image = "https://upload.wikimedia.org/wikipedia/commons/a/a0/Textformatting.svg"
#> order = "1.5"
#> title = "Markdown"
#> tags = ["markdown", "basic"]
#> license = "Unlicense"
#> description = "Learn to write text cells with Markdown."
#> 
#>     [[frontmatter.author]]
#>     name = "Pluto.jl"
#>     url = "https://github.com/JuliaPluto"

using Markdown
using InteractiveUtils

# ╔═╡ ce092665-e18d-4314-a43e-51a04e25cd30
md"""
# How to use Markdown in Pluto

If a Pluto cell starts with `md"` and ends with `"`, it is a markdown cell!
"""

# ╔═╡ 02b26da6-40d1-4b3c-a594-aff8016b0945


# ╔═╡ 1adedccd-db89-40ec-ab77-a92c2976fc2c
md"Hello *Markdown*"

# ╔═╡ 2f8d4781-a364-4803-ba5f-69f85ef1c055


# ╔═╡ 50891330-1c60-4020-b4f6-f1200ca2b71d
md"""
!!! info "Julia cells and Markdown cells"
	Some notebook environments have different **cell types**: a *code* cell and a *Markdown* cell.

	In Pluto, there is **only one cell type**: a Julia cell. But you can use the Julia string macro `md"` to write Markdown inside of Julia! 🤯
"""

# ╔═╡ 57e3bfde-b692-44e6-a764-7459626a8919


# ╔═╡ 50fa8a8b-2c55-45b6-b4e0-8f510294586c


# ╔═╡ 76b5db23-8174-445d-927e-ef2d92bbf32f


# ╔═╡ e548c2ce-0e77-43b2-acaa-97005d67801f
md"""
# Keyboard shortcut

Instead of typing `md"` by hand, you can press **`Ctrl + M`** (or **`Cmd + M`** on Mac) to do it automatically.

👉 Try it yourself! In the cell below, press **`Ctrl/Cmd + M`**, type a message, and run the cell.
"""

# ╔═╡ f953ef79-b3a5-4adb-8467-b92b5f5bfbce


# ╔═╡ c16b0170-5b0b-4618-b028-b6278bd6319d


# ╔═╡ 4dbbfcee-37d0-4361-9058-ea3f9354e2de


# ╔═╡ 49fd22a1-63d7-48c3-a1de-67087b77e347


# ╔═╡ 9a7e812e-f6bd-47b8-ac36-124a2a233354
md"""
> 🐤 This is how all the text cells in this notebook are made! You can show the code on any of them to see how they are written.
"""

# ╔═╡ 838cb47d-db5e-4182-b7a1-164f0552bd02


# ╔═╡ 9cae62be-7591-4ebe-9fbc-c39be4e479c4
md"""
---
"""

# ╔═╡ dfb656e4-94bc-4b3b-bd09-979d937246b8


# ╔═╡ af97612d-832e-431a-b096-be8d7c94228f
md"""
# Markdown syntax

We've seen one bit of markdown syntax already: a single `*` for italics. There are more! Here is a quick reference to get you started:
"""

# ╔═╡ 99f3bca7-5314-4e86-8f28-bb5a6358bdbd
md"""
Text in *italics* or **bold**
"""

# ╔═╡ cd5b10ac-0618-4220-b7e3-b1beeea43eff
md"""
Headers:

# Biggest header
## Big header
### Medium header
#### Small header
##### Smaller header
"""

# ╔═╡ 8b622d0d-def6-4a2c-af3b-fdf91240fb90
md"""
Bullet points:

- something
- something else
"""

# ╔═╡ 5a399dae-5756-4614-a64f-214e812ee069
md"""
Numbered lists:

1. First item
2. Second item
"""

# ╔═╡ cca6c895-7974-4c3e-9170-ed85ae127478
md"""
If you're familiar with writing LaTeX formulas, you can do that too: ``i = \sqrt{-1}``.
"""

# ╔═╡ 65b31de3-fe0b-4e2a-97ad-39e4cd17962f
md"""
Text blocks are often describing code, so it's important that we can write code neatly!

You can use `ticks` when you want to talk about variables or expressions.
"""

# ╔═╡ 3b8ae605-025f-485e-a5a2-1f823319a67a
md"""
For longer pieces of code, you can use three ticks:

```
x = 1
```

If you're writing code in a specific language, you can also specify it to get nice formatting:

```julia
function square(x)
	x^2
end
```

Neat!
"""

# ╔═╡ 6e315f3b-1a46-483e-86bc-931023a8ac54
md"""
You can add links like so: [read about Julia](https://julialang.org). 
"""

# ╔═╡ cb3b24f4-10d1-4de9-bd82-813af622f79b
md"""
If you want to include an image from the web, it looks a lot like adding a a link. Adding a `!` at the start means that we want to *show* the image instead of linking to it.

![julia logo](https://julialang.org/assets/infra/logo.svg)

For images, the text between the `[]` is used as *alt text*: a text description that can be used when the image can't be shown. This is useful for people with impaired vision, but it's also useful if the link doesn't work.

![julia logo](https://broken.link)
"""

# ╔═╡ dd004d6c-54f6-4dd7-9aea-910adf0b22a5
md"""
What if you want to add an image that isn't on the internet? You can also link to your own filesystem:

![cute picture of my dog](C:/Users/Luka/Pictures/Hannes_playing_in_the_snow.jpg)

Oops, you probably can't see that one! That's the trouble with linking to files: it doesn't always work. There are ways around that, but if you're new to all this, linking to online images is the way to go. We recommend uploading your image to the web (with `imgur.com` for example) to get a URL.
"""

# ╔═╡ 5b08043c-302b-4b9b-982d-4ba1da41ff9f
md"""
Those are the basics! There is more you can do in markdown, like adding tables or footnotes: see the links at the bottom if you want to learn more.
"""

# ╔═╡ e7626671-ff5d-45f1-b8df-853d1d9bc1ac


# ╔═╡ 4428fe55-7d65-487b-864b-b566e7ecee9e
md"""
## Dynamic content

Writing some text is nice, what's really neat is if the text can **respond to code**. A simple way to do this is with an `if`/`else` block. Here we make a statement based on the value of `x`:

👉 Try changing the value of `x` to `-5`, and watch how the text changes.
"""

# ╔═╡ 7e5644fd-75ff-4f70-9981-ddb7d9ad470c
x = 1

# ╔═╡ 445eddb1-ccee-45d9-be5b-3f5fec9e2c7a
if x > 0
	md"`x` is positive"
elseif x < 0
	md"`x` is negative"
else
	md"`x` is zero"
end

# ╔═╡ 51e38551-742c-48dd-aaea-ffe479b9621b
md"""
### Interpolating values

You can also use **`$`** (the dollar sign) to include expressions in your text. 

For example, your text can include the value of a variable:
"""

# ╔═╡ 1a2f37ec-9be2-4fd5-8f0b-b6579a241b55
md"""
The value of `x` is $(x), which is $(x > 100 ? "a lot!" : "not very high.")
"""

# ╔═╡ d2451923-6487-497c-a169-9815702c42fc
md"""
## Useful links

- [Markdown Guide](https://www.markdownguide.org/)
- [Documentation of Julia's Markdown library](https://docs.julialang.org/en/v1/stdlib/Markdown/) 

"""

# ╔═╡ 64a23ad5-0fa1-48dd-9786-dcfbc73a3b52


# ╔═╡ d6def1a3-cc96-4eb9-bfce-949d29ffe31f
function pluto_icon(name, alt=name)

	# It would be better to use HypertextLiteral.jl instead of just the HTML function, but this means that the notebook works without any packages, which can be a problem when reading this notebook without internet.
	HTML("""<img 
		src="https://cdn.jsdelivr.net/gh/ionic-team/ionicons@5.5.1/src/svg/$(name)-outline.svg"
		class="pluto-button-inline-icon"
		alt="$(alt)"
		title="$(alt)"
		style="width: 1em; height: 1em; margin-bottom: -.2em;">
	""")
end

# ╔═╡ 8f45d098-4041-4449-83c3-79280232691e
md"""
👉 Try it yourself! In the cell below, write some markdown text, and run the cell with the $(pluto_icon("caret-forward-circle", "play")) button on the bottom right of the cell (or **`Shift + Enter`**).
"""

# ╔═╡ 688a8ea9-1bff-45c5-8942-f8e96ed0ef79
md"""
When you are done, **hide the code** by clicking the $(pluto_icon("eye")) button on the left of the cell.
"""

# ╔═╡ e392d442-5c83-4711-bc45-c2dbedf62b7f
md"""
## Helper function

We wrote a helper function to show Pluto's GUI buttons in the introduction text, like $(pluto_icon("eye")) and $(pluto_icon("caret-forward-circle")). A bit too advanced for this notebook, but hopefully it made the text easier to read!
"""

# ╔═╡ 58eb1225-6521-45ef-827a-78cdafbaf784
pluto_icon_style = html"""
<style>
	@media (prefers-color-scheme: dark) {
	.pluto-button-inline-icon {
        filter: invert(1) hue-rotate(180deg) contrast(0.8);
	}
	}
</style>
"""

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.8.3"
manifest_format = "2.0"
project_hash = "da39a3ee5e6b4b0d3255bfef95601890afd80709"

[deps]
"""

# ╔═╡ Cell order:
# ╟─ce092665-e18d-4314-a43e-51a04e25cd30
# ╟─02b26da6-40d1-4b3c-a594-aff8016b0945
# ╠═1adedccd-db89-40ec-ab77-a92c2976fc2c
# ╟─2f8d4781-a364-4803-ba5f-69f85ef1c055
# ╟─50891330-1c60-4020-b4f6-f1200ca2b71d
# ╟─8f45d098-4041-4449-83c3-79280232691e
# ╠═57e3bfde-b692-44e6-a764-7459626a8919
# ╟─688a8ea9-1bff-45c5-8942-f8e96ed0ef79
# ╟─50fa8a8b-2c55-45b6-b4e0-8f510294586c
# ╟─76b5db23-8174-445d-927e-ef2d92bbf32f
# ╟─e548c2ce-0e77-43b2-acaa-97005d67801f
# ╠═f953ef79-b3a5-4adb-8467-b92b5f5bfbce
# ╟─c16b0170-5b0b-4618-b028-b6278bd6319d
# ╟─4dbbfcee-37d0-4361-9058-ea3f9354e2de
# ╟─49fd22a1-63d7-48c3-a1de-67087b77e347
# ╟─9a7e812e-f6bd-47b8-ac36-124a2a233354
# ╟─838cb47d-db5e-4182-b7a1-164f0552bd02
# ╟─9cae62be-7591-4ebe-9fbc-c39be4e479c4
# ╟─dfb656e4-94bc-4b3b-bd09-979d937246b8
# ╟─af97612d-832e-431a-b096-be8d7c94228f
# ╠═99f3bca7-5314-4e86-8f28-bb5a6358bdbd
# ╠═cd5b10ac-0618-4220-b7e3-b1beeea43eff
# ╠═8b622d0d-def6-4a2c-af3b-fdf91240fb90
# ╠═5a399dae-5756-4614-a64f-214e812ee069
# ╠═cca6c895-7974-4c3e-9170-ed85ae127478
# ╠═65b31de3-fe0b-4e2a-97ad-39e4cd17962f
# ╠═3b8ae605-025f-485e-a5a2-1f823319a67a
# ╠═6e315f3b-1a46-483e-86bc-931023a8ac54
# ╠═cb3b24f4-10d1-4de9-bd82-813af622f79b
# ╠═dd004d6c-54f6-4dd7-9aea-910adf0b22a5
# ╟─5b08043c-302b-4b9b-982d-4ba1da41ff9f
# ╟─e7626671-ff5d-45f1-b8df-853d1d9bc1ac
# ╟─4428fe55-7d65-487b-864b-b566e7ecee9e
# ╠═7e5644fd-75ff-4f70-9981-ddb7d9ad470c
# ╠═445eddb1-ccee-45d9-be5b-3f5fec9e2c7a
# ╟─51e38551-742c-48dd-aaea-ffe479b9621b
# ╠═1a2f37ec-9be2-4fd5-8f0b-b6579a241b55
# ╟─d2451923-6487-497c-a169-9815702c42fc
# ╟─64a23ad5-0fa1-48dd-9786-dcfbc73a3b52
# ╟─e392d442-5c83-4711-bc45-c2dbedf62b7f
# ╟─d6def1a3-cc96-4eb9-bfce-949d29ffe31f
# ╟─58eb1225-6521-45ef-827a-78cdafbaf784
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
