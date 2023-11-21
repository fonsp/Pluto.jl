### A Pluto.jl notebook ###
# v0.19.32

using Markdown
using InteractiveUtils

# ╔═╡ b0f2a778-885f-11ee-3d28-939ca4069ee8
begin
	import Pkg
	Pkg.activate(temp=true)
	Pkg.add([
		Pkg.PackageSpec(name="AbstractPlutoDingetjes", rev="Display.with_js_link")
		Pkg.PackageSpec(name="HypertextLiteral")
	])

	using AbstractPlutoDingetjes
	using HypertextLiteral
end

# ╔═╡ 3d836ff3-995e-4353-807e-bf2cd78920e2
some_global = rand(200)

# ╔═╡ 12e64b86-3866-4e21-9af5-0e546452b4e1
function function_evaluator(f::Function, default="")
	@htl("""
	<div>
		<p>Input:<br>
		<input>&nbsp;<input type="submit"></p>
		
		<p>Output:<br>
		<textarea cols=40 rows=5></textarea>
	<script>
		let sqrt_with_julia = $(AbstractPlutoDingetjes.Display.with_js_link(f))
	
		let wrapper = currentScript.closest("div")
	
		let input = wrapper.querySelector("input")
		let submit = wrapper.querySelector("input[type='submit']")
		let output = wrapper.querySelector("textarea")
	
		submit.addEventListener("click", async () => {
			let result = await sqrt_with_julia(input.value)
			output.innerText = result
		})

		input.value = $(AbstractPlutoDingetjes.Display.published_to_js(default))
		submit.click()
	</script>
	
	</div>
	""")
end

# ╔═╡ 4b80dda0-74b6-4a0e-a50e-61c5380111a4
function_evaluator(123) do input
	sqrt(parse(Float64, input))
end

# ╔═╡ 33a2293c-6202-47ca-80d1-4a9e261cae7f
function_evaluator(4) do input
	@info "You should see this log $(input)"
	println("You should see this print $(input)")
	
	rand(parse(Int, input))
end

# ╔═╡ 480aea45-da00-4e89-b43a-38e4d1827ec2
function_evaluator(4) do input
	@warn("You should see the following error:")
	
	error("You should see this error $(input)")
end

# ╔═╡ b310dd30-dddd-4b75-81d2-aaf35c9dd1d3
function_evaluator(4) do input
	@warn("You should see the assertpackable fail after this log")

	:(@heyyy cant msgpack me)
end

# ╔═╡ 58999fba-6631-4482-a811-12bf2412d65e
function_evaluator(4) do input
	some_global[parse(Int, input)]
end

# ╔═╡ 9e5c0f8d-6ac1-4aee-a00d-938f17eec146
md"""
You should be able to use `with_js_link` multiple times within one cell, and they should work independently of eachother:
"""

# ╔═╡ 306d03da-cd50-4b0c-a5dd-7ec1a278cde1
@htl("""
<div style="display: flex; flex-direction: row;">
	$(function_evaluator(uppercase, "Παναγιώτης"))
	$(function_evaluator(lowercase, "Παναγιώτης"))
</div>
""")

# ╔═╡ 2cf033a7-bcd7-434d-9faf-ea761897fb64
md"""
You should be able to set up a `with_js_link` in one cell, and use it in another. This example is a bit trivial though...
"""

# ╔═╡ 40031867-ee3c-4aa9-884f-b76b5a9c4dec
fe = function_evaluator(length, "Alberto")

# ╔═╡ 7f6ada79-8e3b-40b7-b477-ce05ae79a668
fe

# ╔═╡ f344c4cb-8226-4145-ab92-a37542f697dd
md"""
You should see a warning message when `with_js_link` is not used inside an HTML renderer that supports it:
"""

# ╔═╡ 8bbd32f8-56f7-4f29-aea8-6906416f6cfd
let
	html_repr = repr(MIME"text/html"(), fe)
	HTML(html_repr)
end

# ╔═╡ Cell order:
# ╠═b0f2a778-885f-11ee-3d28-939ca4069ee8
# ╠═4b80dda0-74b6-4a0e-a50e-61c5380111a4
# ╠═33a2293c-6202-47ca-80d1-4a9e261cae7f
# ╠═480aea45-da00-4e89-b43a-38e4d1827ec2
# ╠═b310dd30-dddd-4b75-81d2-aaf35c9dd1d3
# ╠═3d836ff3-995e-4353-807e-bf2cd78920e2
# ╠═58999fba-6631-4482-a811-12bf2412d65e
# ╠═12e64b86-3866-4e21-9af5-0e546452b4e1
# ╟─9e5c0f8d-6ac1-4aee-a00d-938f17eec146
# ╠═306d03da-cd50-4b0c-a5dd-7ec1a278cde1
# ╟─2cf033a7-bcd7-434d-9faf-ea761897fb64
# ╠═40031867-ee3c-4aa9-884f-b76b5a9c4dec
# ╠═7f6ada79-8e3b-40b7-b477-ce05ae79a668
# ╟─f344c4cb-8226-4145-ab92-a37542f697dd
# ╠═8bbd32f8-56f7-4f29-aea8-6906416f6cfd
