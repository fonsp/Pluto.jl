### A Pluto.jl notebook ###
# v0.11.3

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : missing
        el
    end
end

# ╔═╡ fd0763a0-b163-11ea-23b4-a7bae7052e19
md"# File picker"

# ╔═╡ 592d3ac0-b15e-11ea-313c-db05bc7303cc
md"# Notebook interaction"

# ╔═╡ 6dde0352-b15e-11ea-2fa8-7327cc366c1a
md"## Running multiple cells"

# ╔═╡ f0b821b0-b15f-11ea-1f64-dd33aa85b54e
md"## Moving cells"

# ╔═╡ 4980fc10-b163-11ea-081b-c1335699a8f6
md"## Stopping cells"

# ╔═╡ d2c1d090-b162-11ea-0c17-2b234c098cf9
md"# CodeMirror"

# ╔═╡ d890a190-b162-11ea-31dd-8d603787e5c5
md"## Autocomplete"

# ╔═╡ e141f910-b162-11ea-039b-3ba1414cbd07


# ╔═╡ c7a1f21e-c137-11ea-1d11-8fb5508ac80c
md"## Selections"

# ╔═╡ 39724bae-b160-11ea-0af5-737755a57e48
md"# Network"

# ╔═╡ f33dc5b0-b160-11ea-15e3-1b54697b5872


# ╔═╡ 95492630-b15f-11ea-3f16-410fe87cd32c
md"# Errors"

# ╔═╡ c1c894f0-b166-11ea-31e0-dd1cddb7b7ca
md"## Multiple definitions"

# ╔═╡ d05d7df0-b166-11ea-2d8f-39b31a42890d
1
2

# ╔═╡ bdeba8e0-b166-11ea-3913-3138ab428083
md"## Stack traces"

# ╔═╡ 84888e20-b160-11ea-1d61-c5934251d6dd
html"<div style='height: 100vh'></div>"

# ╔═╡ ea3f77f0-b166-11ea-046e-ef39bfc57d0f
md"## Bad errors"

# ╔═╡ ee92a570-b166-11ea-38fa-0f3563b3f790
TODO: add that error showing error to the Julia tests

# ╔═╡ 4f32c16e-b15e-11ea-314e-01700baeb92d
md"# Bonds"

# ╔═╡ 3a14b3f0-b165-11ea-153d-796416ee5ccc
md"## Lossy"

# ╔═╡ 59966a90-b163-11ea-1786-e56e45f06dd0
md"## Recursive"

# ╔═╡ 55bade10-b163-11ea-327f-132c93471713
md"## Scrolling"

# ╔═╡ 431d17c0-cfff-11ea-39b5-394b34438544
md"### `text/html`"

# ╔═╡ 32b5edc0-b15d-11ea-09d6-3b889f6d397a
md"# Rich display

## `image/svg+xml` and `image/jpeg`"

# ╔═╡ 3be84600-b166-11ea-1d24-59212363543f
md"## `text/plain`"

# ╔═╡ 95898660-b166-11ea-1db1-df7f3c4f1353
"<b>I am not bold</b>"

# ╔═╡ 2859a890-b161-11ea-14e9-b7ddaf08195a
md"## Tree view"

# ╔═╡ 88bd7aae-b15f-11ea-270e-ab00e6a01203
["asdf", "<b>I am not bold</b>"]

# ╔═╡ 479df620-b161-11ea-0d2b-293fac4e46bb
md"## Markdown"

# ╔═╡ 57a82490-b162-11ea-0fdb-73c57b08830f
md"Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.

Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there."

# ╔═╡ 5dbbc6c0-b162-11ea-0890-7f0e994b2691
md"Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there."

# ╔═╡ e9a68626-d04c-11ea-35ae-cb157d97fdf7
md"## CSS defaults"

# ╔═╡ 2afb1380-d04d-11ea-27e6-6733f186032a
md"that are essential to **bold getting** there.

that are essential to _italics getting_ there.

that are essential to _**bold italics getting**_ there.

that are essential to [linky](asfdfds) getting there.

that are essential to `Base.get` getting there.

that are essential to **`Base.bold`** getting there.

that are essential to _`Base.italics`_ getting there.

that are essential to _**`Base.bitald`**_ getting there.

"

