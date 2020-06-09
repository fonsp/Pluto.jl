"Generate a file name to be given to the parser (will show up in stack traces)."
pluto_filename(notebook::Notebook, cell::Cell)::String = notebook.path * "#==#" * string(cell.cell_id)

"Is Julia new enough to support filenames in parsing?"
const can_insert_filename = (Base.parse_input_line("1;2") != Base.parse_input_line("1\n2"))

"Parse the code from `cell.code` into a Julia expression (`Expr`). Equivalent to `Meta.parse_input_line` in Julia v1.3, no matter the actual Julia version.

1. Turn multiple expressions into a error expression.
2. Will always produce an expression of the form: `Expr(:toplevel, LineNumberNode(..), root)`. It gets transformed (i.e. wrapped) into this form if needed. A `LineNumberNode` contains a line number and a file name. We use the cell UUID as a 'file name', which makes the stack traces easier to interpret. (Otherwise it would be impossible to tell from which cell a stack frame originates.) Not all Julia versions insert these `LineNumberNode`s, so we insert it ourselves if Julia doesn't.
3. Apply `preprocess_expr` (below) to `root` (from rule 2)."
function parse_custom(notebook::Notebook, cell::Cell)::Expr
    # 1.
    raw = if can_insert_filename
        filename = pluto_filename(notebook, cell)
        ex = Base.parse_input_line(cell.code, filename=filename)
        if (ex isa Expr) && (ex.head == :toplevel)
            # if there is more than one expression:
            if count(a -> !(a isa LineNumberNode), ex.args) > 1
                Expr(:error, "extra token after end of expression")
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
            Expr(:error, "extra token after end of expression")
        end
    end

    # 2.
    topleveled = if ExploreExpression.is_toplevel_expr(raw)
        raw
    else
        filename = pluto_filename(notebook, cell)
        Expr(:toplevel, LineNumberNode(1, Symbol(filename)), raw)
    end

    # 3.
    Expr(topleveled.head, topleveled.args[1], preprocess_expr(topleveled.args[2]))
end

"Make some small adjustments to the `expr` to make it work nicely inside a timed, wrapped expression:

1. If `expr` is a `:toplevel` expression (this is the case iff the expression is a combination of expressions using semicolons, like `a = 1; b` or `123;`), then it gets turned into a `:block` expression. The reason for this transformation is that `:toplevel` does not return/relay the output of its last argument, unlike `begin`, `let`, `if`, etc. (But we want it!)
2. If `expr` is a `:module` expression, wrap it in a `:toplevel` block - module creation needs to be at toplevel. Rule 1. is not applied."
function preprocess_expr(expr::Expr)
    if expr.head == :toplevel
		Expr(:block, expr.args...)
    elseif expr.head == :module
        Expr(:toplevel, expr)
    else
        expr
    end
end

# for expressions that are just values, like :(1) or :(x)
preprocess_expr(val::Any) = val

"Wrap `expr` inside a timing block."
function timed_expr(expr::Expr)::Expr
    # @assert ExploreExpression.is_toplevel_expr(expr)

    linenumbernode = expr.args[1]
    root = expr.args[2] # pretty much equal to what `Meta.parse(cell.code)` would give

    # we don't use `quote ... end` here to avoid the LineNumberNodes that it adds (these would taint the stack trace).
    Expr(:block, 
        :(local elapsed_ns = time_ns()),
        linenumbernode,
        :(local result = $root),
        :(elapsed_ns = time_ns() - elapsed_ns),
        :((result, elapsed_ns))
    )
end

"Wrap `expr` inside a timing block, and then inside a try ... catch block."
function trycatch_expr(expr::Expr, module_name::Symbol, cell_id::UUID)
    quote
        ans, runtime = try
            # We eval `expr` in the global scope of the workspace module:
            Core.eval($(module_name), $(timed_expr(expr) |> QuoteNode))
        catch ex
            bt = stacktrace(catch_backtrace())
            (CapturedException(ex, bt), missing)
        end
        setindex!(Main.PlutoRunner.cell_results, WeakRef(ans), $(cell_id))
    end
end