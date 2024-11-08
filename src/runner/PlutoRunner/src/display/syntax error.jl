
# @codemirror/lint has only three levels
function convert_julia_syntax_level(level)
    level == :error   ? "error" :
    level == :warning ? "warning" : "info"
end

"""
    map_byte_range_to_utf16_codepoints(s::String, start_byte::Int, end_byte::Int)::Tuple{Int,Int}

Taken from `Base.transcode(::Type{UInt16}, src::Vector{UInt8})`
but without line constraints. It also does not support invalid
UTF-8 encoding which `String` should never be anyway.

This maps the given raw byte range `(start_byte, end_byte)` range to UTF-16 codepoints indices.

The resulting range can then be used by code-mirror on the frontend, quoting from the code-mirror docs:

> Character positions are counted from zero, and count each line break and UTF-16 code unit as one unit.

Examples:
```julia
                                           123
                                             vv
julia> map_byte_range_to_utf16_codepoints("abc", 2, 3)
(2, 3)

                                           1122
                                           v   v
julia> map_byte_range_to_utf16_codepoints("🍕🍕", 1, 8)
(1, 4)

                                           11233
                                           v  v
julia> map_byte_range_to_utf16_codepoints("🍕c🍕", 1, 5)
(1, 3)
```
"""
function map_byte_range_to_utf16_codepoints(s, start_byte, end_byte)
    invalid_utf8() = error("invalid UTF-8 string")
    codeunit(s) == UInt8 || invalid_utf8()

    i, n = 1, ncodeunits(s)
    u16 = 0

    from, to = -1, -1
    a = codeunit(s, 1)
    while true
        if i == start_byte
            from = u16
        end
        if i == end_byte
            to = u16
            break
        end
        if i < n && -64 <= a % Int8 <= -12 # multi-byte character
            i += 1
            b = codeunit(s, i)
            if -64 <= (b % Int8) || a == 0xf4 && 0x8f < b
                # invalid UTF-8 (non-continuation of too-high code point)
                invalid_utf8()
            elseif a < 0xe0 # 2-byte UTF-8
                if i == start_byte
                    from = u16
                end
                if i == end_byte
                    to = u16
                    break
                end
            elseif i < n # 3/4-byte character
                i += 1
                c = codeunit(s, i)
                if -64 <= (c % Int8) # invalid UTF-8 (non-continuation)
                    invalid_utf8()
                elseif a < 0xf0 # 3-byte UTF-8
                    if i == start_byte
                        from = u16
                    end
                    if i == end_byte
                        to = u16
                        break
                    end
                elseif i < n
                    i += 1
                    d = codeunit(s, i)
                    if -64 <= (d % Int8) # invalid UTF-8 (non-continuation)
                        invalid_utf8()
                    elseif a == 0xf0 && b < 0x90 # overlong encoding
                        invalid_utf8()
                    else # 4-byte UTF-8 && 2 codeunits UTF-16
                        u16 += 1
                        if i == start_byte
                            from = u16
                        end
                        if i == end_byte
                            to = u16
                            break
                        end
                    end
                else # too short
                    invalid_utf8()
                end
            else # too short
                invalid_utf8()
            end
        else
            # ASCII or invalid UTF-8 (continuation byte or too-high code point)
        end
        u16 += 1
        if i >= n
            break
        end
        i += 1
        a = codeunit(s, i)
    end

    if from == -1
        from = u16
    end
    if to == -1
        to = u16
    end

    return (from, to)
end

function convert_diagnostic_to_dict(source, diag)
    code = source.code

    # JuliaSyntax uses `last_byte < first_byte` to signal an empty range.
    # https://github.com/JuliaLang/JuliaSyntax.jl/blob/97e2825c68e770a3f56f0ec247deda1a8588070c/src/diagnostics.jl#L67-L75
    # it references the byte range as such: `source[first_byte:last_byte]` whereas codemirror
    # is non inclusive, therefore we move the `last_byte` to the next valid character in the string,
    # an empty range then becomes `from == to`, also JuliaSyntax is one based whereas code-mirror is zero-based
    # but this is handled in `map_byte_range_to_utf16_codepoints` with `u16 = 0` initially.
    first_byte = min(diag.first_byte, lastindex(code) + 1)
    last_byte = min(nextind(code, diag.last_byte), lastindex(code) + 1)

    from, to = map_byte_range_to_utf16_codepoints(code, first_byte, last_byte)

    Dict(:from => from,
         :to => to,
         :message => diag.message,
         :source => "JuliaSyntax.jl",
         :line => first(Base.JuliaSyntax.source_location(source, diag.first_byte)),
         :severity => convert_julia_syntax_level(diag.level))
end

function convert_parse_error_to_dict(ex)
   Dict(
       :source => ex.source.code,
       :diagnostics => [
           convert_diagnostic_to_dict(ex.source, diag)
           for diag in ex.diagnostics
       ]
   )
end

"""
*Internal* wrapper for syntax errors which have diagnostics.
Thrown through PlutoRunner.throw_syntax_error
"""
struct PrettySyntaxError <: Exception
    ex::Any
end

function throw_syntax_error(@nospecialize(syntax_err))
    syntax_err isa String && (syntax_err = "syntax: $syntax_err")
    syntax_err isa Exception || (syntax_err = ErrorException(syntax_err))

    if syntax_err isa Base.Meta.ParseError && syntax_err.detail isa Base.JuliaSyntax.ParseError
        syntax_err = PrettySyntaxError(syntax_err)
    end

    throw(syntax_err)
end
