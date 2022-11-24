module IntegrationsWithOtherPackages

import ..notebook_id

export handle_websocket_message, message_channel
"Called directly (through Distributed) from the main Pluto process"
function handle_websocket_message(message)
    try
        result = on_websocket_message(Val(Symbol(message[:module_name])), message[:body])
        if result !== nothing
            @warn """
            Integrations `on_websocket_message(:$(message[:module_name]), ...)` returned a value, but is expected to return `nothing`.

            If you want to send something back to the client, use `IntegrationsWithOtherPackages.message_channel`.
            """
        end
    catch ex
        bt = stacktrace(catch_backtrace())
        @error "Dispatching integrations websocket message failed:" message=message exception=(ex, bt)
    end
    nothing
end

"""
A [`Channel`](@ref) to send messages on demand to JS running in cell outputs. The message should be structured like the example below, and you can use any `MsgPack.jl`-encodable object in the body (including a `Vector{UInt8}` if that's your thing 👀).

# Example
```julia
put!(message_channel, Dict(
    :module_name => "MyPackage",
    :body => mydata,
))
```
"""
const message_channel = Channel{Dict{Symbol,Any}}(10)

"""
Integrations should implement this to capture incoming websocket messages.
We force returning nothing, because returning might give you the idea that
the result is sent back to the client, which (right now) it isn't.
If you want to send something back to the client, use [`IntegrationsWithOtherPackages.message_channel`](@ref).

Do not call this function directly from notebook/package code!

    function on_websocket_message(::Val{:MyModule}, body)::Nothing
        # ...
    end
"""
function on_websocket_message(module_name, body)::Nothing
    error("No websocket message handler defined for '$(module_name)'")
end

end
