"""
Start a notebook server using:

```julia
julia> Pluto.run()
```

Have a look at the FAQ:
https://github.com/fonsp/Pluto.jl/wiki
"""
module Pluto

import Pkg

const PKG_ROOT_DIR = normpath(joinpath(@__DIR__, ".."))
include_dependency(joinpath(PKG_ROOT_DIR, "Project.toml"))
const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(joinpath(PKG_ROOT_DIR, "Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)
const ENV_DEFAULTS = Dict(
    "PLUTO_WORKSPACE_USE_DISTRIBUTED" => "true",
    "PLUTO_RUN_NOTEBOOK_ON_LOAD" => "true",
    "PLUTO_WORKING_DIRECTORY" => let
        preferred_dir = startswith(Sys.BINDIR, pwd()) ? homedir() : pwd()
        joinpath(preferred_dir, "") # must end with / or \
    end,
    "PLUTO_DEFAULT_ENVIRONMENT_PATH" => let
        # Use the global environment, ~/.julia/environments/v<major>.<minor> as fallback environment.
        # The package environment for new notebooks does not inherit from the environment in which the server was launched - this is intentional.
        Base.load_path_expand("@v#.#")
    end,
)

get_pl_env(key::String) = haskey(ENV, key) ? ENV[key] : ENV_DEFAULTS[key]

include("./evaluation/Tokens.jl")
include("./runner/PlutoRunner.jl")
include("./analysis/ExpressionExplorer.jl")

include("./notebook/PathHelpers.jl")
include("./notebook/Cell.jl")
include("./notebook/Notebook.jl")
include("./webserver/Session.jl")

include("./analysis/Errors.jl")
include("./analysis/Parse.jl")
include("./analysis/Topology.jl")

include("./evaluation/WorkspaceManager.jl")
include("./evaluation/Update.jl")
include("./evaluation/Run.jl")

include("./webserver/Configuration.jl")
include("./webserver/MsgPack.jl")
include("./webserver/PutUpdates.jl")
include("./webserver/SessionActions.jl")
include("./webserver/Static.jl")
include("./webserver/Dynamic.jl")
include("./webserver/REPLTools.jl")
include("./webserver/WebServer.jl")

if get(ENV, "PLUTO_SHOW_BANNER", "true") == "true"
@info """\n
    Welcome to Pluto $(PLUTO_VERSION_STR) 🎈
    Start a notebook server using:

  julia> Pluto.run()

    Have a look at the FAQ:
    https://github.com/fonsp/Pluto.jl/wiki
\n"""
end

end
