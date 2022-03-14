# Collect Time To Finish Task (TTFT)

@timeit TOUT "Pluto.Cell" cell = Pluto.Cell("1 + 1")

@timeit TOUT "Pluto.Notebook" nb = Pluto.Notebook([cell])

function wait_for_ready(notebook::Pluto.Notebook)
    while notebook.process_status != Pluto.ProcessStatus.ready
        sleep(0.1)
    end
end

🍭 = Pluto.ServerSession()
🍭.options.server.disable_writing_notebook_files = true
🍭.options.evaluation.workspace_use_distributed = false

path = joinpath(pkgdir(Pluto), "sample", "Basic.jl")

@timeit TOUT "SessionActions.open" nb = Pluto.SessionActions.open(🍭, path; run_async=true)

wait_for_ready(nb)

@timeit TOUT "SessionActions.shutdown" Pluto.SessionActions.shutdown(🍭, nb; async=true)

@timeit TOUT "Pluto.run" server_task = let
    port = 13435
    options = Pluto.Configuration.from_flat_kwargs(; port, launch_browser=false, workspace_use_distributed=true, require_secret_for_access=false, require_secret_for_open_links=false)
    🍭 = Pluto.ServerSession(; options)
    server_task = @async Pluto.run(🍭)

    retry(; delays=fill(0.1, 20)) do
        HTTP.get("http://localhost:$port/edit").status == 200
    end
    server_task
end

schedule(server_task, InterruptException(); error=true)