# ╔═╡ 539c6442-d04d-11ea-2b5d-8faeb152a6fb
md"""
### Heading 3 - hello **bold** but also _italics_ and _**both**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
#### Heading 4 - hello **bold** but also _italics_ and _**both**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
##### Heading 5 - hello **bold** but also _italics_ and _**both**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
###### Heading 6 - hello **bold** but also _italics_ and _**both**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
"""

# ╔═╡ fcf2e354-d04d-11ea-1340-1d6211796d5e
md"""
### Heading 3 - `hey` hello **`bold`** but also _`italics`_ and _**`both`**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
#### Heading 4 - `hey` hello **`bold`** but also _`italics`_ and _**`both`**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
##### Heading 5 - `hey` hello **`bold`** but also _`italics`_ and _**`both`**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
###### Heading 6 - `hey` hello **`bold`** but also _`italics`_ and _**`both`**_
Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
"""

# ╔═╡ e8c7abe6-d050-11ea-3999-e3f1d4994c0c
md"Hey I am referencing [^1], [^two], [^Raa97] and [^another_one_here].

[^another_one_here]: Heyy"

# ╔═╡ 95de7fac-d04d-11ea-0d83-f1b05c9bd972
md"""
> **Blockquote:** Writing a notebook is not just about writing the final document — Pluto empowers the experiments and discoveries that are essential to getting there.
"""

# ╔═╡ 33b2934e-d04e-11ea-0f18-0dfec350bb5e
md"""Here is some generic code:
```
Markdown = "d6f4376e-aef5-505a-96c1-9c027394607a"
Pkg = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"
REPL = "3fa0cd96-eef1-5676-8a61-b3b8758bbffb"
Sockets = "6462fe0b-24de-5631-8697-dd941f90decc"
UUIDs = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

with one very long line that should wrap on spaces with one very long line that should wrap on spaces with one very long line that should wrap on spaces with one very long line that should wrap

andoneverylonglinethathasnospacesandoneverylonglinethathasnospacesandoneverylonglinethathasnospacesandoneverylonglinethathasnospacesandoneverylong
```
And this is Julia code:
```julia
if (isfile(path))
    # 4 spaces
    return launch_notebook_response(path, title="Failed to load notebook", advice="The file <code>$(htmlesc(path))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
else
	# 1 tab
	return error_response(404, "Can't find a file here", "Please check whether <code>$(htmlesc(path))</code> exists.")
end
```

"""

# ╔═╡ a70fc678-d04d-11ea-0390-9705003cd285
md"---"

# ╔═╡ 29565386-d04e-11ea-3a40-47639d1fc22f
md"---
---"

# ╔═╡ 3804ce76-d68e-11ea-1641-b9d5e4d9bace
md"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic 

---

typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."

# ╔═╡ 2ee00948-d04e-11ea-3413-e5fb7dd2a25e
md"""
| Syntax      | Description | Test Text     |
| :---        |    :----:   |          ---: |
| Header      | Title       | Here's this   |
| Paragraph   | Text        | And more      |
"""

# ╔═╡ f0e92382-d682-11ea-3ede-65cd0f124ea4
md"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."

# ╔═╡ ac82922e-d04e-11ea-0bac-8530cacc5c72
md"""
Stage | Direct Products | ATP Yields
----: | --------------: | ---------:
Glycolysis | 2 ATP ||
^^ | 2 NADH | 3--5 ATP |
Pyruvaye oxidation | 2 NADH | 5 ATP |
Citric acid cycle | 2 ATP ||
^^ | 6 NADH | 15 ATP |
^^ | 2 FADH2 | 3 ATP |
**30--32** ATP |||
[Net ATP yields per hexose]
"""

# ╔═╡ ee43c1b6-d04f-11ea-3a3d-1384ff255535
md"""
!!! tip
    asdf

!!! note "Note - Wowie!"

    asdf

!!! info
	I don't work?

!!! warning

    asdf
    
    line 2


!!! danger

    asdf
    
    line 2


"""

# ╔═╡ 17f53606-d051-11ea-3183-b3a4cb7180db
md"### Footnote defs

asdfdasd

[^1]: adsf
[^two]:
    asdfasfd
    
    line 2
[^thrice]:
    Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
    
    line 2"

# ╔═╡ 46fc284a-d682-11ea-34b6-69874efcaf65
md"### Text wrapping"

# ╔═╡ 1bb05fc0-b15d-11ea-3dae-7734f66a0c56
md"# Testing machinery"

