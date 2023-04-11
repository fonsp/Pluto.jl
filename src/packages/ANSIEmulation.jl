### A Pluto.jl notebook ###
# v0.19.24

using Markdown
using InteractiveUtils

# ╔═╡ 6f1cb799-21b7-459a-a7c5-6c42b1376b11
# ╠═╡ skip_as_script = true
#=╠═╡
using BenchmarkTools: @benchmark
  ╠═╡ =#

# ╔═╡ 98ac036d-1a37-457c-b89d-8e954ab6f039
# ╠═╡ skip_as_script = true
#=╠═╡
using PlutoUI: Slider
  ╠═╡ =#

# ╔═╡ e665ae4e-bf4e-11ed-330a-f3670dd00a95
# ╠═╡ skip_as_script = true
#=╠═╡
str = read(download("https://raw.githubusercontent.com/fonsp/disorganised-mess/main/ansidemo.txt"), String)
  ╠═╡ =#

# ╔═╡ 032a10cc-8b2b-4e85-bac4-b9623b91d016
# ╠═╡ disabled = true
# ╠═╡ skip_as_script = true
#=╠═╡
str = "\nInstantiating...\n\e[32m\e[1m  No Changes\e[22m\e[39m to `/private/var/folders/v_/fhpj9jn151d4p9c2fdw2gv780000gn/T/jl_DivOhV/Project.toml`\n\e[32m\e[1m  No Changes\e[22m\e[39m to `/private/var/folders/v_/fhpj9jn151d4p9c2fdw2gv780000gn/T/jl_DivOhV/Manifest.toml`\n\e[?25l\e[?25h\e[2K\nResolving...\n\e[32m\e[1m  No Changes\e[22m\e[39m to `/private/var/folders/v_/fhpj9jn151d4p9c2fdw2gv780000gn/T/jl_DivOhV/Project.toml`\n\e[32m\e[1m  No Changes\e[22m\e[39m to `/private/var/folders/v_/fhpj9jn151d4p9c2fdw2gv780000gn/T/jl_DivOhV/Manifest.toml`\n\e[?25l\e[?25h\e[2K"
  ╠═╡ =#

# ╔═╡ 209f221c-be89-4976-b712-2b9214c3291c
#=╠═╡
Text(str)
  ╠═╡ =#

# ╔═╡ dff16b61-7fa6-4702-95a6-a0d2913c3070
#=╠═╡
collect(str)
  ╠═╡ =#

# ╔═╡ b6fe176d-cfbe-4aac-ad46-3345b0acbb74
#=╠═╡
length(str)
  ╠═╡ =#

# ╔═╡ c952da01-ba67-4a49-99df-c61939ba81be
# ESC[H	moves cursor to home position (0, 0)
# ESC[{line};{column}H
# ESC[{line};{column}f	moves cursor to line #, column #
# ESC[#A	moves cursor up # lines
# ESC[#B	moves cursor down # lines
# ESC[#C	moves cursor right # columns
# ESC[#D	moves cursor left # columns
# ESC[#E	moves cursor to beginning of next line, # lines down
# ESC[#F	moves cursor to beginning of previous line, # lines up
# ESC[#G	moves cursor to column #
# ESC[6n	request cursor position (reports as ESC[#;#R)
# ESC M	moves cursor one line up, scrolling if needed
# ESC 7	save cursor position (DEC)
# ESC 8	restores the cursor to the last saved position (DEC)
# ESC[s	save cursor position (SCO)
# ESC[u	restores the cursor to the last saved position (SCO)

# ╔═╡ f661240f-4950-4be0-a2b2-98ed77f6e4a2
const stoppers = ('H', 'f', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'n', 's', 'u', 'J', 'K', 'm', 'l', 'h', 'S')

# ╔═╡ af48f80f-345d-4d90-9cf1-b8be9004a53d
Base.@kwdef mutable struct ANSITerminalState
	lines::Dict{Int,Vector{Char}}=Dict{Int,Vector{Char}}()
	col::Int=1
	row::Int=1
end

# ╔═╡ f54f7282-87fd-4f05-8f8a-220d83186e9a
getline(state::ANSITerminalState) = get!(state.lines, state.row) do
	Char[]
