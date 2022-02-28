### A Pluto.jl notebook ###
# v0.18.0

using Markdown
using InteractiveUtils

# ╔═╡ 5f0bce84-f876-499a-9239-2b6d3dbcbd79
println(md"""

Hi! Have fun looking at the benchmark results.
One note though: beware that the reported time may differ per CPU and that GitHub Runners don't all have the same CPU.
Therefore, it's better to look at allocations.
""")

# ╔═╡ 812dd750-bc82-4dfa-a1c4-443ebc2bda51
PKGDIR = dirname(@__DIR__)

# ╔═╡ 71b750ea-98b5-11ec-39f9-df1b8825bc3c
begin
	using Pkg
    
    Pkg.activate(; temp=true)
    Pkg.add([
		"DataFrames",
		"OrderedCollections"
    ])
    Pkg.develop(; path=PKGDIR)
end

# ╔═╡ 4d561fbd-2c21-4606-b245-88e4ae235919
begin
	using DataFrames
	using OrderedCollections

	# We collect the output to make it easy to show it in a separate GitHub Actions step. 
	out = OrderedDict()

	Pkg.precompile()
	
	out["warmup"] = @timed 1 + 1
	
	out["using Pluto"] = @timed using Pluto

	function wait_for_ready(notebook::Pluto.Notebook)
    	while notebook.process_status != Pluto.ProcessStatus.ready
    	    sleep(0.1)
    	end
	end;
	
	out["Pluto.ServerSession()"] = @timed Pluto.ServerSession()
	session = out["Pluto.ServerSession()"].value
	session.options.server.disable_writing_notebook_files = true

	out["SessionActions.open"] = @timed let
    	path = joinpath(PKGDIR, "sample", "Basic.jl")
    	Pluto.SessionActions.open(session, path; run_async=true)
	end	
	nb = out["SessionActions.open"].value

	wait_for_ready(nb)

	out["SessionActions.shutdown"] = @timed Pluto.SessionActions.shutdown(session, nb; async=true)

	# Let the shutdown complete.
	sleep(10)
	# @show nb.process_status

	out["SessionActions.new"] = @timed Pluto.SessionActions.new(session; run_async=true)

	wait_for_ready(nb)
end

# ╔═╡ 5ff034f9-b851-4e6d-8eba-8215fb5a32ed
let
	pop!(out, "warmup")
	names = [first(x) for x in out]
	times = [round(last(x).time; digits=1) for x in out]
	allocations = [round(last(x).bytes / 10^6, digits=1) for x in out]
	df = DataFrame(
		"Operation" => names,
		"Allocations (MB)" => allocations,
		"Time (seconds)" => times
	)
	text = string(df)
	# To show it in the next step in GitHub Actions which makes looking things up easier.
	write(joinpath(PKGDIR, "perf", "compiletimes.txt"), text)
	Base.Text(text)
end

# ╔═╡ Cell order:
# ╟─5f0bce84-f876-499a-9239-2b6d3dbcbd79
# ╠═812dd750-bc82-4dfa-a1c4-443ebc2bda51
# ╠═71b750ea-98b5-11ec-39f9-df1b8825bc3c
# ╠═4d561fbd-2c21-4606-b245-88e4ae235919
# ╠═5ff034f9-b851-4e6d-8eba-8215fb5a32ed
