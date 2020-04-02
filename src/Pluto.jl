module Pluto
export Notebook, Cell, run

import Pkg

const PKG_ROOT_DIR = normpath(joinpath(@__DIR__, ".."))
const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(joinpath(PKG_ROOT_DIR, "Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)

@info """\n
    Welcome to Pluto $(PLUTO_VERSION_STR)! ⚡

    Let us know what you think:
    https://github.com/fonsp/Pluto.jl
\n"""

include("./react/ExploreExpression.jl")
using .ExploreExpression

include("./notebookserver/FormatOutput.jl")
include("./notebookserver/Cell.jl")
include("./notebookserver/Notebook.jl")
include("./notebookserver/Client.jl")


include("./react/WorkspaceManager.jl")
include("./react/Errors.jl")
include("./react/React.jl")
include("./react/Run.jl")

include("./webserver/WebServer.jl")
include("./webserver/Static.jl")
include("./webserver/Dynamic.jl")
include("./webserver/Completions.jl")

end