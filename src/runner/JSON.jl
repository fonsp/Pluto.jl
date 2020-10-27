###
# JSON SERIALIZER
###

# We define a minimal JSON serializer here so that the notebook process does not need to depend on JSON.jl
# Performance is about 0.5-1.0x JSON.jl, but that's okay since it is only used for special output types like stack traces
# Not designed/tested for use outside of Pluto

module JSON

export json

struct ReplacePipe <: IO
	outstream::IO
end

# to get these character codes:
# [c => UInt8(c) for c in "\"\\/\b\f\n\r\t"]
# we can do this escaping per-byte because UTF-8 is backwards compatible with ASCII, i.e. these special characters are never part of a UTF-8 encoded character other than the ASCII characters they represent. Cool!
function Base.write(rp::ReplacePipe, x::UInt8)
	if x == 0x22 || x== 0x5c || x== 0x2f # https://www.json.org/json-en.html
        write(rp.outstream, '\\')
        write(rp.outstream, x)
    elseif x < 0x10 # ish
        write(rp.outstream, escape_string(String([Char(x)]))) # the Julia escaping 'happens' to coincide with what we want
    else
        write(rp.outstream, x)
    end
end
function sanitize_pipe(func::Function, outstream::IO, args...)
	func(ReplacePipe(outstream), args...)
end


function json(io, arr::AbstractArray)
    write(io, '[')
    len = length(arr)
    for (i, val) in enumerate(arr)
        json(io, val)
        (i != len) && write(io, ',')
    end
    write(io, ']')
end

function json(io, d::Dict{Symbol, T}) where T
    write(io, '{')
    len = length(d)
    for (i, val) in enumerate(d)
        write(io, '"', val.first, '"', ':')
        json(io, val.second)
        (i != len) && write(io, ',')
    end
    write(io, '}')
end

function json(io, str::T) where T<:AbstractString
    write(io, '"')
    sanitize_pipe(write, io, str)
    write(io, '"')
end

function json(io, val::Any)
    show(io, val)
end

end