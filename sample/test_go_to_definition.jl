### A Pluto.jl notebook ###
# v0.17.5

using Markdown
using InteractiveUtils

# ╔═╡ a3865853-58ad-4e27-bfbf-7223760ca026
md"""
# Methodical testing for the go-to-definition plugin

### FAQ
**Q:** Wait.. isn't it better to have this as javascript tests, so we can actually automate them and be sure that nothing breaks instead of relying on our flimsy human eyeballs?

**A:** Yes
"""

# ╔═╡ c93bd0ce-dffe-4416-a007-79116ab1f1cb
macro >(expr)
	nothing
end

# ╔═╡ 91bd5444-154e-48f1-bd51-fbdcfc5cfc14
macro +(expr)
	return esc(expr)
end

# ╔═╡ cf229fd1-5bdc-4a44-8272-5ecc872a2fbd
md"""
### Reading guide for ["Definitions"](#Definitions)

Every section here consists of a couple of definitions, followed by a cell that references all of these. The test is pressing every reference and making sure it selects the right part in the definition cell.
"""

# ╔═╡ 8d559967-84da-45c9-9e05-ce1adc36804c
md"""
### Reading guide for ["Usages"](#Usages)

There are some "predefined" variables: `x`, `y` and `z`; `@z`, `@z_str`; `X`, `Y` and `Z`. These are then used to make sure they get underlined. I decided that the `z`-s and `y`-s are intended to reference outside of the cell. If there is a way to override the variable locally in the cell or an identifier that isn't a reference,  use `x` for that. There should be **no underlined `x`'s**.
"""

# ╔═╡ 52620cb5-7d42-4d40-a3ae-6d9d29448014
md"## Definitions"

# ╔═╡ 7527a5b8-7eeb-4ec7-abbe-34ed68415ce1
md"---"

# ╔═╡ 0cdf94d0-dd1a-4a4a-b6c2-d2d290cd3224
import Example

# ╔═╡ 2d145800-c22f-4bbe-a6f3-bca8bb79d513
import Example as ExampleAlias

# ╔═╡ df05dcd2-fb6b-4907-ad80-6d231d6b6ce5
import Example: hello, domath as domath_alias

# ╔═╡ f22e3e28-6cda-4dbd-bc30-d2f7c2411e91
import Example: hello as hello_alias

# ╔═╡ 8948913b-9917-46c2-a91a-14386d269502
import Example.domath

# ╔═╡ e152285a-9265-4a13-bf0d-cfc0ba418595
import Example.domath as another_domath_alias

# ╔═╡ 90682238-2769-4f20-afcf-56ced93242ba
Example; ExampleAlias; hello; domath;

# ╔═╡ e30de56d-5985-42e7-abde-1ec90c7484c9
hello_alias; domath_alias; another_domath_alias; # Pluto doesn't recognize aliases?

# ╔═╡ 3be4e4b7-02f8-4f4c-bcab-2d796f38a93f
md"---"

# ╔═╡ 1d2f2927-49d0-404e-a324-4ab4f677d89a
abstract type _abstract_type1 end

# ╔═╡ 654566d0-9b46-49dd-a8ac-4d3f5708cba5
abstract type _abstract_type2{T} end

# ╔═╡ 8e823381-7b06-44b1-99e0-565083bc2434
_abstract_type1; _abstract_type2;

# ╔═╡ 709300fe-3b3d-471f-8fc1-608b904d18ed
md"---"

# ╔═╡ 4f996030-0ff2-4ea2-aa48-ac92765072c8
struct _struct1 end;

# ╔═╡ 670eb47b-225f-4626-9276-4cae08d90843
struct _struct2 x end;

# ╔═╡ 5afc38cb-ae2b-495e-93f9-a7ca85773ca9
struct _struct4{T} <: _abstract_type2{T} end

# ╔═╡ 327e846b-3edc-406a-936f-799475a7b3de
md"---"

# ╔═╡ 955ae894-24a1-4f8a-999d-3e8d809e0eba
(_tuple1,) = (:x,);

# ╔═╡ 09a24659-6646-40bb-8e7c-0d340d2b45da
(_tuple2, _tuple3, _tuple4...) = (:x1, :x2, :x3, :x4);

# ╔═╡ a85d6a78-b212-46b0-bacc-ad880911f2cb
_tuple1; _tuple2; _tuple3; _tuple4;

# ╔═╡ cb226d6d-f294-42b0-a40e-cb07e58fa776
md"---"

# ╔═╡ 554ad95c-2edd-4ef9-b532-0ec7cf08243c
_baretuple1, = (:x,);

