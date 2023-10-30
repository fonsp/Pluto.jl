# this file is just a bunch of ugly code to make sure that the Julia Array{UInt8,1} becomes a JS Uint8Array() instead of a normal array. This improves performance of the client.
# ignore it if you are not interested in that kind of stuff

import Dates
import UUIDs: UUID
import MsgPack
import .Configuration
import Pkg

# MsgPack.jl doesn't define a serialization method for MIME and UUID objects, so we write these ourselves:
MsgPack.msgpack_type(::Type{<:MIME}) = MsgPack.StringType()
MsgPack.msgpack_type(::Type{UUID}) = MsgPack.StringType()
MsgPack.msgpack_type(::Type{VersionNumber}) = MsgPack.StringType()
MsgPack.msgpack_type(::Type{Pkg.Types.VersionRange}) = MsgPack.StringType()
MsgPack.to_msgpack(::MsgPack.StringType, m::MIME) = string(m)
MsgPack.to_msgpack(::MsgPack.StringType, u::UUID) = string(u)
MsgPack.to_msgpack(::MsgPack.StringType, v::VersionNumber) = string(v)
MsgPack.to_msgpack(::MsgPack.StringType, v::Pkg.Types.VersionRange) = string(v)

# Support for sending Dates
MsgPack.msgpack_type(::Type{Dates.DateTime}) = MsgPack.ExtensionType()
MsgPack.to_msgpack(::MsgPack.ExtensionType, d::Dates.DateTime) = let
    millisecs_since_1970_because_thats_how_computers_work = Dates.value(d - Dates.DateTime(1970))
    MsgPack.Extension(0x0d, reinterpret(UInt8, [millisecs_since_1970_because_thats_how_computers_work]))
end

# Our Configuration types:
MsgPack.msgpack_type(::Type{Configuration.Options}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.EvaluationOptions}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.CompilerOptions}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.ServerOptions}) = MsgPack.StructType()
MsgPack.msgpack_type(::Type{Configuration.SecurityOptions}) = MsgPack.StructType()

# Don't try to send callback functions which can't be serialized (see ServerOptions.event_listener)
MsgPack.msgpack_type(::Type{Function}) = MsgPack.NilType()
MsgPack.to_msgpack(::MsgPack.NilType, ::Function) = nothing

# We want typed integer arrays to arrive as JS typed integer arrays:
const JSTypedIntSupport = [Int8, UInt8, Int16, UInt16, Int32, UInt32, Float32, Float64]
const JSTypedInt = Union{Int8,UInt8,Int16,UInt16,Int32,UInt32,Float32,Float64}

MsgPack.msgpack_type(::Type{Vector{T}}) where T <: JSTypedInt = MsgPack.ExtensionType()
function MsgPack.to_msgpack(::MsgPack.ExtensionType, x::Vector{T}) where T <: JSTypedInt
    type = findfirst(isequal(T), JSTypedIntSupport) + 0x10
    MsgPack.Extension(type, reinterpret(UInt8, x))
end
MsgPack.msgpack_type(::Type{Vector{Union{}}}) = MsgPack.ArrayType()


# The other side does the same (/frontend/common/MsgPack.js), and we decode it here:
function decode_extension_and_addbits(x::MsgPack.Extension)
    if x.type == 0x0d
        # the datetime type
        millisecs_since_1970_because_thats_how_computers_work = reinterpret(Int64, x.data)[1]
        Dates.DateTime(1970) + Dates.Millisecond(millisecs_since_1970_because_thats_how_computers_work)
        # TODO? Dates.unix2datetime does exactly this ?? - DRAL
    else
        # the array types
        julia_type = JSTypedIntSupport[x.type - 0x10]
        if eltype(x.data) == julia_type
            x.data
        else
            reinterpret(julia_type, x.data)
        end
    end
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
precompile(unpack, (Vector{UInt8},))