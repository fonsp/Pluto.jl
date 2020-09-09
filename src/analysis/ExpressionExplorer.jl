module ExpressionExplorer
export compute_symbolreferences, try_compute_symbolreferences, compute_usings, SymbolsState, FuncName, join_funcname_parts

import ..PlutoRunner
import Markdown
import Base: union, union!, ==, push!

###
# TWO STATE OBJECTS
###

# TODO: use GlobalRef instead
FuncName = Array{Symbol,1}

"SymbolsState trickles _down_ the ASTree: it carries referenced and defined variables from endpoints down to the root."
mutable struct SymbolsState
    references::Set{Symbol}
    assignments::Set{Symbol}
    funccalls::Set{FuncName}
    funcdefs::Dict{FuncName,SymbolsState}
end

SymbolsState(references, assignments, funccalls) = SymbolsState(references, assignments, funccalls, Dict{FuncName,SymbolsState}())
SymbolsState(references, assignments) = SymbolsState(references, assignments, Set{Symbol}())
SymbolsState() = SymbolsState(Set{Symbol}(), Set{Symbol}())

function Base.show(io::IO, s::SymbolsState)
    print(io, "SymbolsState([")
    join(io, s.references, ", ")
    print(io, "], [")
    join(io, s.assignments, ", ")
    print(io, "], [")
    join(io, s.funccalls, ", ")
    print(io, "], [")
    if isempty(s.funcdefs)
        print(io, "]")
    else
        println(io)
        for (k, v) in s.funcdefs
            print(io, "    ", k, ": ", v)
            println(io)
        end
        print(io, "]")
    end
    print(io, ")")
end


"ScopeState moves _up_ the ASTree: it carries scope information up towards the endpoints."
mutable struct ScopeState
    inglobalscope::Bool
    exposedglobals::Set{Symbol}
    hiddenglobals::Set{Symbol}
    definedfuncs::Set{Symbol}
end

# The `union` and `union!` overloads define how two `SymbolsState`s or two `ScopeState`s are combined.

function union(a::Dict{FuncName,SymbolsState}, bs::Dict{FuncName,SymbolsState}...)
    union!(Dict{FuncName,SymbolsState}(), a, bs...)
end

function union!(a::Dict{FuncName,SymbolsState}, bs::Dict{FuncName,SymbolsState}...)
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

function union!(a::Tuple{FuncName,SymbolsState}, bs::Tuple{FuncName,SymbolsState}...)
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
    a.references == b.references && a.assignments == b.assignments && a.funccalls == b.funccalls && a.funcdefs == b.funcdefs 
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

function get_assignees(ex::Expr)::FuncName
    if ex.head == :tuple
        # e.g. (x, y) in the ex (x, y) = (1, 23)
        union!(Symbol[], get_assignees.(ex.args)...)
        # filter(s->s isa Symbol, ex.args)
    elseif ex.head == :(::)
        # TODO: type is referenced
        Symbol[ex.args[1]]
    elseif ex.head == :ref || ex.head == :(.)
        Symbol[]
    else
        @warn "unknow use of `=`. Assignee is unrecognised." ex
        Symbol[]
    end
end

# e.g. x = 123
get_assignees(ex::Symbol) = Symbol[ex]

# When you assign to a datatype like Int, String, or anything bad like that
# e.g. 1 = 2
# This is parsable code, so we have to treat it
get_assignees(::Any) = Symbol[]

# TODO: this should return a FuncName, and use `split_funcname`.
"Turn :(A{T}) into :A."
function uncurly!(ex::Expr, scopestate::ScopeState)::Symbol
    @assert ex.head == :curly
    push!(scopestate.hiddenglobals, (a for a in ex.args[2:end] if a isa Symbol)...)
    Symbol(ex.args[1])
end

uncurly!(ex::Expr)::Symbol = ex.args[1]

uncurly!(s::Symbol, scopestate=nothing)::Symbol = s

