### A Pluto.jl notebook ###
# v0.17.0

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

# ╔═╡ 071d9ca5-9b42-4583-ad96-a48f93453a0e
using PlutoUI

# ╔═╡ bc532cd2-c75b-11ea-313f-8b5e771c9227
md"""# PlutoUI.jl

The [Interactivity sample notebook](./sample/Interactivity.jl) explains how Pluto notebooks can use **`@bind`** to add _interactivity_ to your notebook. It's a simple concept - it uses the same reactivity that you have when editing code, except now you use sliders and buttons, instead of editing code.

However, code like

```julia
@bind x html"<input type=range min=5 max=15>"
```
is hard to memorize, so `PlutoUI` makes it more _Julian_:
```julia
@bind x Slider(1:15)
```
"""

# ╔═╡ 3eff9592-cc63-11ea-2b61-4170d1a7656a


# ╔═╡ 051f31fc-cc63-11ea-1e2c-0704285ea6a9
md"""
#### To use it in other notebooks
Simply import the `PlutoUI` package, and Pluto's built-in package manager takes care of the rest!
"""

# ╔═╡ fddb794c-c75c-11ea-1f55-eb9c178424cd
md"# Basics"

# ╔═╡ 1e10d82a-c766-11ea-0c4b-3bd77f62759d
md"`PlutoUI` includes the basic HTML5 `<input>` types."

# ╔═╡ b819e9a8-c760-11ea-11ee-dd01da663b5c
md"## Slider"

# ╔═╡ 34ebf81e-c760-11ea-05bb-376173e7ed10
@bind x Slider(5:15)

# ╔═╡ a4488984-c760-11ea-2930-871f6b400ef5
x

# ╔═╡ 1048d1e0-cc50-11ea-1bf3-d76cae42740a


# ╔═╡ a709fd2e-c760-11ea-05c5-7bf673990de1
md"The first argument is an `AbstractRange` object. You can set the _default value_ using a keyword argument:"

# ╔═╡ d3811ac2-c760-11ea-0811-131d9f1d3910
@bind y Slider(20:0.1:30, default=25)

# ╔═╡ dfe10b6c-c760-11ea-2f77-79cc4cfa8dc4
y

# ╔═╡ 06962cde-cc4f-11ea-0d96-69a8cb7eeda2


# ╔═╡ e49623ac-c760-11ea-3689-c15f2e2f6081
md"## NumberField

A `NumberField` can be used just like a `Slider`, it just looks different:"

# ╔═╡ 314cb85a-c761-11ea-1cba-b73f84a52be8
@bind x_different NumberField(0:100, default=20)

# ╔═╡ 104b55ce-cc4f-11ea-1273-092a1717e399


# ╔═╡ 4513b730-c761-11ea-1460-2dca56081fcf
md"## CheckBox"

# ╔═╡ 4f8e4e1e-c761-11ea-1787-419cab59bb12
@bind z CheckBox()

# ╔═╡ b787ead6-c761-11ea-3b17-41c0a5434f9b
z

# ╔═╡ 177e6bf0-cc50-11ea-0de2-e77544f5c615


# ╔═╡ b08c347e-c761-11ea-1b61-7b69631d078b
md"Default value:"

# ╔═╡ b53c8ffa-c761-11ea-38d1-2d4ad96a7bee
@bind having_fun CheckBox(default=true)

# ╔═╡ adcf4e68-c761-11ea-00bb-c3b15c6dedc0
having_fun

# ╔═╡ 1a562ad4-cc50-11ea-2485-cdec6e1a78dc


# ╔═╡ 5d420570-c764-11ea-396b-cf0db01d34aa
having_fun ? md"🎈🎈" : md"☕"

# ╔═╡ 09393bf2-cc4f-11ea-1e48-cfbedab8e6b4


# ╔═╡ cd1b5872-c761-11ea-2179-57a3cb34d235
md"## TextField"

