import REPL
import FuzzyCompletions: FuzzyCompletions, Completion, BslashCompletion, ModuleCompletion, PropertyCompletion, FieldCompletion, PathCompletion, DictCompletion, completion_text, score

function basic_completion_priority((s, description, exported, from_notebook))
	c = first(s)
	if islowercase(c)
		1 - 10exported
	elseif isuppercase(c)
		2 - 10exported
	else
		3 - 10exported
	end
end

completion_value_type_inner(x::Function) = :Function
completion_value_type_inner(x::Number) = :Number
completion_value_type_inner(x::AbstractString) = :String
completion_value_type_inner(x::Module) = :Module
completion_value_type_inner(x::AbstractArray) = :Array
completion_value_type_inner(x::Any) = :Any

completion_value_type(c::ModuleCompletion) = try
    completion_value_type_inner(getfield(c.parent, Symbol(c.mod)))::Symbol
catch
    :unknown
end
completion_value_type(::Completion) = :unknown

completion_special_symbol_value(::Completion) = nothing
completion_special_symbol_value(completion::BslashCompletion) =
    haskey(REPL.REPLCompletions.latex_symbols, completion.bslash) ?
        REPL.REPLCompletions.latex_symbols[completion.bslash] :
    haskey(REPL.REPLCompletions.emoji_symbols, completion.bslash) ?
        REPL.REPLCompletions.emoji_symbols[completion.bslash] :
        nothing

function is_pluto_workspace(m::Module)
    isdefined(m, PLUTO_INNER_MODULE_NAME) &&
        which(m, PLUTO_INNER_MODULE_NAME) == m
end

"""
Returns wether the module is a pluto workspace or any of its ancestors is.

For example, writing the following julia code in Pluto:

```julia
import Plots

module A
end
```

will give the following module tree:

```
Main                 (not pluto controlled)
└── var"workspace#1" (pluto controlled)
    └── A            (pluto controlled)
└── var"workspace#2" (pluto controlled)
    └── A            (pluto controlled)
Plots                (not pluto controlled)
```
"""
function is_pluto_controlled(m::Module)
    is_pluto_workspace(m) && return true
    parent = parentmodule(m)
    parent != m && is_pluto_controlled(parent)
end

function completions_exported(cs::Vector{<:Completion})
    map(cs) do c
        if c isa ModuleCompletion
            sym = Symbol(c.mod)
            @static if isdefined(Base, :ispublic)
                Base.ispublic(c.parent, sym)
            else
                Base.isexported(c.parent, sym)
            end
        else
            true
        end
    end
end

completion_from_notebook(c::ModuleCompletion) =
    is_pluto_workspace(c.parent) &&
    c.mod != "include" &&
    c.mod != "eval" &&
    !startswith(c.mod, "#")
completion_from_notebook(c::Completion) = false

completion_type(::FuzzyCompletions.PathCompletion) = :path
completion_type(::FuzzyCompletions.DictCompletion) = :dict
completion_type(::FuzzyCompletions.MethodCompletion) = :method
completion_type(::FuzzyCompletions.ModuleCompletion) = :module
completion_type(::FuzzyCompletions.BslashCompletion) = :bslash
completion_type(::FuzzyCompletions.FieldCompletion) = :field
completion_type(::FuzzyCompletions.KeywordArgumentCompletion) = :keyword_argument
completion_type(::FuzzyCompletions.KeywordCompletion) = :keyword
completion_type(::FuzzyCompletions.PropertyCompletion) = :property
completion_type(::FuzzyCompletions.Text) = :text

completion_type(::Completion) = :unknown

"You say Linear, I say Algebra!"
function completion_fetcher(query, pos, workspace::Module)
    results, loc, found = FuzzyCompletions.completions(
        query, pos, workspace;
        enable_questionmark_methods=false,
        enable_expanduser=true,
        enable_path=true,
        enable_methods=false,
        enable_packages=false,
    )
    partial = query[1:pos]
    if endswith(partial, '.')
        filter!(is_dot_completion, results)
        # we are autocompleting a module, and we want to see its fields alphabetically
        sort!(results; by=completion_text)
    elseif endswith(partial, '/')
        filter!(is_path_completion, results)
        sort!(results; by=completion_text)
    elseif endswith(partial, '[')
        filter!(is_dict_completion, results)
        sort!(results; by=completion_text)
    else
        contains_slash = '/' ∈ partial
        if !contains_slash
            filter!(!is_path_completion, results)
        end
        filter!(
            r -> is_kwarg_completion(r) || score(r) >= 0,
            results
        ) # too many candidates otherwise
    end

    exported = completions_exported(results)
    smooshed_together = map(zip(results, exported)) do (result, rexported)
        (
            completion_text(result)::String,
            completion_value_type(result)::Symbol,
            rexported::Bool,
            completion_from_notebook(result)::Bool,
            completion_type(result)::Symbol,
            completion_special_symbol_value(result),
        )
    end

    p = if endswith(query, '.')
        sortperm(smooshed_together; alg=MergeSort, by=basic_completion_priority)
    else
        # we give 3 extra score points to exported fields
        scores = score.(results)
        sortperm(scores .+ 3.0 * exported; alg=MergeSort, rev=true)
    end

    permute!(smooshed_together, p)
    (smooshed_together, loc, found)
end

is_dot_completion(::Union{ModuleCompletion,PropertyCompletion,FieldCompletion}) = true
is_dot_completion(::Completion)                                                 = false

is_path_completion(::PathCompletion) = true
is_path_completion(::Completion)     = false

is_dict_completion(::DictCompletion) = true
is_dict_completion(::Completion)     = false

is_kwarg_completion(::FuzzyCompletions.KeywordArgumentCompletion) = true
is_kwarg_completion(::Completion)                                 = false