"Turn `:(Base.Submodule.f)` into `[:Base, :Submodule, :f]` and `:f` into `[:f]`."
function split_funcname(funcname_ex::Expr)::FuncName
    if funcname_ex.head == :(.)
        vcat(split_funcname.(funcname_ex.args)...)
    else
        # a call to a function that's not a global, like calling an array element: `funcs[12]()`
        # TODO: explore symstate!
        Symbol[]
    end
end

function split_funcname(funcname_ex::QuoteNode)::FuncName
    split_funcname(funcname_ex.value)
end

function split_funcname(funcname_ex::Symbol)::FuncName
    Symbol[funcname_ex |> without_dotprefix |> without_dotsuffix]
end

# this includes GlobalRef - it's fine that we don't recognise it, because you can't assign to a globalref?
function split_funcname(::Any)::FuncName
    Symbol[]
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
        Symbol(fn_str[1:end - 1])
    else
        funcname
    end
end
        
"""Turn `Symbol[:Module, :func]` into Symbol("Module.func").

This is **not** the same as the expression `:(Module.func)`, but is used to identify the function name using a single `Symbol` (like normal variables).
This means that it is only the inverse of `ExpressionExplorer.split_funcname` iff `length(parts) ≤ 1`."""
function join_funcname_parts(parts::FuncName)::Symbol
	join(parts .|> String, ".") |> Symbol
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
        SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{Symbol}(), Dict{FuncName,SymbolsState}())
    else
        SymbolsState(Set([sym]), Set{Symbol}(), Set{Symbol}(), Dict{FuncName,SymbolsState}())
    end
end

