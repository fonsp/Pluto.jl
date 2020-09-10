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

function default_working_directory()
    preferred_dir = startswith(Sys.BINDIR, pwd()) ? homedir() : pwd()
    return joinpath(preferred_dir, "") # must end with / or \
end

pluto_path(xs...) = normpath(joinpath(dirname(dirname(pathof(Pluto))), xs...))

const PLUTO_VERSION = VersionNumber(Pkg.TOML.parsefile(pluto_path("Project.toml"))["version"])
const PLUTO_VERSION_STR = 'v' * string(PLUTO_VERSION)
const JULIA_VERSION_STR = 'v' * string(VERSION)

abstract type AbstractPlutoConfiguration end

Base.@kwdef struct CompilerOptions <: AbstractPlutoConfiguration
    compile::Union{Nothing, String} = nothing
    sysimage::Union{Nothing, String} = nothing
    banner::Union{Nothing, String} = nothing
    optimize::Union{Nothing, Int} = nothing
    math_mode::Union{Nothing, String} = nothing

    # notebook specified configs
    # the followings are different from
    # the default julia compiler options

    # we use nothing to represent "@v#.#"
    project::Union{Nothing, String} = "@."
    # we don't load startup file in notebook
    startup_file::Union{Nothing, String} = "no"
    # we don't load history file in notebook
    history_file::Union{Nothing, String} = "no"

@static if VERSION > v"1.5.0-"
    threads::Union{Nothing, String} = nothing
end

end # struct CompilerOptions

function simlar_options(options::AbstractPlutoConfiguration; kwargs...)
    new_kwargs = Dict()
    for each in fieldnames(typeof(options))
        new_kwargs[each] = get(kwargs, each, getfield(options, each))
    end
    return typeof(options)(;new_kwargs...)
end

# NOTE: printings are copy-pastable
function Base.show(io::IO, x::AbstractPlutoConfiguration)
    indent = get(io, :indent, 0)

    summary(io, x)
    println(io, "(")
    fnames = fieldnames(typeof(x))
    for each in fieldnames(typeof(x))
        print(IOContext(io, :indent=>2), " "^indent, " "^2, each, " = ", getfield(x, each))
        println(io, ", ")
    end
    print(io, " "^indent, ")")
    return
end

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
