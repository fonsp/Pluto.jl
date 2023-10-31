using ExpressionExplorer

module ExpressionExplorerExtras
using ExpressionExplorer

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
    if ExpressionExplorer.join_funcname_parts(macro_name) ∈ can_macroexpand
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
    local fake_reactive_node = Pluto.ReactiveNode(symstate)
    local fake_expranalysiscache = Pluto.ExprAnalysisCache(
        parsedcode = expr,
        module_usings_imports = ExpressionExplorer.compute_usings_imports(expr),
    )
    local fake_topology = Pluto.NotebookTopology(
        nodes = Pluto.ImmutableDefaultDict(Pluto.ReactiveNode, Dict(fake_cell => fake_reactive_node)),
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
        funcname = split_funcname(ex.args[1])
        funcname_joined = join_funcname_parts(funcname)

        if funcname_joined ∈ (expand_bind ? can_macroexpand : can_macroexpand_no_bind)
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



###
# UTILITY FUNCTIONS
###




Base.@kwdef struct UsingsImports
    usings::Set{Expr} = Set{Expr}()
    imports::Set{Expr} = Set{Expr}()
end

is_implicit_using(ex::Expr) = Meta.isexpr(ex, :using) && length(ex.args) >= 1 && !Meta.isexpr(ex.args[1], :(:))
function transform_dot_notation(ex::Expr)
    if Meta.isexpr(ex, :(.))
        Expr(:block, ex.args[end])
    else
        ex
    end
end

function collect_implicit_usings(ex::Expr)
    if is_implicit_using(ex)
        Set{Expr}(Iterators.map(transform_dot_notation, ex.args))
    else
        return Set{Expr}()
    end
end

collect_implicit_usings(usings::Set{Expr}) = mapreduce(collect_implicit_usings, union!, usings; init = Set{Expr}())
collect_implicit_usings(usings_imports::UsingsImports) = collect_implicit_usings(usings_imports.usings)

# Performance analysis: https://gist.github.com/fonsp/280f6e883f419fb3a59231b2b1b95cab
"Preallocated version of [`compute_usings_imports`](@ref)."
function compute_usings_imports!(out::UsingsImports, ex::Any)
    if isa(ex, Expr)
        if ex.head == :using
            push!(out.usings, ex)
        elseif ex.head == :import
            push!(out.imports, ex)
        elseif ex.head != :quote
            for a in ex.args
                compute_usings_imports!(out, a)
            end
        end
    end
    out
end

"""
Given `:(using Plots, Something.Else, .LocalModule)`, return `Set([:Plots, :Something])`.
"""
function external_package_names(ex::Expr)::Set{Symbol}
    @assert ex.head == :import || ex.head == :using
    if Meta.isexpr(ex.args[1], :(:))
        external_package_names(Expr(ex.head, ex.args[1].args[1]))
    else
        out = Set{Symbol}()
        for a in ex.args
            if Meta.isexpr(a, :as)
                a = a.args[1]
            end
            if Meta.isexpr(a, :(.))
                if a.args[1] != :(.)
                    push!(out, a.args[1])
                end
            end
        end
        out
    end
end

function external_package_names(x::UsingsImports)::Set{Symbol}
    union!(Set{Symbol}(), Iterators.map(external_package_names, x.usings)..., Iterators.map(external_package_names, x.imports)...)
end

"Get the sets of `using Module` and `import Module` subexpressions that are contained in this expression."
compute_usings_imports(ex) = compute_usings_imports!(UsingsImports(), ex)

"Return whether the expression is of the form `Expr(:toplevel, LineNumberNode(..), any)`."
function is_toplevel_expr(ex::Expr)::Bool
    Meta.isexpr(ex, :toplevel, 2) && (ex.args[1] isa LineNumberNode)
end

is_toplevel_expr(::Any)::Bool = false

"If the expression is a (simple) assignemnt at its root, return the assignee as `Symbol`, return `nothing` otherwise."
function get_rootassignee(ex::Expr, recurse::Bool = true)::Union{Symbol,Nothing}
    if is_toplevel_expr(ex) && recurse
        get_rootassignee(ex.args[2], false)
    elseif Meta.isexpr(ex, :macrocall, 3)
        rooter_assignee = get_rootassignee(ex.args[3], true)
        if rooter_assignee !== nothing
            Symbol(string(ex.args[1]) * " " * string(rooter_assignee))
        else
            nothing
        end
    elseif Meta.isexpr(ex, :const, 1)
        rooter_assignee = get_rootassignee(ex.args[1], false)
        if rooter_assignee !== nothing
            Symbol("const " * string(rooter_assignee))
        else
            nothing
        end
    elseif ex.head == :(=) && ex.args[1] isa Symbol
        ex.args[1]
    else
        nothing
    end
end

get_rootassignee(ex::Any, recuse::Bool = true)::Union{Symbol,Nothing} = nothing

"Is this code simple enough that we can wrap it inside a function to boost performance? Look for [`PlutoRunner.Computer`](@ref) to learn more."
function can_be_function_wrapped(x::Expr)
    if x.head === :global || # better safe than sorry
       x.head === :using ||
       x.head === :import ||
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
       (x.head === :(=) && is_function_assignment(x)) || # f(x) = ...
       (x.head === :call && (x.args[1] === :eval || x.args[1] === :include))
        false
    else
        all(can_be_function_wrapped, x.args)
    end

end
can_be_function_wrapped(x::Any) = true

end
