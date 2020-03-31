import Base: showerror


abstract type ReactivityError <: Exception end


struct CircularReferenceError <: ReactivityError
	syms::Set{Symbol}
end

function CircularReferenceError(cycle::Array{Cell, 1})
	referenced_during_cycle = union((c.resolved_symstate.references for c in cycle)...)
	assigned_during_cycle = union((c.resolved_symstate.assignments for c in cycle)...)
	
	CircularReferenceError(referenced_during_cycle ∩ assigned_during_cycle)
end

CircularReferenceError(cycle::Set{Cell}) = collect(cycle) |> CircularReferenceError


struct MultipleDefinitionsError <: ReactivityError
	syms::Set{Symbol}
end

function MultipleDefinitionsError(cell::Cell, all_definers)
	competitors = setdiff(all_definers, [cell])
	union((cell.resolved_symstate.assignments ∩ c.resolved_symstate.assignments for c in competitors)...) |>
	MultipleDefinitionsError
end



function showerror(io::IO, cre::CircularReferenceError)
	print(io, "Circular references among $(join(cre.syms, ", ", " and ")).")
end

function showerror(io::IO, mde::MultipleDefinitionsError)
	print(io, "Multiple definitions for $(join(mde.syms, ", ", " and ")).\nCombine all definitions into a single reactive cell using a `begin` ... `end` block.") # TODO: hint about mutable globals
end

"Send `error` to the frontend without backtrace. Runtime errors are handled by `WorkspaceManager.eval_fetch_in_workspace` - this function is for Reactivity errors."
function relay_reactivity_error!(cell::Cell, error::Exception)
	cell.output_repr = nothing
	cell.error_repr, cell.repr_mime = format_output(error)
end