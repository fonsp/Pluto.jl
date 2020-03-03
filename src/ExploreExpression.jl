module ExploreExpression
export compute_symbolreferences, compute_usings, SymbolsState

import Base: union, ==

# from the source code: https://github.com/JuliaLang/julia/blob/master/src/julia-parser.scm#L9
const modifiers = [:(+=), :(-=), :(*=), :(/=), :(//=), :(^=), :(÷=), :(%=), :(<<=), :(>>=), :(>>>=), :(&=), :(⊻=), :(≔), :(⩴), :(≕)]


"SymbolsState trickels _down_ the ASTree: it carries referenced and defined variables from endpoints down to the root"
mutable struct SymbolsState
    references::Set{Symbol}
    assignments::Set{Symbol}
end

"ScopeState moves _up_ the ASTree: it carries scope information up towards the endpoints"
mutable struct ScopeState
    inglobalscope::Bool
    exposedglobals::Set{Symbol}
    hiddenglobals::Set{Symbol}
end

function union(a::SymbolsState, b::SymbolsState)
    SymbolsState(a.references ∪ b.references, a.assignments ∪ b.assignments)
end

function union(a::ScopeState, b::ScopeState)
    SymbolsState(a.inglobalscope && b.inglobalscope, a.exposedglobals ∪ b.exposedglobals, a.hiddenglobals ∪ b.hiddenglobals)
end

function ==(a::SymbolsState, b::SymbolsState)
    return a.references == b.references && a.assignments == b.assignments
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
            if a.head == :parameters
                push!(argnames, extractfunctionarguments(a)...)
            elseif a.head == :kw || a.head == :(=) # first is for unnamed function arguments, second is for lambdas
                push!(argnames, a.args[1])
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
function explore(value, symstate::SymbolsState, scstate::ScopeState)::Tuple{SymbolsState,ScopeState}
    # includes: LineNumberNode, Int64, String, 
    return SymbolsState(Set{Symbol}(), Set{Symbol}()), scstate
end

# Possible leaf: symbol
# Like a = x
# x is a symbol
# We handle the assignment separately, and explore(:a, ...) will not be called.
# Therefore, this method only handles _references_, which are added to the symbolstate, depending on the scopestate.
function explore(sym::Symbol, symstate::SymbolsState, scstate::ScopeState)::Tuple{SymbolsState,ScopeState}
    return if !(sym in scstate.hiddenglobals)
        SymbolsState(Set([sym]), Set{Symbol}()), scstate
    else
        SymbolsState(Set{Symbol}(), Set{Symbol}()), scstate
    end
end

# General recursive method. Is never a leaf.
function explore(ex::Expr, symstate::SymbolsState, scstate::ScopeState)::Tuple{SymbolsState,ScopeState}
    if ex.head == :call
        # Does not create scope

        # The ScopeState can me modified during a call.
        # Therefore, we go by its arguments one by one, and pass on any modifications to the scope state.

        for a in ex.args
            innersymstate, newscopestate = explore(a, symstate, scstate)

            scstate = newscopestate
            symstate = symstate ∪ innersymstate
        end

        return symstate, scstate
    elseif ex.head == :(=)
        # Does not create scope

        assignees = if isa(ex.args[1], Symbol)
            # x = 123
            [ex.args[1]]
        elseif isa(ex.args[1], Expr)
            if ex.args[1].head == :tuple
                # (x, y) = (1, 23)
                ex.args[1].args
            elseif ex.args[1].head == :ref
                # TODO: what is the desired behaviour here?
                # right now, it registers no reference, and no assignment
                []
            elseif ex.args[1].head == :(.)
                # TODO: what is the desired behaviour here?
                []
            else
                @warn "unknow use of =. Assignee is unrecognised."
                []
            end
        end
        val = ex.args[2]

        global_assignees = filter(assignees) do assignee
            scstate.inglobalscope || assignee in scstate.exposedglobals
        end
        
        # If we are _not_ assigning a global variable
        for assignee in setdiff(assignees, global_assignees)
            # Then this symbol hides any global definition with that name
            scstate.hiddenglobals = union(scstate.hiddenglobals, [assignee])
        end

        innersymstate, newscstate = explore(val, symstate, scstate)

        scstate = newscstate
        symstate = symstate ∪ innersymstate

        for assignee in global_assignees
            scstate.hiddenglobals = union(scstate.hiddenglobals, [assignee])
            symstate.assignments = union(symstate.assignments, [assignee])
        end

        return symstate, scstate
    elseif ex.head in modifiers
        # We change: a[1] += 123
        # to:        a[1] = a[1] + 123
        # We transform the modifier back to its operator
        # for when users redefine the + function

        operator = Symbol(string(ex.head)[1:end-1])
        expanded_expr = Expr(:(=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore(expanded_expr, symstate, scstate)
    elseif ex.head == :let
        # Creates local scope

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scstate)
        innerscopestate.inglobalscope = false
        for a in ex.args
            innersymstate, innerscopestate = explore(a, symstate, innerscopestate)

            symstate = symstate ∪ innersymstate
        end

        return symstate, scstate
    elseif ex.head == :function
        # Creates local scope

        funcname = assignee = ex.args[1].args[1]
        funcargs = ex.args[1]

        assigning_global = scstate.inglobalscope || assignee in scstate.exposedglobals
        
        
        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scstate)
        innerscopestate.hiddenglobals = union(innerscopestate.hiddenglobals, extractfunctionarguments(funcargs))
        innerscopestate.inglobalscope = false
        for a in ex.args[2:end]
            innersymstate, innerscopestate = explore(a, symstate, innerscopestate)

            symstate = symstate ∪ innersymstate
        end
        
        if assigning_global
            scstate.hiddenglobals = union(scstate.hiddenglobals, [assignee])
            symstate.assignments = union(symstate.assignments, [assignee])
        end

        return symstate, scstate
    elseif ex.head == :(->)
        # Creates local scope

        funcargs = ex.args[1]
        
        
        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scstate)
        innerscopestate.hiddenglobals = union(innerscopestate.hiddenglobals, extractfunctionarguments(funcargs))
        innerscopestate.inglobalscope = false
        for a in ex.args[2:end]
            innersymstate, innerscopestate = explore(a, symstate, innerscopestate)

            symstate = symstate ∪ innersymstate
        end

        return symstate, scstate
    elseif ex.head == :global
        # Does not create scope

        # We have one of:
        # global x;
        # global x = 1;
        # global x += 1;

        # `globalised` is everything that comes after `global`

        globalisee = ex.args[1]

        if isa(globalisee, Symbol)
            scstate.exposedglobals = union(scstate.exposedglobals, [globalisee])
            # symstate.assignments = union(symstate.assignments, [globalisee])
        elseif isa(globalisee, Expr)
            innerscopestate = deepcopy(scstate)
            innerscopestate.inglobalscope = true
            innersymstate, innerscopestate = explore(globalisee, symstate, innerscopestate)
            symstate = symstate ∪ innersymstate
        else
            @error "unknow global use"
        end
        
        return symstate, scstate
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
        indexoffirstassignment = findfirst(a -> isa(a, Expr) && a.head == :(=), ex.args)
        if indexoffirstassignment !== nothing
            recursers = ex.args[indexoffirstassignment:end]

            exposed = filter(ex.args[1:indexoffirstassignment-1]) do a::Symbol
                (scstate.inglobalscope || a in scstate.exposedglobals) && !(a in scstate.hiddenglobals)
            end
            
            scstate.exposedglobals = union(scstate.exposedglobals, exposed)
            symstate.assignments = union(symstate.assignments, exposed)
        end

        for a in recursers
            innersymstate, innerscopestate = explore(a, symstate, scstate)

            scstate = innerscopestate
            symstate = symstate ∪ innersymstate
        end
        
        return symstate, scstate
    elseif ex.head == :using || ex.head == :import
        if scstate.inglobalscope
            imports = if ex.args[1].head == :(:)
                ex.args[1].args[2:end]
            else
                ex.args
            end

            packagenames = map(e -> e.args[1], imports)

            return SymbolsState(Set{Symbol}(), Set{Symbol}(packagenames)), scstate
        end
        return SymbolsState(Set{Symbol}(), Set{Symbol}()), scstate
    else
        # fallback, includes:
        # begin, block, 

        # Does not create scope (probably)

        for a in ex.args
            innersymstate, innerscopestate = explore(a, symstate, scstate)

            scstate = innerscopestate
            symstate = symstate ∪ innersymstate
        end

        return symstate, scstate
    end
end


function compute_symbolreferences(ex)
    explore(ex, SymbolsState(Set{Symbol}(), Set{Symbol}()), ScopeState(true, Set{Symbol}(), Set{Symbol}()))[1]
end

# TODO: this can be done during the `explore` recursion
"Get the set of `using Module` expressions that are contained in this expression."
function compute_usings(ex)::Set{Expr}
    if isa(ex, Expr)
        if ex.head == :using
            Set{Expr}([ex])
        else
            union(compute_usings.(ex.args)...)
        end
    else
        Set{Expr}()
    end
end

end