# Collect Time To First X (TTFX)
#
# A few notes about these compile times benchmarks.
#   1. These benchmarks are meant to show where the biggest problems are and to be able to trace back where some regression was introduced.
#   2. The benchmarks use `@eval` to avoid missing compile time, see the `@time` docstring for more info.
#   3. Only add benchmarks for methods which take more than 1 seconds on the first run to reduce noise.
#   4. Note that some benchmarks depend on disk and network speeds too, so focus on the number of allocations since those are more robust.

module Foo end

using UUIDs

# setup required for run_exporession:
const test_notebook_id = uuid1()
let
    channel = Channel{Any}(10)
    Pluto.PlutoRunner.setup_plutologger(
        test_notebook_id, 
        channel,
    )
end
@timeit TOUT "PlutoRunner.run_expression" @eval Pluto.PlutoRunner.run_expression(Foo, Expr(:toplevel, :(1 + 1)), test_notebook_id, uuid1(), nothing);

function wait_for_ready(notebook::Pluto.Notebook)
    while notebook.process_status != Pluto.ProcessStatus.ready
        sleep(0.1)
    end
end

🍭 = Pluto.ServerSession()
🍭.options.server.disable_writing_notebook_files = true
🍭.options.evaluation.workspace_use_distributed = false

path = joinpath(pkgdir(Pluto), "sample", "Basic.jl")

@timeit TOUT "SessionActions.open" nb = @eval Pluto.SessionActions.open(🍭, path; run_async=false)

wait_for_ready(nb)

Pluto.SessionActions.shutdown(🍭, nb; async=false)

# Compile HTTP get. Use no encoding since there seem to be an issue with Accept-Encoding: gzip
HTTP.get("http://github.com")

@timeit TOUT "Pluto.run" server_task = @eval let
    port = 13435
    options = Pluto.Configuration.from_flat_kwargs(; port, launch_browser=false, workspace_use_distributed=false, require_secret_for_access=false, require_secret_for_open_links=false)
    🍭 = Pluto.ServerSession(; options)
    server_task = @async Pluto.run(🍭)

    # Give the async task time to start.
    sleep(1)

    HTTP.get("http://localhost:$port/edit").status == 200
    server_task
end
