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
		"TimerOutputs"
    ])
    Pkg.develop(; path=PKGDIR)

	# Loading in this block to avoid a "Undefined @timeit" in the next block.
	using TimerOutputs
end

# ╔═╡ 4d561fbd-2c21-4606-b245-88e4ae235919
begin
	tout = TimerOutput()

	Pkg.precompile()
	
	@timeit tout "using Pluto" using Pluto

	function wait_for_ready(notebook::Pluto.Notebook)
    	while notebook.process_status != Pluto.ProcessStatus.ready
    	    sleep(0.1)
    	end
	end;
	
	@timeit tout "Pluto.ServerSession()" session = Pluto.ServerSession()
	session.options.server.disable_writing_notebook_files = true

	path = joinpath(PKGDIR, "sample", "Basic.jl")
	
	@timeit tout "SessionActions.open" nb = Pluto.SessionActions.open(session, path; run_async=true)

	wait_for_ready(nb)

	@timeit tout "SessionActions.shutdown" Pluto.SessionActions.shutdown(session, nb; async=true)

	# Let the shutdown complete.
	sleep(10)
	# @show nb.process_status

	@timeit tout "SessionActions.new" Pluto.SessionActions.new(session; run_async=true)

	wait_for_ready(nb)
end

# ╔═╡ 5ff034f9-b851-4e6d-8eba-8215fb5a32ed
let
	table = sprint((io, tout) -> show(io, tout; compact=true, sortby=:firstexec), tout)
	write(joinpath(PKGDIR, "perf", "compiletimes.txt"), table)
	Base.Text(table)
end

# ╔═╡ Cell order:
# ╟─5f0bce84-f876-499a-9239-2b6d3dbcbd79
# ╠═812dd750-bc82-4dfa-a1c4-443ebc2bda51
# ╠═71b750ea-98b5-11ec-39f9-df1b8825bc3c
# ╠═4d561fbd-2c21-4606-b245-88e4ae235919
# ╠═5ff034f9-b851-4e6d-8eba-8215fb5a32ed