# ╔═╡ d6e27295-77eb-4a84-98be-ea338a85f455
_baretuple2, _baretuple3... = (:x1, :x2, :x3);

# ╔═╡ 06948715-85e7-4609-94b1-bb91123d928c
_baretuple1; _baretuple2; _baretuple3;

# ╔═╡ 22032cef-5889-48d8-8709-bb7eeac89638
md"""
For both `_tuple4` and `_baretuple3`: JS side has these covered (shown by example below), but Pluto doesn't recognize it (thus it not working outside cells)
"""

# ╔═╡ 31713a89-8656-4cf9-aee0-ac24c3430c0a
let
	(_tuple2, _tuple3, _tuple4...) = (:x1, :x2, :x3, :x4);
	_baretuple2, _baretuple3... = (:x1, :x2, :x3);

	_baretuple3; _tuple4; # cmd+click me!
end;

# ╔═╡ 0a8e5b66-daaa-4f32-8dd8-1e8b9ec35465
md"---"

# ╔═╡ 4e3b5537-59b7-4d87-ae54-f1153c092ffa
const _const = :const;

# ╔═╡ 5d2d43f0-5a17-407a-a9ee-a041010e5579
global _global = :global;

# ╔═╡ e14b69ca-f325-440c-acb1-c33de71e75a2
_const; _global;

# ╔═╡ f9737a60-9909-445c-8382-4dd00aa267ba
md"## Usages"

# ╔═╡ a0f62011-92f2-44ad-b420-27217bcbd89c
md"### Predefined"

# ╔═╡ 90a81bc8-cce9-49bd-a3c4-126c74a515d3
x = "Hi, I'm x";

# ╔═╡ ad3ab162-2139-45b4-8877-18285f1c2fa8
y = "Hi, x";

# ╔═╡ 18e25073-6ea7-4287-975d-84c05743930e
z = "I was expecting a joke";

# ╔═╡ b7bd9512-a119-46e5-a6df-58b04e04bda0
_function3() = (x, z);

# ╔═╡ 1c530e0e-770c-44b5-a13e-e5b905e3d84c
_function6(x) = x, z;

# ╔═╡ a6eec43c-dc37-4113-a7e5-fafde8bdbd39
@Base.kwdef struct _struct3
	x::Int = z
end;

# ╔═╡ 0135431d-4b3f-4513-9982-937cc0b60837
_struct1; _struct2; _struct3; _struct4;

# ╔═╡ 669cf7b9-b1cc-4f01-8dc3-b9a156f9de63
macro z end;

# ╔═╡ 20804f0f-ca92-463d-afb7-604aeb6057f7
macro z_str end;

# ╔═╡ 7781bce5-2dd8-4d06-8bfd-7589bea619dc
abstract type X end

# ╔═╡ f9236dd2-4fd7-4d86-8dcb-cbc011da8b03
abstract type Y end

# ╔═╡ 4a9d7bb3-9ca7-4af9-b7e1-e730fbc1c570
abstract type Z end

# ╔═╡ 5d9701eb-46a3-483a-9b51-0e376031ae34
function _function1()::Z end;

# ╔═╡ 24716c18-5a36-4b12-9ed5-43069c81f15b
function _function2(x...)::Z
	x, z
end;

# ╔═╡ 5365c683-75b7-4f29-8cbe-810167409686
_function4(x::Z) = begin x end;

# ╔═╡ a85475ce-44ee-4b87-99b6-10b8b31d99fa
_function4(::Z) = (10, z, "hi");

# ╔═╡ b2c9c60f-c107-4cbb-bc7e-3018117e9ecb
_function5(x)::Z = (x, z);

# ╔═╡ 3f3440dc-4449-4a9f-b019-f2b5a3fc97b9
_function1; _function2; _function3; _function4; _function5; _function6;

# ╔═╡ e5b3cb7a-bf0d-479e-a533-d5699abe6f2a
md"### Cases"

# ╔═╡ 94c6fccc-ae3a-40bb-bf3f-a11f6d9244e2
@> sum(x for x in [1,2,3])

# ╔═╡ 18ea6b86-9ed5-4a75-852e-13cbb7f4d8da
@> function f(x=z)::z 
	x, z
end

# ╔═╡ d8de87c9-e516-4f5f-978a-4c53071c5656
@> function f(x=z; y)::z 
	x, y, z
end

# ╔═╡ 6bc106ce-ebba-4487-859e-9701ebeda022
md"---"

# ╔═╡ c283d772-e007-447a-aa88-a01d75d48e2e
@> z.@x

# ╔═╡ fa2aaff3-9b8a-4cdc-919d-2de38f54018b
@> @z.x