# General recursive method. Is never a leaf.
# Modifies the `scopestate`.
function explore!(ex::Expr, scopestate::ScopeState)::SymbolsState
    if ex.head == :(=)
        # Does not create scope
        
        if ex.args[1] isa Expr && (ex.args[1].head == :call || ex.args[1].head == :where || (ex.args[1].head == :(::) && ex.args[1].args[1] isa Expr && ex.args[1].args[1].head == :call))
            # f(x, y) = x + y
            # Rewrite to:
            # function f(x, y) x + y end
            return explore!(Expr(:function, ex.args...), scopestate)
        end
        assignees = get_assignees(ex.args[1])
        val = ex.args[2]

        global_assignees = get_global_assignees(assignees, scopestate)
        
        symstate = innersymstate = explore!(val, scopestate)
        # If we are _not_ assigning a global variable, then this symbol hides any global definition with that name
        push!(scopestate.hiddenglobals, setdiff(assignees, global_assignees)...)
        assigneesymstate = explore!(ex.args[1], scopestate)
        
        push!(scopestate.hiddenglobals, global_assignees...)
        push!(symstate.assignments, global_assignees...)
        push!(symstate.references, setdiff(assigneesymstate.references, global_assignees)...)

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

        operator = Symbol(string(ex.head)[2:end - 1])
        expanded_expr = Expr(:(.=), ex.args[1], Expr(:call, operator, ex.args[1], ex.args[2]))
        return explore!(expanded_expr, scopestate)
    elseif ex.head == :let || ex.head == :for || ex.head == :while
        # Creates local scope

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scopestate)
        innerscopestate.inglobalscope = false

        return mapfoldl(a -> explore!(a, innerscopestate), union!, ex.args, init=SymbolsState())
    elseif ex.head == :macrocall
        # Does not create sccope
        
        funcname = ex.args[1] |> split_funcname
        # Macros can transform the expression into anything - the best way to treat them is to macroexpand
        # the problem is that the macro is only available on the worker process, see https://github.com/fonsp/Pluto.jl/issues/196
        if (length(funcname) == 1 || (length(funcname) >= 2 && funcname[1] == :Base))
            if funcname[end] == Symbol("@md_str") || funcname[end] == Symbol("@bind") || funcname[end] == Symbol("@gensym") || funcname[end] == Symbol("@kwdef")
                # we macroexpand these, and recurse
                expanded = macroexpand(PlutoRunner, ex; recursive=false)
                return explore!(Expr(:call, ex.args[1], expanded), scopestate)
            elseif funcname[end] == Symbol("@enum")
                # we could do macroexpand, but the expanded macro defines typemin and typemax methods for the new enum type, and because of 
                # https://github.com/fonsp/Pluto.jl/issues/177
                # this would mean that you can only define one enum per notebook :(
                syms = filter(x -> x isa Symbol, ex.args[2:end])
                rest = setdiff(ex.args[2:end], syms)
                
                return mapfoldl(a -> explore!(a, scopestate), union!, rest, init=SymbolsState(Set{Symbol}(), Set{Symbol}(syms), Set{FuncName}([[Symbol("@enum")]])))
            end
        end

        return explore!(Expr(:call, ex.args...), scopestate)
    elseif ex.head == :call
        # Does not create scope

        funcname = ex.args[1] |> split_funcname
        symstate = if length(funcname) == 0
            explore!(ex.args[1], scopestate)
        elseif length(funcname) == 1
            if funcname[1] ∈ scopestate.hiddenglobals
                SymbolsState()
            else
            SymbolsState(Set{Symbol}(), Set{Symbol}(), Set{FuncName}([funcname]))
            end
        else
            SymbolsState(Set{Symbol}([funcname[end - 1]]), Set{Symbol}(), Set{FuncName}([funcname]))
        end
        # Explore code inside function arguments:
        union!(symstate, explore!(Expr(:block, ex.args[2:end]...), scopestate))
        return symstate
    elseif ex.head == :kw
        return explore!(ex.args[2], scopestate)
    elseif ex.head == :struct
        # Creates local scope

        structname = ex.args[2]
        structfields = ex.args[3].args

        equiv_func = Expr(:function, Expr(:call, structname, structfields...), Expr(:block, nothing))

        return explore!(equiv_func, scopestate)
    elseif ex.head == :generator
        # Creates local scope

        # In a `generator`, a single expression is followed by the iterator assignments.
        # In a `for`, this expression comes at the end.

        # This is not strictly the normal form of a `for` but that's okay
        return explore!(Expr(:for, ex.args[2:end]..., ex.args[1]), scopestate)
    elseif ex.head == :function || ex.head == :abstract
        symstate = SymbolsState()
        # Creates local scope

        funcroot = ex.args[1]

        # Because we are entering a new scope, we create a copy of the current scope state, and run it through the expressions.
        innerscopestate = deepcopy(scopestate)
        innerscopestate.inglobalscope = false

        funcname, innersymstate = explore_funcdef!(funcroot, innerscopestate)

        union!(innersymstate, explore!(Expr(:block, ex.args[2:end]...), innerscopestate))
        
        if will_assign_global(funcname, scopestate)
            symstate.funcdefs[funcname] = innersymstate
            if length(funcname) == 1
                push!(scopestate.definedfuncs, funcname[end])
                push!(scopestate.hiddenglobals, funcname[end])
            elseif length(funcname) > 1
                push!(symstate.references, funcname[end - 1]) # reference the module of the extended function
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

        tempname = Symbol("anon", rand(UInt64))

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
            @error "unknow global use" ex
            return explore!(globalisee, scopestate)
        end
        
        return symstate
    elseif ex.head == :local
        # Does not create scope

        localisee = ex.args[1]

        if isa(localisee, Symbol)
            push!(scopestate.hiddenglobals, localisee)
            return SymbolsState()
        elseif isa(localisee, Expr) && (localisee.head == :(=) || localisee.head in modifiers)
            push!(scopestate.hiddenglobals, get_assignees(localisee.args[1])...)
            return explore!(localisee, scopestate)
        else
            @warn "unknow local use" ex
            return explore!(localisee, scopestate)
        end
    elseif ex.head == :tuple
        # Does not create scope
        
        # There are three (legal) cases:
        # 1. Creating a tupe:
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
                before = ex.args[1:indexoffirstassignment - 1]
                after = ex.args[indexoffirstassignment + 1:end]

                symstate_middle = explore!(ex.args[indexoffirstassignment], scopestate)
                symstate_outer = explore!(Expr(:(=), Expr(:tuple, before...), Expr(:block, after...)), scopestate)

                return union!(symstate_middle, symstate_outer)
            end
        else
            # 1.
            # good 'ol tuple
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

            packagenames = map(e -> e.args[end], imports)

            return SymbolsState(Set{Symbol}(), Set{Symbol}(packagenames))
        else
            return SymbolsState(Set{Symbol}(), Set{Symbol}())
        end
    elseif ex.head == :quote
        # We ignore contents

        return SymbolsState()
    elseif ex.head == :module
        # We ignore contents; the module name is a definition

        return SymbolsState(Set{Symbol}(), Set{Symbol}([ex.args[2]]))
    else
        # fallback, includes:
        # begin, block, do, toplevel, const
        # (and hopefully much more!)
        
        # Does not create scope (probably)

        return mapfoldl(a -> explore!(a, scopestate), union!, ex.args, init=SymbolsState())
    end
