module PlutoReactiveCore

using ExpressionExplorer

"""
The `AbstractCell` type is the "unit of reactivity". It is used only as an indexing type in PlutoReactiveCore, its fields are not used. 

For example, the struct `Cycle <: ChildExplorationResult` stores a list of cells that reference each other in a cycle. This list is stored as a `Vector{<:AbstractCell}`.

Pluto's `Cell` struct is a subtype of `AbstractCell`. So for example, the `Cycle` stores a `Vector{Cell}` when used in Pluto.
"""
abstract type AbstractCell end

include("./PlutoReactiveCore/data structures.jl")
include("./PlutoReactiveCore/ExpressionExplorer.jl")
include("./PlutoReactiveCore/Topology.jl")
include("./PlutoReactiveCore/Errors.jl")
include("./PlutoReactiveCore/TopologicalOrder.jl")
include("./PlutoReactiveCore/topological_order.jl")
include("./PlutoReactiveCore/TopologyUpdate.jl")

end