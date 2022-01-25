### A Pluto.jl notebook ###
# v0.17.7

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

# ╔═╡ 7e613bd2-616a-4687-8af5-a22c7a747d97
import Serialization

# ╔═╡ d30e1e1b-fa6f-4fbc-bccb-1fcfc7b829df
import UUIDs: UUID, uuid4

# ╔═╡ f7d14367-27d7-41a5-9f6a-79cf5e721a7d
import PlutoUI

# ╔═╡ fe669218-18c3-46c7-80e8-7b1ab6fa77d2
import PlutoLinks: @ingredients, @use_task

# ╔═╡ f9675ee0-e728-420b-81bd-22e57583c587
import PlutoHooks: @use_effect, @use_ref, @use_state, @use_memo

# ╔═╡ ca96e0d5-0904-4ae5-89d0-c1a9187710a1
Base.@kwdef struct PlutoProcess
	process
	stdin
	stdout
	stderr
end

# ╔═╡ b7734627-ba2a-48d8-8fd8-a5c94716da20
function Base.show(io::IO, ::MIME"text/plain", process::PlutoProcess)
	write(io, process_running(process.process) ? "Running" : "Stopped")
end

# ╔═╡ 1a2f116b-78f7-47b6-b96b-c0c74b5c5a35
@bind reset_process_counter PlutoUI.CounterButton("Reset process!")

# ╔═╡ 8d6f46b6-e6cf-4094-a32a-f1b13dc005f6
@bind send_counter PlutoUI.CounterButton("Send!")

# ╔═╡ 09f4b4b6-75a4-4727-9405-e4fc45c2cda7
import Distributed

# ╔═╡ ffc98725-a88f-4dac-b387-f73cfd07510a
# @use_task([x]) do
# 	ChildProcesses.call(x, quote
# 		1 + 1
# 	end)
# end

# ╔═╡ a26cc458-4578-427f-840d-71d78c5c8b01
begin
	ChildProcesses = @ingredients("./ChildProcesses.jl").ChildProcesses
	var"ChildProcesses.jl" = ChildProcesses
end

# ╔═╡ 730cfe5e-1541-4c08-8d4a-86d1f9e4115e
let
	process = ChildProcesses.create_child_process()

	ChildProcesses.call(process, :(throw("hi")))
end

# ╔═╡ b7ac2fea-41f4-47f3-a294-944378cb7093
x = @use_memo([]) do
	ChildProcesses.create_child_process()
end

# ╔═╡ 872a8651-736c-47dd-80e6-b645fb0490c9
kill(x, Base.SIGINT)

# ╔═╡ c1038e6a-c4e9-4b79-b3f9-35a9f64b0f64
task = @use_task([x]) do
	ChildProcesses.call(x, quote
			while true; end
	end)
end

# ╔═╡ 75fc343a-7904-45f8-be09-a542255ba673
istaskdone(task) ? fetch(task) : nothing

# ╔═╡ 281b4aab-307a-4d90-9dfb-f422b9567736
# process_output = let
# 	# error("Nope")
	
# 	my_stderr = @use_memo([reset_process_counter, ChildProcesses]) do 
# 		Pipe()
# 	end
# 	output, set_output = @use_state("")

# 	process = @use_memo([my_stderr]) do
# 		ChildProcesses.create_child_process(
# 			custom_stderr=my_stderr,
# 			exeflags=["--color=yes", "--threads=4"],
# 		)
# 	end
# 	@use_effect([process]) do
# 		return () -> begin
# 			kill(process)
# 		end
# 	end

# 	# So we re-run the whole thing when the process exists
# 	_, refresh_state = @use_state(nothing)
# 	@use_task([]) do
# 		if process_running(process)
# 			wait(process)
# 			refresh_state(nothing)
# 		end
# 	end

# 	@use_task([]) do
# 		while process_running(process) && !eof(my_stderr)
# 			new_output = String(readavailable(my_stderr))
# 			set_output((output) -> begin
# 				output * new_output
# 			end)
# 		end
# 	end

# 	pluto_process = @use_memo([process, my_stderr]) do
# 		PlutoProcess(
# 			process=process,
# 			stderr=my_stderr,
# 			stdin=process.process.in,
# 			stdout=process.process.out,
# 		)
# 	end

