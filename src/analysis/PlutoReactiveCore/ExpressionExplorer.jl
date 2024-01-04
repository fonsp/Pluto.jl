using ExpressionExplorer

@deprecate ReactiveNode_from_expr(args...; kwargs...) ExpressionExplorer.compute_reactive_node(args...; kwargs...)

module ExpressionExplorerExtras
import ..PlutoReactiveCore
using ExpressionExplorer
using ExpressionExplorer: ScopeState

module Fake
    module PlutoRunner
        using Markdown
        using InteractiveUtils
        macro bind(def, element)    
            quote
                global $(esc(def)) = element
            end
        end
    end
    import .PlutoRunner
end
import .Fake


"""
ExpressionExplorer does not explore inside macro calls, i.e. the arguments of a macrocall (like `a+b` in `@time a+b`) are ignored.
Normally, you would macroexpand an expression before giving it to ExpressionExplorer, but in Pluto we sometimes need to explore expressions *before* executing code.

In those cases, we want most accurate result possible. Our extra needs are:
1. Macros included in Julia base, Markdown and `@bind` can be expanded statically. (See `maybe_macroexpand_pluto`.)
2. If a macrocall argument contains a "special heuristic" like `Pkg.activate()` or `using Something`, we need to surface this to be visible to ExpressionExplorer and Pluto. We do this by placing the macrocall in a block, and copying the argument after to the macrocall.
3. If a macrocall argument contains other macrocalls, we need these nested macrocalls to be visible. We do this by placing the macrocall in a block, and creating new macrocall expressions with the nested macrocall names, but without arguments.
"""
function pretransform_pluto(ex)
    if Meta.isexpr(ex, :macrocall)
        to_add = Expr[]
        
        maybe_expanded = maybe_macroexpand_pluto(ex)
        if maybe_expanded === ex
            # we were not able to expand statically
            for arg in ex.args[begin+1:end]
                arg_transformed = pretransform_pluto(arg)
                macro_arg_symstate = ExpressionExplorer.compute_symbols_state(arg_transformed)
                
                # When this macro has something special inside like `Pkg.activate()`, we're going to make sure that ExpressionExplorer treats it as normal code, not inside a macrocall. (so these heuristics trigger later)
                if arg isa Expr && macro_has_special_heuristic_inside(symstate = macro_arg_symstate, expr = arg_transformed)
                    # then the whole argument expression should be added
                    push!(to_add, arg_transformed)
                else
                    for fn in macro_arg_symstate.macrocalls
                        push!(to_add, Expr(:macrocall, fn))
                        # fn is a FunctionName
                        # normally this would not be a legal expression, but ExpressionExplorer handles it correctly so it's all cool
                    end
                end
            end
            
            Expr(
                :block,
                # the original expression, not expanded. ExpressionExplorer will just explore the name of the macro, and nothing else.
                ex, 
                # any expressions that we need to sneakily add
                to_add...
            )
        else
            Expr(
                :block,
                # We were able to expand the macro, so let's recurse on the result.
                pretransform_pluto(maybe_expanded), 
                # the name of the macro that got expanded
                Expr(:macrocall, ex.args[1]),
            )
        end
    elseif Meta.isexpr(ex, :module)
        ex
    elseif ex isa Expr
        # recurse
        Expr(ex.head, (pretransform_pluto(a) for a in ex.args)...)
    else
        ex
    end
end



"""
Uses `cell_precedence_heuristic` to determine if we need to include the contents of this macro in the symstate.
This helps with things like a Pkg.activate() that's in a macro, so Pluto still understands to disable nbpkg.
"""
function macro_has_special_heuristic_inside(; symstate::SymbolsState, expr::Expr)::Bool
    # Also, because I'm lazy and don't want to copy any code, imma use cell_precedence_heuristic here.
    # Sad part is, that this will also include other symbols used in this macro... but come'on
    node = ReactiveNode(symstate)
    code = PlutoReactiveCore.ExprAnalysisCache(
        parsedcode = expr,
        module_usings_imports = ExpressionExplorer.compute_usings_imports(expr),
    )

    return PlutoReactiveCore.cell_precedence_heuristic(node, code) < PlutoReactiveCore.DEFAULT_PRECEDENCE_HEURISTIC
end

const can_macroexpand_no_bind = Set(Symbol.(["@md_str", "Markdown.@md_str", "@gensym", "Base.@gensym", "@enum", "Base.@enum", "@assert", "Base.@assert", "@cmd"]))
const can_macroexpand = can_macroexpand_no_bind ∪ Set(Symbol.(["@bind", "PlutoRunner.@bind"]))

const plutorunner_id = Base.PkgId(Base.UUID("dc6b355a-2368-4481-ae6d-ae0351418d79"), "PlutoRunner")
const pluto_id = Base.PkgId(Base.UUID("c3e4b0f8-55cb-11ea-2926-15256bba5781"), "Pluto")
const found_plutorunner = Ref{Union{Nothing,Module}}(nothing)

function get_plutorunner()
    fpr = found_plutorunner[]
    if fpr === nothing
        # lets try really hard to find it!
        if haskey(Base.loaded_modules, plutorunner_id)
            found_plutorunner[] = Base.loaded_modules[plutorunner_id]
        elseif haskey(Base.loaded_modules, pluto_id)
            found_plutorunner[] = Base.loaded_modules[pluto_id].PlutoRunner
        elseif isdefined(Main, :PlutoRunner) && Main.PlutoRunner isa Module
            found_plutorunner[] = Main.PlutoRunner
        else
            Fake.PlutoRunner # (the fake one)
        end
    else
        fpr
    end
end

"""
If the macro is **known to Pluto**, expand or 'mock expand' it, if not, return the expression. Macros from external packages are not expanded, this is done later in the pipeline. See https://github.com/fonsp/Pluto.jl/pull/1032
"""
function maybe_macroexpand_pluto(ex::Expr; recursive::Bool=false, expand_bind::Bool=true)
    result::Expr = if ex.head === :macrocall
        funcname = ExpressionExplorer.split_funcname(ex.args[1])

        if funcname.joined ∈ (expand_bind ? can_macroexpand : can_macroexpand_no_bind)
            macroexpand(get_plutorunner(), ex; recursive=false)::Expr
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

function collect_implicit_usings(usings_imports::ExpressionExplorer.UsingsImports)
    implicit_usings = Set{Expr}()
    for (using_, isglobal) in zip(usings_imports.usings, usings_imports.usings_isglobal)
        if !(isglobal && is_implicit_using(using_))
            continue
        end

        for arg in using_.args
            push!(implicit_usings, transform_dot_notation(arg))
        end
    end
    implicit_usings
end

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
