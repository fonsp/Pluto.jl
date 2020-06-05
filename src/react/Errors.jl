import Base: showerror


abstract type ReactivityError <: Exception end


struct CyclicReferenceError <: ReactivityError
	syms::Set{Symbol}
end

function CyclicReferenceError(cycle::Cell...)
	referenced_during_cycle = union((c.symstate.references for c in cycle)...)
	assigned_during_cycle = union((c.symstate.assignments for c in cycle)...)
	
	CyclicReferenceError(referenced_during_cycle ∩ assigned_during_cycle)
end


struct MultipleDefinitionsError <: ReactivityError
	syms::Set{Symbol}
end

function MultipleDefinitionsError(cell::Cell, all_definers)
	competitors = setdiff(all_definers, [cell])
	union((cell.symstate.assignments ∩ c.symstate.assignments for c in competitors)...) |>
	MultipleDefinitionsError
end

# Also update identically name variables in `editor.js`.
hint1 = "Combine all definitions into a single reactive cell using a `begin ... end` block."
hint2 = "Wrap all code in a `begin ... end` block."

# TODO: handle case when cells are in cycle, but variables aren't
function showerror(io::IO, cre::CyclicReferenceError)
	print(io, "Cyclic references among $(join(cre.syms, ", ", " and ")):\n$hint1")
end

function showerror(io::IO, mde::MultipleDefinitionsError)
	print(io, "Multiple definitions for $(join(mde.syms, ", ", " and ")):\n$hint1") # TODO: hint about mutable globals
end

"Send `error` to the frontend without backtrace. Runtime errors are handled by `WorkspaceManager.eval_fetch_in_workspace` - this function is for Reactivity errors."
function relay_reactivity_error!(cell::Cell, error::Exception)
	cell.errored = true
	cell.runtime = missing
	cell.output_repr, cell.repr_mime = PlutoRunner.format_output(CapturedException(error, []))
end