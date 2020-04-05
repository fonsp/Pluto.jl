module ExploreExpression
export compute_symbolreferences, compute_usings, SymbolsState

import Base: union, ==

# from the source code: https://github.com/JuliaLang/julia/blob/master/src/julia-parser.scm#L9
const modifiers = [:(+=), :(-=), :(*=), :(/=), :(//=), :(^=), :(÷=), :(%=), :(<<=), :(>>=), :(>>>=), :(&=), :(⊻=), :(≔), :(⩴), :(≕)]


"SymbolsState trickles _down_ the ASTree: it carries referenced and defined variables from endpoints down to the root"
mutable struct SymbolsState
    references::Set{Symbol}
    assignments::Set{Symbol}
    funccalls::Set{Symbol}
    funcdefs::Dict{Symbol, SymbolsState}
end

SymbolsState(references, assignments, funccalls) = SymbolsState(references, assignments, funccalls, Dict{Symbol,SymbolsState}())
SymbolsState(references, assignments) = SymbolsState(references, assignments, Set{Symbol}())
SymbolsState() = SymbolsState(Set{Symbol}(), Set{Symbol}())

"ScopeState moves _up_ the ASTree: it carries scope information up towards the endpoints"
mutable struct ScopeState
    inglobalscope::Bool
    exposedglobals::Set{Symbol}
    hiddenglobals::Set{Symbol}
    definedfuncs::Set{Symbol}
end

function union(a::Dict{Symbol,SymbolsState}, b::Dict{Symbol,SymbolsState})
    # TODO: optimise: reuse `a` as `c`
    c = Dict{Symbol,SymbolsState}()
    for (k, v) in a
        c[k] = v
    end
    for (k, v) in b
        if haskey(c, k)
            c[k] = c[k] ∪ v
        else
            c[k] = v
        end
    end
    c
end

function union(a::SymbolsState, b::SymbolsState)
    SymbolsState(a.references ∪ b.references, a.assignments ∪ b.assignments, a.funccalls ∪ b.funccalls, a.funcdefs ∪ b.funcdefs)
end

function union(a::ScopeState, b::ScopeState)
    SymbolsState(a.inglobalscope && b.inglobalscope, a.exposedglobals ∪ b.exposedglobals, a.hiddenglobals ∪ b.hiddenglobals)
end

function ==(a::SymbolsState, b::SymbolsState)
    a.references == b.references && a.assignments == b.assignments&& a.funccalls == b.funccalls && a.funcdefs == b.funcdefs 
end

function will_assign_global(assignee::Symbol, scopestate::ScopeState)::Bool
    (scopestate.inglobalscope || assignee ∈ scopestate.exposedglobals) && (assignee ∉ scopestate.hiddenglobals || assignee ∈ scopestate.definedfuncs)
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
    global_assignees
end

# We handle a list of function arguments separately.
function extractfunctionarguments(funcdef::Expr)::Set{Symbol}
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
                push!(argnames, extractfunctionarguments(a)...)
            elseif a.head == :kw || a.head == :(=) # first is for unnamed function arguments, second is for lambdas
                push!(argnames, extractfunctionarguments(a.args[1])...)
            end
        end
    end

    return argnames
end

function extractfunctionarguments(funcdef::Symbol)::Set{Symbol}
    Set([funcdef])
end

# Possible leaf: value
# Like: a = 1
# 1 is a value (Int64)
function explore!(value, scopestate::ScopeState)::SymbolsState
    # includes: LineNumberNode, Int64, String, 
    return SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Symbol}(), Dict{Symbol,SymbolsState}())
end

# Possible leaf: symbol
# Like a = x
# x is a symbol
# We handle the assignment separately, and explore!(:a, ...) will not be called.
# Therefore, this method only handles _references_, which are added to the symbolstate, depending on the scopestate.
function explore!(sym::Symbol, scopestate::ScopeState)::SymbolsState
    return if !(sym in scopestate.hiddenglobals)
        SymbolsState(Set([sym]), Set{Symbol}(), Set{Symbol}(), Dict{Symbol,SymbolsState}())
    else
        SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Symbol}(), Dict{Symbol,SymbolsState}())
    end
end