end

# ╔═╡ 0a4587f7-55b2-4621-89e8-a9492d32bc09
#=╠═╡
@benchmark ncodeunits(str)
  ╠═╡ =#

# ╔═╡ 84a457d4-1e3c-4797-aa94-a7ca9ce628e4
"""
Update the `ANSITerminalState` with new data from a TTY stream.
"""
function consume!(state::ANSITerminalState, str::AbstractString)
	ind = 0

	L = ncodeunits(str)
	
	while ind < L
		ind = nextind(str, ind)
		if ind > L
			break
		end
		
		c = str[ind]
		if c === '\n'
			state.col = 1
			state.row += 1
			
		elseif c === '\r'
			state.col = 1

		elseif c === '\e'
			# ANSI control character
			# see https://en.wikipedia.org/wiki/ANSI_escape_code for descriptions of these.

			ind += 1
			# ignoring this character, it should be a '['

			"will contain the characters between ] and the stopper character"
			buffer_vec = Char[]

			# keep reading until we have the stopper character
			local stopper = '\0'
			while ind <= L - 1
				ind += 1
				next_c = str[ind]
				if next_c ∈ stoppers
					stopper = next_c
					break
				end
				push!(buffer_vec, next_c)
			end


			# @info "Escape sequence read" stopper buffer


			if stopper === 'l' || stopper === 'h'
				# ignored
			elseif stopper === '\0'
				# this means that no stop was found, ignoring...

			elseif stopper === 'K'# && buffer == "2"
				# @assert buffer_vec == ['2']
		
				line = getline(state)
				line .= ' '
			elseif stopper === 'A'
				state.row = max(1, state.row - parse(Int, String(buffer_vec)))
				
			elseif stopper === 'G'
				state.col = parse(Int, String(buffer_vec))
				
			elseif stopper === 'J'# && buffer == "0"
				# @assert buffer_vec == ['0']

				# clear the remainder of this line
				resize!(getline(state), state.col - 1)
				# and clear all rows below
				for row in state.row+1 : maximum(keys(state.lines))
					delete!(state.lines, row)
				end

			elseif stopper === 'm'
				# keep it in the output because we use ansiup to handle colors in the frontend
				line = getline(state)
				push!(line, '\e', '[')
				append!(line, buffer_vec)
				push!(line, stopper)

				state.col += 3 + length(buffer_vec)
				
			elseif stopper === 'S'
				diff = isempty(buffer_vec) ? 1 : parse(Int, String(buffer_vec))
				state.row += diff
				
			else
				@warn "Unrecogized escape sequence" stopper String(buffer_vec)
			end

		else
			# no escape character, just a regular char
			line = getline(state)

			while length(line) < state.col
				push!(line, ' ')
			end
			line[state.col] = c
			state.col += 1
		end
	end
end

# ╔═╡ 2c02ca66-e3fe-479a-b3f1-13ea0850f3d7
function consume_safe!(state::ANSITerminalState, str::AbstractString)
	try
		consume!(state, str)
	catch e
		@debug "ANSI escape sequence glitch" exception=(e,catch_backtrace())
		line = getline(state)
		append!(line, codeunits(str))
		state.row += ncodeunits(str)
	end
end

# ╔═╡ 6a8f71f5-7113-4074-8009-14eea11cc958
#=╠═╡
@bind L Slider(1:length(str))
  ╠═╡ =#

# ╔═╡ f9232436-618c-401f-9d18-f9f8f1f04a77
function build_str(state::ANSITerminalState)
	d = state.lines
	join(
		(String(get(() -> Char[], d, i)) for i in 1:maximum(keys(d))), "\n"
	)
end

# ╔═╡ a1ebfaf3-dadb-40dc-95c5-ae8a9d6de1ec
# ╠═╡ skip_as_script = true
#=╠═╡
function solve(str::AbstractString)
	state = ANSITerminalState()
	consume_safe!(state, str)
	build_str(state)
end
  ╠═╡ =#

# ╔═╡ 6dc56641-7d0d-4bd7-a1ef-22e373908207
#=╠═╡
@benchmark solve($str) seconds=1
  ╠═╡ =#

