import .ExpressionExplorer
import JuliaSyntax, Markdown

"Generate a file name to be given to the parser (will show up in stack traces)."
pluto_filename(notebook::Notebook, cell::Cell)::String = notebook.path * "#==#" * string(cell.cell_id)

"Is Julia new enough to support filenames in parsing?"
const can_insert_filename = (Base.parse_input_line("1;2") != Base.parse_input_line("1\n2"))

# @codemirror/lint has only three levels
function convert_julia_syntax_level(level)
    level == :error   ? "error" :
    level == :warning ? "warning" : "info"
end

function convert_diagnostic_to_dict(source, diag)
    line_byte_ends = findall(==('\n'), source)

    # JuliaSyntax uses `last_byte < first_byte` to signal an empty range.
    # https://github.com/JuliaLang/JuliaSyntax.jl/blob/97e2825c68e770a3f56f0ec247deda1a8588070c/src/diagnostics.jl#L67-L75
    # it references the byte range as such: `source[first_byte:last_byte]` whereas codemirror
    # is non inclusive, therefore we move the `last_byte` to the next valid character in the string,
    # an empty range then becomes `from == to`, also JuliaSyntax is one based whereas code-mirror is zero-based
    # but this is handled in `map_byte_range_to_utf16_codepoints` with `u16 = 0` initially.
    first_byte = min(diag.first_byte, lastindex(source) + 1)
    last_byte = min(nextind(source, diag.last_byte), lastindex(source) + 1)

    from, to = map_byte_range_to_utf16_codepoints(source, first_byte, last_byte)

    Dict(:from => from,
         :to => to,
         :message => diag.message,
         :line => findfirst(bs -> first_byte <= bs, line_byte_ends),
         :severity => convert_julia_syntax_level(diag.level))
end

function convert_parse_error_to_dict(code, ex)
   Dict(
       :source => ex.source.code,
       :diagnostics => [
           convert_diagnostic_to_dict(code, diag)
           for diag in ex.diagnostics
       ]
   )
end

"""
Parse the code from `cell.code` into a Julia expression (`Expr`). Equivalent to `Meta.parse_input_line` in Julia v1.3, no matter the actual Julia version.

1. Turn multiple expressions into an error expression.
2. Fix some `LineNumberNode` idiosyncrasies to be more like modern Julia.
3. Will always produce an expression of the form: `Expr(:toplevel, LineNumberNode(..), root)`. It gets transformed (i.e. wrapped) into this form if needed. A `LineNumberNode` contains a line number and a file name. We use the cell UUID as a 'file name', which makes the stack traces easier to interpret. (Otherwise it would be impossible to tell from which cell a stack frame originates.) Not all Julia versions insert these `LineNumberNode`s, so we insert it ourselves if Julia doesn't.
4. Apply `preprocess_expr` (below) to `root` (from rule 2).
"""
function parse_custom(notebook::Notebook, cell::Cell)::Expr
    # 1.
    raw = if can_insert_filename
        filename = pluto_filename(notebook, cell)
        #ex = Base.parse_input_line(cell.code, filename=filename)
        ex = try
            JuliaSyntax.parseall(Expr, cell.code; filename=filename)
        catch ex
            if !(ex isa JuliaSyntax.ParseError)
                rethrow()
            end
            ex
        end
        if Meta.isexpr(ex, :toplevel)
            # if there is more than one expression:
            if count(a -> !(a isa LineNumberNode), ex.args) > 1
                Expr(:error, "extra token after end of expression\n\nBoundaries: $(expression_boundaries(cell.code))")
            else
                ex
            end
        elseif ex isa JuliaSyntax.ParseError
            quote
                throw(PlutoRunner.ParseError($(convert_parse_error_to_dict(cell.code, ex))))
            end
        else
            ex
        end
    else
        # Meta.parse returns the "extra token..." like we want, but also in cases like "\n\nx = 1\n# comment", so we need to do the multiple expressions check ourselves after all
        parsed1, next_ind1 = Meta.parse(cell.code, 1, raise=false)
        parsed2, next_ind2 = Meta.parse(cell.code, next_ind1, raise=false)

        if parsed2 === nothing
            # only whitespace or comments after the first expression
            parsed1
        else
            Expr(:error, "extra token after end of expression\n\nBoundaries: $(expression_boundaries(cell.code))")
        end
    end

    # 2.
    filename = pluto_filename(notebook, cell)

    if !can_insert_filename
        fix_linenumbernodes!(raw, filename)
    end

    # 3.
    topleveled = if ExpressionExplorer.is_toplevel_expr(raw)
        raw
    else
        Expr(:toplevel, LineNumberNode(1, Symbol(filename)), raw)
    end

    # 4.
    Expr(topleveled.head, topleveled.args[1], preprocess_expr(topleveled.args[2]))
