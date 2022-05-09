module ExpressionExplorer
export compute_symbolreferences, try_compute_symbolreferences, compute_usings_imports, SymbolsState, FunctionName, join_funcname_parts

import ..PlutoRunner
import Markdown
import Base: union, union!, ==, push!

###
# TWO STATE OBJECTS
###

const FunctionName = Array{Symbol,1}

struct FunctionNameSignaturePair
    name::FunctionName
    canonicalized_head::Any
end

Base.:(==)(a::FunctionNameSignaturePair, b::FunctionNameSignaturePair) = a.name == b.name && a.canonicalized_head == b.canonicalized_head
Base.hash(a::FunctionNameSignaturePair, h::UInt) = hash(a.name, hash(a.canonicalized_head, h))

"SymbolsState trickles _down_ the ASTree: it carries referenced and defined variables from endpoints down to the root."
Base.@kwdef mutable struct SymbolsState
    references::Set{Symbol} = Set{Symbol}()
    assignments::Set{Symbol} = Set{Symbol}()
    funccalls::Set{FunctionName} = Set{FunctionName}()
    funcdefs::Dict{FunctionNameSignaturePair,SymbolsState} = Dict{FunctionNameSignaturePair,SymbolsState}()
    macrocalls::Set{FunctionName} = Set{FunctionName}()
end


"ScopeState moves _up_ the ASTree: it carries scope information up towards the endpoints."
mutable struct ScopeState
    inglobalscope::Bool
    exposedglobals::Set{Symbol}
    hiddenglobals::Set{Symbol}
    definedfuncs::Set{Symbol}
end
ScopeState() = ScopeState(true, Set{Symbol}(), Set{Symbol}(), Set{Symbol}())

# The `union` and `union!` overloads define how two `SymbolsState`s or two `ScopeState`s are combined.

function union(a::Dict{FunctionNameSignaturePair,SymbolsState}, bs::Dict{FunctionNameSignaturePair,SymbolsState}...)
    union!(Dict{FunctionNameSignaturePair,SymbolsState}(), a, bs...)
end

function union!(a::Dict{FunctionNameSignaturePair,SymbolsState}, bs::Dict{FunctionNameSignaturePair,SymbolsState}...)
    for b in bs
        for (k, v) in b
            if haskey(a, k)
                a[k] = union!(a[k], v)
            else
                a[k] = v
            end
        end
        a
    end
    return a
end

function union(a::SymbolsState, b::SymbolsState)
    SymbolsState(a.references ∪ b.references, a.assignments ∪ b.assignments, a.funccalls ∪ b.funccalls, a.funcdefs ∪ b.funcdefs, a.macrocalls ∪ b.macrocalls)
end

function union!(a::SymbolsState, bs::SymbolsState...)
    union!(a.references, (b.references for b in bs)...)
    union!(a.assignments, (b.assignments for b in bs)...)
    union!(a.funccalls, (b.funccalls for b in bs)...)
    union!(a.funcdefs, (b.funcdefs for b in bs)...)
    union!(a.macrocalls, (b.macrocalls for b in bs)...)
    return a
end

function union!(a::Tuple{FunctionName,SymbolsState}, bs::Tuple{FunctionName,SymbolsState}...)
    a[1], union!(a[2], (b[2] for b in bs)...)
end

function union(a::ScopeState, b::ScopeState)
    SymbolsState(a.inglobalscope && b.inglobalscope, a.exposedglobals ∪ b.exposedglobals, a.hiddenglobals ∪ b.hiddenglobals)
end

function union!(a::ScopeState, bs::ScopeState...)
    a.inglobalscope &= all((b.inglobalscope for b in bs)...)
    union!(a.exposedglobals, (b.exposedglobals for b in bs)...)
    union!(a.hiddenglobals, (b.hiddenglobals for b in bs)...)
    union!(a.definedfuncs, (b.definedfuncs for b in bs)...)
    return a
end

function ==(a::SymbolsState, b::SymbolsState)
    a.references == b.references && a.assignments == b.assignments && a.funccalls == b.funccalls && a.funcdefs == b.funcdefs && a.macrocalls == b.macrocalls
end

Base.push!(x::Set) = x

###
# HELPER FUNCTIONS
###

function explore_inner_scoped(ex::Expr, scopestate::ScopeState)::SymbolsState
    # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
    innerscopestate = deepcopy(scopestate)
    innerscopestate.inglobalscope = false

    return mapfoldl(a -> explore!(a, innerscopestate), union!, ex.args, init = SymbolsState())
end

