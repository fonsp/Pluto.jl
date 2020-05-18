"Generate a file name to be given to the parser (will show up in stack traces)."
pluto_filename(notebook::Notebook, cell::Cell)::String = notebook.path * "#==#" * string(cell.uuid)

"Is Julia new enough to support filenames in parsing?"
const _can_differentiate_with_expr = (Base.parse_input_line("1;2") != Base.parse_input_line("1\n2"))

"Parse the code from `cell.code` into a Julia expression (`Expr`). Inserts custom filename if possible."
function parse_custom(notebook::Notebook, cell::Cell)
    if _can_differentiate_with_expr
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
        Meta.parse(rstrip(cell.code, ['\r', '\n', '\t', ' ']), raise=false)
    end
end

"Make some small adjustments to the `expr` to make it work nicely inside a timed, wrapped expression."
function preprocessed_expr(expr::Expr)
    if expr.head == :toplevel
        # for expressions combined using a semicolon: `a = 1; b`

        # a :toplevel expression doesn't return anything, so we change it to a :block
        # unless the cell defines a module, that has to be on :toplevel
		Expr(:block, expr.args...)
    elseif expr.head == :module
        # module definitions need to be at toplevel
        Expr(:toplevel, expr)
    else
        expr
    end
end

preprocessed_expr(val::Any) = val

"Wrap `expr` inside a timing block."
function timed_expr(expr, filename::String="none")::Expr
    local linenumbernode, root
    if ExploreExpression.is_toplevel_expr(expr)
        linenumbernode = expr.args[1]
        root = expr.args[2]
    else
        linenumbernode = LineNumberNode(1, Symbol(filename))
        root = expr
    end

    e = preprocessed_expr(root) # pretty much equal to `Meta.parse(cell.code)`
    # we don't use `quote ... end` here to avoid the LineNumberNodes that it adds (these would taint the stack trace).
    Expr(:block, 
        :(local elapsed_ns = time_ns()),
        linenumbernode,
        :(local result = $e),
        :(elapsed_ns = time_ns() - elapsed_ns),
        :((result, elapsed_ns))
    )
end

"Wrap `expr` inside a timing block, and then inside a try ... catch block."
function trycatch_expr(expr, module_name::Symbol, filename::String, cell_id::UUID)
    quote
        ans, runtime = try
            # We eval `expr` in the global scope of the workspace module:
            Core.eval($(module_name), $(timed_expr(expr, filename) |> QuoteNode))
        catch ex
            bt = stacktrace(catch_backtrace())
            (CapturedException(ex, bt), missing)
        end
        setindex!(Main.PlutoRunner.cell_results, WeakRef(ans), $(cell_id))
    end
end