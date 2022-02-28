using Pkg
const PKGDIR = dirname(@__DIR__)
Pkg.activate(PKGDIR)

import Base

const MODE = get(ENV, "PLUTO_COMPILE_TIMES_MODE", "with_precompile_directives")

if MODE == "without_precompile_directives"
    # Disable precompilation by overriding the method.
    function Base.precompile(@nospecialize(f), args::Tuple)
        return nothing
    end
end

@show precompile(sum, ()) == nothing

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