# General recursive method. Is never a leaf.
# Modifies the `scopestate`.
function explore!(ex::Expr, scopestate::ScopeState)::SymbolsState
    symstate = SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Symbol}(), Dict{Symbol,SymbolsState}())
    if ex.head == :(=)
        # Does not create scope

        assignees = if isa(ex.args[1], Symbol)
            # x = 123
            [ex.args[1]]
        elseif isa(ex.args[1], Expr)
            if ex.args[1].head == :tuple
                # (x, y) = (1, 23)
                filter(s->s isa Symbol, ex.args[1].args)
            elseif ex.args[1].head == :(::)
                # TODO: type is referenced
                [ex.args[1].args[1]]
            elseif ex.args[1].head == :ref
                # TODO: what is the desired behaviour here?
                # right now, it registers no reference, and no assignment
                []
            elseif ex.args[1].head == :(.)
                # TODO: what is the desired behaviour here?
                []
            elseif ex.args[1].head == :call
                # f(x, y) = x + y
                # Rewrite to:
                # function f(x, y) x + y end
                return explore!(Expr(:function, ex.args...), scopestate)
            else
                @warn "unknow use of =. Assignee is unrecognised." ex.args[1]
                []
            end
        else
            # When you assign to a datatype like Int, String, or anything bad like that
            # e.g. 1 = 2
            # This is parsable code, so we have to treat it
            []
        end
        val = ex.args[2]

        global_assignees = get_global_assignees(assignees, scopestate)
        
        # If we are _not_ assigning a global variable
        for assignee in setdiff(assignees, global_assignees)
            # Then this symbol hides any global definition with that name
            scopestate.hiddenglobals = union(scopestate.hiddenglobals, [assignee])
        end

        innersymstate = explore!(val, scopestate)

        symstate = symstate ∪ innersymstate

        for assignee in global_assignees
            scopestate.hiddenglobals = union(scopestate.hiddenglobals, [assignee])
            symstate.assignments = union(symstate.assignments, [assignee])
        end

        return symstate
    elseif ex.head in modifiers
        # We change: a[1] += 123
        # to:        a[1] = a[1] + 123
        # We transform the modifier back to its operator
        # for when users redefine the + function

        operator = Symbol(string(ex.head)[1:end - 1])
        expanded_expr = Expr(:(=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore!(expanded_expr, scopestate)
    elseif ex.head == :let || ex.head == :for || ex.head == :while
        # Creates local scope

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scopestate)
        innerscopestate.inglobalscope = false

        return mapfoldl(a -> explore!(a, innerscopestate), ∪, ex.args, init=symstate)
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
        # Creates local scope

        funcroot = if ex.args[1].head == :(::)
            # TODO: record reactive reference to type
            ex.args[1].args[1]
        else
            ex.args[1]
        end

        # is either `f` (Symbol) or `f::String` (Expression)
        funcname_expr = assignee = funcroot.args[1]

        # is either [funcname] or []
        global_assignees = get_global_assignees([funcname_expr], scopestate)

        
        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        
        innerscopestate = deepcopy(scopestate)
        innerscopestate.hiddenglobals = union(innerscopestate.hiddenglobals, extractfunctionarguments(funcroot))
        innerscopestate.inglobalscope = false
        
        innersymstate = explore!(Expr(:block, ex.args[2:end]...), innerscopestate)
        
        if !isempty(global_assignees)
            funcname = first(global_assignees)

            symstate.funcdefs[funcname] = innersymstate
            push!(scopestate.hiddenglobals, funcname)
            push!(scopestate.definedfuncs, funcname)
            push!(symstate.assignments, funcname)
        else
            # The function is not defined globally. However, the function can still modify the global scope or reference globals, e.g.
            
            # let
            #     function f(x)
            #         global z = x + a
            #     end
            #     f(2)
            # end

            # so we insert the function's inner symbol state here, as if it was a `let` block.
            symstate = symstate ∪ innersymstate
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
        # Does not create scope

        # We have one of:
        # global x;
        # global x = 1;
        # global x += 1;

        # where x can also be a tuple:
        # global a,b = 1,2

        globalisee = ex.args[1]

        if isa(globalisee, Symbol)
            scopestate.exposedglobals = union(scopestate.exposedglobals, [globalisee])
        elseif isa(globalisee, Expr)
            innerscopestate = deepcopy(scopestate)
            innerscopestate.inglobalscope = true
            innersymstate = explore!(globalisee, innerscopestate)
            symstate = symstate ∪ innersymstate
        else
            @error "unknow global use"
        end
        
        return symstate
    elseif ex.head == :local
        # Does not create scope

        # Logic similar to :global
        localisee = ex.args[1]

        if isa(localisee, Symbol)
            scopestate.hiddenglobals = union(scopestate.hiddenglobals, [localisee])
        elseif isa(localisee, Expr)
            innerscopestate = deepcopy(scopestate)
            innerscopestate.inglobalscope = false
            innersymstate = explore!(localisee, innerscopestate)
            symstate = symstate ∪ innersymstate
        else
            @error "unknow local use"
        end

        return symstate
    elseif ex.head == :tuple
        # Does not create scope
        
        # Is something like:
        # a,b,c = 1,2,3
        
        # This parses to:
        # head: Symbol tuple
        # args: a, b, :(c=1), 2, 3
        
        # 🤔
        # This one is very messy...
        
        recursers = ex.args

        # We have a tuple assignment if one of the tuple elements is an assignment expression:
        indexoffirstassignment = findfirst(a->isa(a, Expr) && a.head == :(=), ex.args)
        if indexoffirstassignment !== nothing
            recursers = ex.args[indexoffirstassignment:end]

            exposed = get_global_assignees(ex.args[1:indexoffirstassignment - 1], scopestate)

            scopestate.exposedglobals = union(scopestate.exposedglobals, exposed)
            symstate.assignments = union(symstate.assignments, exposed)
        end

        return mapfoldl(a -> explore!(a, scopestate), ∪, recursers, init=symstate)
    elseif ex.head == :using || ex.head == :import
        if scopestate.inglobalscope
            imports = if ex.args[1].head == :(:)
                ex.args[1].args[2:end]
            else
                ex.args
            end

            packagenames = map(e->e.args[1], imports)

            return SymbolsState(Set{Symbol}(), Set{Symbol}(packagenames))
        else
            return SymbolsState(Set{Symbol}(), Set{Symbol}())
        end
    elseif ex.head == :macrocall && isa(ex.args[1], Symbol) && ex.args[1] == Symbol("@md_str")
        # Does not create scope
        # The Markdown macro treats things differently, so we must too

        parsed_markdown_str = Meta.parse("\"\"\"$(ex.args[3])\"\"\"", raise = false)
        innersymstate = explore!(parsed_markdown_str, scopestate)

        symstate = innersymstate ∪ SymbolsState(Set{Symbol}([Symbol("@md_str")]), Set{Symbol}())
        

        return symstate
    elseif ex.head == :call && ex.args[1] isa Symbol
        # Does not create scope

        # We change the `call` to a `block` and recurse again (hitting the fallback below).
        # In particular, this adds the called function as a reference, which is what we want.
        symstate = explore!(Expr(:block, ex.args...), scopestate)
        push!(symstate.funccalls, ex.args[1])
        return symstate
    else
        # fallback, includes:
        # begin, block, do, call, 
        # (and hopefully much more!)
        
        # Does not create scope (probably)

        return mapfoldl(a -> explore!(a, scopestate), ∪, ex.args, init=symstate)
    end
end


function compute_symbolreferences(ex)::SymbolsState
    symstate = explore!(ex, ScopeState(true, Set{Symbol}(), Set{Symbol}(), Set{Symbol}()))

    # We do something special to account for recursive functions:
    # If a function `f` calls a function `g`, and both are defined inside this cell, the reference to `g` inside the symstate of `f` will be deleted.
    # the motivitation is that normally, an assignment (or function definition) will add that symbol to a list of 'hidden globals' - any future references to that symbol will be ignored. i.e. the _local definition hides a global_.
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
function compute_usings(ex)::Set{Expr}
    if isa(ex, Expr)
        if ex.head == :using
            Set{Expr}([ex])
        else
            union(Set{Expr}(), compute_usings.(ex.args)...)
        end
    else
        Set{Expr}()
    end
end

function is_pure_html(ex)::Bool
    if !(isa(ex, Expr) && ex.head == :macrocall && (ex.args[1] == Symbol("@md_str") || ex.args[1] == Symbol("@html_str")) && isa(ex.args[3], String))
        return false
    end
    if ex.args[1] == Symbol("@md_str")
        parsed_markdown_str = Meta.parse("\"\"\"$(ex.args[3])\"\"\"", raise = false)
        isa(parsed_markdown_str, String)
    else
        true
    end
end

end