# ╔═╡ d9e85ed0-c761-11ea-30bf-83ce272526e0
@bind s TextField()

# ╔═╡ e4c262d6-c761-11ea-36b2-055419bfc981
s

# ╔═╡ 0934bc0c-cc50-11ea-0da8-0d6b2f275399


# ╔═╡ e690337c-c761-11ea-08be-ade40a464eb4
md"With a default value:"

# ╔═╡ f1f83980-c761-11ea-1e34-97c0ffca3f67
@bind sentence TextField(default="te dansen omdat men leeft")

# ╔═╡ f985c8de-c761-11ea-126c-1fd79d547b79
sentence

# ╔═╡ 1cbfd28e-cc50-11ea-2c90-a7807e4979ef


# ╔═╡ 0136af80-c762-11ea-2f1a-9dccff334a11
md"You can also create a **mutli-line** text box!"

# ╔═╡ 0e6f0508-c762-11ea-0352-09bd694a9b35
# gedicht van: Sanne de Kroon
@bind poem TextField((30, 3), "Je opent en sluit je armen,\nMaar houdt niets vast.\nHet is net zwemmen")

# ╔═╡ 3dcd7002-c765-11ea-323d-a1fb49409011
split(poem, "\n")

# ╔═╡ 0aa3c85e-cc4f-11ea-2fba-4bdd513d9217


# ╔═╡ 5833f7f4-c763-11ea-0b95-9b21a40192a9
md"## Select"

# ╔═╡ 690cf3ac-c763-11ea-10f0-b3e28c380be9
@bind vegetable Select(["potato", "carrot"])

# ╔═╡ 705662e2-c763-11ea-2f6d-cdaffc1fc73a
vegetable

# ╔═╡ 3930f0d8-cc50-11ea-3de6-d91ac5c6cd9f


# ╔═╡ 787a2c88-c763-11ea-0a32-bb91ca60113d
md"Instead of an array of `String`s, you can also give an array of **pairs**, where the first item is the bound value, and the second item is displayed. "

# ╔═╡ ac8c4dee-c763-11ea-1b2d-c590a2d50d7e
@bind fruit Select(["apple" => "🍎", "melon" => "🍉"])

# ╔═╡ dcda9ad2-c763-11ea-3ec6-093b823ba66d
fruit

# ╔═╡ 0c3ab1f8-cc4f-11ea-0cfb-8f076d2c9836


# ╔═╡ 62c6f866-f0fe-11ea-0961-319f28d040d4
md"""
## MultiSelect

This widget allows the user to select multiple element by holding `Ctrl` / `Cmd` while clicking a more items.
"""

# ╔═╡ a01c8096-f0fe-11ea-3e78-ad8551e84fa1
@bind vegetable_basket MultiSelect(["potato", "carrot", "boerenkool"])

# ╔═╡ a20e30f2-f0fe-11ea-0ca7-c5195c9eb24a
vegetable_basket

# ╔═╡ c819ef3e-f0fe-11ea-1213-9df7597e4e89
md"Just like `Select`, you can also give an array of pairs."

# ╔═╡ b104ba6d-0293-4378-9652-f628f1d08d97
md"""
## MultiCheckBox

This widget allows the user to select multiple elements using checkboxes.
"""

# ╔═╡ 16f2218d-f1bc-4b34-a355-53acfa77fbf5
@bind fruit_basket MultiCheckBox(["apple", "blueberry", "mango"])

# ╔═╡ 2c7811cb-d9ea-470c-8cb7-2b3803489f3f
fruit_basket

# ╔═╡ 283d1177-c605-4652-905b-9a70354cf878
md"Just like `Select`, you can also give an array of pairs. See the Live Docs for `MultiCheckBox` for all the customization options!"

# ╔═╡ 0b1ce22e-c764-11ea-3d60-e799d58aee30
md"## Button"

