const PKGDIR = dirname(@__DIR__)

using Pkg
Pkg.activate(PKGDIR)

using Pluto

session = Pluto.ServerSession()
session.options.server.disable_writing_notebook_files = true

path = joinpath(PKGDIR, "perf", "benchmark-compilation.jl")

# For some reason, running the separate file didn't work, so let's call it via Pluto.
Pluto.SessionActions.open(session, path; run_async=false)