# 	PlutoUI.with_terminal() do
# 		print(output)
# 		pluto_process
# 	end
# end

# ╔═╡ e5edaa4d-74ff-4f6e-a045-71fd5494dd79
# @use_memo([spawned_process]) do
# 	try
# 		ChildProcesses.create_channel(spawned_process, quote
# 			Channel() do ch
# 				for i in 1:2000
# 					put!(ch, i)
# 				end
# 			end
# 		end) do ch
# 			for i in 1:10
# 				x = take!(ch)
# 			end
# 		end
# 	catch error
# 		@error "UHHH" error stacktrace(catch_backtrace())
# 		(error, stacktrace(catch_backtrace()))
# 	end
# end

# ╔═╡ 5fb236c3-b67d-47ee-8644-84bd51e577b1
# @task_result([spawned_process]) do
# 	ChildProcesses.call(spawned_process, quote
# 		1 + 1
# 	end)
# end

# ╔═╡ 8bd24b7b-4837-46b7-a6e9-b674630c2f56
# @use_memo([spawned_process]) do
# 	for i in 1:10
# 		ChildProcesses.call(spawned_process, quote
# 			1 + 1
# 		end)
# 	end
# end

# ╔═╡ e33a9b31-722e-425e-be5e-b33517bec8e3
# @use_memo([spawned_process]) do
# 	BenchmarkTools.@benchmark ChildProcesses.call(spawned_process, quote
# 		1 + 1
# 	end)
# end

# ╔═╡ de602aaa-704c-45c4-8b7b-fc58e41236ce
begin
	struct FakeProcess <: Base.AbstractPipe
		in::IO
		out::IO
	end
	eval(:(Base.process_running(::FakeProcess) = true))
	eval(:(Base.pipe_writer(process::FakeProcess) = process.in))
	eval(:(Base.pipe_reader(process::FakeProcess) = process.out))
end

# ╔═╡ abf694f4-c5c4-4a4f-b30f-62e358149195
# @task_result() do
# 	Base.readbytes!(PipeBuffer(), UInt8[], 10)
# end

# ╔═╡ ec4a5558-28dd-47c1-b015-8799d9cb8800
# function Base.eof(buffer::IOBuffer)
# 	while buffer.readable
# 		if bytesavailable(buffer) !== 0
# 			return false
# 		end
# 		# eval(:(@info "OOPS"))
# 		sleep(1)
# 		yield()
# 	end
# 	return true
# end

# ╔═╡ ce384249-52c5-47d8-9c93-18837432b625
# let
# 	parent_to_child = PipeBuffer()
# 	child_to_parent = PipeBuffer()
# 	child_process = @use_memo([ChildProcesses.ChildProcess, FakeProcess]) do
# 		process = FakeProcess(child_to_parent, parent_to_child)
# 		child_process = ChildProcesses.ChildProcess(process=process)
# 	end
# 	parent_process = @use_memo([ChildProcesses.ParentProcess]) do
# 		ChildProcesses.ParentProcess(
# 			parent_to_child=parent_to_child,
# 			child_to_parent=child_to_parent,
# 		)
# 	end

# 	@info "#1"
# 	@use_task([ChildProcesses.start_from_child_loop, child_process]) do
# 		ChildProcesses.start_from_child_loop(child_process)
# 	end
# 	@info "#2"
# 	@use_task([ChildProcesses.listen_for_messages_from_parent, parent_process]) do
# 		ChildProcesses.listen_for_messages_from_parent(parent_process)
# 	end
# 	@info "#3"

# 	result, set_result = @use_state(Pending())

# 	@use_task([ChildProcesses.call, child_process]) do
# 		try
# 			result = ChildProcesses.call(child_process, quote
# 				1 + 1
# 			end)

# 			set_result(Result(result))
# 		catch error
# 			set_result(Failure(error))
# 		end
# 	end

# 	result
# end

# ╔═╡ 4be7e097-72a3-4590-bcfb-a7dacb78159c
spawned_process = process_output.value.process;

# ╔═╡ 49fdc8a3-0e1a-42f0-acc4-b823eec91d31
md"---"

