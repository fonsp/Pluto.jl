"""
The full list of keyword arguments that can be passed to [`Pluto.run`](@ref) (or [`Pluto.Configuration.from_flat_kwargs`](@ref)) is divided into four categories. Take a look at the documentation for:

- [`Pluto.Configuration.CompilerOptions`](@ref) defines the command line arguments for notebook `julia` processes.
- [`Pluto.Configuration.ServerOptions`](@ref) configures the HTTP server.
- [`Pluto.Configuration.SecurityOptions`](@ref) configures the authentication options for Pluto's HTTP server. Change with caution.
- [`Pluto.Configuration.EvaluationOptions`](@ref) is used internally during Pluto's testing.

Note that Pluto is designed to be _zero-configuration_, and most users should not (have to) change these settings. Most 'customization' can be achieved using Julia's wide range of packages! That being said, the available settings are useful if you are using Pluto in a special environment, such as docker, mybinder, etc.
"""
module Configuration

using Configurations # https://github.com/Roger-luo/Configurations.jl

import ..Pluto: tamepath

# Using a ref to avoid fixing the pwd() output during the compilation phase. We don't want this value to be baked into the sysimage, because it depends on the `pwd()`. We do want to cache it, because the pwd might change while Pluto is running.
const pwd_ref = Ref{Union{Nothing,String}}()
function notebook_path_suggestion()
    pwd_val = something(pwd_ref[], pwd())
    preferred_dir = startswith(Sys.BINDIR, pwd_val) ? homedir() : pwd_val
    # so that it ends with / or \
    string(joinpath(preferred_dir, ""))
end

function __init__()
    pwd_ref[] = pwd()
end

const ROOT_URL_DEFAULT = nothing
const HOST_DEFAULT = "127.0.0.1"
const PORT_DEFAULT = nothing
const LAUNCH_BROWSER_DEFAULT = true
const DISMISS_UPDATE_NOTIFICATION_DEFAULT = false
const SHOW_FILE_SYSTEM_DEFAULT = true
const DISABLE_WRITING_NOTEBOOK_FILES_DEFAULT = false
const AUTO_RELOAD_FROM_FILE_DEFAULT = false
const AUTO_RELOAD_FROM_FILE_COOLDOWN_DEFAULT = 0.4
const AUTO_RELOAD_FROM_FILE_IGNORE_PKG_DEFAULT = false
const NOTEBOOK_DEFAULT = nothing
const INIT_WITH_FILE_VIEWER_DEFAULT = false
const SIMULATED_LAG_DEFAULT = 0.0
const SIMULATED_PKG_LAG_DEFAULT = 0.0
const INJECTED_JAVASCRIPT_DATA_URL_DEFAULT = "data:text/javascript;base64,"
const ON_EVENT_DEFAULT = function(a) #= @info "$(typeof(a))" =# end