# ╔═╡ 9ac925d0-b15d-11ea-2abd-7db360900be0
html"""
<style>
.test {
	padding: .5em; 
	border-radius: 6px;
}
.test::before,
.test::after {
	font-weight: bold;
}
.test.broken::after {
	content: "BROKEN";
}

.test.manual {
	background-color: rgba(200, 150, 0, .2); 
}
.test.visual {
	background-color: rgba(0, 150, 200, .2); 
}
.test.manual::before {
	content: "MANUAL ";
}
.test.visual::before {
	content: "VISUAL ";
}


</style>

"""

# ╔═╡ 878a4750-b15e-11ea-2584-8feba490699f
using Test

# ╔═╡ 7370dcc0-b15e-11ea-234b-23584c864b61
ma = 1

# ╔═╡ 75b21a30-b15e-11ea-3046-2170ec097e63
mb = 2

# ╔═╡ 7b74dd40-b15e-11ea-291a-d7e10a185718
@test ma + mb == 3

# ╔═╡ 9dc4a0a0-b15f-11ea-361c-87742cf3f2a2
function ef(x)
	
	
	sqrt(-x)
end

# ╔═╡ aab109c0-b15f-11ea-275d-31e21fcda8c4
ef(1)

# ╔═╡ 976bc2a0-b160-11ea-3e7a-9f033b0f2daf
function eg(x)
	
	
	sqrt(-x)
end

# ╔═╡ 9c74f9b2-b160-11ea-35fb-917cb1120f5b
eg(1)

# ╔═╡ 41a75500-b165-11ea-2519-bbd0feaef6cf
@bind bl1 html"<input type='range' max='100000'>"

# ╔═╡ 4ccbf670-b165-11ea-1951-c17ffb8a58cf
sleep(.5); bl1

# ╔═╡ 8bb26902-b165-11ea-048c-d7f7a72006ee
@assert bl1 isa Int64

# ╔═╡ e559eaf0-b165-11ea-0d81-ffc480afe8f3
@bind bl2 html"<input type='range' max='100000'>"

# ╔═╡ e63be680-b165-11ea-0fd3-bd4e0bf92eb8
bl2

# ╔═╡ f2c0bb90-b162-11ea-24a1-3f864a09e5ee
@bind bw1 html"<input type='range' value='0'>"

# ╔═╡ a4d4ac28-cfff-11ea-3f14-15d2928d2c88
zeros((bw1, bw1))

# ╔═╡ 56e6f440-b15e-11ea-1327-09932af5b5bd
HTML("<div style='height: $(bw1)vh'></div>")

# ╔═╡ 2296ac80-b163-11ea-3d00-ed366fa9ce3e
@bind bw2 html"<input type='range' value='0'>"

# ╔═╡ 20d72230-b163-11ea-39c2-69bf2c422d50
HTML("<div style='height: $(bw2)vh'></div>")

# ╔═╡ 55d116d6-cfff-11ea-25fc-056ce62c8bcd
zeros((bw2, bw2))

# ╔═╡ 76c98394-cfff-11ea-0b6c-25260a8a3bb9
zeros((10,10));

# ╔═╡ 52cb1264-d824-11ea-332a-55964f3d8b90
begin
	struct A end
	struct B end
	
	function Base.show(io::IO, ::MIME"image/svg+xml", x::A)
		write(io, read(download("https://raw.githubusercontent.com/fonsp/Pluto.jl/main/frontend/img/logo.svg")))
	end
	function Base.show(io::IO, ::MIME"image/jpg", x::B)
		write(io, read(download("https://fonsp.com/img/doggoSmall.jpg?raw=true")))
	end
	nothing
end

# ╔═╡ 5d59acfe-d824-11ea-1d7b-07551a2b11d4
A()

# ╔═╡ 64d929aa-d824-11ea-2cc1-835fbe38be11
B()

# ╔═╡ 661c112e-d824-11ea-3612-4104449c409e
[A(), B()]

# ╔═╡ 42f0a872-b166-11ea-0c71-355d62f67fca
ra = 1:100

# ╔═╡ 794bc212-b166-11ea-0840-fddb29190841
1:13

# ╔═╡ 23f41dd2-b15c-11ea-17d2-45b3e83093ba
Ref(Dict(:a => [1,md"![](https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/PDS_70.jpg/567px-PDS_70.jpg)", md"# Hello"], [3,4] => (:b, (x=3, y=2))))

