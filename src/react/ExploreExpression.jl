module ExploreExpression
export compute_symbolreferences, compute_usings, SymbolsState, join_funcname_parts

import Base: union, union!, ==, push!

###
# TWO STATE OBJECTS
###

"SymbolsState trickles _down_ the ASTree: it carries referenced and defined variables from endpoints down to the root."
mutable struct SymbolsState
    references::Set{Symbol}
    assignments::Set{Symbol}
    funccalls::Set{Vector{Symbol}}
    funcdefs::Dict{Vector{Symbol},SymbolsState}
end

SymbolsState(references, assignments, funccalls) = SymbolsState(references, assignments, funccalls, Dict{Vector{Symbol},SymbolsState}())
SymbolsState(references, assignments) = SymbolsState(references, assignments, Set{Symbol}())
SymbolsState() = SymbolsState(Set{Symbol}(), Set{Symbol}())

"ScopeState moves _up_ the ASTree: it carries scope information up towards the endpoints."
mutable struct ScopeState
    inglobalscope::Bool
    exposedglobals::Set{Symbol}
    hiddenglobals::Set{Symbol}
    definedfuncs::Set{Symbol}
end

# The `union` and `union!` overloads define how two `SymbolsState`s or two `ScopeState`s are combined.

function union(a::Dict{Vector{Symbol},SymbolsState}, bs::Dict{Vector{Symbol},SymbolsState}...)
    union!(Dict{Vector{Symbol},SymbolsState}(), a, bs...)
end

function union!(a::Dict{Vector{Symbol},SymbolsState}, bs::Dict{Vector{Symbol},SymbolsState}...)
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
    SymbolsState(a.references ∪ b.references, a.assignments ∪ b.assignments, a.funccalls ∪ b.funccalls, a.funcdefs ∪ b.funcdefs)
end

function union!(a::SymbolsState, bs::SymbolsState...)
    union!(a.references, (b.references for b in bs)...)
    union!(a.assignments, (b.assignments for b in bs)...)
    union!(a.funccalls, (b.funccalls for b in bs)...)
    union!(a.funcdefs, (b.funcdefs for b in bs)...)
    return a
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
    a.references == b.references && a.assignments == b.assignments&& a.funccalls == b.funccalls && a.funcdefs == b.funcdefs 
end

Base.push!(x::Set) = x

###
# HELPER FUNCTIONS
###

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

# We handle a list of function arguments separately.
function get_functionarguments(funcdef::Expr)::Set{Symbol}
    argnames = Set{Symbol}()

    funcdefargs = if funcdef.head == :call
        funcdef.args[2:end]
    else
        funcdef.args
    end

    for a in funcdefargs
        if isa(a, Symbol)
            push!(argnames, a)
        elseif isa(a, Expr)
            if a.head == :(::)
                if length(a.args) == 2
                    push!(argnames, a.args[1])
                else
                    # f(..., ::JustAType, ...)
                end
            elseif a.head == :parameters || a.head == :tuple  # second is for ((a,b),(c,d)) -> a*b*c*d stuff
                push!(argnames, get_functionarguments(a)...)
            elseif a.head == :kw || a.head == :(=) # first is for unnamed function arguments, second is for lambdas
                push!(argnames, get_functionarguments(a.args[1])...)
            end
        end
    end

    return argnames
end

function get_functionarguments(funcdef::Symbol)::Set{Symbol}
    Set([funcdef])
end

function get_assignees(expr::Expr)::Vector{Symbol}
    if expr.head == :tuple
        # e.g. (x, y) in the expr (x, y) = (1, 23)
        union!(Symbol[], get_assignees.(expr.args)...)
        # filter(s->s isa Symbol, expr.args)
    elseif expr.head == :(::)
        # TODO: type is referenced
        Symbol[expr.args[1]]
    elseif expr.head == :ref || expr.head == :(.)
        Symbol[]
    else
        @warn "unknow use of `=`. Assignee is unrecognised." expr
        Symbol[]
    end
end

# e.g. x = 123
get_assignees(expr::Symbol) = Symbol[expr]

# When you assign to a datatype like Int, String, or anything bad like that
# e.g. 1 = 2
# This is parsable code, so we have to treat it
get_assignees(expr::Any) = Symbol[]

