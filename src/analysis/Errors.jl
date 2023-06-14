import Base: showerror
import .ExpressionExplorer: FunctionName, join_funcname_parts

abstract type ReactivityError <: Exception end

struct CyclicReferenceError <: ReactivityError
	syms::Set{Symbol}
end

function CyclicReferenceError(topology::NotebookTopology, cycle::AbstractVector{Cell})
	CyclicReferenceError(cyclic_variables(topology, cycle))
end

struct MultipleDefinitionsError <: ReactivityError
	syms::Set{Symbol}
end

function MultipleDefinitionsError(topology::NotebookTopology, cell::Cell, all_definers)
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

"Send `error` to the frontend without backtrace. Runtime errors are handled by `WorkspaceManager.eval_format_fetch_in_workspace` - this function is for Reactivity errors."
function relay_reactivity_error!(cell::Cell, error::Exception, timestamp::Float64)
	body, mime = PlutoRunner.format_output(CapturedException(error, []))
	cell.output = CellOutput(
		body=body,
		mime=mime,
		rootassignee=nothing,
		last_run_timestamp=timestamp,
		persist_js_state=false,
	)
	cell.published_objects = Dict{String,Any}()
	cell.runtime = nothing
	cell.errored = true
end
