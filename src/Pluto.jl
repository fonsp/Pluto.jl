module Pluto
export Notebook, Cell, run

import Pkg

const PKG_ROOT_DIR = normpath(joinpath(@__DIR__, ".."))
include_dependency(joinpath(PKG_ROOT_DIR, "Project.toml"))
const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(joinpath(PKG_ROOT_DIR, "Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)
const ENV_DEFAULTS = Dict(
    "PLUTO_WORKSPACE_USE_DISTRIBUTED" => "true",
    "PLUTO_RUN_NOTEBOOK_ON_LOAD" => "true",
    "PLUTO_ROOT_URL" => "/",
)

if get(ENV, "PLUTO_SHOW_BANNER", "true") == "true"
@info """\n
    Welcome to Pluto $(PLUTO_VERSION_STR) 🎈
    Start a notebook server using:

  julia> Pluto.run(1234)

    Have a look at the FAQ:
    https://github.com/fonsp/Pluto.jl/wiki
\n"""
end

include("./react/ExploreExpression.jl")
include("./runner/PlutoRunner.jl")
using .ExploreExpression

include("./notebookserver/Cell.jl")
include("./notebookserver/Notebook.jl")
include("./notebookserver/Client.jl")

include("./react/Parse.jl")
include("./react/WorkspaceManager.jl")
include("./react/Errors.jl")
include("./react/React.jl")
include("./react/Run.jl")

include("./webserver/WebServer.jl")
include("./webserver/Static.jl")
include("./webserver/Dynamic.jl")
include("./webserver/REPLish.jl")

end