# ╔═╡ 95c5a5bc-db23-4ad3-8ae8-81bc8f0edfd4
import BenchmarkTools

# ╔═╡ 4541f52f-1217-4dcd-b44c-042c7ca246bd
1 + 1

# ╔═╡ ced9d1e9-7075-4ff2-8ca2-6a349f2a69c4
let
	stream = PipeBuffer()
	BenchmarkTools.@benchmark begin
		input = Dict(:x => 1)
		ChildProcesses.send_message($stream, ChildProcesses.to_binary(input))
		output = ChildProcesses.from_binary(ChildProcesses.read_message($stream))
		
		if input != output
			throw("Waoh, input and output should match but didn't!")
		end
	end
end

# ╔═╡ be18d157-6b55-4eaa-99fe-c398e992a9fa
md"### @task_result"

# ╔═╡ 12578b59-0161-4e72-afef-825166a62121
struct Pending end

# ╔═╡ 34d90560-5a3e-4c7f-8126-35e1a6153aa1
struct Result value end

# ╔═╡ 83540498-f317-4d8b-8dc6-80a93247b3b2
struct Failure error end

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
BenchmarkTools = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
Distributed = "8ba89e20-285c-5b6f-9357-94700520ee1b"
PlutoHooks = "0ff47ea0-7a50-410d-8455-4348d5de0774"
PlutoLinks = "0ff47ea0-7a50-410d-8455-4348d5de0420"
PlutoUI = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
Serialization = "9e88b42a-f829-5b0c-bbe9-9e923198166b"
UUIDs = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[compat]
BenchmarkTools = "~1.2.0"
PlutoHooks = "~0.0.3"
PlutoLinks = "~0.1.1"
PlutoUI = "~0.7.16"
"""

# ╔═╡ 00000000-0000-0000-0000-000000000002
PLUTO_MANIFEST_TOML_CONTENTS = """
# This file is machine-generated - editing it directly is not advised

[[Base64]]
uuid = "2a0f44e3-6c83-55bd-87e4-b1978d98bd5f"

[[BenchmarkTools]]
deps = ["JSON", "Logging", "Printf", "Profile", "Statistics", "UUIDs"]
git-tree-sha1 = "61adeb0823084487000600ef8b1c00cc2474cd47"
uuid = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
version = "1.2.0"

[[Dates]]
deps = ["Printf"]
uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"

[[Distributed]]
deps = ["Random", "Serialization", "Sockets"]
uuid = "8ba89e20-285c-5b6f-9357-94700520ee1b"

[[FileWatching]]
uuid = "7b1f6079-737a-58dc-b8bc-7a2ca5c1b5ee"

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

[[Libdl]]
uuid = "8f399da3-3557-5675-b5ff-fb832c97cbdb"

[[LinearAlgebra]]
deps = ["Libdl"]
uuid = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[[Logging]]
uuid = "56ddb016-857b-54e1-b83d-db4d58db5568"

[[Markdown]]
deps = ["Base64"]
uuid = "d6f4376e-aef5-505a-96c1-9c027394607a"

[[Mmap]]
uuid = "a63ad114-7e13-5084-954f-fe012c677804"

[[Parsers]]
deps = ["Dates"]
git-tree-sha1 = "d911b6a12ba974dabe2291c6d450094a7226b372"
uuid = "69de0a69-1ddd-5017-9359-2bf0b02dc9f0"
version = "2.1.1"

[[PlutoHooks]]
deps = ["FileWatching", "InteractiveUtils", "Markdown", "UUIDs"]
git-tree-sha1 = "f297787f7d7507dada25f6769fe3f08f6b9b8b12"
uuid = "0ff47ea0-7a50-410d-8455-4348d5de0774"
version = "0.0.3"

[[PlutoLinks]]
deps = ["FileWatching", "InteractiveUtils", "Markdown", "PlutoHooks", "UUIDs"]
git-tree-sha1 = "5f45fc68dd9eb422358a8008e3fb8df3c01d8ab8"
uuid = "0ff47ea0-7a50-410d-8455-4348d5de0420"
version = "0.1.1"