"Turn `:(Base.Submodule.f)` into `[:Base, :Submodule, :f]` and `:f` into `[:f]`."
function split_funcname(funcname_ex::Expr)::Vector{Symbol}
    if funcname_ex.head == :(.)
        vcat(split_funcname.(funcname_ex.args)...)
    else
        # a call to a function that's not a global, like calling an array element: `funcs[12]()`
        # TODO: explore symstate!
        Symbol[]
    end
end

function split_funcname(funcname_ex::QuoteNode)::Vector{Symbol}
    split_funcname(funcname_ex.value)
end

function split_funcname(funcname_ex::Symbol)::Vector{Symbol}
    [funcname_ex |> without_dotprefix |> without_dotsuffix]
end

"Turn :(.+) into :(+)"
function without_dotprefix(funcname::Symbol)::Symbol
    fn_str = String(funcname)
    if length(fn_str) > 0 && fn_str[1] == '.'
        Symbol(fn_str[2:end])
    else
        funcname
    end
end

"Turn :(sqrt.) into :(sqrt)"
function without_dotsuffix(funcname::Symbol)::Symbol
    fn_str = String(funcname)
    if length(fn_str) > 0 && fn_str[end] == '.'
        Symbol(fn_str[1:end-1])
    else
        funcname
    end
end

"""Turn `Symbol[:Module, :func]` into Symbol("Module.func").

This is **not** the same as the expression `:(Module.func)`, but is used to identify the function name using a single `Symbol` (like normal variables).
This means that it is only the inverse of `ExploreExpression.split_funcname` iff `length(parts) ≤ 1`."""
function join_funcname_parts(parts::Vector{Symbol})::Symbol
	join(parts .|> String, ".") |> Symbol
end


###
# MAIN RECURSIVE FUNCTION
###

# Possible leaf: value
# Like: a = 1
# 1 is a value (Int64)
function explore!(value, scopestate::ScopeState)::SymbolsState
    # includes: LineNumberNode, Int64, String, 
    return SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Symbol}(), Dict{Vector{Symbol},SymbolsState}())
end

# Possible leaf: symbol
# Like a = x
# x is a symbol
# We handle the assignment separately, and explore!(:a, ...) will not be called.
# Therefore, this method only handles _references_, which are added to the symbolstate, depending on the scopestate.
function explore!(sym::Symbol, scopestate::ScopeState)::SymbolsState
    if sym ∈ scopestate.hiddenglobals
        SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Symbol}(), Dict{Vector{Symbol},SymbolsState}())
    else
        SymbolsState(Set([sym]), Set{Symbol}(), Set{Symbol}(), Dict{Vector{Symbol},SymbolsState}())
    end
end

