# This is how we go from a String of cell code to a Julia `Expr` that can be executed.

import ExpressionExplorer
import Markdown

"Generate a file name to be given to the parser (will show up in stack traces)."
pluto_filename(notebook::Notebook, cell::Cell)::String = notebook.path * "#==#" * string(cell.cell_id)

"Is Julia new enough to support filenames in parsing?"
const can_insert_filename = (Base.parse_input_line("1;2") != Base.parse_input_line("1\n2"))

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
        ex = Base.parse_input_line(cell.code, filename=filename)
        if Meta.isexpr(ex, :toplevel)
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
            if a.file === nothing || a.file == :none
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
4. If `expr` failed to parse, it has head in (:incomplete, :error) and is replaced with a call to PlutoRunner.throw_syntax_error which will render diagnostics in a frontend compatible manner (Pluto.jl#2526).
"""
function preprocess_expr(expr::Expr)
    if expr.head === :toplevel
		Expr(:block, expr.args...)
    elseif expr.head === :module
        Expr(:toplevel, expr)
    elseif expr.head === :(=) && (expr.args[1] isa Expr && expr.args[1].head == :curly)
        Expr(:const, expr)
    elseif expr.head === :incomplete || expr.head === :error
        Expr(:call, :(PlutoRunner.throw_syntax_error), expr.args...)
    else
        expr
    end
end

# for expressions that are just values, like :(1) or :(x)
preprocess_expr(val::Any) = val


"""
Does this `String` contain a single expression? If this function returns `false`, then Pluto will show a "multiple expressions in one cell" error in the editor.

!!! compat "Pluto 0.20.5"
    This function is new in Pluto 0.20.5.

"""
function is_single_expression(s::String)
    n = Pluto.Notebook([Pluto.Cell(s)])
    e = parse_custom(n, n.cells[1])
    bad = Meta.isexpr(e, :toplevel, 2) && Meta.isexpr(e.args[2], :call, 2) && e.args[2].args[1] == :(PlutoRunner.throw_syntax_error) && e.args[2].args[2] isa String && startswith(e.args[2].args[2], "extra token after end of expression")
    
    
    return !bad
end



function updated_topology(old_topology::NotebookTopology{Cell}, notebook::Notebook, updated_cells)
    get_code_str(cell::Cell) = cell.code
    get_code_expr(cell::Cell) = parse_custom(notebook, cell)
    PlutoDependencyExplorer.updated_topology(
        old_topology, 
        notebook.cells, 
        updated_cells;
        get_code_str,
        get_code_expr,
        get_cell_disabled=is_disabled,
    )
end
