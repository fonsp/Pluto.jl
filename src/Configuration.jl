module Configuration

function notebook_path_suggestion()
    preferred_dir = startswith(Sys.BINDIR, pwd()) ? homedir() : pwd()
    return joinpath(preferred_dir, "") # so that it ends with / or \
end

"""
The HTTP server options. See `SecurityOptions` for additional settings.
"""
Base.@kwdef mutable struct ServerOptions
    root_url::Union{Nothing,String} = nothing
    host::String = "127.0.0.1"
    port::Union{Nothing,Integer} = nothing
    launch_browser::Bool = true
    show_file_system::Bool = true
    notebook_path_suggestion::String = notebook_path_suggestion()
end

"""
Security settings for the HTTP server.
"""
Base.@kwdef mutable struct SecurityOptions
    require_token_for_open_links::Bool = true
end

Base.@kwdef mutable struct EvaluationOptions
    run_notebook_on_load::Bool = true
    workspace_use_distributed::Bool = true
end

"""
These options will be passed as command line argument to newly launched processes.

The ServerSession contains a global version of this configuration, and each notebook can also have its own version.
"""
Base.@kwdef mutable struct CompilerOptions
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

"""
Collection of all settings that configure a Pluto session. 

`ServerSession` contains a `Configuration`.
"""
Base.@kwdef struct Options
    server::ServerOptions = ServerOptions()
    security::SecurityOptions = SecurityOptions()
    evaluation::EvaluationOptions = EvaluationOptions()
    compiler::CompilerOptions = CompilerOptions()
end

# We don't us an abstract type because Base.@kwdef does not support subtyping in Julia 1.0, only in ≥1.1
AbstractOptions = Union{EvaluationOptions,CompilerOptions,ServerOptions,SecurityOptions,Options}

function overlayed(original::AbstractOptions; changes...)
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
        print(IOContext(io, :indent => 2), " "^indent, " "^2, each, " = ", repr(getfield(x, each)))
        println(io, ", ")
    end
    print(io, " "^indent, ")")
    return
end

function from_flat_kwargs(; kwargs...)::Options
    server_options = Dict()
    security_options = Dict()
    evaluation_options = Dict()
    compiler_options = Dict()

    for (k, v) in kwargs
        if k in fieldnames(EvaluationOptions)
            evaluation_options[k] = v
        elseif k in fieldnames(CompilerOptions)
            compiler_options[k] = v
        elseif k in fieldnames(ServerOptions)
            server_options[k] = v
        elseif k in fieldnames(SecurityOptions)
            security_options[k] = v
        else
            throw(ArgumentError("""Key $k not recognised. Options are:\n$(join(
            [
                "Server Options:",
                map(x->" "^2 * string(x), fieldnames(ServerOptions))...,
                "",
                "Security Options:",
                map(x->" "^2 * string(x), fieldnames(SecurityOptions))...,
                "",
                "Evaluation Options:",
                map(x->" "^2 * string(x), fieldnames(EvaluationOptions))...,
                "",
                "Compiler Options:",
                map(x->" "^2 * string(x), fieldnames(CompilerOptions))...,
            ], '\n'))"""))
        end
    end

    return Options(
        server=ServerOptions(; server_options...),
        security=SecurityOptions(; security_options...),
        evaluation=EvaluationOptions(; evaluation_options...),
        compiler=CompilerOptions(; compiler_options...),
    )
end

end