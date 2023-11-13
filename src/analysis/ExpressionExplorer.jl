using ExpressionExplorer

@deprecate ReactiveNode_from_expr(args...; kwargs...) ExpressionExplorer.compute_reactive_node(args...; kwargs...)

module ExpressionExplorerExtras
import ..Pluto
import ..PlutoRunner
using ExpressionExplorer
using ExpressionExplorer: ScopeState

struct PlutoConfiguration <: ExpressionExplorer.AbstractExpressionExplorerConfiguration
end


function ExpressionExplorer.explore_macrocall!(ex::Expr, scopestate::ScopeState{PlutoConfiguration})
    # Early stopping, this expression will have to be re-explored once
    # the macro is expanded in the notebook process.
    macro_name = ExpressionExplorer.split_funcname(ex.args[1])
    symstate = SymbolsState(macrocalls = Set{FunctionName}([macro_name]))

    # Because it sure wouldn't break anything,
    # I'm also going to blatantly assume that any macros referenced in here...
    # will end up in the code after the macroexpansion 🤷‍♀️
    # "You should make a new function for that" they said, knowing I would take the lazy route.
    for arg in ex.args[begin+1:end]
        macro_symstate = ExpressionExplorer.explore!(arg, ScopeState(scopestate.configuration))

        # Also, when this macro has something special inside like `Pkg.activate()`,
        # we're going to treat it as normal code (so these heuristics trigger later)
        # (Might want to also not let this to @eval macro, as an extra escape hatch if you
        #    really don't want pluto to see your Pkg.activate() call)
        if arg isa Expr && macro_has_special_heuristic_inside(symstate = macro_symstate, expr = arg)
            union!(symstate, macro_symstate)
        else
            union!(symstate, SymbolsState(macrocalls = macro_symstate.macrocalls))
        end
    end

    # Some macros can be expanded on the server process
    if macro_name.joined ∈ can_macroexpand
        new_ex = maybe_macroexpand_pluto(ex)
        union!(symstate, ExpressionExplorer.explore!(new_ex, scopestate))
    end

    return symstate
end



"""
Uses `cell_precedence_heuristic` to determine if we need to include the contents of this macro in the symstate.
This helps with things like a Pkg.activate() that's in a macro, so Pluto still understands to disable nbpkg.
"""
function macro_has_special_heuristic_inside(; symstate::SymbolsState, expr::Expr)::Bool
    # Also, because I'm lazy and don't want to copy any code, imma use cell_precedence_heuristic here.
    # Sad part is, that this will also include other symbols used in this macro... but come'on
    local fake_cell = Pluto.Cell()
    local fake_reactive_node = ReactiveNode(symstate)
    local fake_expranalysiscache = Pluto.ExprAnalysisCache(
        parsedcode = expr,
        module_usings_imports = ExpressionExplorer.compute_usings_imports(expr),
    )
    local fake_topology = Pluto.NotebookTopology(
        nodes = Pluto.ImmutableDefaultDict(ReactiveNode, Dict(fake_cell => fake_reactive_node)),
        codes = Pluto.ImmutableDefaultDict(Pluto.ExprAnalysisCache, Dict(fake_cell => fake_expranalysiscache)),
        cell_order = Pluto.ImmutableVector([fake_cell]),
    )

    return Pluto.cell_precedence_heuristic(fake_topology, fake_cell) < Pluto.DEFAULT_PRECEDENCE_HEURISTIC
end

const can_macroexpand_no_bind = Set(Symbol.(["@md_str", "Markdown.@md_str", "@gensym", "Base.@gensym", "@enum", "Base.@enum", "@assert", "Base.@assert", "@cmd"]))
const can_macroexpand = can_macroexpand_no_bind ∪ Set(Symbol.(["@bind", "PlutoRunner.@bind"]))

"""
If the macro is **known to Pluto**, expand or 'mock expand' it, if not, return the expression. Macros from external packages are not expanded, this is done later in the pipeline. See https://github.com/fonsp/Pluto.jl/pull/1032
"""
function maybe_macroexpand_pluto(ex::Expr; recursive::Bool=false, expand_bind::Bool=true)
    result::Expr = if ex.head === :macrocall
        funcname = ExpressionExplorer.split_funcname(ex.args[1])

        if funcname.joined ∈ (expand_bind ? can_macroexpand : can_macroexpand_no_bind)
            macroexpand(PlutoRunner, ex; recursive=false)::Expr
        else
            ex
        end
    else
        ex
    end

    if recursive
        # Not using broadcasting because that is expensive compilation-wise for `result.args::Any`.
        expanded = Any[]
        for arg in result.args
            ex = maybe_macroexpand_pluto(arg; recursive, expand_bind)
            push!(expanded, ex)
        end
        return Expr(result.head, expanded...)
    else
        return result
    end
end

maybe_macroexpand_pluto(ex::Any; kwargs...) = ex



###############



function collect_implicit_usings(ex::Expr)
    if is_implicit_using(ex)
        Set{Expr}(Iterators.map(transform_dot_notation, ex.args))
    else
        return Set{Expr}()
    end
end

collect_implicit_usings(usings::Set{Expr}) = mapreduce(collect_implicit_usings, union!, usings; init = Set{Expr}())
collect_implicit_usings(usings_imports::ExpressionExplorer.UsingsImports) = collect_implicit_usings(usings_imports.usings)


is_implicit_using(ex::Expr) = Meta.isexpr(ex, :using) && length(ex.args) >= 1 && !Meta.isexpr(ex.args[1], :(:))

function transform_dot_notation(ex::Expr)
    if Meta.isexpr(ex, :(.))
        Expr(:block, ex.args[end])
    else
        ex
    end
end



###############


"""
```julia
can_be_function_wrapped(ex)::Bool
```

Is this code simple enough that we can wrap it inside a function, and run the function in global scope instead of running the code directly? Look for `Pluto.PlutoRunner.Computer` to learn more.
"""
function can_be_function_wrapped(x::Expr)
    if x.head === :global || # better safe than sorry
       x.head === :using ||
       x.head === :import ||
       x.head === :export ||
       x.head === :public || # Julia 1.11
       x.head === :module ||
       x.head === :incomplete ||
       # Only bail on named functions, but anonymous functions (args[1].head == :tuple) are fine.
       # TODO Named functions INSIDE other functions should be fine too
       (x.head === :function && !Meta.isexpr(x.args[1], :tuple)) ||
       x.head === :macro ||
       # Cells containing macrocalls will actually be function wrapped using the expanded version of the expression
       # See https://github.com/fonsp/Pluto.jl/pull/1597
       x.head === :macrocall ||
       x.head === :struct ||
       x.head === :abstract ||
       (x.head === :(=) && ExpressionExplorer.is_function_assignment(x)) || # f(x) = ...
       (x.head === :call && (x.args[1] === :eval || x.args[1] === :include))
        false
    else
        all(can_be_function_wrapped, x.args)
    end
end

can_be_function_wrapped(x::Any) = true

end