[[PlutoUI]]
deps = ["Base64", "Dates", "Hyperscript", "HypertextLiteral", "IOCapture", "InteractiveUtils", "JSON", "Logging", "Markdown", "Random", "Reexport", "UUIDs"]
git-tree-sha1 = "4c8a7d080daca18545c56f1cac28710c362478f3"
uuid = "7f904dfe-b85e-4ff6-b463-dae2292396a8"
version = "0.7.16"

[[Printf]]
deps = ["Unicode"]
uuid = "de0858da-6303-5e67-8744-51eddeeeb8d7"

[[Profile]]
deps = ["Printf"]
uuid = "9abbd945-dff8-562f-b5e8-e1ebf5ef1b79"

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

[[SparseArrays]]
deps = ["LinearAlgebra", "Random"]
uuid = "2f01184e-e22b-5df5-ae63-d93ebab69eaf"

[[Statistics]]
deps = ["LinearAlgebra", "SparseArrays"]
uuid = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"

[[Test]]
deps = ["InteractiveUtils", "Logging", "Random", "Serialization"]
uuid = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[[UUIDs]]
deps = ["Random", "SHA"]
uuid = "cf7118a7-6976-5b1a-9a39-7adc72f591a4"

[[Unicode]]
uuid = "4ec0a83e-493e-50e2-b9ac-8f72acf5a8f5"
"""

# ╔═╡ Cell order:
# ╠═7e613bd2-616a-4687-8af5-a22c7a747d97
# ╠═d30e1e1b-fa6f-4fbc-bccb-1fcfc7b829df
# ╠═f7d14367-27d7-41a5-9f6a-79cf5e721a7d
# ╠═fe669218-18c3-46c7-80e8-7b1ab6fa77d2
# ╠═f9675ee0-e728-420b-81bd-22e57583c587
# ╟─ca96e0d5-0904-4ae5-89d0-c1a9187710a1
# ╠═b7734627-ba2a-48d8-8fd8-a5c94716da20
# ╟─1a2f116b-78f7-47b6-b96b-c0c74b5c5a35
# ╟─8d6f46b6-e6cf-4094-a32a-f1b13dc005f6
# ╠═09f4b4b6-75a4-4727-9405-e4fc45c2cda7
# ╠═730cfe5e-1541-4c08-8d4a-86d1f9e4115e
# ╠═b7ac2fea-41f4-47f3-a294-944378cb7093
# ╠═c1038e6a-c4e9-4b79-b3f9-35a9f64b0f64
# ╠═75fc343a-7904-45f8-be09-a542255ba673
# ╠═ffc98725-a88f-4dac-b387-f73cfd07510a
# ╠═872a8651-736c-47dd-80e6-b645fb0490c9
# ╠═a26cc458-4578-427f-840d-71d78c5c8b01
# ╠═281b4aab-307a-4d90-9dfb-f422b9567736
# ╠═e5edaa4d-74ff-4f6e-a045-71fd5494dd79
# ╠═5fb236c3-b67d-47ee-8644-84bd51e577b1
# ╠═8bd24b7b-4837-46b7-a6e9-b674630c2f56
# ╠═e33a9b31-722e-425e-be5e-b33517bec8e3
# ╠═de602aaa-704c-45c4-8b7b-fc58e41236ce
# ╠═abf694f4-c5c4-4a4f-b30f-62e358149195
# ╠═ec4a5558-28dd-47c1-b015-8799d9cb8800
# ╠═ce384249-52c5-47d8-9c93-18837432b625
# ╠═4be7e097-72a3-4590-bcfb-a7dacb78159c
# ╟─49fdc8a3-0e1a-42f0-acc4-b823eec91d31
# ╠═95c5a5bc-db23-4ad3-8ae8-81bc8f0edfd4
# ╠═4541f52f-1217-4dcd-b44c-042c7ca246bd
# ╠═ced9d1e9-7075-4ff2-8ca2-6a349f2a69c4
# ╟─be18d157-6b55-4eaa-99fe-c398e992a9fa
# ╠═12578b59-0161-4e72-afef-825166a62121
# ╠═34d90560-5a3e-4c7f-8126-35e1a6153aa1
# ╠═83540498-f317-4d8b-8dc6-80a93247b3b2
# ╟─00000000-0000-0000-0000-000000000001
# ╟─00000000-0000-0000-0000-000000000002
