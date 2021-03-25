import Pkg
Pkg.activate(mktempdir())
Pkg.develop(Pkg.PackageSpec(path=ARGS[1]))
import Pluto
s = Pluto.ServerSession()
urls = [
    "https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.12.16/sample/Basic.jl",
    "https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.12.16/sample/Basic.jl",
    "https://gist.githubusercontent.com/fonsp/4e164a262a60fc4bdd638e124e629d64/raw/8ffe93c680e539056068456a62dea7bf6b8eb622/basic_pkg_notebook.jl",
]
success = all(urls) do url
    @show url
    nb = Pluto.SessionActions.open_url(s, url; run_async=false)
    @show [c.output.body for c in nb.cells]
    nb_success = !any(c.errored for c in nb.cells)
    @info "Done" url nb_success
    nb_success
end
exit(success ? 0 : 1)