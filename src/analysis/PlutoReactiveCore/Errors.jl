import Base: showerror
import ExpressionExplorer: FunctionName

abstract type ReactivityError <: Exception end

struct CyclicReferenceError <: ReactivityError
	syms::Set{Symbol}
end

function CyclicReferenceError(topology::NotebookTopology, cycle::AbstractVector{<:AbstractCell})
	CyclicReferenceError(cyclic_variables(topology, cycle))
end

struct MultipleDefinitionsError <: ReactivityError
	syms::Set{Symbol}
end

function MultipleDefinitionsError(topology::NotebookTopology, cell::AbstractCell, all_definers)
	competitors = setdiff(all_definers, [cell])
	defs(c) = topology.nodes[c].funcdefs_without_signatures ∪ topology.nodes[c].definitions
	MultipleDefinitionsError(
		union((defs(cell) ∩ defs(c) for c in competitors)...)
	)
end

const hint1 = "Combine all definitions into a single reactive cell using a `begin ... end` block."

# TODO: handle case when cells are in cycle, but variables aren't
function showerror(io::IO, cre::CyclicReferenceError)
	print(io, "Cyclic references among ")
	println(io, join(cre.syms, ", ", " and "))
	print(io, hint1)
end

function showerror(io::IO, mde::MultipleDefinitionsError)
	print(io, "Multiple definitions for ")
	println(io, join(mde.syms, ", ", " and "))
	print(io, hint1) # TODO: hint about mutable globals
end
