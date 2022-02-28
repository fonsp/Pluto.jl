using Pkg
const PKGDIR = dirname(@__DIR__)
Pkg.activate(PKGDIR)

print("""
\nHi! Have fun looking at the benchmark results. One note though: beware that the reported time may differ per CPU and that GitHub Runners don't all have the same CPU. Therefore, it's better to look at allocations.
""")

println("\nPrecompile:")
@time Pkg.precompile()

println("\nUsing Pluto:")
@time using Pluto

function wait_for_ready(nb::Pluto.Notebook)
    while nb.process_status != Pluto.ProcessStatus.ready
        sleep(0.1)
    end
end

println("\nPluto.ServerSession():")
@time session = Pluto.ServerSession()

println("\nSessionActions.open:")
@time nb = let
    path = joinpath(PKGDIR, "sample", "Basic.jl")
    Pluto.SessionActions.open(session, path; run_async=true)
end

wait_for_ready(nb)

println("\nSessionActions.shutdown:")
@time Pluto.SessionActions.shutdown(session, nb; async=true)

# Let the shutdown complete.
sleep(10)

println("\nSessionActions.new:")
@time nb = Pluto.SessionActions.new(session; run_async=true)

wait_for_ready(nb)
