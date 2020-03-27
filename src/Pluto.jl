module Pluto
export Notebook, Cell, run

import Pkg

const PKG_ROOT_DIR = normpath(joinpath(@__DIR__, ".."))
const VERSION_STR = 'v' * Pkg.TOML.parsefile(joinpath(PKG_ROOT_DIR, "Project.toml"))["version"]

@info """\n
    Welcome to Pluto $(VERSION_STR)! ⚡

    Let us know what you think:
    https://github.com/fonsp/Pluto.jl
\n"""

include("./react/ExploreExpression.jl")
using .ExploreExpression
include("./react/Cell.jl")
include("./react/Notebook.jl")
include("./react/WorkspaceManager.jl")
include("./react/React.jl")

include("./webserver/NotebookServer.jl")
include("./webserver/Static.jl")
include("./webserver/FormatOutput.jl")
include("./webserver/Dynamic.jl")

end