# ╔═╡ da330714-5130-470b-bd2a-6343c932f808
@> @z

# ╔═╡ 196a17eb-1ded-40be-a00b-b5e4d7fa1070
md"---"

# ╔═╡ 3e773c63-a8b7-4ad8-9dbb-74d519054f0f
@> struct x
	x1
	x2::z
	x3::z = z
	x4 = z
end

# ╔═╡ eac662c8-369e-4bf3-9aec-5f9c46fc4f77
@> x::z = z

# ╔═╡ 1d7c5c41-f5c8-40b3-b0b1-7da19572bef2
@> :(1 + $(z...) + 1)

# ╔═╡ 7521b3c9-a1bd-4786-aa19-44fd1db90149
@> (x, y...) = z

# ╔═╡ 4eb71552-16da-42bb-a9dc-f18e1b3e7190
@> z.@macro x = z

# ╔═╡ 3f009423-6a36-41c2-ad74-de596a8519c1
@> begin
	struct x end
	struct x{y} end
	struct x <: z end
	struct x <: z{x,z} end
	struct x{y} <: z{x,y,z} end

	x, y, z
end

# ╔═╡ fba1aebf-c00a-4750-89d3-a1b6e27c07a4
@> var"x" = 10;

# ╔═╡ 0b34c665-9c93-40ab-9965-d0ae36a2190d
@> var"x";

# ╔═╡ 29f7c36e-9b4d-4a91-83b3-162f1cd9e00c
@> (x=z) -> (x, z)

# ╔═╡ a478a0e0-51ba-4261-ac9d-5b3333b5a8bf
@> f(z)

# ╔═╡ 8ea3cd9e-c831-4140-977c-cc6cee5367b9
@> f(x=z)

# ╔═╡ 499392fa-4c50-4d0b-b584-098355e9af48
md"---"

# ╔═╡ 5749eb9d-f18f-4a91-8bb1-17d1c680d397
@> quote $(z) end

# ╔═╡ 259004c3-770f-4fe2-9c84-4c6f5d5c879c
@> quote quote $(x) end end

# ╔═╡ 91f8bfee-102a-437d-8c40-d7c694f0a384
@> quote quote $$(z) end end

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Example = "7876af07-990d-54b4-ab0e-23690620f79a"