# ╔═╡ 6d9108a8-c765-11ea-0a38-09a1364998b1
@bind clicked Button("Hello world")

# ╔═╡ 7a14e496-c765-11ea-20a1-6fb960009251
clicked

# ╔═╡ 3eff932a-cc50-11ea-366e-812d3854dd4c


# ╔═╡ 7e10fb52-c765-11ea-2a71-0fc347d09885
md"""
### Button as reactive trigger

In the example above, _any cell that references `clicked` will re-evaluate_ when you click the button. This means that you can a button as a **reactive trigger**, by referencing its value in another cell.
"""

# ╔═╡ b91764e8-c765-11ea-27a2-4ba5777fbd89
@bind go Button("Recompute")

# ╔═╡ bb356b12-c765-11ea-2c36-697f4314bb93
let
	go
	
	md"I am $(rand(1:15)) years old!"
end

# ╔═╡ 9276da28-cc4f-11ea-17b3-65eec41a181e


# ╔═╡ 92def54a-cc4f-11ea-12c5-652f2bb46413
md"## FilePicker"

# ╔═╡ 9920e56c-cc4f-11ea-2d5e-f5371c79f048
@bind important_document FilePicker()

# ╔═╡ 44591b34-cc50-11ea-2005-2f7075e6f2db
important_document

# ╔═╡ 4fda3072-cc50-11ea-2804-197b6391b269
md"The file picker is useful if you want to show off your notebook on a dataset or image **uploaded by the reader**. It will work anywhere - you don't access files using their path.

The caveat is that large files might take a long time to get processed: everything needs to pass through the browser. If you are using large datasets, a better option is to use `Select` to let the reader pick a filename. You can then read the file using `Base.read(filename, type)`"

# ╔═╡ 3e5dd7d2-c760-11ea-1dca-6d8720b3558d
md"# Extras"

# ╔═╡ f31668c6-c768-11ea-1501-5f41afa7c83b
md"## Clock"

# ╔═╡ 417390ba-c760-11ea-27df-5908858ae88c
@bind t Clock()

# ╔═╡ 49e7cd06-c760-11ea-3f5d-2741d94278a6
t

# ╔═╡ 31a2f3c4-cc51-11ea-3652-bd814517a4b5


# ╔═╡ 67709812-c760-11ea-2bda-9756ead35749
md"You can set the interval (`5.0` seconds), and disable the UI (`true`):"

# ╔═╡ 4c2b45a0-c760-11ea-2b64-3fefc820cd5b
@bind t_slow Clock(5.0, true)

# ╔═╡ 5be148cc-c760-11ea-0819-a7bb403d27ff
t_slow

# ╔═╡ 347e3d06-cc51-11ea-012c-43e824eaffa2


# ╔═╡ 343d7118-cc51-11ea-387a-fb22d8c73506
md"You can use a `Clock` to drive an animation! Or use it to repeat the same command at an interval: just like with `Button`, you can reference a bound (reactive) variable without actually using it!"

# ╔═╡ 32e41ac2-cc51-11ea-3358-bbead9c68123


# ╔═╡ f74f434a-c768-11ea-079c-fb707e6ba17b
md"## DownloadButton"

# ╔═╡ ea00721c-cc4b-11ea-1e82-0b3dbe6a7f1e
md"The download button is not an **input** element that you can `@bind` to, it's an **output** that you can use to get processed data from your notebook easily."

# ╔═╡ fc12280c-c768-11ea-3ebc-ebcd6b3459c1
DownloadButton(poem, "poem.txt")

# ╔═╡ 067cbcde-cc4c-11ea-3eed-972dc6d7bb3b
DownloadButton([0x01, 0x02, 0x03], "secret_data.bin")

