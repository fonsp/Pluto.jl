"""
Start a notebook server using:

```julia
julia> Pluto.run()
```

Have a look at the FAQ:
https://github.com/fonsp/Pluto.jl/wiki
"""
module Pluto
project_relative_path(xs...) = normpath(joinpath(dirname(dirname(pathof(Pluto))), xs...))

import Pkg

include_dependency("../Project.toml")
const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(project_relative_path("Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)

include("./notebook/PathHelpers.jl")
include("./notebook/Export.jl")
include("./Configuration.jl")

include("./evaluation/Tokens.jl")
include("./runner/PlutoRunner.jl")
include("./analysis/ExpressionExplorer.jl")
include("./analysis/ReactiveNode.jl")
include("./packages/PkgCompat.jl")

include("./notebook/Cell.jl")
include("./analysis/Topology.jl")
include("./analysis/Errors.jl")
include("./analysis/TopologicalOrder.jl")
include("./notebook/Notebook.jl")
include("./webserver/Session.jl")
include("./webserver/PutUpdates.jl")

include("./analysis/Parse.jl")
include("./analysis/topological_order.jl")
include("./analysis/is_just_text.jl")
include("./analysis/TopologyUpdate.jl")
include("./analysis/DependencyCache.jl")

include("./evaluation/WorkspaceManager.jl")
include("./packages/Packages.jl")
include("./packages/PkgUtils.jl")
include("./evaluation/Run.jl")
include("./evaluation/RunBonds.jl")

include("./webserver/MsgPack.jl")
include("./webserver/SessionActions.jl")
include("./webserver/Static.jl")
include("./webserver/Dynamic.jl")
include("./webserver/REPLTools.jl")
include("./webserver/WebServer.jl")

const reset_notebook_environment = PkgUtils.reset_notebook_environment
const update_notebook_environment = PkgUtils.update_notebook_environment
const activate_notebook_environment = PkgUtils.activate_notebook_environment
export reset_notebook_environment
export update_notebook_environment
export activate_notebook_environment

if get(ENV, "JULIA_PLUTO_SHOW_BANNER", "1") !== "0"
@info """\n
    Welcome to Pluto $(PLUTO_VERSION_STR) 🎈
    Start a notebook server using:

  julia> Pluto.run()

    Have a look at the FAQ:
    https://github.com/fonsp/Pluto.jl/wiki
\n"""
end


# code running in the notebook:

# howmany = @coolbind(Counter(  PlutoRunner.inline_state[:uuid + idx]   ))  + @coolbind(Counter(  PlutoRunner.inline_state[:asd98cn9s8ljsadf8h]   ))


# @coolbind(Slider())

# when saved to file:

# howmany = @coolbind(Counter(124))  + @coolbind(Counter(134))



end