# ╔═╡ 4d452956-d682-11ea-3aeb-cd7d1b2f67dc
s="12345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678012345678056780123456780123456780123456780123456780123456780123456780123456780123456780120123456780\n\n\"\"\n\n5678012345678012

7801234567801234567801234567 7801234567801234567801234567 7801234567801234567801234567 7801234567801234567801234567 7801234567801234567801234567

👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧‍👦👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧👩‍👩‍👧❤❤❤✔

Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."

# ╔═╡ 4e320206-d682-11ea-3dfe-b77f6e96f33a
Text(s)

# ╔═╡ 7e2cc6c0-b15d-11ea-32b0-15394cdebd35
function ask(kind, str::Markdown.MD)
	HTML("<div class='test $(kind)'>" * sprint(show, MIME"text/html"(), str) * "</div>")
end

# ╔═╡ ce7f9d90-b163-11ea-0ff7-cf7378644741
ask("visual", md"During launch: 👆👆 Header should be BLUE and say LOADING")

# ╔═╡ 11f3ae90-b164-11ea-1027-0d2e6e7048dd
ask("visual", md"Hover shows path outlined and RENAME button")

# ╔═╡ 26d2b310-b164-11ea-0029-f7b04ee5ba73
ask("manual", md"Autocomplete shows on every keystroke")

# ╔═╡ 1c6229f0-b165-11ea-0f1d-674022c43971
ask("manual", md"Autocompleting a **directory** using ENTER does what you expect")

# ╔═╡ 427e4980-b164-11ea-3604-69e5af4ad390
ask("manual", md"Delete `jl` from the end, it gives **one** suggestion: the original path, with a sheet-of-paper icon")

