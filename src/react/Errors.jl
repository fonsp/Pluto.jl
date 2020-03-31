import Base: showerror


abstract type ReactivityError <: Exception end

struct CircularReferenceError <: ReactivityError
	syms::Set{Symbol}
end

struct MultipleDefinitionsError <: ReactivityError
	syms::Set{Symbol}
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