"""
    ServerOptions([; kwargs...])

The HTTP server options. See [`SecurityOptions`](@ref) for additional settings.

# Arguments

- `root_url::Union{Nothing,String} = $ROOT_URL_DEFAULT`
- `host::String = "$HOST_DEFAULT"`
- `port::Union{Nothing,Integer} = $PORT_DEFAULT`
- `launch_browser::Bool = $LAUNCH_BROWSER_DEFAULT`
- `dismiss_update_notification::Bool = $DISMISS_UPDATE_NOTIFICATION_DEFAULT`
- `show_file_system::Bool = $SHOW_FILE_SYSTEM_DEFAULT`
- `notebook_path_suggestion::String = notebook_path_suggestion()`
- `disable_writing_notebook_files::Bool = $DISABLE_WRITING_NOTEBOOK_FILES_DEFAULT`
- `auto_reload_from_file::Bool = $AUTO_RELOAD_FROM_FILE_DEFAULT` Watch notebook files for outside changes and update running notebook state automatically
- `auto_reload_from_file_cooldown::Real = $AUTO_RELOAD_FROM_FILE_COOLDOWN_DEFAULT` Experimental, will be removed
- `auto_reload_from_file_ignore_pkg::Bool = $AUTO_RELOAD_FROM_FILE_IGNORE_PKG_DEFAULT` Experimental flag, will be removed
- `notebook::Union{Nothing,String} = $NOTEBOOK_DEFAULT` Optional path of notebook to launch at start
- `init_with_file_viewer::Bool = $INIT_WITH_FILE_VIEWER_DEFAULT`
- `simulated_lag::Real=$SIMULATED_LAG_DEFAULT` (internal) Extra lag to add to our server responses. Will be multiplied by `0.5 + rand()`.
- `simulated_pkg_lag::Real=$SIMULATED_PKG_LAG_DEFAULT` (internal) Extra lag to add to operations done by Pluto's package manager. Will be multiplied by `0.5 + rand()`.
- `injected_javascript_data_url::String = "$INJECTED_JAVASCRIPT_DATA_URL_DEFAULT"` (internal) Optional javascript injectables to the front-end. Can be used to customize the editor, but this API is not meant for general use yet.
- `on_event::Function = $ON_EVENT_DEFAULT`
"""
@option mutable struct ServerOptions
    root_url::Union{Nothing,String} = ROOT_URL_DEFAULT
    host::String = HOST_DEFAULT
    port::Union{Nothing,Integer} = PORT_DEFAULT
    launch_browser::Bool = LAUNCH_BROWSER_DEFAULT
    dismiss_update_notification::Bool = DISMISS_UPDATE_NOTIFICATION_DEFAULT
    show_file_system::Bool = SHOW_FILE_SYSTEM_DEFAULT
    notebook_path_suggestion::String = notebook_path_suggestion()
    disable_writing_notebook_files::Bool = DISABLE_WRITING_NOTEBOOK_FILES_DEFAULT
    auto_reload_from_file::Bool = AUTO_RELOAD_FROM_FILE_DEFAULT
    auto_reload_from_file_cooldown::Real = AUTO_RELOAD_FROM_FILE_COOLDOWN_DEFAULT
    auto_reload_from_file_ignore_pkg::Bool = AUTO_RELOAD_FROM_FILE_IGNORE_PKG_DEFAULT
    notebook::Union{Nothing,String,Vector{<:String}} = NOTEBOOK_DEFAULT
    init_with_file_viewer::Bool = INIT_WITH_FILE_VIEWER_DEFAULT
    simulated_lag::Real = SIMULATED_LAG_DEFAULT
    simulated_pkg_lag::Real = SIMULATED_PKG_LAG_DEFAULT
    injected_javascript_data_url::String = INJECTED_JAVASCRIPT_DATA_URL_DEFAULT
    on_event::Function = ON_EVENT_DEFAULT
end

const REQUIRE_SECRET_FOR_OPEN_LINKS_DEFAULT = true
const REQUIRE_SECRET_FOR_ACESS_DEFAULT = true

"""
    SecurityOptions([; kwargs...])

Security settings for the HTTP server. 

# Arguments

- `require_secret_for_open_links::Bool = $REQUIRE_SECRET_FOR_OPEN_LINKS_DEFAULT`

    Whether the links `http://localhost:1234/open?path=/a/b/c.jl`  and `http://localhost:1234/open?url=http://www.a.b/c.jl` should be protected. 

    Use `true` for almost every setup. Only use `false` if Pluto is running in a safe container (like mybinder.org), where arbitrary code execution is not a problem.

- `require_secret_for_access::Bool = $REQUIRE_SECRET_FOR_ACESS_DEFAULT`

    If false, you do not need to use a `secret` in the URL to access Pluto: you will be authenticated by visiting `http://localhost:1234/` in your browser. An authentication cookie is still used for access (to prevent XSS and deceptive links or an img src to `http://localhost:1234/open?url=badpeople.org/script.jl`), and is set automatically, but this request to `/` is protected by cross-origin policy.

    Use `true` on a computer used by multiple people simultaneously. Only use `false` if necessary.

**Leave these options on `true` for the most secure setup.**

Note that Pluto is quickly evolving software, maintained by designers, educators and enthusiasts — not security experts. If security is a serious concern for your application, then we recommend running Pluto inside a container and verifying the relevant security aspects of Pluto yourself.
"""
@option mutable struct SecurityOptions
    require_secret_for_open_links::Bool = REQUIRE_SECRET_FOR_OPEN_LINKS_DEFAULT
    require_secret_for_access::Bool = REQUIRE_SECRET_FOR_ACESS_DEFAULT
end

const RUN_NOTEBOOK_ON_LOAD_DEFAULT = true
const WORKSPACE_USE_DISTRIBUTED_DEFAULT = true
const LAZY_WORKSPACE_CREATION_DEFAULT = false
const CAPTURE_STDOUT_DEFAULT = true

