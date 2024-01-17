module PlutoDependencyExplorer

using ExpressionExplorer

"""
The `AbstractCell` type is the "unit of reactivity". It is used only as an indexing type in PlutoDependencyExplorer, its fields are not used. 

For example, the struct `Cycle <: ChildExplorationResult` stores a list of cells that reference each other in a cycle. This list is stored as a `Vector{<:AbstractCell}`.

Pluto's `Cell` struct is a subtype of `AbstractCell`. So for example, the `Cycle` stores a `Vector{Cell}` when used in Pluto.
"""
abstract type AbstractCell end

include("./PlutoDependencyExplorer/data structures.jl")
include("./PlutoDependencyExplorer/ExpressionExplorer.jl")
include("./PlutoDependencyExplorer/Topology.jl")
include("./PlutoDependencyExplorer/Errors.jl")
include("./PlutoDependencyExplorer/TopologicalOrder.jl")
include("./PlutoDependencyExplorer/topological_order.jl")
include("./PlutoDependencyExplorer/TopologyUpdate.jl")

end