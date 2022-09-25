"""
Start a notebook server using:

```julia
julia> Pluto.run()
```

Have a look at the FAQ:
https://github.com/fonsp/Pluto.jl/wiki
"""
module Pluto

if isdefined(Base, :Experimental) && isdefined(Base.Experimental, Symbol("@max_methods"))
    @eval Base.Experimental.@max_methods 1
end

import FuzzyCompletions
import RelocatableFolders: @path
const ROOT_DIR = normpath(joinpath(@__DIR__, ".."))
const FRONTEND_DIR = @path(joinpath(ROOT_DIR, "frontend"))
const FRONTEND_DIST_DIR = let dir = joinpath(ROOT_DIR, "frontend-dist")
    isdir(dir) ? @path(dir) : FRONTEND_DIR
end
const frontend_dist_exists = FRONTEND_DIR !== FRONTEND_DIST_DIR
const SAMPLE_DIR = @path(joinpath(ROOT_DIR, "sample"))
const RUNNER_DIR = @path(joinpath(ROOT_DIR, "src", "runner"))
function project_relative_path(root, xs...)
    root == joinpath("src", "runner") ? joinpath(RUNNER_DIR, xs...) :
    root == "frontend-dist" && frontend_dist_exists ? joinpath(FRONTEND_DIST_DIR, xs...) :
    root == "frontend" ? joinpath(FRONTEND_DIR, xs...) :
    root == "sample" ? joinpath(SAMPLE_DIR, xs...) :
        normpath(joinpath(pkgdir(Pluto), root, xs...))
end

import Pkg

include_dependency("../Project.toml")
const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(joinpath(ROOT_DIR, "Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)

include("./notebook/path helpers.jl")
include("./notebook/Export.jl")
include("./Configuration.jl")

include("./evaluation/Tokens.jl")
include("./evaluation/Throttled.jl")
include("./runner/PlutoRunner.jl")
include("./analysis/ExpressionExplorer.jl")
include("./analysis/FunctionDependencies.jl")
include("./analysis/ReactiveNode.jl")
include("./packages/PkgCompat.jl")

module OperationalTransform
include("./notebook/OperationalTransform.jl")
end

include("./notebook/Cell.jl")
include("./analysis/data structures.jl")
include("./analysis/Topology.jl")
include("./analysis/Errors.jl")
include("./analysis/TopologicalOrder.jl")
include("./notebook/Notebook.jl")
include("./notebook/saving and loading.jl")
include("./notebook/frontmatter.jl")
include("./notebook/Events.jl")
include("./webserver/Session.jl")
include("./webserver/PutUpdates.jl")

include("./analysis/Parse.jl")
include("./analysis/topological_order.jl")
include("./analysis/is_just_text.jl")
include("./analysis/TopologyUpdate.jl")
include("./analysis/DependencyCache.jl")
include("./analysis/MoreAnalysis.jl")

include("./evaluation/WorkspaceManager.jl")
include("./evaluation/MacroAnalysis.jl")
include("./packages/Packages.jl")
include("./packages/PkgUtils.jl")
include("./evaluation/Run.jl")
include("./evaluation/RunBonds.jl")

module DownloadCool include("./webserver/data_url.jl") end
include("./webserver/SessionActions.jl")
include("./webserver/Static.jl")
include("./webserver/Dynamic.jl")
include("./webserver/MsgPack.jl")
include("./webserver/REPLTools.jl")
include("./webserver/WebServer.jl")

const reset_notebook_environment = PkgUtils.reset_notebook_environment
const update_notebook_environment = PkgUtils.update_notebook_environment
const activate_notebook_environment = PkgUtils.activate_notebook_environment
export reset_notebook_environment
export update_notebook_environment
export activate_notebook_environment

if get(ENV, "JULIA_PLUTO_SHOW_BANNER", "1") != "0" && get(ENV, "CI", "🍄") != "true"
@info """\n
    Welcome to Pluto $(PLUTO_VERSION_STR) 🎈
    Start a notebook server using:

  julia> Pluto.run()

    Have a look at the FAQ:
    https://github.com/fonsp/Pluto.jl/wiki
\n"""
end

# Generate and include `precompile` directives during the precompilation phase.
# This aims to reduce the time to first X (time to first running notebook in this case).
using PrecompileSignatures: @precompile_signatures
@precompile_signatures(Pluto)

end