"""
    EvaluationOptions([; kwargs...])

Options to change Pluto's evaluation behaviour during internal testing. These options are not intended to be changed during normal use.

- `run_notebook_on_load::Bool = $RUN_NOTEBOOK_ON_LOAD_DEFAULT` Whether to evaluate a notebook on load.
- `workspace_use_distributed::Bool = $WORKSPACE_USE_DISTRIBUTED_DEFAULT` Whether to start notebooks in a separate process.
- `lazy_workspace_creation::Bool = $LAZY_WORKSPACE_CREATION_DEFAULT`
- `capture_stdout::Bool = $CAPTURE_STDOUT_DEFAULT`
"""
@option mutable struct EvaluationOptions
    run_notebook_on_load::Bool = RUN_NOTEBOOK_ON_LOAD_DEFAULT
    workspace_use_distributed::Bool = WORKSPACE_USE_DISTRIBUTED_DEFAULT
    lazy_workspace_creation::Bool = LAZY_WORKSPACE_CREATION_DEFAULT
    capture_stdout::Bool = CAPTURE_STDOUT_DEFAULT
end

const COMPILE_DEFAULT = nothing
const SYSIMAGE_DEFAULT = nothing
const BANNER_DEFAULT = nothing
const OPTIMIZE_DEFAULT = nothing
const MATH_MODE_DEFAULT = nothing
const STARTUP_FILE_DEFAULT = "no"
const HISTORY_FILE_DEFAULT = "no"

function roughly_the_number_of_physical_cpu_cores()
    # https://gist.github.com/fonsp/738fe244719cae820245aa479e7b4a8d
    if Sys.CPU_THREADS == 1
        1
    elseif Sys.CPU_THREADS == 2 || Sys.CPU_THREADS == 3
        2
    else
        Sys.CPU_THREADS ÷ 2
    end
end

function default_number_of_threads()
    env_value = get(ENV, "JULIA_NUM_THREADS", "")

    all(isspace, env_value) ?
        roughly_the_number_of_physical_cpu_cores() :
        env_value
end

"""
    CompilerOptions([; kwargs...])

These options will be passed as command line argument to newly launched processes. See [the Julia documentation on command-line options](https://docs.julialang.org/en/v1/manual/command-line-options/).

# Arguments
- `compile::Union{Nothing,String} = $COMPILE_DEFAULT`
- `sysimage::Union{Nothing,String} = $SYSIMAGE_DEFAULT`
- `banner::Union{Nothing,String} = $BANNER_DEFAULT`
- `optimize::Union{Nothing,Int} = $OPTIMIZE_DEFAULT`
- `math_mode::Union{Nothing,String} = $MATH_MODE_DEFAULT`
- `startup_file::Union{Nothing,String} = "$STARTUP_FILE_DEFAULT"` By default, the startup file isn't loaded in notebooks.
- `history_file::Union{Nothing,String} = "$HISTORY_FILE_DEFAULT"` By default, the history isn't loaded in notebooks.
- `threads::Union{Nothing,String,Int} = default_number_of_threads()`
"""
@option mutable struct CompilerOptions
    compile::Union{Nothing,String} = COMPILE_DEFAULT
    sysimage::Union{Nothing,String} = SYSIMAGE_DEFAULT
    banner::Union{Nothing,String} = BANNER_DEFAULT
    optimize::Union{Nothing,Int} = OPTIMIZE_DEFAULT
    math_mode::Union{Nothing,String} = MATH_MODE_DEFAULT

    # notebook specified options
    # the followings are different from
    # the default julia compiler options
    startup_file::Union{Nothing,String} = STARTUP_FILE_DEFAULT
    history_file::Union{Nothing,String} = HISTORY_FILE_DEFAULT

    threads::Union{Nothing,String,Int} = default_number_of_threads()
end

"""
Collection of all settings that configure a Pluto session. 

`ServerSession` contains a `Configuration`.
"""
@option struct Options
    server::ServerOptions = ServerOptions()
    security::SecurityOptions = SecurityOptions()
    evaluation::EvaluationOptions = EvaluationOptions()
    compiler::CompilerOptions = CompilerOptions()
end

