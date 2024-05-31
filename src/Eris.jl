"""
Start a notebook server using:

```julia
julia> Eris.run()
```

Have a look at the FAQ:
https://github.com/fonsp/Pluto.jl/wiki
"""
module Eris

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
        normpath(joinpath(pkgdir(Eris), root, xs...))
end

import Pkg
import Scratch

include_dependency("../Project.toml")
const ERIS_VERSION = VersionNumber(Pkg.TOML.parsefile(joinpath(ROOT_DIR, "Project.toml"))["version"])
const ERIS_VERSION_STR = "v$(string(ERIS_VERSION))"
const JULIA_VERSION_STR = "v$(string(VERSION))"

import PlutoDependencyExplorer: PlutoDependencyExplorer, TopologicalOrder, NotebookTopology, ExprAnalysisCache, ImmutableVector, ExpressionExplorerExtras, topological_order, all_cells, disjoint, where_assigned, where_referenced
using ExpressionExplorer

include("./notebook/path helpers.jl")
include("./notebook/Export.jl")
include("./Configuration.jl")

include("./evaluation/Tokens.jl")
include("./evaluation/Throttled.jl")
include("./runner/PlutoRunner/src/PlutoRunner.jl")
include("./packages/PkgCompat.jl")
include("./webserver/Status.jl")

include("./notebook/Cell.jl")
include("./notebook/Notebook.jl")
include("./notebook/saving and loading.jl")
include("./notebook/frontmatter.jl")
include("./notebook/Events.jl")
include("./webserver/Session.jl")
include("./webserver/PutUpdates.jl")

include("./analysis/Parse.jl")
include("./analysis/is_just_text.jl")
include("./analysis/DependencyCache.jl")
include("./analysis/MoreAnalysis.jl")

include("./evaluation/WorkspaceManager.jl")
include("./evaluation/MacroAnalysis.jl")
include("./packages/IOListener.jl")
include("./packages/precompile_isolated.jl")
include("./packages/Packages.jl")
include("./packages/PkgUtils.jl")
include("./evaluation/Run.jl")
include("./evaluation/RunBonds.jl")

module DownloadCool include("./webserver/data_url.jl") end
include("./webserver/MsgPack.jl")
include("./webserver/SessionActions.jl")
include("./webserver/Static.jl")
include("./webserver/Authentication.jl")
include("./webserver/Router.jl")
include("./webserver/Dynamic.jl")
include("./webserver/REPLTools.jl")
include("./webserver/WebServer.jl")

const reset_notebook_environment = PkgUtils.reset_notebook_environment
const update_notebook_environment = PkgUtils.update_notebook_environment
const activate_notebook_environment = PkgUtils.activate_notebook_environment
export reset_notebook_environment
export update_notebook_environment
export activate_notebook_environment

# include("./precompile.jl")

const pluto_boot_environment_path = Ref{String}()

function __init__()
    pluto_boot_environment_name = "pluto-boot-environment-$(VERSION)-$(ERIS_VERSION)"
    pluto_boot_environment_path[] = Scratch.@get_scratch!(pluto_boot_environment_name)

    # Print a welcome banner
    if (get(ENV, "JULIA_ERIS_SHOW_BANNER", "1") != "0" &&
        get(ENV, "CI", "🍄") != "true" && isinteractive())
        # Print the banner only once per version, if there isn't
        # yet a file for this version in banner_shown scratch space.
        # (Using the Eris version as the filename enables later
        # version-specific "what's new" messages.)
        fn = joinpath(Scratch.@get_scratch!("banner_shown"), ERIS_VERSION_STR)
        if !isfile(fn)
            @info """

              Welcome to Eris $(ERIS_VERSION_STR) 🔬
              Start a notebook server using:

            julia> Eris.run()

              Have a look at the FAQ:
              https://github.com/fonsp/Pluto.jl/wiki

            """
            # create empty file to indicate that we've shown the banner
            write(fn, "");
        end
    end
end

end