# ╔═╡ ad8e9b30-c75d-11ea-1fd0-0b53592135bf
md"""# Loading resources

Notebooks use data from different places. For example, you use `Base.read` to access local data (files) inside your Julia code, and `HTTP.jl` for remote data (interwebs). 

`PlutoUI` helps you communicate with the person reading the notebook!
- To get **remote media** (URL) inside your **Markdown text**, use `PlutoUI.Resource`.
- To get **local media** (file) inside your **Markdown text**, use `PlutoUI.LocalResource`.

(With _media_, we mean **images**, video and audio.)

> We **strongly recommend** that you use _remote_ media inside Pluto notebooks! 
> 
> If your notebook uses local images, then those images **will not show** when someone else opens your notebook, unless they have the same images on their computer, at the exact same location. _More on this later._

"""

# ╔═╡ 87d088d0-cc54-11ea-02c6-bd673b95b9d3
md"""## Resource

If you just want to show **images inside Markdown**, you can use the built-in syntax (without `PlutoUI`):

```
md"Here is a _dog_: ![](https://fonsp.com/img/doggoSmall.jpg)"
```

`PlutoUI.Resource` has some extra features:
- specify **image dimensions** and spacing
- support for videos
- support for audio"""

# ╔═╡ 6a7e7e54-c75e-11ea-2ea7-ed3da37e9e96
dog_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Welsh_Springer_Spaniel.jpg/640px-Welsh_Springer_Spaniel.jpg"

# ╔═╡ 3c68b25c-c761-11ea-226a-4f46579a6732
Resource(dog_url, :width => x * x_different)

# ╔═╡ 9ac7921c-c75e-11ea-30f5-c35e6ee370cb
t_rex_url = "https://upload.wikimedia.org/wikipedia/commons/transcoded/6/62/Meow.ogg/Meow.ogg.mp3"

# ╔═╡ a8c57442-c75e-11ea-1913-7d82cbd2c69c
flower_url = "https://upload.wikimedia.org/wikipedia/commons/4/41/Sunflower_Flower_Opening_Time_Lapse.ogv"

# ╔═╡ cb37b916-c75b-11ea-0c83-6ba759536075
md"""Hello I am a dog $(Resource(dog_url))"""

# ╔═╡ 16ea31fc-c75e-11ea-0f2d-dd790a56b2dc
md"""And I sound like this: $(Resource(t_rex_url))"""

# ╔═╡ 1dfd8cc6-c75e-11ea-3c04-a96734779c97
md"""This is my flower friend

$(Resource(flower_url, :width => 200))"""

# ╔═╡ 2fda30ea-c75e-11ea-2ff5-7f2dcf4f9b66
md"### Attributes

You can pass additional _HTML attributes_ to `Resource`, these will be added to the element. For example:"

# ╔═╡ 525ceea0-c75e-11ea-2766-f72418fd784e
md"""
$(Resource(dog_url, :width => 20))
$(Resource(dog_url, :width => 50))
$(Resource(dog_url, :width => 100))
$(Resource(dog_url, 
	:width => 100, 
	:style => "filter: grayscale(100%); border: 3px solid black;"))
"""

# ╔═╡ 382d41d8-c75e-11ea-2ae3-2ffe96e04b5a
Resource(flower_url, :width => 200, :autoplay => "", :loop => "")

# ╔═╡ 958ab19c-cc56-11ea-162e-d3664e66ff66
md"### YouTube, Vimeo, etc.

If you use `Resource` for video, the URL has to point to a _video file_ (like `.mp4` or `.mov`). 

Popular video sites don't give you that link, instead, you can use their **embed codes**. You can find these inside the video player, by right clicking or using the menu buttons. You then use that inside an HTML block:
```
html\"\"\"
~ paste embed code here ~
\"\"\"
```

You might need to change the `width` to `100%` to make it fit."

# ╔═╡ 8477619c-cc57-11ea-0618-1778c502d28f
html"""

<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/438210156" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

"""

# ╔═╡ f743076c-cc57-11ea-1a8e-8799d9db985a


# ╔═╡ c65d28a2-c75d-11ea-2e13-7332f93d9c5e
md"## LocalResource _(not recommended)_

