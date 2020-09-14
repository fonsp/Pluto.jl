module Configuration

abstract type AbstractOptions end

"""
These options will be passed as command line argument to newly launched processes.

The ServerSession contains a global version of this configuration, and each notebook can also have its own version.
"""
Base.@kwdef mutable struct CompilerOptions <: AbstractOptions
    compile::Union{Nothing,String} = nothing
    sysimage::Union{Nothing,String} = nothing
    banner::Union{Nothing,String} = nothing
    optimize::Union{Nothing,Int} = nothing
    math_mode::Union{Nothing,String} = nothing

    # notebook specified options
    # the followings are different from
    # the default julia compiler options

    # we use nothing to represent "@v#.#"
    project::Union{Nothing,String} = "@."
    # we don't load startup file in notebook
    startup_file::Union{Nothing,String} = "no"
    # we don't load history file in notebook
    history_file::Union{Nothing,String} = "no"

    @static if VERSION > v"1.5.0-"
        threads::Union{Nothing,String} = nothing
    end
end # struct CompilerOptions

function notebook_path_suggestion()
    preferred_dir = startswith(Sys.BINDIR, pwd()) ? homedir() : pwd()
    return joinpath(preferred_dir, "") # so that it ends with / or \
end

"""
The HTTP server options. See `SecurityOptions` for additional settings.
"""
Base.@kwdef mutable struct ServerOptions <: AbstractOptions
    root_url::Union{Nothing,String} = nothing
    host::String = "127.0.0.1"
    port::Union{Nothing,Integer} = nothing
    launch_browser::Bool = true
    show_file_system::Bool = true
    working_directory::String = notebook_path_suggestion()
end

"""
Security settings for the HTTP server.
"""
Base.@kwdef mutable struct SecurityOptions <: AbstractOptions
    require_token_for_open_links::Bool = true
end

Base.@kwdef mutable struct EvaluationOptions <: AbstractOptions
    run_notebook_on_load::Bool = true
    workspace_use_distributed::Bool = true
end

"""
Collection of all settings that configure a Pluto session. 

`ServerSession` contains a `Configuration`.
"""
Base.@kwdef struct Options <: AbstractOptions
    evaluation::EvaluationOptions = EvaluationOptions()
    compiler::CompilerOptions = CompilerOptions()
    server::ServerOptions = ServerOptions()
    security::SecurityOptions = SecurityOptions()
end


function overlayed(original::AbstractOptions, changes...)
    new_kwargs = Dict()
    for name in fieldnames(typeof(original))
        new_kwargs[name] = get(changes, name, getfield(original, name))
    end
    return typeof(original)(;new_kwargs...)
end

# NOTE: printings are copy-pastable
function Base.show(io::IO, x::AbstractOptions)
    indent = get(io, :indent, 0)

    summary(io, x)
    println(io, "(")
    fnames = fieldnames(typeof(x))
    for each in fieldnames(typeof(x))
        print(IOContext(io, :indent => 2), " "^indent, " "^2, each, " = ", getfield(x, each))
        println(io, ", ")
    end
    print(io, " "^indent, ")")
    return
end

end