# from the source code: https://github.com/JuliaLang/julia/blob/master/src/julia-parser.scm#L9
const modifiers = [:(+=), :(-=), :(*=), :(/=), :(//=), :(^=), :(÷=), :(%=), :(<<=), :(>>=), :(>>>=), :(&=), :(⊻=), :(≔), :(⩴), :(≕)]
const modifiers_dotprefixed = [Symbol('.' * String(m)) for m in modifiers]

function will_assign_global(assignee::Symbol, scopestate::ScopeState)::Bool
    (scopestate.inglobalscope || assignee ∈ scopestate.exposedglobals) && (assignee ∉ scopestate.hiddenglobals || assignee ∈ scopestate.definedfuncs)
end

function will_assign_global(assignee::Array{Symbol,1}, scopestate::ScopeState)::Bool
    if length(assignee) == 0
        false
    elseif length(assignee) > 1
        scopestate.inglobalscope
    else
        will_assign_global(assignee[1], scopestate)
    end
end

function get_global_assignees(assignee_exprs, scopestate::ScopeState)::Set{Symbol}
    global_assignees = Set{Symbol}()
    for ae in assignee_exprs
        if isa(ae, Symbol)
            will_assign_global(ae, scopestate) && push!(global_assignees, ae)
        else
            if ae.head == :(::)
                will_assign_global(ae.args[1], scopestate) && push!(global_assignees, ae.args[1])
            else
                @warn "Unknown assignee expression" ae
            end
        end
    end
    return global_assignees
end

function get_assignees(ex::Expr)::FunctionName
    if ex.head == :tuple
        if length(ex.args) == 1 && Meta.isexpr(only(ex.args), :parameters)
            # e.g. (x, y) in the ex (; x, y) = (x = 5, y = 6, z = 7)
            args = only(ex.args).args
        else
            # e.g. (x, y) in the ex (x, y) = (1, 23)
            args = ex.args
        end
        union!(Symbol[], get_assignees.(args)...)
        # filter(s->s isa Symbol, ex.args)
    elseif ex.head == :(::)
        # TODO: type is referenced
        get_assignees(ex.args[1])
    elseif ex.head == :ref || ex.head == :(.)
        Symbol[]
    else
        @warn "unknown use of `=`. Assignee is unrecognised." ex
        Symbol[]
    end
end

# e.g. x = 123, but ignore _ = 456
get_assignees(ex::Symbol) = all_underscores(ex) ? Symbol[] : Symbol[ex]

# When you assign to a datatype like Int, String, or anything bad like that
# e.g. 1 = 2
# This is parsable code, so we have to treat it
get_assignees(::Any) = Symbol[]

all_underscores(s::Symbol) = all(isequal('_'), string(s))

# TODO: this should return a FunctionName, and use `split_funcname`.
"Turn :(A{T}) into :A."
function uncurly!(ex::Expr, scopestate::ScopeState)::Tuple{Symbol,SymbolsState}
    @assert ex.head == :curly
    symstate = SymbolsState()
    for curly_arg in ex.args[2:end]
        arg_name, arg_symstate = explore_funcdef!(curly_arg, scopestate)
        push!(scopestate.hiddenglobals, join_funcname_parts(arg_name))
        union!(symstate, arg_symstate)
    end
    Symbol(ex.args[1]), symstate
end

uncurly!(ex::Expr)::Tuple{Symbol,SymbolsState} = ex.args[1], SymbolsState()

uncurly!(s::Symbol, scopestate = nothing)::Tuple{Symbol,SymbolsState} = s, SymbolsState()

"Turn `:(Base.Submodule.f)` into `[:Base, :Submodule, :f]` and `:f` into `[:f]`."
function split_funcname(funcname_ex::Expr)::FunctionName
    if funcname_ex.head == :(.)
        out = FunctionName()
        args = funcname_ex.args
        for arg in args
            push!(out, split_funcname(arg)...)
        end
        return out
    else
        # a call to a function that's not a global, like calling an array element: `funcs[12]()`
        # TODO: explore symstate!
        return Symbol[]
    end
end

function split_funcname(funcname_ex::QuoteNode)::FunctionName
    split_funcname(funcname_ex.value)
end
function split_funcname(funcname_ex::GlobalRef)::FunctionName
    split_funcname(funcname_ex.name)
end

function split_funcname(funcname_ex::Symbol)::FunctionName
    Symbol[funcname_ex|>without_dotprefix|>without_dotsuffix]
end

# this includes GlobalRef - it's fine that we don't recognise it, because you can't assign to a globalref?
function split_funcname(::Any)::FunctionName
    Symbol[]
end

"Allows comparing tuples to vectors since having constant vectors can be slower"
all_iters_eq(a, b) = length(a) == length(b) && all((aa == bb for (aa, bb) in zip(a, b)))

function is_just_dots(ex::Expr)
    ex.head == :(.) && all(is_just_dots, ex.args)
end
is_just_dots(::Union{QuoteNode,Symbol,GlobalRef}) = true
is_just_dots(::Any) = false

"""Turn `Symbol(".+")` into `:(+)`"""
function without_dotprefix(funcname::Symbol)::Symbol
    fn_str = String(funcname)
    if length(fn_str) > 0 && fn_str[1] == '.'
        Symbol(fn_str[2:end])
    else
        funcname
    end
end

"""Turn `Symbol("sqrt.")` into `:sqrt`"""
function without_dotsuffix(funcname::Symbol)::Symbol
    fn_str = String(funcname)
    if length(fn_str) > 0 && fn_str[end] == '.'
        Symbol(fn_str[1:end-1])
    else
        funcname
    end
end

"""Generates a vector of all possible variants from a function name

```
julia> generate_funcnames([:Base, :Foo, :bar])
3-element Vector{Symbol}:
 Symbol("Base.Foo.bar")
 Symbol("Foo.bar")
 :bar
```

"""
function generate_funcnames(funccall::FunctionName)
    calls = Vector{FunctionName}(undef, length(funccall) - 1)
    for i = length(funccall):-1:2
        calls[i-1] = funccall[i:end]
    end
    calls
end

"""
Turn `Symbol[:Module, :func]` into Symbol("Module.func").

This is **not** the same as the expression `:(Module.func)`, but is used to identify the function name using a single `Symbol` (like normal variables).
This means that it is only the inverse of `ExpressionExplorer.split_funcname` iff `length(parts) ≤ 1`.
"""
join_funcname_parts(parts::FunctionName) = Symbol(join(parts, '.'))

# this is stupid -- désolé
function is_joined_funcname(joined::Symbol)
    joined !== :.. #= .. is a valid identifier 😐 =# && occursin('.', String(joined))
end

"Module so I don't pollute the whole ExpressionExplorer scope"
module MacroHasSpecialHeuristicInside
import ...Pluto
import ..ExpressionExplorer, ..SymbolsState

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

    return Pluto.cell_precedence_heuristic(fake_topology, fake_cell) < 9
end
# Having written this... I know I said I was lazy... I was wrong
end


###
# MAIN RECURSIVE FUNCTION
###

# Spaghetti code for a spaghetti problem 🍝

# Possible leaf: value
# Like: a = 1
# 1 is a value (Int64)
function explore!(value, scopestate::ScopeState)::SymbolsState
    # includes: LineNumberNode, Int64, String, 
    return SymbolsState()
end

# Possible leaf: symbol
# Like a = x
# x is a symbol
# We handle the assignment separately, and explore!(:a, ...) will not be called.
# Therefore, this method only handles _references_, which are added to the symbolstate, depending on the scopestate.
function explore!(sym::Symbol, scopestate::ScopeState)::SymbolsState
    if sym ∈ scopestate.hiddenglobals
        SymbolsState()
    else
        SymbolsState(references = Set([sym]))
    end
end

"""
Returns whether or not an assignment Expr(:(=),...) is assigning to a new function
  * f(x) = ...
  * f(x)::V = ...
  * f(::T) where {T} = ...
"""
is_function_assignment(ex::Expr) = ex.args[1] isa Expr && (ex.args[1].head == :call || ex.args[1].head == :where || (ex.args[1].head == :(::) && ex.args[1].args[1] isa Expr && ex.args[1].args[1].head == :call))

anonymous_name() = Symbol("anon", rand(UInt64))

# General recursive method. Is never a leaf.
# Modifies the `scopestate`.
function explore!(ex::Expr, scopestate::ScopeState)::SymbolsState
    if ex.head == :(=)
        # Does not create scope

        if is_function_assignment(ex)
            # f(x, y) = x + y
            # Rewrite to:
            # function f(x, y) x + y end
            return explore!(Expr(:function, ex.args...), scopestate)
        end

        val = ex.args[2]
        # Handle generic types assignments A{B} = C{B, Int}
        if ex.args[1] isa Expr && ex.args[1].head == :curly
            assignees, symstate = explore_funcdef!(ex.args[1], scopestate)
            innersymstate = union!(symstate, explore!(val, scopestate))
        else
            assignees = get_assignees(ex.args[1])
            symstate = innersymstate = explore!(val, scopestate)
        end

        global_assignees = get_global_assignees(assignees, scopestate)

        # If we are _not_ assigning a global variable, then this symbol hides any global definition with that name
        push!(scopestate.hiddenglobals, setdiff(assignees, global_assignees)...)
        assigneesymstate = explore!(ex.args[1], scopestate)

        push!(scopestate.hiddenglobals, global_assignees...)
        push!(symstate.assignments, global_assignees...)
        push!(symstate.references, setdiff(assigneesymstate.references, global_assignees)...)
        filter!(!all_underscores, symstate.references)  # Never record _ as a reference

        return symstate
    elseif ex.head in modifiers
        # We change: a[1] += 123
        # to:        a[1] = a[1] + 123
        # We transform the modifier back to its operator
        # for when users redefine the + function

        operator = let
            s = string(ex.head)
            Symbol(s[1:prevind(s, lastindex(s))])
        end
        expanded_expr = Expr(:(=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore!(expanded_expr, scopestate)
    elseif ex.head in modifiers_dotprefixed
        # We change: a[1] .+= 123
        # to:        a[1] .= a[1] + 123

        operator = Symbol(string(ex.head)[2:end-1])
        expanded_expr = Expr(:(.=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore!(expanded_expr, scopestate)
    elseif ex.head == :let || ex.head == :for || ex.head == :while
        # Creates local scope
        return explore_inner_scoped(ex, scopestate)
    elseif ex.head == :filter
        # In a filter, the assignment is the second expression, the condition the first
        return mapfoldr(a -> explore!(a, scopestate), union!, ex.args, init = SymbolsState())
    elseif ex.head == :generator
        # Creates local scope

        # In a `generator`, a single expression is followed by the iterator assignments.
        # In a `for`, this expression comes at the end.

        # This is not strictly the normal form of a `for` but that's okay
        return explore!(Expr(:for, Iterators.reverse(ex.args[2:end])..., ex.args[1]), scopestate)
    elseif ex.head == :macrocall
        # Early stopping, this expression will have to be re-explored once
        # the macro is expanded in the notebook process.
        macro_name = split_funcname(ex.args[1])
        symstate = SymbolsState(macrocalls = Set{FunctionName}([macro_name]))

        # Because it sure wouldn't break anything,
        # I'm also going to blatantly assume that any macros referenced in here...
        # will end up in the code after the macroexpansion 🤷‍♀️
        # "You should make a new function for that" they said, knowing I would take the lazy route.
        for arg in ex.args[begin+1:end]
            macro_symstate = explore!(arg, ScopeState())

            # Also, when this macro has something special inside like `Pkg.activate()`,
            # we're going to treat it as normal code (so these heuristics trigger later)
            # (Might want to also not let this to @eval macro, as an extra escape hatch if you
            #    really don't want pluto to see your Pkg.activate() call)
            if arg isa Expr && MacroHasSpecialHeuristicInside.macro_has_special_heuristic_inside(symstate = macro_symstate, expr = arg)
                union!(symstate, macro_symstate)
            else
                union!(symstate, SymbolsState(macrocalls = macro_symstate.macrocalls))
            end
        end

        # Some macros can be expanded on the server process
        if join_funcname_parts(macro_name) ∈ can_macroexpand
            new_ex = maybe_macroexpand(ex)
            union!(symstate, explore!(new_ex, scopestate))
        end

        return symstate
    elseif ex.head == :call
        # Does not create scope

        if is_just_dots(ex.args[1])
            funcname = ex.args[1] |> split_funcname
            symstate = if length(funcname) == 0
                explore!(ex.args[1], scopestate)
            elseif length(funcname) == 1
                if funcname[1] ∈ scopestate.hiddenglobals
                    SymbolsState()
                else
                    SymbolsState(funccalls = Set{FunctionName}([funcname]))
                end
            elseif funcname[1] ∈ scopestate.hiddenglobals
                SymbolsState()
            else
                SymbolsState(references = Set{Symbol}([funcname[1]]), funccalls = Set{FunctionName}([funcname]))
            end

            # Explore code inside function arguments:
            union!(symstate, explore!(Expr(:block, ex.args[2:end]...), scopestate))

            # Make `@macroexpand` and `Base.macroexpand` reactive by referencing the first macro in the second
            # argument to the call.
            if (all_iters_eq((:Base, :macroexpand), funcname) || all_iters_eq((:macroexpand,), funcname)) &&
               length(ex.args) >= 3 &&
               ex.args[3] isa QuoteNode &&
               Meta.isexpr(ex.args[3].value, :macrocall)
                expanded_macro = split_funcname(ex.args[3].value.args[1])
                union!(symstate, SymbolsState(macrocalls = Set{FunctionName}([expanded_macro])))
            elseif all_iters_eq((:BenchmarkTools, :generate_benchmark_definition), funcname) &&
                length(ex.args) == 10
                block = Expr(:block,
                     map(ex.args[[8,7,9]]) do child
                        if (Meta.isexpr(child, :copyast, 1) && child.args[1] isa QuoteNode && child.args[1].value isa Expr)
                            child.args[1].value
                        else
                            nothing
                        end
                    end...
                )
                union!(symstate, explore_inner_scoped(block, scopestate))
            end

            return symstate
        else
            return explore!(Expr(:block, ex.args...), scopestate)
        end
    elseif ex.head == :kw
        return explore!(ex.args[2], scopestate)
    elseif ex.head == :struct
        # Creates local scope

        structnameexpr = ex.args[2]
        structfields = ex.args[3].args

        equiv_func = Expr(:function, Expr(:call, structnameexpr, structfields...), Expr(:block, nothing))

        # struct should always be in Global state
        globalscopestate = deepcopy(scopestate)
        globalscopestate.inglobalscope = true

        # we register struct definitions as both a variable and a function. This is because deleting a struct is trickier than just deleting its methods.
        # Due to this, outer constructors have to be defined in the same cell where the struct is defined.
        # See https://github.com/fonsp/Pluto.jl/issues/732 for more details
        inner_symstate = explore!(equiv_func, globalscopestate)

        structname = first(keys(inner_symstate.funcdefs)).name |> join_funcname_parts
        push!(inner_symstate.assignments, structname)
        return inner_symstate
    elseif ex.head == :abstract
        equiv_func = Expr(:function, ex.args...)
        inner_symstate = explore!(equiv_func, scopestate)

        abstracttypename = first(keys(inner_symstate.funcdefs)).name |> join_funcname_parts
        push!(inner_symstate.assignments, abstracttypename)
        return inner_symstate
    elseif ex.head == :function || ex.head == :macro
        symstate = SymbolsState()
        # Creates local scope

        funcroot = ex.args[1]

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scopestate)
        innerscopestate.inglobalscope = false

        funcname, innersymstate = explore_funcdef!(funcroot, innerscopestate)

        # Macro are called using @funcname, but defined with funcname. We need to change that in our scopestate
        # (The `!= 0` is for when the function named couldn't be parsed)
        if ex.head == :macro && length(funcname) != 0
            funcname = Symbol[Symbol("@$(funcname[1])")]
            push!(innerscopestate.hiddenglobals, only(funcname))
        elseif length(funcname) == 1
            push!(scopestate.definedfuncs, funcname[end])
            push!(scopestate.hiddenglobals, funcname[end])
        elseif length(funcname) > 1
            push!(symstate.references, funcname[end-1]) # reference the module of the extended function
            push!(scopestate.hiddenglobals, funcname[end-1])
        end

        union!(innersymstate, explore!(Expr(:block, ex.args[2:end]...), innerscopestate))
        funcnamesig = FunctionNameSignaturePair(funcname, canonalize(funcroot))

        if will_assign_global(funcname, scopestate)
            symstate.funcdefs[funcnamesig] = innersymstate
        else
            # The function is not defined globally. However, the function can still modify the global scope or reference globals, e.g.

            # let
            #     function f(x)
            #         global z = x + a
            #     end
            #     f(2)
            # end

            # so we insert the function's inner symbol state here, as if it was a `let` block.
            symstate = innersymstate
        end

        return symstate
    elseif ex.head == :try
        symstate = SymbolsState()

        # Handle catch first
        if ex.args[3] != false
            union!(symstate, explore_inner_scoped(ex.args[3], scopestate))
            # If we catch a symbol, it could shadow a global reference, remove it
            if ex.args[2] != false
                setdiff!(symstate.references, Symbol[ex.args[2]])
            end
        end

        # Handle the try block
        union!(symstate, explore_inner_scoped(ex.args[1], scopestate))

        # Finally, handle finally
        if length(ex.args) == 4
            union!(symstate, explore_inner_scoped(ex.args[4], scopestate))
        end

        return symstate
    elseif ex.head == :(->)
        # Creates local scope

        tempname = anonymous_name()

        # We will rewrite this to a normal function definition, with a temporary name
        funcroot = ex.args[1]
        args_ex = if funcroot isa Symbol || (funcroot isa Expr && funcroot.head == :(::))
            [funcroot]
        elseif funcroot.head == :tuple || funcroot.head == :(...) || funcroot.head == :block
            funcroot.args
        else
            @error "Unknown lambda type"
        end

        equiv_func = Expr(:function, Expr(:call, tempname, args_ex...), ex.args[2])

        return explore!(equiv_func, scopestate)
    elseif ex.head == :global
        # Does not create scope

        # global x, y, z
        if length(ex.args) > 1
            return mapfoldl(arg -> explore!(Expr(:global, arg), scopestate), union!, ex.args; init = SymbolsState())
        end

        # We have one of:
        # global x;
        # global x = 1;
        # global x += 1;

        # where x can also be a tuple:
        # global a,b = 1,2

        globalisee = ex.args[1]

        if isa(globalisee, Symbol)
            push!(scopestate.exposedglobals, globalisee)
            return SymbolsState()
        elseif isa(globalisee, Expr)
            # temporarily set inglobalscope to true
            old = scopestate.inglobalscope
            scopestate.inglobalscope = true
            result = explore!(globalisee, scopestate)
            scopestate.inglobalscope = old
            return result
        else
            @error "unknown global use" ex
            return explore!(globalisee, scopestate)
        end

        return symstate
    elseif ex.head == :local
        # Does not create scope

        # Turn `local x, y` in `local x; local y
        if length(ex.args) > 1
            return mapfoldl(arg -> explore!(Expr(:local, arg), scopestate), union!, ex.args; init = SymbolsState())
        end

        localisee = ex.args[1]

        if isa(localisee, Symbol)
            push!(scopestate.hiddenglobals, localisee)
            return SymbolsState()
        elseif isa(localisee, Expr) && (localisee.head == :(=) || localisee.head in modifiers)
            push!(scopestate.hiddenglobals, get_assignees(localisee.args[1])...)
            return explore!(localisee, scopestate)
        else
            @warn "unknown local use" ex
            return explore!(localisee, scopestate)
        end
    elseif ex.head == :tuple
        # Does not create scope

        # There are three (legal) cases:
        # 1. Creating a tuple:
        #   (a, b, c)

        # 2. Creating a named tuple:
        #   (a=1, b=2, c=3)

        # 3. Multiple assignments
        # a,b,c = 1,2,3
        # This parses to:
        # head = :tuple
        # args = [:a, :b, :(c=1), :2, :3]
        # 
        # 🤔
        # we turn it into two expressions:
        # 
        # (a, b) = (2, 3)
        # (c = 1)
        # 
        # and explore those :)

        indexoffirstassignment = findfirst(a -> isa(a, Expr) && a.head == :(=), ex.args)
        if indexoffirstassignment !== nothing
            # we have one of two cases, see next `if`
            indexofsecondassignment = findnext(a -> isa(a, Expr) && a.head == :(=), ex.args, indexoffirstassignment + 1)

            if length(ex.args) == 1 || indexofsecondassignment !== nothing
                # 2.
                # we have a named tuple, e.g. (a=1, b=2)
                new_args = map(ex.args) do a
                    (a isa Expr && a.head == :(=)) ? a.args[2] : a
                end
                return explore!(Expr(:block, new_args...), scopestate)
            else
                # 3. 
                # we have a tuple assignment, e.g. `a, (b, c) = [1, [2, 3]]`
                before = ex.args[1:indexoffirstassignment-1]
                after = ex.args[indexoffirstassignment+1:end]

                symstate_middle = explore!(ex.args[indexoffirstassignment], scopestate)
                symstate_outer = explore!(Expr(:(=), Expr(:tuple, before...), Expr(:block, after...)), scopestate)

                return union!(symstate_middle, symstate_outer)
            end
        else
            # 1.
            # good ol' tuple
            return explore!(Expr(:block, ex.args...), scopestate)
        end
    elseif Meta.isexpr(ex, :(.), 2) && ex.args[2] isa Expr && ex.args[2].head == :tuple
        # pointwise function call, e.g. sqrt.(nums)
        # we rewrite to a regular call

        return explore!(Expr(:call, ex.args[1], ex.args[2].args...), scopestate)
    elseif ex.head == :using || ex.head == :import
        imports = if ex.args[1].head == :(:)
            ex.args[1].args[2:end]
        else
            ex.args
        end

        packagenames = map(e -> e.args[end], imports)

        return SymbolsState(assignments = Set{Symbol}(packagenames))
    elseif ex.head == :quote
        # Look through the quote and only returns explore! deeper into :$'s
        # I thought we need to handle strings in the same way,
        #   but strings do just fine with the catch all at the end
        #   and actually strings don't always have a :$ expression, sometimes just
        #   plain Symbols (which we should then be interpreted as variables,
        #     which is different to how we handle Symbols in quote'd expressions)
        return explore_interpolations!(ex.args[1], scopestate)
    elseif ex.head == :module
        # Does create it's own scope, but can import from outer scope, that's what `explore_module_definition!` is for
        symstate = explore_module_definition!(ex, scopestate)

        return union(symstate, SymbolsState(assignments = Set{Symbol}([ex.args[2]])))
    elseif Meta.isexpr(ex, Symbol("'"), 1)
        # a' corresponds to adjoint(a)
        return explore!(Expr(:call, :adjoint, ex.args[1]), scopestate)
    elseif ex.head == :meta
        return SymbolsState()
    else
        # fallback, includes:
        # begin, block, do, toplevel, const
        # (and hopefully much more!)

        # Does not create scope (probably)

        return mapfoldl(a -> explore!(a, scopestate), union!, ex.args, init = SymbolsState())
    end
end

"""
Goes through a module definition, and picks out `import ..x`'s, which are references to the outer module.
We need `module_depth + 1` dots before the specifier, so nested modules can still access Pluto.
"""
function explore_module_definition!(ex::Expr, scopestate; module_depth::Number = 0)
    if ex.head == :using || ex.head == :import
        # We don't care about anything after the `:` here
        import_names = if ex.args[1].head == :(:)
            [ex.args[1].args[1]]
        else
            ex.args
        end


        symstate = SymbolsState()
        for import_name_expr in import_names
            if (
                Meta.isexpr(import_name_expr, :., module_depth + 2) &&
                all(x -> x == :., import_name_expr.args[begin:end-1]) &&
                import_name_expr.args[end] isa Symbol
            )
                # Theoretically it could still use an assigment from the same cell, if it weren't
                # for the fact that modules need to be top level, and we don't support multiple (toplevel) expressions in a cell yet :D
                push!(symstate.references, import_name_expr.args[end])
            end

        end

        return symstate
    elseif ex.head == :module
        # Explorer the block inside with one more depth added
        return explore_module_definition!(ex.args[3], scopestate, module_depth = module_depth + 1)
    elseif ex.head == :quote
        # TODO? Explore interpolations, modules can't be in interpolations, but `import`'s can >_>
        return SymbolsState()
    else
        # Go deeper
        return mapfoldl(a -> explore_module_definition!(a, scopestate, module_depth = module_depth), union!, ex.args, init = SymbolsState())
    end
end
explore_module_definition!(expr, scopestate; module_depth::Number = 1) = SymbolsState()


"Go through a quoted expression and use explore! for :\$ expressions"
function explore_interpolations!(ex::Expr, scopestate)
    if ex.head == :$
        explore!(ex.args[1], scopestate)
    else
        # We are still in a quote, so we do go deeper, but we keep ignoring everything except :$'s
        return mapfoldl(a -> explore_interpolations!(a, scopestate), union!, ex.args, init = SymbolsState())
    end
end
explore_interpolations!(anything_else, scopestate) = SymbolsState()


"Return the function name and the SymbolsState from argument defaults. Add arguments as hidden globals to the `scopestate`.

Is also used for `struct` and `abstract`."
function explore_funcdef!(ex::Expr, scopestate::ScopeState)::Tuple{FunctionName,SymbolsState}
    if ex.head == :call
        params_to_explore = ex.args[2:end]
        # Using the keyword args syntax f(;y) the :parameters node is the first arg in the AST when it should
        # be explored last. We change from (parameters, ...) to (..., parameters)
        if length(params_to_explore) >= 2 && params_to_explore[1] isa Expr && params_to_explore[1].head == :parameters
            params_to_explore = [params_to_explore[2:end]..., params_to_explore[1]]
        end

        # Handle struct as callables, `(obj::MyType)(a, b) = ...`
        # or `function (obj::MyType)(a, b) ...; end` by rewriting it as:
        # function MyType(obj, a, b) ...; end
        funcroot = ex.args[1]
        if Meta.isexpr(funcroot, :(::))
            if last(funcroot.args) isa Symbol
                return explore_funcdef!(Expr(:call, reverse(funcroot.args)..., params_to_explore...), scopestate)
            else
                # Function call as type: (obj::typeof(myotherobject))()
                symstate = explore!(last(funcroot.args), scopestate)
                name, declaration_symstate = if length(funcroot.args) == 1
                    explore_funcdef!(Expr(:call, anonymous_name(), params_to_explore...), scopestate)
                else
                    explore_funcdef!(Expr(:call, anonymous_name(), first(funcroot.args), params_to_explore...), scopestate)
                end
                return name, union!(symstate, declaration_symstate)
            end
        end

        # get the function name
        name, symstate = explore_funcdef!(funcroot, scopestate)
        # and explore the function arguments
        return mapfoldl(a -> explore_funcdef!(a, scopestate), union!, params_to_explore, init = (name, symstate))
    elseif ex.head == :(::) || ex.head == :kw || ex.head == :(=)
        # account for unnamed params, like in f(::Example) = 1
        if ex.head == :(::) && length(ex.args) == 1
            symstate = explore!(ex.args[1], scopestate)

            return Symbol[], symstate
        end

        # For a() = ... in a struct definition
        if Meta.isexpr(ex, :(=), 2) && Meta.isexpr(ex.args[1], :call)
            name, symstate = explore_funcdef!(ex.args[1], scopestate)
            union!(symstate, explore!(ex.args[2], scopestate))
            return name, symstate
        end

        # recurse by starting by the right hand side because f(x=x) references the global variable x
        rhs_symstate = if length(ex.args) > 1
            # use `explore!` (not `explore_funcdef!`) to explore the argument's default value - these can contain arbitrary expressions
            explore!(ex.args[2], scopestate)
        else
            SymbolsState()
        end
        name, symstate = explore_funcdef!(ex.args[1], scopestate)
        union!(symstate, rhs_symstate)

        return name, symstate

    elseif ex.head == :where
        # function(...) where {T, S <: R, U <: A.B}
        # supertypes `R` and `A.B` are referenced
        supertypes_symstate = SymbolsState()
        for a in ex.args[2:end]
            name, inner_symstate = explore_funcdef!(a, scopestate)
            if length(name) == 1
                push!(scopestate.hiddenglobals, name[1])
            end
            union!(supertypes_symstate, inner_symstate)
        end
        # recurse
        name, symstate = explore_funcdef!(ex.args[1], scopestate)
        union!(symstate, supertypes_symstate)
        return name, symstate

    elseif ex.head == :(<:)
        # for use in `struct` and `abstract`
        name, symstate = uncurly!(ex.args[1], scopestate)
        if length(ex.args) != 1
            union!(symstate, explore!(ex.args[2], scopestate))
        end
        return Symbol[name], symstate

    elseif ex.head == :curly
        name, symstate = uncurly!(ex, scopestate)
        return Symbol[name], symstate

    elseif ex.head == :parameters || ex.head == :tuple
        return mapfoldl(a -> explore_funcdef!(a, scopestate), union!, ex.args, init = (Symbol[], SymbolsState()))

    elseif ex.head == :(.)
        return split_funcname(ex), SymbolsState()

    elseif ex.head == :(...)
        return explore_funcdef!(ex.args[1], scopestate)
    else
        return Symbol[], explore!(ex, scopestate)
    end
end

function explore_funcdef!(ex::QuoteNode, scopestate::ScopeState)::Tuple{FunctionName,SymbolsState}
    explore_funcdef!(ex.value, scopestate)
end

function explore_funcdef!(ex::Symbol, scopestate::ScopeState)::Tuple{FunctionName,SymbolsState}
    push!(scopestate.hiddenglobals, ex)
    Symbol[ex|>without_dotprefix|>without_dotsuffix], SymbolsState()
end

function explore_funcdef!(::Any, ::ScopeState)::Tuple{FunctionName,SymbolsState}
    Symbol[], SymbolsState()
end



const can_macroexpand_no_bind = Set(Symbol.(["@md_str", "Markdown.@md_str", "@gensym", "Base.@gensym", "@enum", "Base.@enum", "@assert", "Base.@assert", "@cmd"]))
const can_macroexpand = can_macroexpand_no_bind ∪ Set(Symbol.(["@bind", "PlutoRunner.@bind"]))

"""
If the macro is **known to Pluto**, expand or 'mock expand' it, if not, return the expression. Macros from external packages are not expanded, this is done later in the pipeline. See https://github.com/fonsp/Pluto.jl/pull/1032
"""
function maybe_macroexpand(ex::Expr; recursive::Bool=false, expand_bind::Bool=true)
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
            ex = maybe_macroexpand(arg; recursive, expand_bind)
            push!(expanded, ex)
        end
        return Expr(result.head, expanded...)
    else
        return result
    end
end

maybe_macroexpand(ex::Any; kwargs...) = ex


###
# CANONICALIZE FUNCTION DEFINITIONS
###

"""
Turn a function definition expression (`Expr`) into a "canonical" form, in the sense that two methods that would evaluate to the same method signature have the same canonical form. Part of a solution to https://github.com/fonsp/Pluto.jl/issues/177. Such a canonical form cannot be achieved statically with 100% correctness (impossible), but we can make it good enough to be practical.


# Wait, "evaluate to the same method signature"?

In Pluto, you cannot do definitions of **the same global variable** in different cells. This is needed for reactivity to work, and it avoid ambiguous notebooks and stateful stuff. This rule used to also apply to functions: you had to place all methods of a function in one cell. (Go and read more about methods in Julia if you haven't already.) But this is quite annoying, especially because multiple dispatch is so important in Julia code. So we allow methods of the same function to be defined across multiple cells, but we still want to throw errors when you define **multiple methods with the same signature**, because one overrides the other. For example:
```julia
julia> f(x) = 1
f (generic function with 1 method)

julia> f(x) = 2
f (generic function with 1 method)
``

After adding the second method, the function still has only 1 method. This is because the second definition overrides the first one, instead of being added to the method table. This example should be illegal in Julia, for the same reason that `f = 1` and `f = 2` is illegal. So our problem is: how do we know that two cells will define overlapping methods? 

Ideally, we would just evaluate the user's code and **count methods** afterwards, letting Julia do the work. Unfortunately, we need to know this info _before_ we run cells, otherwise we don't know in which order to run a notebook! There are ways to break this circle, but it would complicate our process quite a bit.

Instead, we will do _static analysis_ on the function definition expressions to determine whether they overlap. This is non-trivial. For example, `f(x)` and `f(y::Any)` define the same method. Trickier examples are here: https://github.com/fonsp/Pluto.jl/issues/177#issuecomment-645039993

# Wait, "function definition expressions"?
For example:

```julia
e = :(function f(x::Int, y::String)
        x + y
    end)

dump(e, maxdepth=2)

#=
gives:

Expr
  head: Symbol function
  args: Array{Any}((2,))
    1: Expr
    2: Expr
=#
```

This first arg is the function head:

```julia
e.args[1] == :(f(x::Int, y::String))
```

# Mathematics
Our problem is to find a way to compute the equivalence relation ~ on `H × H`, with `H` the set of function head expressions, defined as:

`a ~ b` iff evaluating both expressions results in a function with exactly one method.

_(More precisely, evaluating `Expr(:function, x, Expr(:block))` with `x ∈ {a, b}`.)_

The equivalence sets are isomorphic to the set of possible Julia methods.

Instead of finding a closed form algorithm for `~`, we search for a _canonical form_: a function `canonical: H -> H` that chooses one canonical expression per equivalence class. It has the property 
    
`canonical(a) = canonical(b)` implies `a ~ b`.

We use this **canonical form** of the function's definition expression as its "signature". We compare these canonical forms when determining whether two function expressions will result in overlapping methods.

# Example
```julia
e1 = :(f(x, z::Any))
e2 = :(g(x, y))

canonalize(e1) == canonalize(e2)
```

```julia
e1 = :(f(x))
e2 = :(g(x, y))

canonalize(e1) != canonalize(e2)
```

```julia
e1 = :(f(a::X, b::wow(ie), c,      d...; e=f) where T)
e2 = :(g(z::X, z::wow(ie), z::Any, z...     ) where T)

canonalize(e1) == canonalize(e2)
```
"""
function canonalize(ex::Expr)
    if ex.head == :where
        Expr(:where, canonalize(ex.args[1]), ex.args[2:end]...)
    elseif ex.head == :call || ex.head == :tuple
        skip_index = ex.head == :call ? 2 : 1
        # ex.args[1], if ex.head == :call this is the function name, we dont want it

        interesting = filter(ex.args[skip_index:end]) do arg
            !(arg isa Expr && arg.head == :parameters)
        end

        hide_argument_name.(interesting)
    elseif ex.head == :(::)
        canonalize(ex.args[1])
    elseif ex.head == :curly || ex.head == :(<:)
        # for struct definitions, which we hackily treat as functions
        nothing
    else
        @error "Failed to canonalize this strange looking function" ex
        nothing
    end
end

# for `function g end`
canonalize(::Symbol) = nothing

function hide_argument_name(ex::Expr)
    if ex.head == :(::) && length(ex.args) > 1
        Expr(:(::), nothing, ex.args[2:end]...)
    elseif ex.head == :(...)
        Expr(:(...), hide_argument_name(ex.args[1]))
    elseif ex.head == :kw
        Expr(:kw, hide_argument_name(ex.args[1]), nothing)
    else
        ex
    end
end
hide_argument_name(::Symbol) = Expr(:(::), nothing, :Any)
hide_argument_name(x::Any) = x

###
# UTILITY FUNCTIONS
###

"Get the global references, assignment, function calls and function defintions inside an arbitrary expression."
function compute_symbolreferences(ex::Any)::SymbolsState
    symstate = explore!(ex, ScopeState())

    # We do something special to account for recursive functions:
    # If a function `f` calls a function `g`, and both are defined inside this cell, the reference to `g` inside the symstate of `f` will be deleted.
    # The motivitation is that normally, an assignment (or function definition) will add that symbol to a list of 'hidden globals' - any future references to that symbol will be ignored. i.e. the _local definition hides a global_.
    # In the case of functions, you can reference functions and variables that do not yet exist, and so they won't be in the list of hidden symbols when the function definition is analysed. 
    # Of course, our method will fail if a referenced function is defined both inside the cell **and** in another cell. However, this will lead to a MultipleDefinitionError before anything bad happens.
    for (func, inner_symstate) in symstate.funcdefs
        inner_symstate.references = setdiff(inner_symstate.references, keys(symstate.funcdefs))
        inner_symstate.funccalls = setdiff(inner_symstate.funccalls, keys(symstate.funcdefs))
    end
    symstate
end

function try_compute_symbolreferences(ex::Any)::SymbolsState
    try
        compute_symbolreferences(ex)
    catch e
        if e isa InterruptException
            rethrow(e)
        end
        @error "Expression explorer failed on: " ex
        showerror(stderr, e, stacktrace(catch_backtrace()))
        SymbolsState(references = Set{Symbol}([:fake_reference_to_prevent_it_from_looking_like_a_text_only_cell]))
    end
end

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
        Set{Expr}(transform_dot_notation.(ex.args))
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
    union!(Set{Symbol}(), external_package_names.(x.usings)..., external_package_names.(x.imports)...)
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
