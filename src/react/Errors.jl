import Base: showerror


abstract type ReactivityError <: Exception end


struct CyclicReferenceError <: ReactivityError
	syms::Set{Symbol}
end

function CyclicReferenceError(cycle::Array{Cell, 1})
	referenced_during_cycle = union((c.symstate.references for c in cycle)...)
	assigned_during_cycle = union((c.symstate.assignments for c in cycle)...)
	
	CyclicReferenceError(referenced_during_cycle ∩ assigned_during_cycle)
end

CyclicReferenceError(cycle::Set{Cell}) = collect(cycle) |> CyclicReferenceError


struct MultipleDefinitionsError <: ReactivityError
	syms::Set{Symbol}
end

function MultipleDefinitionsError(cell::Cell, all_definers)
	competitors = setdiff(all_definers, [cell])
	union((cell.symstate.assignments ∩ c.symstate.assignments for c in competitors)...) |>
	MultipleDefinitionsError
end


# TODO: handle case when cells are in cycle, but variables aren't
function showerror(io::IO, cre::CyclicReferenceError)
	print(io, "Cyclic references among $(join(cre.syms, ", ", " and ")).")
end

function showerror(io::IO, mde::MultipleDefinitionsError)
	print(io, "Multiple definitions for $(join(mde.syms, ", ", " and ")).\nCombine all definitions into a single reactive cell using a `begin` ... `end` block.") # TODO: hint about mutable globals
end

"Send `error` to the frontend without backtrace. Runtime errors are handled by `WorkspaceManager.eval_fetch_in_workspace` - this function is for Reactivity errors."
function relay_reactivity_error!(cell::Cell, error::Exception)
	cell.output_repr = nothing
	cell.error_repr, cell.repr_mime = format_output(error)
end