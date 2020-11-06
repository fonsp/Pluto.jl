import .ExpressionExplorer

"Generate a file name to be given to the parser (will show up in stack traces)."
pluto_filename(notebook::Notebook, cell::Cell)::String = notebook.path * "#==#" * string(cell.cell_id)

"Is Julia new enough to support filenames in parsing?"
const can_insert_filename = (Base.parse_input_line("1;2") != Base.parse_input_line("1\n2"))

"Parse the code from `cell.code` into a Julia expression (`Expr`). Equivalent to `Meta.parse_input_line` in Julia v1.3, no matter the actual Julia version.

1. Turn multiple expressions into an error expression.
2. Fix some `LineNumberNode` idiosyncrasies to be more like modern Julia.
3. Will always produce an expression of the form: `Expr(:toplevel, LineNumberNode(..), root)`. It gets transformed (i.e. wrapped) into this form if needed. A `LineNumberNode` contains a line number and a file name. We use the cell UUID as a 'file name', which makes the stack traces easier to interpret. (Otherwise it would be impossible to tell from which cell a stack frame originates.) Not all Julia versions insert these `LineNumberNode`s, so we insert it ourselves if Julia doesn't.
4. Apply `preprocess_expr` (below) to `root` (from rule 2)."
function parse_custom(notebook::Notebook, cell::Cell)::Expr
    # 1.
    raw = if can_insert_filename
        filename = pluto_filename(notebook, cell)
        ex = Base.parse_input_line(cell.code, filename=filename)
        if (ex isa Expr) && (ex.head == :toplevel)
            # if there is more than one expression:
            if count(a -> !(a isa LineNumberNode), ex.args) > 1
                Expr(:error, "extra token after end of expression\n\nBoundaries: $(expression_boundaries(cell.code))")
            else
                ex
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
            if a.file == nothing || a.file == :none
                ex.args[i] = LineNumberNode(a.line, Symbol(actual_filename))
            end
        end
    end
end
fix_linenumbernodes!(::Any, actual_filename) = nothing

"""Get the list of string indices that denote expression boundaries.

# Examples

`expression_boundaries("sqrt(1)") == [ncodeunits("sqrt(1)") + 1]`

`expression_boundaries("sqrt(1)\n\n123") == [ncodeunits("sqrt(1)\n\n") + 1, ncodeunits("sqrt(1)\n\n123") + 1]`

"""
function expression_boundaries(code::String, start=1)::Array{<:Integer,1}
    expr, next = Meta.parse(code, start, raise=false)
    if next <= ncodeunits(code)
        [next, expression_boundaries(code, next)...]
    else
        [next]
    end
end

"Make some small adjustments to the `expr` to make it work nicely inside a timed, wrapped expression:

1. If `expr` is a `:toplevel` expression (this is the case iff the expression is a combination of expressions using semicolons, like `a = 1; b` or `123;`), then it gets turned into a `:block` expression. The reason for this transformation is that `:toplevel` does not return/relay the output of its last argument, unlike `begin`, `let`, `if`, etc. (But we want it!)
2. If `expr` is a `:module` expression, wrap it in a `:toplevel` block - module creation needs to be at toplevel. Rule 1. is not applied.
3. If `expr` is a `:(=)` expression with a curly assignment, wrap it in a `:const` to allow execution - see https://github.com/fonsp/Pluto.jl/issues/517 "
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

"Wrap `expr` inside a timing block."
function timed_expr(expr::Expr, return_proof::Any=nothing)::Expr
    # @assert ExpressionExplorer.is_toplevel_expr(expr)

    linenumbernode = expr.args[1]
    root = expr.args[2] # pretty much equal to what `Meta.parse(cell.code)` would give

    @gensym result
    @gensym elapsed_ns
    # we don't use `quote ... end` here to avoid the LineNumberNodes that it adds (these would taint the stack trace).
    Expr(:block, 
        :(local $elapsed_ns = time_ns()),
        linenumbernode,
        :(local $result = $root),
        :($elapsed_ns = time_ns() - $elapsed_ns),
        :(($result, $elapsed_ns, $return_proof)),
    )
end

"Wrap `expr` inside a timing block, and then inside a try ... catch block."
function trycatch_expr(expr::Expr, module_name::Symbol, cell_id::UUID)
    # I use this to make sure the result from the `expr` went through `timed_expr`, as opposed to when `expr`
    # has an explicit `return` that causes it to jump to the result of `Core.eval` directly.
    return_proof = Ref(123)
    # This seems a bit like a petty check ("I don't want people to play with Pluto!!!") but I see it more as a
    # way to protect people from finding this obscure bug in some way - DRAL

    quote
        ans, runtime = try
            # We eval `expr` in the global scope of the workspace module:
            local invocation = Core.eval($(module_name), $(timed_expr(expr, return_proof) |> QuoteNode))

            if !isa(invocation, Tuple{Any,Number,Any}) || invocation[3] !== $(return_proof)
                throw("Pluto: You can only use return inside a function.")
            else
                local ans, runtime, _ = invocation
                (ans, runtime)
            end
        catch ex
            bt = stacktrace(catch_backtrace())
            (CapturedException(ex, bt), missing)
        end
        setindex!(Main.PlutoRunner.cell_results, ans, $(cell_id))
    end
end
