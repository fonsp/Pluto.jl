Base.@kwdef struct ServerSecurity
    require_token_for_open_links::Bool = true
end

# ServerSecurity(val::Bool) = ServerSecurity(val, val, val)

"(More options coming...)"
Base.@kwdef struct ServerConfiguration
    root_url::Union{Nothing,String} = nothing
    # host::AbstractString = "127.0.0.1"
    # port::Union{Nothing,Integer} = nothing
    launch_browser::Bool = true
    # single_notebook_mode::Union{Nothing,Notebook} = nothing
    # show_file_system::Bool = true
end


