###
# REPL THINGS
###

module Autocompletion

import REPL.REPLCompletions: completions, complete_path, completion_text, Completion, ModuleCompletion
import ..PlutoRunner: current_module

export doc_fetcher, completion_fetcher

function completion_priority((s, description, exported))
	c = first(s)
	if islowercase(c)
		1 - 10exported
	elseif isuppercase(c)
		2 - 10exported
	else
		3 - 10exported
	end
end

completed_object_description(x::Function) = "Function"
completed_object_description(x::Number) = "Number"
completed_object_description(x::AbstractString) = "String"
completed_object_description(x::Module) = "Module"
completed_object_description(x::AbstractArray) = "Array"
completed_object_description(x::Any) = "Any"

completion_description(c::ModuleCompletion) = try
    completed_object_description(getfield(c.parent, Symbol(c.mod)))
catch
    nothing
end
completion_description(::Completion) = nothing

function completions_exported(cs::Vector{<:Completion})
    completed_modules = Set(c.parent for c in cs if c isa ModuleCompletion)
    completed_modules_exports = Dict(m => string.(names(m, all=false, imported=true)) for m in completed_modules)

    map(cs) do c
        if c isa ModuleCompletion
            c.mod ∈ completed_modules_exports[c.parent]
        else

            true
        end
    end
end

"You say Linear, I say Algebra!"
function completion_fetcher(query, pos, workspace::Module=current_module)
    results, loc, found = completions(query, pos, workspace)

    texts = completion_text.(results)
    descriptions = completion_description.(results)
    exported = completions_exported(results)

    smooshed_together = zip(texts, descriptions, exported)
    
    final = sort(collect(smooshed_together); alg=MergeSort, by=completion_priority)
    (final, loc, found)
end

# Based on /base/docs/bindings.jl from Julia source code
function binding_from(x::Expr, workspace::Module=current_module)
    if x.head == :macrocall
        Docs.Binding(workspace, x.args[1])
    elseif x.head == :.
        Docs.Binding(Core.eval(workspace, x.args[1]), x.args[2].value)
    else
        error("Invalid @var syntax `$x`.")
    end
end
binding_from(s::Symbol, workspace::Module=current_module) = Docs.Binding(workspace, s)
binding_from(r::GlobalRef, workspace::Module=current_module) = Docs.Binding(r.mod, r.name)
binding_from(other, workspace::Module=current_module) = error("Invalid @var syntax `$other`.")

"You say doc_fetch, I say You say doc_fetch, I say You say doc_fetch, I say You say doc_fetch, I say ...!!!!"
function doc_fetcher(query, workspace::Module=current_module)
    try
        binding = binding_from(Meta.parse(query), workspace)::Docs.Binding
        (repr(MIME"text/html"(), Docs.doc(binding)), :👍)
    catch ex
        (nothing, :👎)
    end
end

end