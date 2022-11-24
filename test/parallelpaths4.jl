### A Pluto.jl notebook ###
# v0.17.1

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

# ╔═╡ e36eee87-a354-4eab-a156-734dee28b71f
A = 123

# ╔═╡ de01d226-7fbb-4d6b-a044-7252415564ea
B = C = 33

# ╔═╡ 5696c569-7377-4faf-9f09-63fc01c55a00
D = A

# ╔═╡ ea8654e0-4a25-4c2c-97a9-330a2b89c419
E = D + A

# ╔═╡ b085e622-f4ec-49e1-9de1-5553f8ddce1c
F = B - A

# ╔═╡ 9dac8ef1-fd6c-4eae-b468-b92411a66313
G = B + E

# ╔═╡ b182e0b3-be07-4d29-81cc-af5e6ba1d6ea
F + G

# ╔═╡ 8aac8df3-1551-4c9f-a8bd-a62751a29b2a
md"""
## Path 1
"""

# ╔═╡ 03307e43-cb61-4321-95ac-7bbb16e0cfc6
@bind x html"<input type=range max=10000>"

# ╔═╡ 692746e0-7c96-47ac-b1ee-5ff34ee66751
@bind y html"<input type=range max=10000>"

# ╔═╡ b18c2329-18d7-4041-962c-0ef98f8aa591
(x,y)

# ╔═╡ 399ef117-2085-4c9d-9d8d-d03a03baf5ef
md"""
## Path 2
"""

# ╔═╡ a3a04d5f-b0f0-4740-9b37-92570864f142
high_res = true

# ╔═╡ a822ac82-5691-4f8e-a60a-1a4582cf59e7
dog_file = if high_res
		download("https://upload.wikimedia.org/wikipedia/commons/e/ef/Pluto_in_True_Color_-_High-Res.jpg")
else
	download("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Pluto_in_True_Color_-_High-Res.jpg/240px-Pluto_in_True_Color_-_High-Res.jpg")
end

# ╔═╡ 627461ce-9e80-4707-b0ba-ddc6bb9b4269
begin
	struct Dog end
	function Base.show(io::IO, ::MIME"image/jpg", ::Dog)
		write(io, read(dog_file))
	end
end

# ╔═╡ 5ce8ebc6-b509-42f0-acd5-8008673b04ab
md"Downloaded image is $(filesize(dog_file) / 1000) kB"

# ╔═╡ 1f48fe19-3ee8-44ac-a591-7b4df2d2f93a
md"""
This cell will have very large Uint8Arrays in the output body
"""

# ╔═╡ 5539db10-b0d2-48b6-8985-ef437b8ae0b5
@bind show_dogs html"<input type=checkbox>"

# ╔═╡ 74329553-ab9b-4b6c-a77b-9c24ac48490b
show_dogs === true && Dog()

# ╔═╡ 8811b8bd-7d44-4f4a-b52d-0948dad39a51
md"""
## Path 3
"""

# ╔═╡ f0575125-d7dd-4cf5-bfd3-3275d6bdd0ce
a = 100

# ╔═╡ 802be3da-6f24-4693-b48e-0479aec4a02c
begin
	a
	@bind b html"<input>"
end

# ╔═╡ 997f714f-1df4-4b2c-ab0a-50dd52cb4a82
md"""
## Path 4
"""

# ╔═╡ a504bc18-fff4-4cd7-b74c-173abcf1ef68
begin
	a
	@bind c html"<input>"
end

# ╔═╡ 00a0169e-fd93-4dfe-b45b-f088312e24ab
md"""
## Path 5
"""

# ╔═╡ e7b5f5ec-d673-4397-ac0c-7a4bfc364fde
f(x) = x

# ╔═╡ 0a61c092-e61a-4219-a57f-172a8c8c4117
begin
	f(1)
	@bind five1 html"<input>"
end

# ╔═╡ 31695eb5-7d77-4d6b-a32a-ff31cf1fd8e9
md"""
## Path 6
"""

# ╔═╡ 25774e63-94fb-4b03-a43a-72a62f08f0c5
begin
	f(1)
	@bind five2 html"<input>"
end

# ╔═╡ a04672a7-3d3f-4b0b-8c8f-f8b73f208de4
md"""
## Path 7
"""

# ╔═╡ 2d0f4354-20e0-47a0-8a86-99cd50bca80f
@bind six1 html"<input>"

# ╔═╡ fee1f75a-5f3e-4213-8ba3-872871cf7f68
@bind six2 html"<input>"

# ╔═╡ 20ebc38b-24c1-4e39-97b0-dcd53a9a5bf7
@bind six3 html"<input>"

# ╔═╡ 5545ac33-82e9-4994-be49-5776d512e2c1
(six1, six2)

# ╔═╡ b776eba5-60bc-4d0f-8e93-e2baf2f695bc
md"""
## Path 8
"""

# ╔═╡ a56b8b24-bf38-49bf-b19e-d8feadd55db3
(six2, six3)

