using Pluto

notebook_url = "https://raw.githubusercontent.com/fonsp/disorganised-mess/master/big.jl"

path = download(notebook_url)

session = Pluto.ServerSession()
@time nb = Pluto.SessionActions.open(session, path; run_async=false) # run async=false means that it will run the entire notebook and return when its done

@assert nb isa Pluto.Notebook
