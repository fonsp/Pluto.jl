
"""
All code necessary for throwing errors when cells return.
Right now it just throws an error from the position of the return,
    this is nice because you get to the line number of the return.
However, now it is suddenly possibly to catch the return error...
    so we might want to actually return the error instead of throwing it,
    and then handle it in `run_expression` or something.
"""
module CantReturnInPluto
    struct CantReturnInPlutoException end
    function Base.showerror(io::IO, ::CantReturnInPlutoException)
        print(io, "Pluto: You can only use return inside a function.")
    end

    """
    We do macro expansion now, so we can also check for `return` statements "statically".
    This method goes through an expression and replaces all `return` statements with `throw(CantReturnInPlutoException())`
    """
    function replace_returns_with_error(expr::Expr)::Expr
        if expr.head == :return
            :(throw($(CantReturnInPlutoException())))
        elseif expr.head == :quote
            Expr(:quote, replace_returns_with_error_in_interpolation(expr.args[1]))
        elseif Meta.isexpr(expr, :(=)) && expr.args[1] isa Expr && (expr.args[1].head == :call || expr.args[1].head == :where || (expr.args[1].head == :(::) && expr.args[1].args[1] isa Expr && expr.args[1].args[1].head == :call))
            # f(x) = ...
            expr
        elseif expr.head == :function || expr.head == :macro || expr.head == :(->)
            expr
        else
            Expr(expr.head, map(arg -> replace_returns_with_error(arg), expr.args)...)
        end
    end
    replace_returns_with_error(other) = other

    "Go through a quoted expression and remove returns"
    function replace_returns_with_error_in_interpolation(expr::Expr)
        if expr.head == :$
            Expr(:$, replace_returns_with_error_in_interpolation(expr.args[1]))
        else
            # We are still in a quote, so we do go deeper, but we keep ignoring everything except :$'s
            Expr(expr.head, map(arg -> replace_returns_with_error_in_interpolation(arg), expr.args)...)
        end
    end
    replace_returns_with_error_in_interpolation(ex) = ex
end