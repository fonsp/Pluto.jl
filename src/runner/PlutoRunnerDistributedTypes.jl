"""
I want some structs to communicate between the Pluto process and Pluto Runner process.
Right now we import PlutoRunner.jl into the main process anyway, but I think it's
good to keep them seperate and in the future only import this file.
"""
module PlutoRunnerDistributedTypes

export IntegrationsTypes

"""
I need types for passing the http and websocket requests back and forth.
"""
module IntegrationsTypes
  export HTTPRequest, AbstractHTTPResponse, HTTPResponse, WebsocketMessage

  Base.@kwdef struct HTTPRequest
    module_name::Symbol
    method::String
    target::String
    body::Vector{UInt8}
  end

  abstract type AbstractHTTPResponse end
  Base.@kwdef struct HTTPResponse <: AbstractHTTPResponse
    status::Int16
    headers::Vector{Pair{String,String}}=[]
    body::Vector{UInt8}=UInt8[]
  end
  Base.@kwdef struct HTTPFileFromDiskResponse <: AbstractHTTPResponse
    status::Int16=200
    headers::Vector{Pair{String,String}}=[]
    file_path::String
  end

  Base.@kwdef struct WebsocketMessage
    module_name::Symbol
    body
  end
end

end