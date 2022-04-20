# Collect Time To Finish Task (TTFT)

# Using `@eval` to avoid missing compile time, see the `@time` docstring for more info.
@timeit TOUT "Pluto.Cell" cell = @eval Pluto.Cell("1 + 1")

@timeit TOUT "Pluto.Notebook" nb = @eval Pluto.Notebook([cell])

module Foo end
@timeit TOUT "PlutoRunner.run_expression" @eval Pluto.PlutoRunner.run_expression(Foo, :(1 + 1), Pluto.uuid1(), nothing);

function wait_for_ready(notebook::Pluto.Notebook)
    while notebook.process_status != Pluto.ProcessStatus.ready
        sleep(0.1)
    end
end

🍭 = Pluto.ServerSession()
🍭.options.server.disable_writing_notebook_files = true
🍭.options.evaluation.workspace_use_distributed = false

path = joinpath(pkgdir(Pluto), "sample", "Basic.jl")

@timeit TOUT "SessionActions.open" nb = @eval Pluto.SessionActions.open(🍭, path; run_async=true)

wait_for_ready(nb)

@timeit TOUT "SessionActions.shutdown" @eval Pluto.SessionActions.shutdown(🍭, nb; async=true)

# According to SnoopCompile, this is a big part of the time for `Pluto.run()`.
# However, it's very tricky to measure this via the `Pluto.run` below.
@timeit TOUT "Configuration.from_flat_kwargs" @eval Pluto.Configuration.from_flat_kwargs()

# Compile HTTP get.
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
