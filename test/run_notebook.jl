import Pkg
Pkg.add("Pluto")
import Pluto
s = Pluto.ServerSession()
nb = Pluto.SessionActions.open_url(s, "https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.12.16/sample/Basic.jl"; run_async=false)
@show [c.output_repr for c in nb.cells]
success = !any(c.errored for c in nb.cells)
exit(success ? 0 : 1)