# ╔═╡ 48c686f9-722f-4d84-ac9d-9b11c934370c
#=╠═╡
solve(str) |> Text
  ╠═╡ =#

# ╔═╡ ee9a24d4-7a9f-4024-8100-f7ce4ef436cb
#=╠═╡
collect(str) => collect(solve(str))
  ╠═╡ =#

# ╔═╡ 2453d8e0-ca26-4033-a272-c5c51fc8d16d
#=╠═╡
solve(SubString(str, 1, nextind(str, 0, L))) |> Text
  ╠═╡ =#

# ╔═╡ 535f471d-a049-4d74-aa52-9be86e2d4352
#=╠═╡
let

	state = ANSITerminalState()

	mid = nextind(str, 0, L ÷ 2)
	top = nextind(str, 0, L)

	consume!(state, SubString(str, 1, mid))
	consume!(state, SubString(str, nextind(str, mid), top))

	build_str(state) |> Text
end
  ╠═╡ =#

# ╔═╡ 195a8e3c-427f-487f-9c7c-d31ce374de81
# ╠═╡ skip_as_script = true
#=╠═╡
ANSITerminalState(
	lines=Dict(3 => Char['a', 't'], 1 => ['c'])
) |> build_str |> Text
  ╠═╡ =#

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
BenchmarkTools = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"

[compat]
BenchmarkTools = "~1.3.2"
PlutoUI = "~0.7.50"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

julia_version = "1.9.0-rc2"
manifest_format = "2.0"
project_hash = "ce886088241d89ce6a9168ebf44701e0c6f4421f"

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

[[deps.BenchmarkTools]]
deps = ["JSON", "Logging", "Printf", "Profile", "Statistics", "UUIDs"]
git-tree-sha1 = "d9a9701b899b30332bbcb3e1679c41cce81fb0e8"
uuid = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
version = "1.3.2"

[[deps.ColorTypes]]
deps = ["FixedPointNumbers", "Random"]
git-tree-sha1 = "eb7f0f8307f71fac7c606984ea5fb2817275d6e4"
uuid = "3da002f7-5984-5a60-b8a6-cbb66c0b333f"
version = "0.11.4"