The examples above use `Resource` to make media from a URL available inside Markdown. To use **local files**, simply **replace `Resource` with `LocalResource`**, and use a _file path_ instead of a URL."

# ╔═╡ c16dff74-cc5d-11ea-380c-aff1639b5551


# ╔═╡ dada2154-c75d-11ea-2312-b9156a9a531e
html"<span style='font-family: cursive; color: purple;'>I really hope that this works</span>"

# ╔═╡ f809110c-cc55-11ea-1551-e138c28d5d82
md"""Hello I am a dog $(LocalResource("C:\\Users\\fons\\Pictures\\hannes.jpg"))"""

# ╔═╡ 1c930364-cc58-11ea-36c8-0ddf7c4700cd
md""" $(html"<span style='font-family: cursive; color: purple;'>OOPS</span>"), it didn't!

$(html"<br>")

Here are **two tips** for getting local images to work correctly:

1. Go to [imgur.com](https://imgur.com) and drag&drop the image to the page. Right click on the image, and select "Copy image location". You can now use the image like so: 

   ```PlutoUI.Resource("https://i.imgur.com/SAzsMMA.jpg")```


2. If your notebook is part of a git repository, place the image in the repository and use a relative path: 
   
    ```PlutoUI.LocalResource("../images/cat.jpg")```


"""

# ╔═╡ c48b48f6-cc5d-11ea-0f3b-d3481238625d


# ╔═╡ ea6ade22-cc5a-11ea-1782-97f2464fd148
md"#### Why does it have to be so difficult?

Pluto only stores _code_ in the notebook file, not images. This minimal file format is very valuable, but it means that images need to be _addressed_, not stored.

Addressing _local files_ is fragile: if someone else opens the notebook, or if you move the notebook to a different folder, that image file needs to be available at exactly the same path. This is difficult to do correctly, and if it works for you, it is hard to tell if it will work for someone else. 

Putting images online might be a hassle, but once it works, it will work everywhere! The stateless nature of URLs means that the images will work regardless of how the notebook file is accessed, while keeping a minimal file format."

# ╔═╡ a245dddc-cc59-11ea-3e1d-1763673ff706
md"# PlutoUI without Pluto

Huh?

Did you know that you can run Pluto notebooks _without Pluto_? If your notebook is called `wow.jl`, then 
```sh
$ julia wow.jl
```
will run the notebook just fine. 

When you use `@bind`, your notebook can still run without Pluto! Sort of. Normally, all bound variables are assigned the value `missing` when you run it elsewhere. However, the `PlutoUI` types have all been configured to assign a more sensible default value.

For example, if your notebook contains
```julia
@bind x Slider(10:20)
```
and you run it without Pluto, then this statement simply assigns `x = 10`.
"

# ╔═╡ 0cda8986-cc64-11ea-2acc-b5c38fdf17e5


# ╔═╡ 0da7bc30-cc64-11ea-1dde-2b7f2dd76036
md"`Pluto` and `PlutoUI` work independently of each other! In fact, _you_ could write a package with fun input elements, or add `@bind`able values to existing packages."

# ╔═╡ 512fe760-cc4c-11ea-1c5b-2b32da035aad
md"# Appendix"

# ╔═╡ 55bcdbf8-cc4c-11ea-1549-87c076a59ff4
space = html"<br><br><br>"

# ╔═╡ fb6142f6-c765-11ea-29fd-7ff4e823c02b
space

# ╔═╡ ebfc61b0-c765-11ea-1d66-cbf1dcdb8bdb
space

# ╔═╡ f69a5d5e-c765-11ea-3fa0-230c6c619730
space

# ╔═╡ 35523932-cc4f-11ea-0908-2d51c57176b7
space

