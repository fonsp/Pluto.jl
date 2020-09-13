module MacroZoo

"Each entry is a function, which takes the macro's arguments,
and returns a tuple of fake arguments, for Pluto to digest."
const mock_macros = Dict{Symbol,Function}()

# These functions must accept many arguments, and probably shouldn't give an error
# even on input that the real macro can't accept.

###
# THE ZOO
###

function curly_and_keywords(exs...)
    map(exs) do ex
        postwalk(ex) do x
            if x isa Expr && x.head == :(=) # keyword argument, not assignment
                x.args[2]
            elseif x isa Expr && x.head == :braces # replace {} with begin end
                Expr(:block, x.args...)
            else
                x
            end
        end
    end
end

mock_macros[Symbol("@vlplot")] = curly_and_keywords # VegaLite.jl

mock_macros[Symbol("@pgf")] = curly_and_keywords # PGFPlotsX.jl

first_then_keywords(exs...) = (first(exs), curly_and_keywords(Base.tail(exs)...)...)

mock_macros[Symbol("@test")] = first_then_keywords

query_list = [
    # https://www.queryverse.org/Query.jl/stable/standalonequerycommands/
    "@map",
    "@filter",
    "@groupby",
    "@orderby",
    "@orderby_descending",
    "@thenby",
    "@thenby_descending",
    "@groupjoin",
    "@join",
    "@mapmany",
    "@take",
    "@drop",
    "@unique",
    "@select",
    "@rename",
    "@mutate",
    "@dropna",
    "@dissallowna",
    "@replacena",
    # https://www.queryverse.org/Query.jl/stable/linqquerycommands/
    "@let",
    "@from",
    "@group",
    "@where",
    "@select",
    "@collect",
]
for str in query_list
    mock_macros[Symbol(str)] = (exs...) -> (0,)
end

einsum_list = [
    "@einsum", "@einsimd", "@vielsum", "@vielsimd", # Einsum.jl
    "@tensor", "@tensoropt", "@cutensor", # TensorOperations.jl
    "@cast", "@reduce", "@matmul", # TensorCast.jl
    "@ein", # OMEinsum.jl
    "@tullio", # Tullio.jl
]

function einsum_expand(exs...)
    out = []
    for ex in exs
        ex isa Expr || continue # skip LineNumberNode etc
        if ex.head == :(:=)
            # then this is assignment
            left = einsum_name(ex.args[1])
            left === nothing && continue
            right = if einsum_hasref(ex.args[2])
                einsum_undummy(ex.args[2]) # RHS of simple @einsum
            else
                einsum_undummy(ex.args[2], true) # first expr of A[i] := sum(j) B[i,j]
            end
            push!(out, Expr(:(=), left, right))
        elseif einsum_hasref(ex)
            # scalar assignment, in-place update, or RHS of @reduce
            push!(out, einsum_undummy(ex))
        end
    end
    isempty(out) ? exs : out
end

for str in einsum_list # must be below function definition
    mock_macros[Symbol(str)] = einsum_expand
end

einsum_name(s::Symbol) = s
einsum_name(ex::Expr) = ex.head == :(.) ? ex :  # case A.x[i] := ...
    ex.head == :ref ? einsum_name(ex.args[1]) : # recursive for A[i][j] := ...
    nothing

einsum_undummy(s, inref=false) = (inref || s == :_) ? 0 : s
einsum_undummy(ex::Expr, inref=false) =
    if ex.head == :ref
        # inside indexing, all loose symbols are dummy indices
        args = map(i -> einsum_undummy(i, true), ex.args[2:end])
        Expr(:ref, ex.args[1], args...)
    elseif ex.head == :call && ex.args[1] in [:(|>), :(<|)]
        # don't keep this as function name, but "... |> sqrt" should keep sqrt(0)
        args = map(a -> a isa Symbol ? :($a(0)) : einsum_undummy(a, inref), ex.args[2:end])
        Expr(:call, :+, args...)
    elseif ex.head == :call
        # function calls keep the function name
        args = map(i -> einsum_undummy(i, inref), ex.args[2:end])
        Expr(:call, ex.args[1], args...)
    elseif ex.head == :$
        # interpet $ as interpolation
        ex.args[1]
    else
        args = map(i -> einsum_undummy(i, inref), ex.args)
        Expr(ex.head, args...)
    end

function einsum_hasref(ex) # this serves to exclude keyword options
    out = false
    postwalk(ex) do x
        if x isa Expr && x.head == :ref
            out = true
        end
        x
    end
    out
end


###
# HELPER FUNCTIONS
###

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
