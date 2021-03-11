module IntegrationsWithOtherPackages

import ..workspace_info

include("./Requires.jl/src/Requires.jl")

export dispatch_message
function dispatch_message(message)
    on_message(Val{Symbol(message["module_name"])}(), message["body"])
end
export message_channel
const message_channel = Channel{Any}(10)

# Submodules should implement this to capture incoming websocket messages
function on_message(module_name, body)
    throw(error("No websocket message handler defined for '$(module_name)'"))
end


module AssetRegistryIntegrations
    import ..Requires
    import ..workspace_info

    function get_filepath_from_urlpath(path)
        nothing
    end

    function __init__()
        Requires.@require AssetRegistry="bf4720bc-e11a-5d0c-854e-bdca1663c893" begin
            if workspace_info.notebook_id === nothing
                throw(error("Couldn't load AssetRegistry integrations, notebook_id not set inside PlutoRunner"))
            end
            AssetRegistry.baseurl[] = "./integrations/AssetRegistry/$(workspace_info.notebook_id)"
            function get_filepath_from_urlpath(path)
                local full_path = AssetRegistry.baseurl[] * "/" * path
                get(AssetRegistry.registry, full_path, nothing)
            end
        end
    end
end


module WebIOIntegrations
    import ..Requires
    import ..on_message
    import ..message_channel

    function __init__()
        Requires.@require WebIO="0f1e0344-ec1d-5b48-a673-e5cf874b6c29" begin
            import Sockets
            import .WebIO
                    
            struct WebIOConnection <: WebIO.AbstractConnection end
            Sockets.send(::WebIOConnection, data) = begin
                put!(message_channel, Dict(
                    "module_name" => "WebIO",
                    "body" => data,
                ))
            end
            Base.isopen(::WebIOConnection) = Base.isopen(message_channel)
            
            function on_message(::Val{:WebIO}, body)
                WebIO.dispatch(WebIOConnection(), body)
            end
        end
    end
end

end