# ╔═╡ 6784f0e5-5108-48ca-99ac-9d154b1d3c55
md"""
## Path 9
"""

# ╔═╡ aacc0632-797f-49d6-b9ce-3e728fade6c3
begin
	@bind cool1 let
		@bind cool2 html"nothing"
		
		html"<input type=range>"
	end
end

# ╔═╡ 6357cfaf-e6d6-49f2-b3bb-5a27b28cf0fa
cool1

# ╔═╡ 4fd43c26-dd05-4520-93e9-901760ef49b4
cool2

# ╔═╡ 357762fc-52fe-4727-b0a8-af55eea466b7
md"""
## Path 10
"""

# ╔═╡ 0024288a-9ee3-42b5-82c6-d996f45be9ed
let
	md"""
	
	Hello $(@bind world html"<input value=world>")
	"""
end

# ╔═╡ ef732ddf-b034-42cf-815f-1c8b53da6401
world

# ╔═╡ c143b2de-78c5-46ad-852f-3c2a9115cb72
md"""
## Path 11
"""

# ╔═╡ cf628a57-933b-4984-a317-63360c345534
@bind boring html"<input>"

# ╔═╡ 22659c85-700f-4dad-a22a-7aafa71225c0
# boring is never referenced

# ╔═╡ Cell order:
# ╠═e36eee87-a354-4eab-a156-734dee28b71f
# ╠═de01d226-7fbb-4d6b-a044-7252415564ea
# ╠═5696c569-7377-4faf-9f09-63fc01c55a00
# ╠═ea8654e0-4a25-4c2c-97a9-330a2b89c419
# ╠═b085e622-f4ec-49e1-9de1-5553f8ddce1c
# ╠═9dac8ef1-fd6c-4eae-b468-b92411a66313
# ╠═b182e0b3-be07-4d29-81cc-af5e6ba1d6ea
# ╟─8aac8df3-1551-4c9f-a8bd-a62751a29b2a
# ╠═03307e43-cb61-4321-95ac-7bbb16e0cfc6
# ╠═692746e0-7c96-47ac-b1ee-5ff34ee66751
# ╠═b18c2329-18d7-4041-962c-0ef98f8aa591
# ╟─399ef117-2085-4c9d-9d8d-d03a03baf5ef
# ╠═627461ce-9e80-4707-b0ba-ddc6bb9b4269
# ╠═a3a04d5f-b0f0-4740-9b37-92570864f142
# ╠═a822ac82-5691-4f8e-a60a-1a4582cf59e7
# ╟─5ce8ebc6-b509-42f0-acd5-8008673b04ab
# ╟─1f48fe19-3ee8-44ac-a591-7b4df2d2f93a
# ╠═5539db10-b0d2-48b6-8985-ef437b8ae0b5
# ╠═74329553-ab9b-4b6c-a77b-9c24ac48490b
# ╟─8811b8bd-7d44-4f4a-b52d-0948dad39a51
# ╠═f0575125-d7dd-4cf5-bfd3-3275d6bdd0ce
# ╠═802be3da-6f24-4693-b48e-0479aec4a02c
# ╟─997f714f-1df4-4b2c-ab0a-50dd52cb4a82
# ╠═a504bc18-fff4-4cd7-b74c-173abcf1ef68
# ╟─00a0169e-fd93-4dfe-b45b-f088312e24ab
# ╠═e7b5f5ec-d673-4397-ac0c-7a4bfc364fde
# ╠═0a61c092-e61a-4219-a57f-172a8c8c4117
# ╟─31695eb5-7d77-4d6b-a32a-ff31cf1fd8e9
# ╠═25774e63-94fb-4b03-a43a-72a62f08f0c5
# ╟─a04672a7-3d3f-4b0b-8c8f-f8b73f208de4
# ╠═2d0f4354-20e0-47a0-8a86-99cd50bca80f
# ╠═fee1f75a-5f3e-4213-8ba3-872871cf7f68
# ╠═20ebc38b-24c1-4e39-97b0-dcd53a9a5bf7
# ╠═5545ac33-82e9-4994-be49-5776d512e2c1
# ╟─b776eba5-60bc-4d0f-8e93-e2baf2f695bc
# ╠═a56b8b24-bf38-49bf-b19e-d8feadd55db3
# ╟─6784f0e5-5108-48ca-99ac-9d154b1d3c55
# ╠═aacc0632-797f-49d6-b9ce-3e728fade6c3
# ╠═6357cfaf-e6d6-49f2-b3bb-5a27b28cf0fa
# ╠═4fd43c26-dd05-4520-93e9-901760ef49b4
# ╟─357762fc-52fe-4727-b0a8-af55eea466b7
# ╠═0024288a-9ee3-42b5-82c6-d996f45be9ed
# ╠═ef732ddf-b034-42cf-815f-1c8b53da6401
# ╟─c143b2de-78c5-46ad-852f-3c2a9115cb72
# ╠═cf628a57-933b-4984-a317-63360c345534
# ╠═22659c85-700f-4dad-a22a-7aafa71225c0
