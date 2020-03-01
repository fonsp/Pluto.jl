module ExploreExpression
export modified, referenced, SymbolsState

import Base: union, ==

# from the source code: https://github.com/JuliaLang/julia/blob/master/src/julia-parser.scm#L9
const modifiers = [:(+=), :(-=), :(*=), :(/=), :(//=), :(^=), :(÷=), :(%=), :(<<=), :(>>=), :(>>>=), :(&=), :(⊻=), :(≔), :(⩴), :(≕)]



"SymbolsState trickels _down_ the ASTree: it carries referenced and defined variables from endpoints down to the root"
mutable struct SymbolsState
    foundrefs::Set{Symbol}
    founddefs::Set{Symbol}
end

"ScopeState moves _up_ the ASTree: it carries scope information up towards the endpoints"
mutable struct ScopeState
    inglobalscope::Bool
    exposedglobals::Set{Symbol}
    hiddenglobals::Set{Symbol}
end

function union(a::SymbolsState, b::SymbolsState)
    SymbolsState(a.foundrefs ∪ b.foundrefs, a.founddefs ∪ b.founddefs)
end

function union(a::ScopeState, b::ScopeState)
    SymbolsState(a.inglobalscope && b.inglobalscope, a.exposedglobals ∪ b.exposedglobals, a.hiddenglobals ∪ b.hiddenglobals)
end

function ==(a::SymbolsState, b::SymbolsState)
    return a.foundrefs == b.foundrefs && a.founddefs == b.founddefs
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
            elseif a.head == :kw
                push!(argnames, a.args[1])
            end
        end
    end

    return argnames
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

        assignee = ex.args[1]
        val = ex.args[2]

        assigning_global = scstate.inglobalscope || assignee in scstate.exposedglobals
        
        # If we are _not_ assigning a global variable
        if !assigning_global
            # Then this symbol hides any global definition with that name
            scstate.hiddenglobals = union(scstate.hiddenglobals, [assignee])
            println("hiding $assignee")
        end

        innersymstate, newscstate = explore(val, symstate, scstate)

        scstate = newscstate
        symstate = symstate ∪ innersymstate

        if assigning_global
            symstate.founddefs = union(symstate.founddefs, [assignee])
        end

        return symstate, scstate
    elseif ex.head == :let
        # Creates local scope

        scstate.inglobalscope = false

        for a in ex.args
            innersymstate, newscopestate = explore(a, symstate, scstate)

            scstate = newscopestate
            symstate = symstate ∪ innersymstate
        end

        return symstate, scstate
    elseif ex.head == :function
        # Creates local scope

        funcname = assignee = ex.args[1].args[1]
        funcargs = ex.args[1]

        assigning_global = scstate.inglobalscope || assignee in scstate.exposedglobals
        
        scstate.hiddenglobals = union(scstate.hiddenglobals, extractfunctionarguments(funcargs))
        scstate.inglobalscope = false

        @show extractfunctionarguments(funcargs)
        
        for a in ex.args[2:end]
            innersymstate, newscopestate = explore(a, symstate, scstate)

            scstate = newscopestate
            symstate = symstate ∪ innersymstate
        end
        
        if assigning_global
            symstate.founddefs = union(symstate.founddefs, [assignee])
        end

        return symstate, scstate
    else
        # fallback, includes:
        # begin, block, 

        # Does not create scope (probably)

        for a in ex.args
            innersymstate, newscopestate = explore(a, symstate, scstate)

            scstate = newscopestate
            symstate = symstate ∪ innersymstate
        end

        return symstate, scstate
    end
end


function compute_symbolreferences(ex)
    explore(ex, SymbolsState(Set{Symbol}(), Set{Symbol}()), ScopeState(true, Set{Symbol}(), Set{Symbol}()))[1]
end


# OLD


# TODO: doesn't work for things like "x=1;y=2" yet
"The symbols whose values are modified in the expression"
function modified(ast::Expr)
    if ast.head in modifiers || ast.head == :(=)
        if isa(ast.args[1], Symbol) # otherwise lambdas get treated as assignments too
            return [ast.args[1]]
        end
    end
    return []
end

modified(thing::Any) = []


# TODO: doesn't ignore local scope variables
"The symbols whose values are read in the expression"
function referenced(ast::Expr)
    used_args = []
    if ast.head in modifiers || ast.head == :(=) # only right-hand side matters
        used_args = ast.args[2:end]
    else
        used_args = ast.args[1:end]
    end
    return vcat([referenced(arg) for arg in used_args]...)
end

referenced(symbol::Symbol) = Base.isidentifier(symbol) ? [symbol] : []
referenced(sth::Any) = []


end