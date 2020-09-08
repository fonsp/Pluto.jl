Base.@kwdef struct ServerSecurity
    require_token_for_open_links::Bool = true
end

# ServerSecurity(val::Bool) = ServerSecurity(val, val, val)

# THIS IS NOT USED YET
Base.@kwdef struct ServerConfiguration
    host::AbstractString = "127.0.0.1"
    port::Integer = 1234
    skip_main_menu::Bool = false
    show_file_system::Bool = true
end

# ServerSecurity(val::Bool) = ServerSecurity(val)