end

"Old Julia versions insert some `LineNumberNode`s with `:none` as filename, which are useless and break stack traces, so we replace those."
function fix_linenumbernodes!(ex::Expr, actual_filename)
    for (i, a) in enumerate(ex.args)
        if a isa Expr
            fix_linenumbernodes!(a, actual_filename)
        elseif a isa LineNumberNode
            if a.file === nothing || a.file == :none
                ex.args[i] = LineNumberNode(a.line, Symbol(actual_filename))
            end
        end
    end
end
fix_linenumbernodes!(::Any, actual_filename) = nothing


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
function map_byte_range_to_utf16_codepoints(s::String, start_byte, end_byte)
    invalid_utf8() = error("invalid UTF-8 string")
    codeunit(s) == UInt8 || invalid_utf8()

    i, n = 1, ncodeunits(s)
    u16 = 0

    from, to = -1, -1

    if i == start_byte
        from = u16
    end
    if i == end_byte
        to = u16
        return (from, to)
    end

    a = codeunit(s, 1)
    while true
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
        else # ASCII or invalid UTF-8 (continuation byte or too-high code point)
            if i == start_byte
                from = u16
            end
            if i == end_byte
                to = u16
                break
            end
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


"""Get the list of string indices that denote expression boundaries.

# Examples

`expression_boundaries("sqrt(1)") == [ncodeunits("sqrt(1)") + 1]`

`expression_boundaries("sqrt(1)\n\n123") == [ncodeunits("sqrt(1)\n\n") + 1, ncodeunits("sqrt(1)\n\n123") + 1]`

"""
function expression_boundaries(code::String, start=1)::Vector{<:Integer}
    expr, next = Meta.parse(code, start, raise=false)
    if next <= ncodeunits(code)
        [next, expression_boundaries(code, next)...]
    else
        [next]
    end
end

"""
Make some small adjustments to the `expr` to make it work nicely inside a timed, wrapped expression:

1. If `expr` is a `:toplevel` expression (this is the case iff the expression is a combination of expressions using semicolons, like `a = 1; b` or `123;`), then it gets turned into a `:block` expression. The reason for this transformation is that `:toplevel` does not return/relay the output of its last argument, unlike `begin`, `let`, `if`, etc. (But we want it!)
2. If `expr` is a `:module` expression, wrap it in a `:toplevel` block - module creation needs to be at toplevel. Rule 1. is not applied.
3. If `expr` is a `:(=)` expression with a curly assignment, wrap it in a `:const` to allow execution - see https://github.com/fonsp/Pluto.jl/issues/517
"""
function preprocess_expr(expr::Expr)
    if expr.head == :toplevel
		Expr(:block, expr.args...)
    elseif expr.head == :module
        Expr(:toplevel, expr)
    elseif expr.head == :(=) && (expr.args[1] isa Expr && expr.args[1].head == :curly)
        Expr(:const, expr)
    else
        expr
    end
end

# for expressions that are just values, like :(1) or :(x)
preprocess_expr(val::Any) = val