end

"Return the function name and the SymbolsState from argument defaults. Add arguments as hidden globals to the `scopestate`.

Is also used for `struct` and `abstract`."
function explore_funcdef!(ex::Expr, scopestate::ScopeState)::Tuple{FuncName,SymbolsState}
    if ex.head == :call
        # get the function name
        name, symstate = explore_funcdef!(ex.args[1], scopestate)
        # and explore the function arguments
        return mapfoldl(a -> explore_funcdef!(a, scopestate), union!, ex.args[2:end], init=(name, symstate))

    elseif ex.head == :(::) || ex.head == :kw || ex.head == :(=)
        # recurse
        name, symstate = explore_funcdef!(ex.args[1], scopestate)
        if length(ex.args) > 1
            # use `explore!` (not `explore_funcdef!`) to explore the argument's default value - these can contain arbitrary expressions
            union!(symstate, explore!(ex.args[2], scopestate))
        end
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
        name = uncurly!(ex.args[1], scopestate)
        symstate = if length(ex.args) == 1
            SymbolsState()
        else
            explore!(ex.args[2], scopestate)
        end
        return Symbol[name], symstate

    elseif ex.head == :curly
        name = uncurly!(ex, scopestate)
        return Symbol[name], SymbolsState()

    elseif ex.head == :parameters || ex.head == :tuple
        return mapfoldl(a -> explore_funcdef!(a, scopestate), union!, ex.args, init=(Symbol[], SymbolsState()))

    elseif ex.head == :(.)
        return split_funcname(ex), SymbolsState()

    else
        return Symbol[], explore!(ex, scopestate)
    end
end

function explore_funcdef!(ex::QuoteNode, scopestate::ScopeState)::Tuple{FuncName,SymbolsState}
    explore_funcdef!(ex.value, scopestate)
end

function explore_funcdef!(ex::Symbol, scopestate::ScopeState)::Tuple{FuncName,SymbolsState}
    push!(scopestate.hiddenglobals, ex)
    Symbol[ex |> without_dotprefix |> without_dotsuffix], SymbolsState()
end

function explore_funcdef!(::Any, ::ScopeState)::Tuple{FuncName,SymbolsState}
    Symbol[], SymbolsState()
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

function try_compute_symbolreferences(ex::Any)
	try
		compute_symbolreferences(ex)
	catch e
		@error "Expression explorer failed on: " ex
		showerror(stderr, e, stacktrace(catch_backtrace()))
		SymbolsState(Set{Symbol}([:fake_reference_to_prevent_it_from_looking_like_a_text_only_cell]), Set{Symbol}())
	end
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

"Return whether the expression is of the form `Expr(:toplevel, LineNumberNode(..), any)`."
function is_toplevel_expr(ex::Expr)::Bool
    (ex.head == :toplevel) && (length(ex.args) == 2) && (ex.args[1] isa LineNumberNode)
end

is_toplevel_expr(::Any)::Bool = false

"If the expression is a (simple) assignemnt at its root, return the assignee as `Symbol`, return `nothing` otherwise."
function get_rootassignee(ex::Expr, recurse::Bool=true)::Union{Symbol,Nothing}
    if is_toplevel_expr(ex) && recurse
        get_rootassignee(ex.args[2], false)
    elseif ex.head == :(=) && ex.args[1] isa Symbol
        ex.args[1]
    else
        nothing
    end
end

get_rootassignee(ex::Any, recuse::Bool=true)::Union{Symbol,Nothing} = nothing

end