function from_flat_kwargs(;
        root_url::Union{Nothing,String} = ROOT_URL_DEFAULT,
        host::String = HOST_DEFAULT,
        port::Union{Nothing,Integer} = PORT_DEFAULT,
        launch_browser::Bool = LAUNCH_BROWSER_DEFAULT,
        dismiss_update_notification::Bool = DISMISS_UPDATE_NOTIFICATION_DEFAULT,
        show_file_system::Bool = SHOW_FILE_SYSTEM_DEFAULT,
        notebook_path_suggestion::String = notebook_path_suggestion(),
        disable_writing_notebook_files::Bool = DISABLE_WRITING_NOTEBOOK_FILES_DEFAULT,
        auto_reload_from_file::Bool = AUTO_RELOAD_FROM_FILE_DEFAULT,
        auto_reload_from_file_cooldown::Real = AUTO_RELOAD_FROM_FILE_COOLDOWN_DEFAULT,
        auto_reload_from_file_ignore_pkg::Bool = AUTO_RELOAD_FROM_FILE_IGNORE_PKG_DEFAULT,
        notebook::Union{Nothing,String,Vector{<:String}} = NOTEBOOK_DEFAULT,
        init_with_file_viewer::Bool = INIT_WITH_FILE_VIEWER_DEFAULT,
        simulated_lag::Real = SIMULATED_LAG_DEFAULT,
        simulated_pkg_lag::Real = SIMULATED_PKG_LAG_DEFAULT,
        injected_javascript_data_url::String = INJECTED_JAVASCRIPT_DATA_URL_DEFAULT,
        on_event::Function = ON_EVENT_DEFAULT,
        require_secret_for_open_links::Bool = REQUIRE_SECRET_FOR_OPEN_LINKS_DEFAULT,
        require_secret_for_access::Bool = REQUIRE_SECRET_FOR_ACESS_DEFAULT,
        run_notebook_on_load::Bool = RUN_NOTEBOOK_ON_LOAD_DEFAULT,
        workspace_use_distributed::Bool = WORKSPACE_USE_DISTRIBUTED_DEFAULT,
        lazy_workspace_creation::Bool = LAZY_WORKSPACE_CREATION_DEFAULT,
        capture_stdout::Bool = CAPTURE_STDOUT_DEFAULT,
        compile::Union{Nothing,String} = COMPILE_DEFAULT,
        sysimage::Union{Nothing,String} = SYSIMAGE_DEFAULT,
        banner::Union{Nothing,String} = BANNER_DEFAULT,
        optimize::Union{Nothing,Int} = OPTIMIZE_DEFAULT,
        math_mode::Union{Nothing,String} = MATH_MODE_DEFAULT,
        startup_file::Union{Nothing,String} = STARTUP_FILE_DEFAULT,
        history_file::Union{Nothing,String} = HISTORY_FILE_DEFAULT,
        threads::Union{Nothing,String,Int} = default_number_of_threads(),
    )
    server = ServerOptions(;
        root_url,
        host,
        port,
        launch_browser,
        dismiss_update_notification,
        show_file_system,
        notebook_path_suggestion,
        disable_writing_notebook_files,
        auto_reload_from_file,
        auto_reload_from_file_cooldown,
        auto_reload_from_file_ignore_pkg,
        notebook,
        init_with_file_viewer,
        simulated_lag,
        simulated_pkg_lag,
        injected_javascript_data_url,
        on_event,
    )
    security = SecurityOptions(;
        require_secret_for_open_links,
        require_secret_for_access,
    )
    evaluation = EvaluationOptions(;
        run_notebook_on_load,
        workspace_use_distributed,
        lazy_workspace_creation,
        capture_stdout,
    )
    compiler = CompilerOptions(;
        compile,
        sysimage,
        banner,
        optimize,
        math_mode,
        startup_file,
        history_file,
        threads,
    )
    return Options(; server, security, evaluation, compiler)
end

function _merge_notebook_compiler_options(notebook, options::CompilerOptions)::CompilerOptions
    if notebook.compiler_options === nothing
        return options
    end

    kwargs = Dict{Symbol,Any}()
    for each in fieldnames(CompilerOptions)
        # 1. not specified by notebook options
        # 2. general notebook specified options
        if getfield(notebook.compiler_options, each) === nothing
            kwargs[each] = getfield(options, each)
        else
            kwargs[each] = getfield(notebook.compiler_options, each)
        end
    end
    return CompilerOptions(; kwargs...)
end

function _convert_to_flags(options::CompilerOptions)::Vector{String}
    option_list = String[]

    for name in fieldnames(CompilerOptions)
        flagname = string("--", replace(String(name), "_" => "-"))
        value = getfield(options, name)
        if value !== nothing
            push!(option_list, string(flagname, "=", value))
        end
    end

    return option_list
end


end