# ╔═╡ d163f434-cc5a-11ea-19e9-9319ba994efa
space

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
PlutoUI = "~0.7.18"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[AbstractPlutoDingetjes]]
deps = ["Pkg"]
git-tree-sha1 = "0ec322186e078db08ea3e7da5b8b2885c099b393"
uuid = "6e696c72-6542-2067-7265-42206c756150"
version = "1.1.0"

[[Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[Distributed]]
deps = ["Random", "Serialization", "Sockets"]
uuid = "8ba89e20-285c-5b6f-9357-94700520ee1b"

[[Hyperscript]]
deps = ["Test"]
git-tree-sha1 = "8d511d5b81240fc8e6802386302675bdf47737b9"
uuid = "47d2ed2b-36de-50cf-bf87-49c2cf4b8b91"
version = "0.0.4"

[[HypertextLiteral]]
git-tree-sha1 = "5efcf53d798efede8fee5b2c8b09284be359bf24"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.2"

[[IOCapture]]
deps = ["Logging", "Random"]
git-tree-sha1 = "f7be53659ab06ddc986428d3a9dcc95f6fa6705a"
uuid = "b5f81e59-6552-4d32-b1f0-c071b021bf89"
version = "0.2.2"

[[InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "8076680b162ada2a031f707ac7b4953e30667a37"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.2"

[[LibGit2]]
deps = ["Printf"]
uuid = "76f85450-5226-5b5a-8eaa-529ad045b433"

[[Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[Parsers]]
deps = ["Dates"]
git-tree-sha1 = "ae4bbcadb2906ccc085cf52ac286dc1377dceccc"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.1.2"

[[Pkg]]
deps = ["Dates", "LibGit2", "Libdl", "Logging", "Markdown", "Printf", "REPL", "Random", "SHA", "UUIDs"]
uuid = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"

[[PlutoUI]]
deps = ["AbstractPlutoDingetjes", "Base64", "Dates", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "Markdown", "Random", "Reexport", "UUIDs"]
git-tree-sha1 = "57312c7ecad39566319ccf5aa717a20788eb8c1f"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.18"

[[Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[REPL]]
deps = ["InteractiveUtils", "Markdown", "Sockets"]
uuid = "3fa0cd96-eef1-5676-8a61-b3b8758bbffb"

[[Random]]
deps = ["Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[Reexport]]
git-tree-sha1 = "45e428421666073eab6f2da5c9d310d99bb12f9b"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.2.2"

[[SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"

[[Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[Test]]
deps = ["Distributed", "InteractiveUtils", "Logging", "Random"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"
"""

# ╔═╡ Cell order:
# ╟─bc532cd2-c75b-11ea-313f-8b5e771c9227
# ╟─3eff9592-cc63-11ea-2b61-4170d1a7656a
# ╟─051f31fc-cc63-11ea-1e2c-0704285ea6a9
# ╠═071d9ca5-9b42-4583-ad96-a48f93453a0e
# ╟─fb6142f6-c765-11ea-29fd-7ff4e823c02b
# ╟─fddb794c-c75c-11ea-1f55-eb9c178424cd
# ╟─1e10d82a-c766-11ea-0c4b-3bd77f62759d
# ╟─b819e9a8-c760-11ea-11ee-dd01da663b5c
# ╠═34ebf81e-c760-11ea-05bb-376173e7ed10
# ╠═a4488984-c760-11ea-2930-871f6b400ef5
# ╟─1048d1e0-cc50-11ea-1bf3-d76cae42740a
# ╟─a709fd2e-c760-11ea-05c5-7bf673990de1
# ╠═d3811ac2-c760-11ea-0811-131d9f1d3910
# ╠═dfe10b6c-c760-11ea-2f77-79cc4cfa8dc4
# ╟─06962cde-cc4f-11ea-0d96-69a8cb7eeda2
# ╟─e49623ac-c760-11ea-3689-c15f2e2f6081
# ╠═314cb85a-c761-11ea-1cba-b73f84a52be8
# ╟─3c68b25c-c761-11ea-226a-4f46579a6732
# ╟─104b55ce-cc4f-11ea-1273-092a1717e399
# ╟─4513b730-c761-11ea-1460-2dca56081fcf
# ╠═4f8e4e1e-c761-11ea-1787-419cab59bb12
# ╟─b787ead6-c761-11ea-3b17-41c0a5434f9b
# ╟─177e6bf0-cc50-11ea-0de2-e77544f5c615
# ╟─b08c347e-c761-11ea-1b61-7b69631d078b
# ╠═b53c8ffa-c761-11ea-38d1-2d4ad96a7bee
# ╟─adcf4e68-c761-11ea-00bb-c3b15c6dedc0
# ╟─1a562ad4-cc50-11ea-2485-cdec6e1a78dc
# ╟─5d420570-c764-11ea-396b-cf0db01d34aa
# ╟─09393bf2-cc4f-11ea-1e48-cfbedab8e6b4
# ╟─cd1b5872-c761-11ea-2179-57a3cb34d235
# ╠═d9e85ed0-c761-11ea-30bf-83ce272526e0
# ╟─e4c262d6-c761-11ea-36b2-055419bfc981
# ╟─0934bc0c-cc50-11ea-0da8-0d6b2f275399
# ╟─e690337c-c761-11ea-08be-ade40a464eb4
# ╠═f1f83980-c761-11ea-1e34-97c0ffca3f67
# ╟─f985c8de-c761-11ea-126c-1fd79d547b79
# ╟─1cbfd28e-cc50-11ea-2c90-a7807e4979ef
# ╟─0136af80-c762-11ea-2f1a-9dccff334a11
# ╠═0e6f0508-c762-11ea-0352-09bd694a9b35
# ╠═3dcd7002-c765-11ea-323d-a1fb49409011
# ╟─0aa3c85e-cc4f-11ea-2fba-4bdd513d9217
# ╟─5833f7f4-c763-11ea-0b95-9b21a40192a9
# ╠═690cf3ac-c763-11ea-10f0-b3e28c380be9
# ╠═705662e2-c763-11ea-2f6d-cdaffc1fc73a
# ╟─3930f0d8-cc50-11ea-3de6-d91ac5c6cd9f
# ╟─787a2c88-c763-11ea-0a32-bb91ca60113d
# ╠═ac8c4dee-c763-11ea-1b2d-c590a2d50d7e
# ╠═dcda9ad2-c763-11ea-3ec6-093b823ba66d
# ╟─0c3ab1f8-cc4f-11ea-0cfb-8f076d2c9836
# ╟─62c6f866-f0fe-11ea-0961-319f28d040d4
# ╠═a01c8096-f0fe-11ea-3e78-ad8551e84fa1
# ╠═a20e30f2-f0fe-11ea-0ca7-c5195c9eb24a
# ╟─c819ef3e-f0fe-11ea-1213-9df7597e4e89
# ╟─b104ba6d-0293-4378-9652-f628f1d08d97
# ╠═16f2218d-f1bc-4b34-a355-53acfa77fbf5
# ╠═2c7811cb-d9ea-470c-8cb7-2b3803489f3f
# ╟─283d1177-c605-4652-905b-9a70354cf878
# ╟─0b1ce22e-c764-11ea-3d60-e799d58aee30
# ╠═6d9108a8-c765-11ea-0a38-09a1364998b1
# ╠═7a14e496-c765-11ea-20a1-6fb960009251
# ╟─3eff932a-cc50-11ea-366e-812d3854dd4c
# ╟─7e10fb52-c765-11ea-2a71-0fc347d09885
# ╠═b91764e8-c765-11ea-27a2-4ba5777fbd89
# ╠═bb356b12-c765-11ea-2c36-697f4314bb93
# ╟─9276da28-cc4f-11ea-17b3-65eec41a181e
# ╟─92def54a-cc4f-11ea-12c5-652f2bb46413
# ╠═9920e56c-cc4f-11ea-2d5e-f5371c79f048
# ╠═44591b34-cc50-11ea-2005-2f7075e6f2db
# ╟─4fda3072-cc50-11ea-2804-197b6391b269
# ╟─ebfc61b0-c765-11ea-1d66-cbf1dcdb8bdb
# ╟─3e5dd7d2-c760-11ea-1dca-6d8720b3558d
# ╟─f31668c6-c768-11ea-1501-5f41afa7c83b
# ╠═417390ba-c760-11ea-27df-5908858ae88c
# ╠═49e7cd06-c760-11ea-3f5d-2741d94278a6
# ╟─31a2f3c4-cc51-11ea-3652-bd814517a4b5
# ╟─67709812-c760-11ea-2bda-9756ead35749
# ╠═4c2b45a0-c760-11ea-2b64-3fefc820cd5b
# ╠═5be148cc-c760-11ea-0819-a7bb403d27ff
# ╟─347e3d06-cc51-11ea-012c-43e824eaffa2
# ╟─343d7118-cc51-11ea-387a-fb22d8c73506
# ╟─32e41ac2-cc51-11ea-3358-bbead9c68123
# ╟─f74f434a-c768-11ea-079c-fb707e6ba17b
# ╟─ea00721c-cc4b-11ea-1e82-0b3dbe6a7f1e
# ╠═fc12280c-c768-11ea-3ebc-ebcd6b3459c1
# ╠═067cbcde-cc4c-11ea-3eed-972dc6d7bb3b
# ╟─f69a5d5e-c765-11ea-3fa0-230c6c619730
# ╟─ad8e9b30-c75d-11ea-1fd0-0b53592135bf
# ╟─87d088d0-cc54-11ea-02c6-bd673b95b9d3
# ╟─6a7e7e54-c75e-11ea-2ea7-ed3da37e9e96
# ╟─9ac7921c-c75e-11ea-30f5-c35e6ee370cb
# ╟─a8c57442-c75e-11ea-1913-7d82cbd2c69c
# ╠═cb37b916-c75b-11ea-0c83-6ba759536075
# ╠═16ea31fc-c75e-11ea-0f2d-dd790a56b2dc
# ╠═1dfd8cc6-c75e-11ea-3c04-a96734779c97
# ╟─2fda30ea-c75e-11ea-2ff5-7f2dcf4f9b66
# ╠═525ceea0-c75e-11ea-2766-f72418fd784e
# ╠═382d41d8-c75e-11ea-2ae3-2ffe96e04b5a
# ╟─958ab19c-cc56-11ea-162e-d3664e66ff66
# ╠═8477619c-cc57-11ea-0618-1778c502d28f
# ╟─f743076c-cc57-11ea-1a8e-8799d9db985a
# ╟─c65d28a2-c75d-11ea-2e13-7332f93d9c5e
# ╟─c16dff74-cc5d-11ea-380c-aff1639b5551
# ╟─dada2154-c75d-11ea-2312-b9156a9a531e
# ╠═f809110c-cc55-11ea-1551-e138c28d5d82
# ╟─1c930364-cc58-11ea-36c8-0ddf7c4700cd
# ╟─c48b48f6-cc5d-11ea-0f3b-d3481238625d
# ╟─ea6ade22-cc5a-11ea-1782-97f2464fd148
# ╟─35523932-cc4f-11ea-0908-2d51c57176b7
# ╟─a245dddc-cc59-11ea-3e1d-1763673ff706
# ╟─0cda8986-cc64-11ea-2acc-b5c38fdf17e5
# ╟─0da7bc30-cc64-11ea-1dde-2b7f2dd76036
# ╟─d163f434-cc5a-11ea-19e9-9319ba994efa
# ╟─512fe760-cc4c-11ea-1c5b-2b32da035aad
# ╠═55bcdbf8-cc4c-11ea-1549-87c076a59ff4
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
