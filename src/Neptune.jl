"""
Start a notebook server using:

```julia
julia> Pluto.run()
```

Have a look at the FAQ:
https://github.com/fonsp/Pluto.jl/wiki
"""
module Neptune

import Pkg

project_relative_path(xs...) = normpath(joinpath(dirname(dirname(pathof(Neptune))), xs...))

const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(project_relative_path("Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)

include("./Configuration.jl")

include("./evaluation/Tokens.jl")
include("./runner/PlutoRunner.jl")
# import .PlutoRunner
# @eval Main begin
#   PlutoRunner = $(PlutoRunner)
# end
include("./analysis/ExpressionExplorer.jl")
include("./analysis/ReactiveNode.jl")

include("./notebook/PathHelpers.jl")
include("./notebook/Cell.jl")
include("./notebook/Notebook.jl")
include("./webserver/Session.jl")
include("./webserver/PutUpdates.jl")

include("./analysis/Errors.jl")
include("./analysis/Parse.jl")
include("./analysis/Topology.jl")

include("./evaluation/WorkspaceManager.jl")
include("./evaluation/Update.jl")
include("./evaluation/Run.jl")

include("./webserver/MsgPack.jl")
include("./webserver/SessionActions.jl")
include("./webserver/Static.jl")
include("./webserver/Dynamic.jl")
include("./webserver/REPLTools.jl")
include("./webserver/WebServer.jl")

if get(ENV, "JULIA_PLUTO_SHOW_BANNER", "1") !== "0"
@info """\n
    Welcome to Neptune $(PLUTO_VERSION_STR) 🎈
    Start a notebook server using:

  julia> Neptune.run()
\n"""
end

end