[[deps.CompilerSupportLibraries_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "e66e0078-7015-5450-92f7-15fbd957f2ae"
version = "1.0.2+0"

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
deps = ["Libdl", "OpenBLAS_jll", "libblastrampoline_jll"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[deps.Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[deps.MIMEs]]
git-tree-sha1 = "65f28ad4b594aebe22157d6fac869786a255b7eb"
uuid = "6c6e2e6c-3030-632d-7369-2d6c69616d65"
version = "0.1.4"

[[deps.Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[deps.MbedTLS_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "c8ffd9c3-330d-5841-b78e-0817d7145fa1"
version = "2.28.2+0"

[[deps.Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[deps.MozillaCACerts_jll]]
uuid = "14a3606d-f60d-562e-9121-12d972cd8159"
version = "2022.10.11"

[[deps.NetworkOptions]]
uuid = "ca575930-c2e3-43a9-ace4-1e988b2c1908"
version = "1.2.0"

[[deps.OpenBLAS_jll]]
deps = ["Artifacts", "CompilerSupportLibraries_jll", "Libdl"]
uuid = "4536629a-c528-5b80-bd46-f80d51c5b363"
version = "0.3.21+4"

[[deps.Parsers]]
deps = ["Dates", "SnoopPrecompile"]
git-tree-sha1 = "478ac6c952fddd4399e71d4779797c538d0ff2bf"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.5.8"

[[deps.Pkg]]
deps = ["Artifacts", "Dates", "Downloads", "FileWatching", "LibGit2", "Libdl", "Logging", "Markdown", "Printf", "REPL", "Random", "SHA", "Serialization", "TOML", "Tar", "UUIDs", "p7zip_jll"]
uuid = "44cfe95a-1eb2-52ea-b672-e2afdf69b78f"
version = "1.9.0"

[[deps.PlutoUI]]
deps = ["AbstractPlutoDingetjes", "Base64", "ColorTypes", "Dates", "FixedPointNumbers", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "MIMEs", "Markdown", "Random", "Reexport", "URIs", "UUIDs"]
git-tree-sha1 = "5bb5129fdd62a2bbbe17c2756932259acf467386"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.50"

[[deps.Preferences]]
deps = ["TOML"]
git-tree-sha1 = "47e5f437cc0e7ef2ce8406ce1e7e24d44915f88d"
uuid = "21216c6a-2e73-6563-6e65-726566657250"
version = "1.3.0"

[[deps.Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[deps.Profile]]
deps = ["Printf"]
uuid = "9abbd945-dff8-562f-b5e8-e1ebf5ef1b79"

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

[[deps.SnoopPrecompile]]
deps = ["Preferences"]
git-tree-sha1 = "e760a70afdcd461cf01a575947738d359234665c"
uuid = "66db9d55-30c0-4569-8b51-7e840670fc0c"
version = "1.0.3"

[[deps.Sockets]]
uuid = "6462fe0b-24de-5631-8697-dd941f90decc"

[[deps.SparseArrays]]
deps = ["Libdl", "LinearAlgebra", "Random", "Serialization", "SuiteSparse_jll"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"

[[deps.Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"
version = "1.9.0"

[[deps.SuiteSparse_jll]]
deps = ["Artifacts", "Libdl", "Pkg", "libblastrampoline_jll"]
uuid = "bea87d4a-7f5b-5778-9afe-8cc45184846c"
version = "5.10.1+6"

[[deps.TOML]]
deps = ["Dates"]
uuid = "fa267f1f-6049-4f14-aa54-33bafae1ed76"
version = "1.0.3"

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

[[deps.URIs]]
git-tree-sha1 = "074f993b0ca030848b897beff716d93aca60f06a"
uuid = "5c2747f8-b7ea-4ff2-ba2e-563bfd36b1d4"
version = "1.4.2"

[[deps.UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[deps.Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"

[[deps.Zlib_jll]]
deps = ["Libdl"]
uuid = "83775a58-1f1d-513f-b197-d71354ab007a"
version = "1.2.13+0"

[[deps.libblastrampoline_jll]]
deps = ["Artifacts", "Libdl"]
uuid = "8e850b90-86db-534c-a0d3-1478176c7d93"
version = "5.4.0+0"

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
# ╠═e665ae4e-bf4e-11ed-330a-f3670dd00a95
# ╠═032a10cc-8b2b-4e85-bac4-b9623b91d016
# ╠═209f221c-be89-4976-b712-2b9214c3291c
# ╠═dff16b61-7fa6-4702-95a6-a0d2913c3070
# ╠═b6fe176d-cfbe-4aac-ad46-3345b0acbb74
# ╠═c952da01-ba67-4a49-99df-c61939ba81be
# ╠═f661240f-4950-4be0-a2b2-98ed77f6e4a2
# ╠═af48f80f-345d-4d90-9cf1-b8be9004a53d
# ╠═f54f7282-87fd-4f05-8f8a-220d83186e9a
# ╠═0a4587f7-55b2-4621-89e8-a9492d32bc09
# ╠═2c02ca66-e3fe-479a-b3f1-13ea0850f3d7
# ╠═84a457d4-1e3c-4797-aa94-a7ca9ce628e4
# ╠═a1ebfaf3-dadb-40dc-95c5-ae8a9d6de1ec
# ╠═6dc56641-7d0d-4bd7-a1ef-22e373908207
# ╠═6f1cb799-21b7-459a-a7c5-6c42b1376b11
# ╠═48c686f9-722f-4d84-ac9d-9b11c934370c
# ╠═ee9a24d4-7a9f-4024-8100-f7ce4ef436cb
# ╠═2453d8e0-ca26-4033-a272-c5c51fc8d16d
# ╠═535f471d-a049-4d74-aa52-9be86e2d4352
# ╠═98ac036d-1a37-457c-b89d-8e954ab6f039
# ╠═6a8f71f5-7113-4074-8009-14eea11cc958
# ╠═f9232436-618c-401f-9d18-f9f8f1f04a77
# ╠═195a8e3c-427f-487f-9c7c-d31ce374de81
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
