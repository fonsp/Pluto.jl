module MacroZoo

function expand(func, expr...)
    length(func) > 0 || return nothing
    outs = if func[end] in einsum_list
        einsum_expand(expr...)
    # elseif func[end] in reduce_list
    #     reduce_expand(expr...)
    else
        return nothing  # signal to use the original expression
    end
    return Expr(:call, func[end], outs...) # should use join_funcname_parts?
end

###
# THE ZOO
###

einsum_list = map(Symbol, [
    "@einsum", "@einsimd", "@vielsum", "@vielsimd", # Einsum.jl
    "@tensor", "@tensoropt", # TensorOperations.jl
    "@cast", # TensorCast.jl
    "@ein", # OMEinsum.jl
    "@tullio", # Tullio.jl
    ])

function einsum_expand(exs...)
    for ex in exs
        # this assumes that only one expression is of interest
        ex isa Expr || continue
        if ex.head == :(:=)  # then this is assignment
            left = einsum_name(ex.args[1])
            left === nothing && return nothing
            return [Expr(:(=), left, einsum_undummy(ex.args[2]))]
        elseif ex.head in vcat(:(=), modifiers) && einsum_hasref(ex)
            # then either scalar assignment, or in-place
            return [einsum_undummy(ex)]
        end
        # ignore other expressions, including e.g. keyword options
    end
    nothing
end

einsum_name(s::Symbol) = s
einsum_name(ex::Expr) = ex.head == :ref ? ex.args[1] : nothing

function einsum_undummy(ex)
    prewalk(ex) do x
        x isa Expr || return x
        if x.head == :ref
            # remove all dummy indices
            args = map(i -> i isa Symbol ? 0 : i, x.args[2:end])
            return Expr(:ref, x.args[1], args...)
        elseif x.head == :$
            # treat $ as interpolation
            return x.args[1]
        end
        return x
    end
end

function einsum_hasref(ex)
    out = false
    postwalk(ex) do x
        if x isa Expr && x.head == :ref
            out = true
        end
        x
    end
    out
end

reduce_list = map(Symbol, ["@reduce", "@matmul"])

function reduce_expand(exs...)

end

###
# HELPER FUNCTIONS
###

# from the source code: https://github.com/JuliaLang/julia/blob/master/src/julia-parser.scm#L9
const modifiers = [:(+=), :(-=), :(*=), :(/=), :(//=), :(^=), :(÷=), :(%=), :(<<=), :(>>=), :(>>>=), :(&=), :(⊻=), :(≔), :(⩴), :(≕)]
const modifiers_dotprefixed = [Symbol('.' * String(m)) for m in modifiers]

# Copied verbatim from here:
# https://github.com/MikeInnes/MacroTools.jl/blob/master/src/utils.jl

walk(x, inner, outer) = outer(x)
walk(x::Expr, inner, outer) = outer(Expr(x.head, map(inner, x.args)...))

"""
    postwalk(f, expr)
Applies `f` to each node in the given expression tree, returning the result.
`f` sees expressions *after* they have been transformed by the walk. See also
`prewalk`.
"""
postwalk(f, x) = walk(x, x -> postwalk(f, x), f)

"""
    prewalk(f, expr)
Applies `f` to each node in the given expression tree, returning the result.
`f` sees expressions *before* they have been transformed by the walk, and the
walk will be applied to whatever `f` returns.
This makes `prewalk` somewhat prone to infinite loops; you probably want to try
`postwalk` first.
"""
prewalk(f, x)  = walk(f(x), x -> prewalk(f, x), identity)

replace(ex, s, s′) = prewalk(x -> x == s ? s′ : x, ex)

end # module