# ╔═╡ 6e04dd80-b164-11ea-0b33-7dc165574a35
ask("manual", md"Delete `?.jl` (4 charachters) from the end, it gives **two** suggestions: 
- the original path, with a sheet-of-paper icon
- a new suggested path, which ends with `.jl (new)` and has a different icon

1. Click RENAME
1. _There is a confirmation pop-up_
1. Click CANCEL
1. _The path changes back to the original_
1. Change the name again
1. Press `ENTER`
1. _There is a confirmation pop-up_
1. Click OK
1. _Path remains the same_
1. _The notebook is LOADING for a second_
")

# ╔═╡ 5fd66630-b15e-11ea-29b3-5fdf839d105b
ask("visual", md"Fold symbol should follow page scroll for long cells")

# ╔═╡ 9b26e0c0-b15e-11ea-1fbb-a34d46c520fa
ask("manual", md"Swap names `ma` and `mb`, then use `Ctrl+S` to run both cells. Then again, now use 'Submit all changes' button at top of notebook")

# ╔═╡ f4015940-b15f-11ea-0f3a-1714c79023c3
ask("manual", md"Move this cell:
- before itself (should not change pos)
- after itself (should not change pos)
- somewhere else

Drag to end of the screen, **should autoscroll**")

# ╔═╡ 1b569b72-b167-11ea-1462-63674f7e13db
ask("manual", md"Test autocomplete")

# ╔═╡ cd3f70fc-c137-11ea-2871-936287684d2c
ask("manual", md"Select a chunk of code, then put your cursor in another cell
	
Selection of the original cell should collapse")

# ╔═╡ f7297d72-c137-11ea-3a9b-a10be62c3976
ask("manual", md"Put your cursor in this cell, scroll down 2 screens, and click somewhere else
	
Page should not jump back to this cell")

# ╔═╡ 4902abb2-b160-11ea-1120-f501bf151fc2
ask("manual", md"Refresh quickly & slowly a couple of times")

# ╔═╡ 58721630-b160-11ea-30b4-e9667b4df6da
ask("manual", md"Change UUID in URL to something invalid - should redirect to `/`")

# ╔═╡ c8595660-b166-11ea-0b6f-31d05ec9f51f
ask("manual", md"Click on the error")

# ╔═╡ e4a7c0b0-b15f-11ea-2eff-ad120d8cb859
ask("manual", md"Click both yellow items in the stack trace, the relevant line should be selected and scrolled into view")

# ╔═╡ ba734f30-b15f-11ea-0490-a55c3739e4bf
ask("visual", md"Stack trace should have **5** frames and they should look nice
	
The last **2** should have yellow 'filenames'")

# ╔═╡ a4f07420-b160-11ea-2c62-9115046e4e24
ask("manual broken", md"The `eg` cell should get unfolded when the stack frame is clicked")

# ╔═╡ 5f37b100-b165-11ea-2f65-158f1392aea9
ask("manual", md"Move the slider, the second cell should **not** execute on intermediate values. It should **not** be executing 500ms after releasing the slider.")

# ╔═╡ b3047b10-b165-11ea-014e-25d14d54558c
ask("manual", md"1. Move the slider
1. Uncomment the second cell and run
1. _The second cell has the slider value_
1. Move the slider
1. _Second cell updates_")

# ╔═╡ 0d1ca080-b163-11ea-2927-7b46d602f837
ask("manual", md"Moving slider should **not scroll** window")

# ╔═╡ 0c499910-b163-11ea-3fee-c5d006a97ff7
ask("manual", md"Moving slider should **scroll** window to **keep this message at a fixed position**")

# ╔═╡ b5cf05fa-cfff-11ea-2c43-6748c5d90a1e
ask("manual", md"**Delete** semicolon below, then **add** semicolon back. CodeMirror should stay fixed on screen.")

# ╔═╡ 6f4ba610-d824-11ea-2e8f-a1ec77bcaad3
ask("visual", md"**Pluto logo** and **dogs** visible")

# ╔═╡ 7fc898f4-d824-11ea-0edd-ff2084f0652f
ask("visual", md"**Pluto logo** and **dogs** visible")

# ╔═╡ 486c7770-b166-11ea-22df-b38b69fb51ad
ask("visual", md"Shows assignee `ra`")

# ╔═╡ 5f28c770-b166-11ea-3099-afb5ec07119b
ask("visual", md"Output can be scrolled horizontally")

# ╔═╡ 80e7b1f0-b166-11ea-1434-ff74883f762d
ask("visual", md"No scrollbar")

# ╔═╡ 893d7bf2-b166-11ea-1580-63694795488b
ask("visual", md"HTML tags are visible")

# ╔═╡ de56f5d2-b15c-11ea-320b-31b4da177c3a
ask("manual", md"I must be an expandable tree")

# ╔═╡ f3e429be-b15e-11ea-2a93-4516283aa4c0
ask("visual", md"Element alignment should be on baseline")

# ╔═╡ 4096de22-b15f-11ea-0178-17a2ac624e96
ask("visual broken", md"HTML should be escaped")

# ╔═╡ 9df64d10-b161-11ea-2c8c-ff6f0b978cc2
ask("visual", md"Tests visibile inside the following Markdown")

# ╔═╡ 78ef6e12-b162-11ea-1474-b3e749a7b705
ask("visual", md"Assignment to `低调又牛逼的类型系统` must be visible")

# ╔═╡ e16977de-b15a-11ea-3cbd-35af9445d31d
低调又牛逼的类型系统 = md"""
 $(ask("visual", md"Heading in simplified Chinese:"))

#### 低调又牛逼的类型系统

 $(ask("visual", md"Code and LaTeX math inline"))

 比如，`sin.(A)` 会计算 A 中每个元素的 $\sin(A)$ 值

 $(ask("visual", md"Bigger and centered LaTeX math"))

``\frac{\pi^2}{2}``

 $(ask("visual broken", md"Heading & text in Arabic displayed right-to-left"))

## الكَوكَب

يظن بأن كوكب الأرض هو مركز الكون

 $(ask("visual", md"Greek"))

Πλθτο ισ εεν πλανεετ! Some maths: 

 $(ask("visual broken", md"Identical symbols:"))

``\pi = π``

 $(ask("visual", md"Image **should not** fill page when widescreen, image **should** fill page when narrow screen"))

![](https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/PDS_70.jpg/567px-PDS_70.jpg)"""

# ╔═╡ 21bd9950-b15d-11ea-2632-41b1c66563bd
ask("visual", md"These three paragraphs must have equal spacing between them")

# ╔═╡ Cell order:
# ╟─ce7f9d90-b163-11ea-0ff7-cf7378644741
# ╠═878a4750-b15e-11ea-2584-8feba490699f
# ╟─fd0763a0-b163-11ea-23b4-a7bae7052e19
# ╟─11f3ae90-b164-11ea-1027-0d2e6e7048dd
# ╟─26d2b310-b164-11ea-0029-f7b04ee5ba73
# ╟─1c6229f0-b165-11ea-0f1d-674022c43971
# ╟─427e4980-b164-11ea-3604-69e5af4ad390
# ╟─6e04dd80-b164-11ea-0b33-7dc165574a35
# ╟─592d3ac0-b15e-11ea-313c-db05bc7303cc
# ╟─5fd66630-b15e-11ea-29b3-5fdf839d105b
# ╟─6dde0352-b15e-11ea-2fa8-7327cc366c1a
# ╟─9b26e0c0-b15e-11ea-1fbb-a34d46c520fa
# ╠═7370dcc0-b15e-11ea-234b-23584c864b61
# ╠═75b21a30-b15e-11ea-3046-2170ec097e63
# ╠═7b74dd40-b15e-11ea-291a-d7e10a185718
# ╠═f0b821b0-b15f-11ea-1f64-dd33aa85b54e
# ╟─f4015940-b15f-11ea-0f3a-1714c79023c3
# ╟─4980fc10-b163-11ea-081b-c1335699a8f6
# ╟─d2c1d090-b162-11ea-0c17-2b234c098cf9
# ╟─d890a190-b162-11ea-31dd-8d603787e5c5
# ╟─1b569b72-b167-11ea-1462-63674f7e13db
# ╠═e141f910-b162-11ea-039b-3ba1414cbd07
# ╟─c7a1f21e-c137-11ea-1d11-8fb5508ac80c
# ╠═cd3f70fc-c137-11ea-2871-936287684d2c
# ╠═f7297d72-c137-11ea-3a9b-a10be62c3976
# ╟─39724bae-b160-11ea-0af5-737755a57e48
# ╟─4902abb2-b160-11ea-1120-f501bf151fc2
# ╟─58721630-b160-11ea-30b4-e9667b4df6da
# ╠═f33dc5b0-b160-11ea-15e3-1b54697b5872
# ╟─95492630-b15f-11ea-3f16-410fe87cd32c
# ╟─c1c894f0-b166-11ea-31e0-dd1cddb7b7ca
# ╟─c8595660-b166-11ea-0b6f-31d05ec9f51f
# ╠═d05d7df0-b166-11ea-2d8f-39b31a42890d
# ╟─bdeba8e0-b166-11ea-3913-3138ab428083
# ╟─e4a7c0b0-b15f-11ea-2eff-ad120d8cb859
# ╟─ba734f30-b15f-11ea-0490-a55c3739e4bf
# ╠═aab109c0-b15f-11ea-275d-31e21fcda8c4
# ╟─84888e20-b160-11ea-1d61-c5934251d6dd
# ╠═9dc4a0a0-b15f-11ea-361c-87742cf3f2a2
# ╟─a4f07420-b160-11ea-2c62-9115046e4e24
# ╟─976bc2a0-b160-11ea-3e7a-9f033b0f2daf
# ╠═9c74f9b2-b160-11ea-35fb-917cb1120f5b
# ╟─ea3f77f0-b166-11ea-046e-ef39bfc57d0f
# ╠═ee92a570-b166-11ea-38fa-0f3563b3f790
# ╟─4f32c16e-b15e-11ea-314e-01700baeb92d
# ╟─3a14b3f0-b165-11ea-153d-796416ee5ccc
# ╟─5f37b100-b165-11ea-2f65-158f1392aea9
# ╠═41a75500-b165-11ea-2519-bbd0feaef6cf
# ╠═4ccbf670-b165-11ea-1951-c17ffb8a58cf
# ╠═8bb26902-b165-11ea-048c-d7f7a72006ee
# ╟─b3047b10-b165-11ea-014e-25d14d54558c
# ╠═e559eaf0-b165-11ea-0d81-ffc480afe8f3
# ╠═e63be680-b165-11ea-0fd3-bd4e0bf92eb8
# ╟─59966a90-b163-11ea-1786-e56e45f06dd0
# ╟─55bade10-b163-11ea-327f-132c93471713
# ╟─431d17c0-cfff-11ea-39b5-394b34438544
# ╟─0d1ca080-b163-11ea-2927-7b46d602f837
# ╠═f2c0bb90-b162-11ea-24a1-3f864a09e5ee
# ╠═a4d4ac28-cfff-11ea-3f14-15d2928d2c88
# ╠═56e6f440-b15e-11ea-1327-09932af5b5bd
# ╠═20d72230-b163-11ea-39c2-69bf2c422d50
# ╠═55d116d6-cfff-11ea-25fc-056ce62c8bcd
# ╟─0c499910-b163-11ea-3fee-c5d006a97ff7
# ╠═2296ac80-b163-11ea-3d00-ed366fa9ce3e
# ╟─b5cf05fa-cfff-11ea-2c43-6748c5d90a1e
# ╠═76c98394-cfff-11ea-0b6c-25260a8a3bb9
# ╟─32b5edc0-b15d-11ea-09d6-3b889f6d397a
# ╟─52cb1264-d824-11ea-332a-55964f3d8b90
# ╟─6f4ba610-d824-11ea-2e8f-a1ec77bcaad3
# ╠═5d59acfe-d824-11ea-1d7b-07551a2b11d4
# ╠═64d929aa-d824-11ea-2cc1-835fbe38be11
# ╟─7fc898f4-d824-11ea-0edd-ff2084f0652f
# ╠═661c112e-d824-11ea-3612-4104449c409e
# ╟─3be84600-b166-11ea-1d24-59212363543f
# ╟─486c7770-b166-11ea-22df-b38b69fb51ad
# ╟─5f28c770-b166-11ea-3099-afb5ec07119b
# ╠═42f0a872-b166-11ea-0c71-355d62f67fca
# ╟─80e7b1f0-b166-11ea-1434-ff74883f762d
# ╠═794bc212-b166-11ea-0840-fddb29190841
# ╟─893d7bf2-b166-11ea-1580-63694795488b
# ╟─95898660-b166-11ea-1db1-df7f3c4f1353
# ╟─2859a890-b161-11ea-14e9-b7ddaf08195a
# ╟─de56f5d2-b15c-11ea-320b-31b4da177c3a
# ╟─f3e429be-b15e-11ea-2a93-4516283aa4c0
# ╟─23f41dd2-b15c-11ea-17d2-45b3e83093ba
# ╟─4096de22-b15f-11ea-0178-17a2ac624e96
# ╠═88bd7aae-b15f-11ea-270e-ab00e6a01203
# ╟─479df620-b161-11ea-0d2b-293fac4e46bb
# ╟─9df64d10-b161-11ea-2c8c-ff6f0b978cc2
# ╟─78ef6e12-b162-11ea-1474-b3e749a7b705
# ╟─e16977de-b15a-11ea-3cbd-35af9445d31d
# ╟─21bd9950-b15d-11ea-2632-41b1c66563bd
# ╟─57a82490-b162-11ea-0fdb-73c57b08830f
# ╟─5dbbc6c0-b162-11ea-0890-7f0e994b2691
# ╟─e9a68626-d04c-11ea-35ae-cb157d97fdf7
# ╟─2afb1380-d04d-11ea-27e6-6733f186032a
# ╟─539c6442-d04d-11ea-2b5d-8faeb152a6fb
# ╠═fcf2e354-d04d-11ea-1340-1d6211796d5e
# ╟─e8c7abe6-d050-11ea-3999-e3f1d4994c0c
# ╟─95de7fac-d04d-11ea-0d83-f1b05c9bd972
# ╟─33b2934e-d04e-11ea-0f18-0dfec350bb5e
# ╠═a70fc678-d04d-11ea-0390-9705003cd285
# ╠═29565386-d04e-11ea-3a40-47639d1fc22f
# ╠═3804ce76-d68e-11ea-1641-b9d5e4d9bace
# ╟─2ee00948-d04e-11ea-3413-e5fb7dd2a25e
# ╟─f0e92382-d682-11ea-3ede-65cd0f124ea4
# ╟─ac82922e-d04e-11ea-0bac-8530cacc5c72
# ╠═ee43c1b6-d04f-11ea-3a3d-1384ff255535
# ╟─17f53606-d051-11ea-3183-b3a4cb7180db
# ╟─46fc284a-d682-11ea-34b6-69874efcaf65
# ╟─4d452956-d682-11ea-3aeb-cd7d1b2f67dc
# ╠═4e320206-d682-11ea-3dfe-b77f6e96f33a
# ╟─1bb05fc0-b15d-11ea-3dae-7734f66a0c56
# ╠═9ac925d0-b15d-11ea-2abd-7db360900be0
# ╠═7e2cc6c0-b15d-11ea-32b0-15394cdebd35
