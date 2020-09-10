Base.@kwdef struct ServerConfiguration <: AbstractPlutoConfiguration
    root_url::Union{Nothing,String} = nothing
    host::String = "127.0.0.1"
    port::Union{Nothing,Integer} = nothing
    launch_browser::Bool = true
    single_notebook_mode::Union{Nothing,Notebook} = nothing
    show_file_system::Bool = true
end

Base.@kwdef struct PlutoConfiguration <: AbstractPlutoConfiguration
    version::VersionNumber = pluto_version()
    working_directory::String = default_working_directory()
    run_notebook_on_load::Bool = true
    workspace_use_distributed::Bool = true
    require_token_for_open_links::Bool = true

    compiler::CompilerOptions = CompilerOptions()
    server::ServerConfiguration = ServerConfiguration()
end