[compat]
Example = "~0.5.3"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[Example]]
git-tree-sha1 = "46e44e869b4d90b96bd8ed1fdcf32244fddfb6cc"
uuid = "7876af07-990d-54b4-ab0e-23690620f79a"
version = "0.5.3"
"""

# ╔═╡ Cell order:
# ╟─a3865853-58ad-4e27-bfbf-7223760ca026
# ╟─c93bd0ce-dffe-4416-a007-79116ab1f1cb
# ╟─91bd5444-154e-48f1-bd51-fbdcfc5cfc14
# ╟─cf229fd1-5bdc-4a44-8272-5ecc872a2fbd
# ╟─8d559967-84da-45c9-9e05-ce1adc36804c
# ╟─52620cb5-7d42-4d40-a3ae-6d9d29448014
# ╠═5d9701eb-46a3-483a-9b51-0e376031ae34
# ╠═24716c18-5a36-4b12-9ed5-43069c81f15b
# ╠═b7bd9512-a119-46e5-a6df-58b04e04bda0
# ╠═5365c683-75b7-4f29-8cbe-810167409686
# ╠═a85475ce-44ee-4b87-99b6-10b8b31d99fa
# ╠═b2c9c60f-c107-4cbb-bc7e-3018117e9ecb
# ╠═1c530e0e-770c-44b5-a13e-e5b905e3d84c
# ╠═3f3440dc-4449-4a9f-b019-f2b5a3fc97b9
# ╟─7527a5b8-7eeb-4ec7-abbe-34ed68415ce1
# ╠═0cdf94d0-dd1a-4a4a-b6c2-d2d290cd3224
# ╠═2d145800-c22f-4bbe-a6f3-bca8bb79d513
# ╠═df05dcd2-fb6b-4907-ad80-6d231d6b6ce5
# ╠═f22e3e28-6cda-4dbd-bc30-d2f7c2411e91
# ╠═8948913b-9917-46c2-a91a-14386d269502
# ╠═e152285a-9265-4a13-bf0d-cfc0ba418595
# ╠═90682238-2769-4f20-afcf-56ced93242ba
# ╠═e30de56d-5985-42e7-abde-1ec90c7484c9
# ╟─3be4e4b7-02f8-4f4c-bcab-2d796f38a93f
# ╠═1d2f2927-49d0-404e-a324-4ab4f677d89a
# ╠═654566d0-9b46-49dd-a8ac-4d3f5708cba5
# ╠═8e823381-7b06-44b1-99e0-565083bc2434
# ╟─709300fe-3b3d-471f-8fc1-608b904d18ed
# ╠═4f996030-0ff2-4ea2-aa48-ac92765072c8
# ╠═670eb47b-225f-4626-9276-4cae08d90843
# ╠═a6eec43c-dc37-4113-a7e5-fafde8bdbd39
# ╠═5afc38cb-ae2b-495e-93f9-a7ca85773ca9
# ╠═0135431d-4b3f-4513-9982-937cc0b60837
# ╟─327e846b-3edc-406a-936f-799475a7b3de
# ╠═955ae894-24a1-4f8a-999d-3e8d809e0eba
# ╠═09a24659-6646-40bb-8e7c-0d340d2b45da
# ╠═a85d6a78-b212-46b0-bacc-ad880911f2cb
# ╟─cb226d6d-f294-42b0-a40e-cb07e58fa776
# ╠═554ad95c-2edd-4ef9-b532-0ec7cf08243c
# ╠═d6e27295-77eb-4a84-98be-ea338a85f455
# ╠═06948715-85e7-4609-94b1-bb91123d928c
# ╟─22032cef-5889-48d8-8709-bb7eeac89638
# ╠═31713a89-8656-4cf9-aee0-ac24c3430c0a
# ╟─0a8e5b66-daaa-4f32-8dd8-1e8b9ec35465
# ╠═4e3b5537-59b7-4d87-ae54-f1153c092ffa
# ╠═5d2d43f0-5a17-407a-a9ee-a041010e5579
# ╠═e14b69ca-f325-440c-acb1-c33de71e75a2
# ╟─f9737a60-9909-445c-8382-4dd00aa267ba
# ╟─a0f62011-92f2-44ad-b420-27217bcbd89c
# ╠═90a81bc8-cce9-49bd-a3c4-126c74a515d3
# ╠═ad3ab162-2139-45b4-8877-18285f1c2fa8
# ╠═18e25073-6ea7-4287-975d-84c05743930e
# ╠═669cf7b9-b1cc-4f01-8dc3-b9a156f9de63
# ╠═20804f0f-ca92-463d-afb7-604aeb6057f7
# ╠═7781bce5-2dd8-4d06-8bfd-7589bea619dc
# ╠═f9236dd2-4fd7-4d86-8dcb-cbc011da8b03
# ╠═4a9d7bb3-9ca7-4af9-b7e1-e730fbc1c570
# ╟─e5b3cb7a-bf0d-479e-a533-d5699abe6f2a
# ╠═94c6fccc-ae3a-40bb-bf3f-a11f6d9244e2
# ╠═18ea6b86-9ed5-4a75-852e-13cbb7f4d8da
# ╠═d8de87c9-e516-4f5f-978a-4c53071c5656
# ╟─6bc106ce-ebba-4487-859e-9701ebeda022
# ╠═c283d772-e007-447a-aa88-a01d75d48e2e
# ╠═fa2aaff3-9b8a-4cdc-919d-2de38f54018b
# ╠═da330714-5130-470b-bd2a-6343c932f808
# ╟─196a17eb-1ded-40be-a00b-b5e4d7fa1070
# ╠═3e773c63-a8b7-4ad8-9dbb-74d519054f0f
# ╠═eac662c8-369e-4bf3-9aec-5f9c46fc4f77
# ╠═1d7c5c41-f5c8-40b3-b0b1-7da19572bef2
# ╠═7521b3c9-a1bd-4786-aa19-44fd1db90149
# ╠═4eb71552-16da-42bb-a9dc-f18e1b3e7190
# ╠═3f009423-6a36-41c2-ad74-de596a8519c1
# ╠═fba1aebf-c00a-4750-89d3-a1b6e27c07a4
# ╠═0b34c665-9c93-40ab-9965-d0ae36a2190d
# ╠═29f7c36e-9b4d-4a91-83b3-162f1cd9e00c
# ╠═a478a0e0-51ba-4261-ac9d-5b3333b5a8bf
# ╠═8ea3cd9e-c831-4140-977c-cc6cee5367b9
# ╟─499392fa-4c50-4d0b-b584-098355e9af48
# ╠═5749eb9d-f18f-4a91-8bb1-17d1c680d397
# ╠═259004c3-770f-4fe2-9c84-4c6f5d5c879c
# ╠═91f8bfee-102a-437d-8c40-d7c694f0a384
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002