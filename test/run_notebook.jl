import Pkg
Pkg.activate(mktempdir())
Pkg.develop(Pkg.PackageSpec(path=ARGS[1]))
import Pluto
s = Pluto.ServerSession()
nb = Pluto.SessionActions.open_url(s, "https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.12.16/sample/Basic.jl"; run_async=false)
@show [c.output_repr for c in nb.cells]
success = !any(c.errored for c in nb.cells)
exit(success ? 0 : 1)