# General recursive method. Is never a leaf.
# Modifies the `scopestate`.
function explore!(ex::Expr, scopestate::ScopeState)::SymbolsState
    if ex.head == :(=)
        # Does not create scope

        
        if ex.args[1] isa Expr && ex.args[1].head == :call
            # f(x, y) = x + y
            # Rewrite to:
            # function f(x, y) x + y end
            return explore!(Expr(:function, ex.args...), scopestate)
        end
        assignees = get_assignees(ex.args[1])
        val = ex.args[2]

        global_assignees = get_global_assignees(assignees, scopestate)
        
        # If we are _not_ assigning a global variable, then this symbol hides any global definition with that name
        push!(scopestate.hiddenglobals, setdiff(assignees, global_assignees)...)

        assigneesymstate = explore!(ex.args[1], scopestate)
        symstate = innersymstate = explore!(val, scopestate)
        
        push!(scopestate.hiddenglobals, global_assignees...)
        push!(symstate.assignments, global_assignees...)
        push!(symstate.references, setdiff(assigneesymstate.references, global_assignees)...)

        return symstate
    elseif ex.head in modifiers
        # We change: a[1] += 123
        # to:        a[1] = a[1] + 123
        # We transform the modifier back to its operator
        # for when users redefine the + function

        operator = Symbol(string(ex.head)[1:end - 1])
        expanded_expr = Expr(:(=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore!(expanded_expr, scopestate)
    elseif ex.head in modifiers_dotprefixed
        # We change: a[1] .+= 123
        # to:        a[1] .= a[1] + 123

        operator = Symbol(string(ex.head)[2:end - 1])
        expanded_expr = Expr(:(.=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore!(expanded_expr, scopestate)
    elseif ex.head == :let || ex.head == :for || ex.head == :while
        # Creates local scope

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scopestate)
        innerscopestate.inglobalscope = false

        return mapfoldl(a -> explore!(a, innerscopestate), union!, ex.args, init=SymbolsState())
    elseif ex.head == :call
        # Does not create scope

        funcname = ex.args[1] |> split_funcname
        symstate = if length(funcname) == 0
            explore!(ex.args[1], scopestate)
        elseif length(funcname) == 1
            SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Vector{Symbol}}([funcname]))
        else
            SymbolsState(Set{Symbol}([funcname[end-1]]), Set{Symbol}(), Set{Vector{Symbol}}([funcname]))
        end
        # Explore code inside function arguments:
        union!(symstate, explore!(Expr(:block, ex.args[2:end]...), scopestate))
        return symstate
    elseif ex.head == :kw
        return explore!(ex.args[2], scopestate)
    elseif ex.head == :struct
        # Creates local scope

        structname = assignee = if isa(ex.args[2], Symbol)
            ex.args[2]
        else
            # We have:   struct a <: b
            ex.args[2].args[1]
            # TODO: record reactive reference to type
        end
        structfields = ex.args[3].args

        equiv_func = Expr(:function, Expr(:call, structname, structfields...), Expr(:block, nothing))

        return explore!(equiv_func, scopestate)
    elseif ex.head == :generator
        # Creates local scope

        # In a `generator`, a single expression is followed by the iterator assignments.
        # In a `for`, this expression comes at the end.

        # TODO: this is not the normal form of a `for`.
        return explore!(Expr(:for, ex.args[2:end]..., ex.args[1]), scopestate)
    elseif ex.head == :function
        symstate = SymbolsState()
        # Creates local scope

        funcroot = if ex.args[1].head == :(::)
            # TODO: record reactive reference to type
            ex.args[1].args[1]
        else
            ex.args[1]
        end

        # is either `f` (Symbol) or `f::String` (Expression)
        funcname_expr = assignee = funcroot.args[1]

        # is either [:Base, :] or []
        funcname = let
            funcname_parts = split_funcname(funcname_expr)
            will_assign_global(funcname_parts, scopestate) ? funcname_parts : Symbol[]
        end::Vector{Symbol}

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scopestate)
        push!(innerscopestate.hiddenglobals, get_functionarguments(funcroot)...)
        innerscopestate.inglobalscope = false
        
        innersymstate = explore!(Expr(:block, ex.args[2:end]...), innerscopestate)
        
        if !isempty(funcname)
            symstate.funcdefs[funcname] = innersymstate
            if length(funcname) == 1
                push!(scopestate.definedfuncs, funcname[end])
                push!(scopestate.hiddenglobals, funcname[end])
            elseif length(funcname) > 1
                push!(symstate.references, funcname[end-1]) # reference the module of the extended function
            end
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
    elseif ex.head == :(->)
        # Creates local scope

        tempname = Symbol("anon",rand(UInt64))

        # We will rewrite this to a normal function definition, with a temporary name
        funcroot = ex.args[1]
        args_ex = if funcroot isa Symbol || (funcroot isa Expr && funcroot.head == :(::))
            [funcroot]
        elseif funcroot.head == :tuple
            funcroot.args
        else
            @error "Unknown lambda type"
        end

        equiv_func = Expr(:function, Expr(:call, tempname, args_ex...), ex.args[2])

        return explore!(equiv_func, scopestate)
    elseif ex.head == :global
        symstate = SymbolsState()
        # Does not create scope

        # We have one of:
        # global x;
        # global x = 1;
        # global x += 1;

        # where x can also be a tuple:
        # global a,b = 1,2

        globalisee = ex.args[1]

        if isa(globalisee, Symbol)
            push!(scopestate.exposedglobals, globalisee)
        elseif isa(globalisee, Expr)
            innerscopestate = deepcopy(scopestate)
            innerscopestate.inglobalscope = true
            innersymstate = explore!(globalisee, innerscopestate)
            symstate = innersymstate
        else
            @error "unknow global use"
        end
        
        return symstate
    elseif ex.head == :local
        symstate = SymbolsState()
        # Does not create scope

        # Logic similar to :global
        localisee = ex.args[1]

        if isa(localisee, Symbol)
            push!(scopestate.hiddenglobals, localisee)
        elseif isa(localisee, Expr)
            innerscopestate = deepcopy(scopestate)
            innerscopestate.inglobalscope = false
            innersymstate = explore!(localisee, innerscopestate)
            symstate = innersymstate
        else
            @error "unknow local use"
        end

        return symstate
    elseif ex.head == :tuple
        # Does not create scope
        symstate = SymbolsState()
        
        # Is something like:
        # a,b,c = 1,2,3
        
        # This parses to:
        # head = :tuple
        # args = [:a, :b, :(c=1), :2, :3]
        
        # 🤔
        # we turn it into two expressions:

        # (a, b) = (2, 3)
        # (c = 1)

        # and explore those :)

        indexoffirstassignment = findfirst(a->isa(a, Expr) && a.head == :(=), ex.args)
        if indexoffirstassignment !== nothing
            # we have one of two cases, see next `if`
            indexofsecondassignment = findnext(a->isa(a, Expr) && a.head == :(=), ex.args, indexoffirstassignment+1)

            if indexofsecondassignment !== nothing
                # we have a named tuple, e.g. (a=1, b=2)
                new_args = map(ex.args) do a
                    (a isa Expr && a.head == :(=)) ? a.args[2] : a
                end
                return explore!(Expr(:block, new_args...), scopestate)
            else
                # we have a tuple assignment, e.g. `a, (b, c) = [1, [2, 3]]`
                before = ex.args[1:indexoffirstassignment - 1]
                after = ex.args[indexoffirstassignment + 1:end]

                symstate_middle = explore!(ex.args[indexoffirstassignment], scopestate)
                symstate_outer = explore!(Expr(:(=), Expr(:tuple, before...), Expr(:block, after...)), scopestate)

                return union!(symstate_middle, symstate_outer)
            end
        else
            return explore!(Expr(:block, ex.args...), scopestate)
        end
    elseif ex.head == :(.) && ex.args[2] isa Expr && ex.args[2].head == :tuple
        # pointwise function call, e.g. sqrt.(nums)
        # we rewrite to a regular call

        return explore!(Expr(:call, ex.args[1], ex.args[2].args...), scopestate)
    elseif ex.head == :using || ex.head == :import
        if scopestate.inglobalscope
            imports = if ex.args[1].head == :(:)
                ex.args[1].args[2:end]
            else
                ex.args
            end

            packagenames = map(e->e.args[end], imports)

            return SymbolsState(Set{Symbol}(), Set{Symbol}(packagenames))
        else
            return SymbolsState(Set{Symbol}(), Set{Symbol}())
        end
    elseif ex.head == :macrocall && ex.args[1] isa Symbol && ex.args[1] == Symbol("@md_str")
        # Does not create scope
        # The Markdown macro treats things differently, so we must too

        parsed_markdown_str = Meta.parse("\"\"\"$(ex.args[3])\"\"\"", raise = false)
        innersymstate = explore!(parsed_markdown_str, scopestate)
        push!(innersymstate.references, Symbol("@md_str"))
        symstate = innersymstate
        return symstate
    elseif (ex.head == :macrocall && ex.args[1] isa Symbol && ex.args[1] == Symbol("@bind")
        && length(ex.args) == 4 && ex.args[3] isa Symbol)
        
        innersymstate = explore!(ex.args[4], scopestate)
        push!(innersymstate.assignments, ex.args[3])
        
        return innersymstate
    elseif ex.head == :module
        # We completely ignore the contents

        return SymbolsState(Set{Symbol}(), Set{Symbol}([ex.args[2]]))
    else
        # fallback, includes:
        # begin, block, do, call, 
        # (and hopefully much more!)
        
        # Does not create scope (probably)

        return mapfoldl(a -> explore!(a, scopestate), union!, ex.args, init=SymbolsState())
    end
end

###
# UTILITY FUNCTIONS
###

"Get the global references, assignment, function calls and function defintions inside an arbitrary expression."
function compute_symbolreferences(ex::Any)::SymbolsState
    symstate = explore!(ex, ScopeState(true, Set{Symbol}(), Set{Symbol}(), Set{Symbol}()))

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

# TODO: this can be done during the `explore` recursion
"Get the set of `using Module` expressions that are contained in this expression."
function compute_usings(ex::Any)::Set{Expr}
    if isa(ex, Expr)
        if ex.head == :using
            Set{Expr}([ex])
        else
            union!(Set{Expr}(), compute_usings.(ex.args)...)
        end
    else
        Set{Expr}()
    end
end

function get_rootassignee(ex::Expr)::Union{Symbol, Nothing}
    if ex.head == :(=) && ex.args[1] isa Symbol
        ex.args[1]
    else
        nothing
    end
end

get_rootassignee(ex::Any)::Union{Symbol, Nothing} = nothing

end