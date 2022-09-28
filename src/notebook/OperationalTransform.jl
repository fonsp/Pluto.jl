### A Pluto.jl notebook ###
# v0.19.12

using Markdown
using InteractiveUtils

# ╔═╡ 610394d2-ff6f-4736-87ce-217735399222
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
# Operational Transform

This notebook contains Julia code to implement a central Operational Transform authority as described in the [CodeMirror Collaborative Example](https://codemirror.net/examples/collab/).
"""
  ╠═╡ =#

# ╔═╡ 8e36f6d4-665c-45f7-aa29-d00a442a5694
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
## Change Specs

At the most basic level of text editing lies the change specs which describe how a text document can change. In our simple plain text example, they can be of three sorts:

> From the CodeMirror docs: Line numbers start at 1. Character positions are counted from zero, and count each line break and UTF-16 code unit as one unit.

Those UTF-16 code unit as one unit are then converted using `mapchange()` to what I call UTF-8 "plain" characters count (understand `'🍕'` counts as 1 instead of 2 in UTF-16 codeunits and 4 in UTF-8 codeunits).
"""
  ╠═╡ =#

# ╔═╡ 5eb433c4-5a8d-4340-97d3-9f9fc933dbd2
abstract type ChangeSpec end

# ╔═╡ 7d28674a-5614-442c-9a25-85f162476140
struct Deletion <: ChangeSpec
    from::Int
    to::Int
end

# ╔═╡ aecf8cd4-98bf-4e32-aeb3-29c270e76430
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
## Updates

When the client choose to synchronize its changes with the server it bundles these changes into updates which can only be applied to a document of a provided length, this provides a simple check to make sure the contained changes are valid to apply to this document. An update can contain many changes and is always identified by a client id. This allows other clients to identify an update as being remote or not.
"""
  ╠═╡ =#

# ╔═╡ a80dfab8-8464-4c4c-9f63-b6e7daa606d5
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
## Text document

The code of the text can be represented in many ways. CodeMirror for example uses a sort of tree based structure (similar to [ropes](https://en.wikipedia.org/wiki/Rope_(data_structure))?). This current Julia implementation is pretty naïve in that it only represent the text as a single immutable string. Each change would require allocating a new string to produce the new document. However, in our case things should be fine since Pluto cells tend to be at most a few dozens of line.
"""
  ╠═╡ =#

# ╔═╡ ae275932-9764-4579-9111-4c1fa27f9d39
struct Text
	content::String
end

# ╔═╡ a6cdb6fb-0931-4ed5-bfa2-abbf90994877
Base.length(t::Text) = Base.length(t.content)

# ╔═╡ 0a14bc4f-992b-4148-ae1f-d163811b7c6e
Base.String(t::Text) = t.content

# ╔═╡ 8b7fad5a-5cc9-42f5-a6a8-0dd270eaaa36
struct Insertion <: ChangeSpec
    from::Int
    insert::String
end

# ╔═╡ 020d74df-92ec-410f-9e6c-3a0485a3dc6a
struct Replacement <: ChangeSpec
    from::Int
    to::Int
    insert::String
end

# ╔═╡ 2ed4dc39-0f7b-48e9-a40b-5297a6ee3a08
struct Update
    specs::Vector{ChangeSpec}
    document_length::Int
    client_id::String
end

# ╔═╡ 57ab53eb-eb84-49d3-88b4-938842c669c7
"""
    utf16_codepoints(s::String)

Taken from `Base.transcode(::Type{UInt16}, src::Vector{UInt8})`
but without line constraints. It also does not support invalid
UTF-8 encoding which `String` should never be anyway.

This returns an array where each index i of an UTF-16 codepoint map
to an UTF-8 character (understand 1/2/3/4 byte UTF-8 character like `'👋'`).

This allows us to think only in terms of valid characters when performing 
edits and use `nextind(s, 0, i)` when actually slicing the content. I don't
think people will be editing half codeunits from Codemirror anyway.

> The length of `utf16_codepoints(s::String)` also tells us about the length of `s` encoded in UTF-16.

Examples:
```julia
                         123
julia> utf16_codepoints("abc")
                         |||
                        / | \\
               out =  [1, 2, 3]

                         1 2
julia> utf16_codepoints("🍕🍕")
                        /|  |\\
                       / |  | \\
               out = [1, 1, 2, 2]

                         1 23
julia> utf16_codepoints("🍕c🍕")
                        /| | |\\
                       / | | | \\
              out =  [1, 1,2,3, 3]
```
"""
function utf16_codepoints(s::String)
    invalid_utf8() = error("invalid UTF-8 string")

    i, n = 1, ncodeunits(s)
    idx = Int[]

    if n == 0
        return idx
    end

    sizehint!(idx, 2n)

    u = 1
    a = codeunit(s, 1)
    while true
        if i < n && -64 <= a % Int8 <= -12 # multi-byte character
            i += 1
            b = codeunit(s, i)
            if -64 <= (b % Int8) || a == 0xf4 && 0x8f < b
                # invalid UTF-8 (non-continuation of too-high code point)
                invalid_utf8()
            elseif a < 0xe0 # 2-byte UTF-8
                push!(idx, u)
            elseif i < n # 3/4-byte character
                i += 1
                c = codeunit(s, i)
                if -64 <= (c % Int8) # invalid UTF-8 (non-continuation)
                    invalid_utf8()
                elseif a < 0xf0 # 3-byte UTF-8
                    # TODO: test that 3/4 bytes UTF-8 encode to 1/2 UTF-16s.
                    push!(idx, u)
                elseif i < n
                    i += 1
                    d = codeunit(s, i)
                    if -64 <= (d % Int8) # invalid UTF-8 (non-continuation)
                        invalid_utf8()
                    elseif a == 0xf0 && b < 0x90 # overlong encoding
                        invalid_utf8()
                    else # 4-byte UTF-8
                        push!(idx, u, u)
                    end
                else # too short
                    invalid_utf8()
                end
            else # too short
                invalid_utf8()
            end
        else # ASCII or invalid UTF-8 (continuation byte or too-high code point)
            push!(idx, u)
        end
        if i >= n
            break
        end
        i += 1
        a = codeunit(s, i)
        u += 1
    end
    return idx
end

# ╔═╡ 28c82fae-b792-4a09-a12d-09e873069763
md"""
# Applying updates
"""

# ╔═╡ 551fabec-1e0c-45fc-ae5c-4c7e81b63b6d
struct InvalidDocumentLengthError <: Exception
    msg::String
end

# ╔═╡ dff75580-6d1a-4279-acc7-cc5a24659184
function mapindex(mapping, index)
	if index == 0
		return 0
	end

	if index > length(mapping)
		return length(mapping) + 1
	end

	mapping[index]
end

# ╔═╡ 8cbd4dfd-3833-465e-bc6a-696e59c635e0
mapchange(mapping, insertion::Insertion) =
	Insertion(mapindex(mapping, insertion.from), insertion.insert)

# ╔═╡ 0b8c2590-3c86-4f91-a492-ccabaa9f70c8
mapchange(mapping, replacement::Replacement) =
	Replacement(
		mapindex(mapping, replacement.from),
		mapindex(mapping, replacement.to),
		replacement.insert,
	)

# ╔═╡ a6a54ab7-18c8-4155-9afb-a545e95caef6
mapchange(mapping, deletion::Deletion) =
	Deletion(mapindex(mapping, deletion.from), mapindex(mapping, deletion.to))

# ╔═╡ 6b281237-01a4-49b3-927b-e9be0146daa5
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
## `_apply(t::Text, ::ChangeSpec)`

This family of function take change specs where the indices are in plain UTF-8 (one `'🍕'` counts for 1). Therefore, one should probably map CodeMirror changes using `mapchange()` prior to using these functions.

!!! warning
    You should not call this function directly but rather use `apply(text::Text, update::Update)` which is easier to reason about/has CodeMirror semantics.
"""
  ╠═╡ =#

# ╔═╡ 3e4b66b4-342f-44fb-9971-513737077756
function _apply(text::Text, insertion::Insertion)
    content = text.content

    from = nextind(content, 0, insertion.from)
    to = nextind(content, 0, insertion.from + 1)

    @show insertion from to

	new_content = (
		content[begin:from] *
		insertion.insert * 
		content[to:end]
	)
    return Text(new_content)
end

# ╔═╡ b56ea4a6-f341-4390-804c-d589d6a55f5e
function _apply(text::Text, replacement::Replacement)
    content = text.content

    from = nextind(content, 0, replacement.from)
    to = nextind(content, 0, replacement.to + 1)

	new_content = (
		content[begin:from] *
		replacement.insert * 
		content[to:end]
	)
    return Text(new_content)
end

# ╔═╡ 695c324c-1e56-4d5b-a1ae-a83825e8eb84
function _apply(text::Text, deletion::Deletion)
    content = text.content

    from = nextind(content, 0, deletion.from)
    to = nextind(content, 0, deletion.to + 1)

    new_content = content[begin:from] * content[to:end]
    return Text(new_content)
end

# ╔═╡ 4eb67cf4-8da2-45c1-9f2f-e32e6e9d8e54
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
# Utils
"""
  ╠═╡ =#

# ╔═╡ 63f61188-8f6d-431d-b28e-bcb3bb913dc3
"""
Apply an offset for the edit. The returned offset is in "plain" UTF-8 characters count (`'🍕'` counts for 1).
"""
shift_diff(deletion::Deletion, offset) = Deletion(deletion.from + offset, deletion.to + offset)

# ╔═╡ 8ee82c3d-3fc7-4bdb-bbfd-36ed4e1628d5
shift_diff(replacement::Replacement, offset) = Replacement(replacement.from + offset, replacement.to + offset, replacement.insert)

# ╔═╡ 07592888-1be5-460c-90ea-d0a89fb74e29
shift_diff(deletion::Insertion, offset) = Insertion(deletion.from + offset, deletion.insert)

# ╔═╡ 6c57a6da-f1fc-4eb7-8631-f2f0d06d783b
"""
Computes the offset created by this change spec
so that the next change spec can be applied as a
new change. The returned offset is in plain UTF-8 characters count
(`'🍕'` counts for 1).
"""
function diff_offset(deletion::Deletion)
    deletion.from - deletion.to
end

# ╔═╡ 84343a6e-0916-4a5f-a274-0be6365b9b4e
function diff_offset(replacement::Replacement)
    length(replacement.insert) - (replacement.to - replacement.from)
end

# ╔═╡ da569a44-ba0b-4254-9771-c847c73b0f5f
function diff_offset(insertion::Insertion)
    length(insertion.insert)
end

# ╔═╡ 0495815a-56bd-4f46-a46a-4e0926050508
function apply(text::Text, update::Update)
    codepoints_mapping = utf16_codepoints(String(text))

    if length(codepoints_mapping) != update.document_length
        throw(
            InvalidDocumentLengthError("Invalid update document length $(update.document_length), document is $(length(codepoints_mapping))")
        )
    end

    offset = 0
    for change in update.specs
        # 1. Each change is independant of the others in an update
        # This means we can map it to UTF-8 indices and shift the next
        # changes by the edited amount.
        change = mapchange(codepoints_mapping, change)
        @show codepoints_mapping change
        text = _apply(text, shift_diff(change, offset))
        offset += diff_offset(change)
    end
    return text
end

# ╔═╡ 5222e4f1-6353-47dd-b671-a906fe5dc4b9
function Base.convert(::Type{Update}, data::Dict)
    specs = data["specs"]

    # NOTE: we could also replace inserts/deletes with replacements
    specs = map(specs) do spec
        from = spec["from"]
        if haskey(spec, "insert")
            if haskey(spec, "to")
                Replacement(from, spec["to"], spec["insert"])
            else
                Insertion(from, spec["insert"])
            end
        else
            Deletion(from, spec["to"])
        end
    end
    Update(specs, data["document_length"], data["client_id"])
end

# ╔═╡ 96c2cecc-b1bb-40f6-aa6e-a15a3cdb9cfc
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
# Eye candy ✨
"""
  ╠═╡ =#

# ╔═╡ ed0f1503-2403-4b98-bce4-76af313d6c58
function Base.show(io::IO, insertion::Insertion)
    printstyled(io, "+[", insertion.from, "]", "\"", insertion.insert, "\"", color=:green)
end

# ╔═╡ b6194eab-2214-4150-9d3f-3cdd21bb0d57
function Base.show(io::IO, replacement::Replacement)
    printstyled(io, "~[", replacement.from, ":", replacement.to, "]", "\"", replacement.insert, "\"", color=:yellow)
end

# ╔═╡ 53f0d853-f003-4195-a4f7-072ffe61c909
function Base.show(io::IO, deletion::Deletion)
    printstyled(io, "~[", deletion.from, ":", deletion.to, "]"; color=:red)
end

# ╔═╡ 4282641e-7485-4c83-8582-b963716061b4
# ╠═╡ skip_as_script = true
#=╠═╡
let
	println("Insertion:   ", Insertion(0, "Lorem"))
	println("Replacement: ", Replacement(0, 2, "a"))
	println("Deletion:    ", Deletion(0, 1))
end
  ╠═╡ =#

# ╔═╡ 7600ef5a-5c98-4c1c-bae1-a7c0cf5051e4
# ╠═╡ skip_as_script = true
#=╠═╡
md"""
---
"""
  ╠═╡ =#

# ╔═╡ 8f7e5411-0ada-4727-83d0-7ce26feea126
# ╠═╡ skip_as_script = true
#=╠═╡
begin
	import PlutoUI
	import PlutoTest: @test
end
  ╠═╡ =#

# ╔═╡ 130f77a5-8baf-467e-aa0d-d5b6a92d10e8
#=╠═╡
let
	text = Text("Et pariatur sunt eligendi.")
	update = Update(
		[
			# Notice how all change indices don't consider the other
			# changes in the update, see `shif_diff` and `diff_offset`.
			Insertion(0, "Mo"),                               # 1.
			Replacement(3, 3 + length("pariatur"), "ipsum"),  # 2.
			Deletion(length(text) - 1, length(text))          # 3.
		],
		length(text),
		"anonymous"
	)
	text2 = apply(text, update)
	@test String(text2) == "MoEt ipsum sunt eligendi"
  	#                       ^^   ^^^^^              ^
	#                       |    2. replace pariatur|
	#        1.insert Mo at 0    with ipsum         3. delete 1 char 
	#                                               at the end
end
  ╠═╡ =#

# ╔═╡ a2282321-60fc-41e5-9a72-b2cffd094053
#=╠═╡
let
	text = Text("Et pariatur sunt eligendi.")
	update = Update(
		[],
		length(text),
		"anonymous"
	)
	text2 = apply(text, update)
	@test String(text2) == String(text)
end
  ╠═╡ =#

# ╔═╡ 05a34e9f-2975-4f94-8f55-e84177aa36e7
#=╠═╡
let
	text = Text("Et pariatur sunt eligendi.")
	text2 = _apply(text, Insertion(3, "ipsum "))
	@test String(text2) == "Et ipsum pariatur sunt eligendi."
end
  ╠═╡ =#

# ╔═╡ 0e487a6a-d472-4dfa-bf2e-550284d9a570
#=╠═╡
let
	text = Text("Et pariatur sunt eligendi.")
	text2 = _apply(text, Replacement(3, 3 + length("pariatur"), "ipsum"))
	@test String(text2) == "Et ipsum sunt eligendi."
end
  ╠═╡ =#

# ╔═╡ 94479ebd-d280-4b47-ac4d-8df1596e5b69
#=╠═╡
let
	text = Text("Et pariatur sunt eligendi.")
	text2 = _apply(text, Deletion(2, 3 + length("pariatur")))
	@test String(text2) == "Et sunt eligendi."
end
  ╠═╡ =#

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
PlutoTest = "cb4044da-4d16-4ffa-a6a3-8cad7f73ebdc"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
PlutoTest = "~0.2.2"
PlutoUI = "~0.7.43"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.8.1"
manifest_format = "2.0"
project_hash = "e14ca830c01bc56e547746690ee5408f6d886cbd"

[[deps.AbstractPlutoDingetjes]]
deps = ["Pkg"]
git-tree-sha1 = "8eaf9f1b4921132a4cff3f36a1d9ba923b14a481"
uuid = "6e696c72-6542-2067-7265-42206c756150"
version = "1.1.4"

[[deps.ArgTools]]
uuid = "0dad84c5-d112-42e6-8d28-ef12dabb789f"
version = "1.1.1"

[[deps.Artifacts]]
uuid = "56f22d72-fd6d-98f1-02f0-08ddc0907c33"

[[deps.Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[deps.ColorTypes]]
deps = ["FixedPointNumbers", "Random"]
git-tree-sha1 = "eb7f0f8307f71fac7c606984ea5fb2817275d6e4"
uuid = "3da002f7-5984-5a60-b8a6-cbb66c0b333f"
version = "0.11.4"

[[deps.CompilerSupportLibraries_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "e66e0078-7015-5450-92f7-15fbd957f2ae"
version = "0.5.2+0"

[[deps.Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[deps.Downloads]]
deps = ["ArgTools", "FileWatching", "LibCURL", "NetworkOptions"]
uuid = "f43a241f-c20a-4ad4-852c-f6b1247861c6"
version = "1.6.0"

[[deps.FileWatching]]
uuid = "7b1f6079-737a-58dc-b8bc-7a2ca5c1b5ee"

[[deps.FixedPointNumbers]]
deps = ["Statistics"]
git-tree-sha1 = "335bfdceacc84c5cdf16aadc768aa5ddfc5383cc"
uuid = "53c48c17-4a7d-5ca2-90c5-79b7896eea93"
version = "0.8.4"

[[deps.Hyperscript]]
deps = ["Test"]
git-tree-sha1 = "8d511d5b81240fc8e6802386302675bdf47737b9"
uuid = "47d2ed2b-36de-50cf-bf87-49c2cf4b8b91"
version = "0.0.4"

[[deps.HypertextLiteral]]
deps = ["Tricks"]
git-tree-sha1 = "c47c5fa4c5308f27ccaac35504858d8914e102f9"
uuid = "ac1192a8-f4b3-4bfe-ba22-af5b92cd3ab2"
version = "0.9.4"

[[deps.IOCapture]]
deps = ["Logging", "Random"]
git-tree-sha1 = "f7be53659ab06ddc986428d3a9dcc95f6fa6705a"
uuid = "b5f81e59-6552-4d32-b1f0-c071b021bf89"
version = "0.2.2"

[[deps.InteractiveUtils]]
deps = ["Markdown"]
uuid = "b77e0a4c-d291-57a0-90e8-8db25a27a240"

[[deps.JSON]]
deps = ["Dates", "Mmap", "Parsers", "Unicode"]
git-tree-sha1 = "3c837543ddb02250ef42f4738347454f95079d4e"
uuid = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"
version = "0.21.3"

[[deps.LibCURL]]
deps = ["LibCURL_jll", "MozillaCACerts_jll"]
uuid = "b27032c2-a3e7-50c8-80cd-2d36dbcbfd21"
version = "0.6.3"

[[deps.LibCURL_jll]]
deps = ["Artifacts", "LibSSH2_jll", "Libdl", "MbedTLS_jll", "Zlib_jll", "nghttp2_jll"]
uuid = "deac9b47-8bc7-5906-a0fe-35ac56dc84c0"
version = "7.84.0+0"

[[deps.LibGit2]]
deps = ["Base64", "NetworkOptions", "Printf", "SHA"]
uuid = "76f85450-5226-5b5a-8eaa-529ad045b433"

[[deps.LibSSH2_jll]]
deps = ["Artifacts", "Libdl", "MbedTLS_jll"]
uuid = "29816b5a-b9ab-546f-933c-edad1886dfa8"
version = "1.10.2+0"

[[deps.Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[deps.LinearAlgebra]]
deps = ["Libdl", "libblastrampoline_jll"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[deps.Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[deps.Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[deps.MbedTLS_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "c8ffd9c3-330d-5841-b78e-0817d7145fa1"
version = "2.28.0+0"

[[deps.Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[deps.MozillaCACerts_jll]]
uuid = "14a3606d-f60d-562e-9121-12d972cd8159"
version = "2022.2.1"

[[deps.NetworkOptions]]
uuid = "ca575930-c2e3-43a9-ace4-1e988b2c1908"
version = "1.2.0"

[[deps.OpenBLAS_jll]]
deps = ["Artifacts", "CompilerSupportLibraries_jll", "Libdl"]
uuid = "4536629a-c528-5b80-bd46-f80d51c5b363"
version = "0.3.20+0"

[[deps.Parsers]]
deps = ["Dates"]
git-tree-sha1 = "3d5bf43e3e8b412656404ed9466f1dcbf7c50269"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.4.0"

[[deps.Pkg]]
deps = ["Artifacts", "Dates", "Downloads", "LibGit2", "Libdl", "Logging", "Markdown", "Printf", "REPL", "Random", "SHA", "Serialization", "TOML", "Tar", "UUIDs", "p7zip_jll"]
uuid = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"
version = "1.8.0"

[[deps.PlutoTest]]
deps = ["HypertextLiteral", "InteractiveUtils", "Markdown", "Test"]
git-tree-sha1 = "17aa9b81106e661cffa1c4c36c17ee1c50a86eda"
uuid = "cb4044da-4d16-4ffa-a6a3-8cad7f73ebdc"
version = "0.2.2"

[[deps.PlutoUI]]
deps = ["AbstractPlutoDingetjes", "Base64", "ColorTypes", "Dates", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "Markdown", "Random", "Reexport", "UUIDs"]
git-tree-sha1 = "2777a5c2c91b3145f5aa75b61bb4c2eb38797136"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.43"

[[deps.Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[deps.REPL]]
deps = ["InteractiveUtils", "Markdown", "Sockets", "Unicode"]
uuid = "3fa0cd96-eef1-5676-8a61-b3b8758bbffb"

[[deps.Random]]
deps = ["SHA", "Serialization"]
uuid = "9a3f8284-a2c9-5f02-9a11-845980a1fd5c"

[[deps.Reexport]]
git-tree-sha1 = "45e428421666073eab6f2da5c9d310d99bb12f9b"
uuid = "189a3867-3050-52da-a836-e630ba90ab69"
version = "1.2.2"

[[deps.SHA]]
uuid = "ea8e919c-243c-51af-8825-aaa63cd721ce"
version = "0.7.0"

[[deps.Serialization]]
uuid = "9e88b42a-f829-5b0c-bbe9-9e923198166b"

[[deps.Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[deps.SparseArrays]]
deps = ["LinearAlgebra", "Random"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"

[[deps.Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"

[[deps.TOML]]
deps = ["Dates"]
uuid = "fa267f1f-6049-4f14-aa54-33bafae1ed76"
version = "1.0.0"

[[deps.Tar]]
deps = ["ArgTools", "SHA"]
uuid = "a4e569a6-e804-4fa4-b0f3-eef7a1d5b13e"
version = "1.10.0"

[[deps.Test]]
deps = ["InteractiveUtils", "Logging", "Random", "Serialization"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[deps.Tricks]]
git-tree-sha1 = "6bac775f2d42a611cdfcd1fb217ee719630c4175"
uuid = "410a4b4d-49e4-4fbc-ab6d-cb71b17b3775"
version = "0.1.6"

[[deps.UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[deps.Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"

[[deps.Zlib_jll]]
deps = ["Libdl"]
uuid = "83775a58-1f1d-513f-b197-d71354ab007a"
version = "1.2.12+3"

[[deps.libblastrampoline_jll]]
deps = ["Artifacts", "Libdl", "OpenBLAS_jll"]
uuid = "8e850b90-86db-534c-a0d3-1478176c7d93"
version = "5.1.1+0"

[[deps.nghttp2_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850ede-7688-5339-a07c-302acd2aaf8d"
version = "1.48.0+0"

[[deps.p7zip_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "3f19e933-33d8-53b3-aaab-bd5110c3b7a0"
version = "17.4.0+0"
"""

# ╔═╡ Cell order:
# ╟─610394d2-ff6f-4736-87ce-217735399222
# ╟─8e36f6d4-665c-45f7-aa29-d00a442a5694
# ╠═8b7fad5a-5cc9-42f5-a6a8-0dd270eaaa36
# ╠═7d28674a-5614-442c-9a25-85f162476140
# ╠═020d74df-92ec-410f-9e6c-3a0485a3dc6a
# ╠═5eb433c4-5a8d-4340-97d3-9f9fc933dbd2
# ╟─aecf8cd4-98bf-4e32-aeb3-29c270e76430
# ╠═2ed4dc39-0f7b-48e9-a40b-5297a6ee3a08
# ╟─a80dfab8-8464-4c4c-9f63-b6e7daa606d5
# ╠═ae275932-9764-4579-9111-4c1fa27f9d39
# ╠═a6cdb6fb-0931-4ed5-bfa2-abbf90994877
# ╠═0a14bc4f-992b-4148-ae1f-d163811b7c6e
# ╟─57ab53eb-eb84-49d3-88b4-938842c669c7
# ╟─28c82fae-b792-4a09-a12d-09e873069763
# ╠═551fabec-1e0c-45fc-ae5c-4c7e81b63b6d
# ╠═dff75580-6d1a-4279-acc7-cc5a24659184
# ╠═8cbd4dfd-3833-465e-bc6a-696e59c635e0
# ╠═0b8c2590-3c86-4f91-a492-ccabaa9f70c8
# ╠═a6a54ab7-18c8-4155-9afb-a545e95caef6
# ╠═0495815a-56bd-4f46-a46a-4e0926050508
# ╟─130f77a5-8baf-467e-aa0d-d5b6a92d10e8
# ╟─a2282321-60fc-41e5-9a72-b2cffd094053
# ╟─6b281237-01a4-49b3-927b-e9be0146daa5
# ╠═3e4b66b4-342f-44fb-9971-513737077756
# ╟─05a34e9f-2975-4f94-8f55-e84177aa36e7
# ╠═b56ea4a6-f341-4390-804c-d589d6a55f5e
# ╟─0e487a6a-d472-4dfa-bf2e-550284d9a570
# ╠═695c324c-1e56-4d5b-a1ae-a83825e8eb84
# ╟─94479ebd-d280-4b47-ac4d-8df1596e5b69
# ╟─4eb67cf4-8da2-45c1-9f2f-e32e6e9d8e54
# ╠═63f61188-8f6d-431d-b28e-bcb3bb913dc3
# ╠═8ee82c3d-3fc7-4bdb-bbfd-36ed4e1628d5
# ╠═07592888-1be5-460c-90ea-d0a89fb74e29
# ╠═6c57a6da-f1fc-4eb7-8631-f2f0d06d783b
# ╠═84343a6e-0916-4a5f-a274-0be6365b9b4e
# ╠═da569a44-ba0b-4254-9771-c847c73b0f5f
# ╠═5222e4f1-6353-47dd-b671-a906fe5dc4b9
# ╟─96c2cecc-b1bb-40f6-aa6e-a15a3cdb9cfc
# ╠═ed0f1503-2403-4b98-bce4-76af313d6c58
# ╠═b6194eab-2214-4150-9d3f-3cdd21bb0d57
# ╠═53f0d853-f003-4195-a4f7-072ffe61c909
# ╟─4282641e-7485-4c83-8582-b963716061b4
# ╟─7600ef5a-5c98-4c1c-bae1-a7c0cf5051e4
# ╠═8f7e5411-0ada-4727-83d0-7ce26feea126
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
