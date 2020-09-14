# this file is just a bunch of ugly code to make sure that the Julia Array{UInt8,1} becomes a JS Uint8Array() instead of a normal array. This improves performance of the client.
# ignore it if you are not interested in that kind of stuff

import UUIDs: UUID
import MsgPack
import .Configuration

# MsgPack.jl doesn't define a serialization method for MIME and UUID objects, so we write these ourselves:
MsgPack.msgpack_type(m::Type{<:MIME}) = MsgPack.StringType()
MsgPack.msgpack_type(u::Type{UUID}) = MsgPack.StringType()
MsgPack.to_msgpack(::MsgPack.StringType, m::MIME) = string(m)
MsgPack.to_msgpack(::MsgPack.StringType, u::UUID) = string(u)

# Our Configuration types:
MsgPack.msgpack_type(::Type{Configuration.Options}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.EvaluationOptions}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.CompilerOptions}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.ServerOptions}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.SecurityOptions}) = MsgPack.StructType()

# We want typed integer arrays to arrive as JS typed integer arrays:
const JSTypedIntSupport = [Int8, UInt8, Int16, UInt16, Int32, UInt32, Float32, Float64]
JSTypedInt = Union{Int8,UInt8,Int16,UInt16,Int32,UInt32,Float32,Float64}

MsgPack.msgpack_type(m::Type{Vector{T}}) where T <: JSTypedInt = MsgPack.ExtensionType()
MsgPack.to_msgpack(::MsgPack.ExtensionType, x::Vector{T}) where T <: JSTypedInt = let
    type = findfirst(isequal(T), JSTypedIntSupport) + 0x10
    MsgPack.Extension(type, reinterpret(UInt8, x))
end

# The other side does the same (/frontend/common/MsgPack.js), and we decode it here:
function decode_extension_and_addbits(x::MsgPack.Extension)
    julia_type = JSTypedIntSupport[x.type - 0x10]
    reinterpret(julia_type, x.data)
end

function decode_extension_and_addbits(x::Dict)
    # we mutate the dictionary, that's fine in our use case and saves memory?
    for (k, v) in x
        x[k] = decode_extension_and_addbits(v)
    end
    x
end
decode_extension_and_addbits(x::Array) = map(decode_extension_and_addbits, x)

# We also convert everything (except the JS typed arrays) to 64 bit numbers, just to make it easier to work with.
decode_extension_and_addbits(x::T) where T <: Union{Signed,Unsigned} = Int64(x)
decode_extension_and_addbits(x::T) where T <: AbstractFloat = Float64(x)
decode_extension_and_addbits(x::Any) = x

function pack(args...)
    MsgPack.pack(args...)
end

function unpack(args...)
    MsgPack.unpack(args...) |> decode_extension_and_addbits
end