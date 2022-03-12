# Collect Time To Finish Task (TTFT)

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
