module PlutoReactiveCore

using ExpressionExplorer

const Cell = Base.UUID

include("./PlutoReactiveCore/data structures.jl")
include("./PlutoReactiveCore/ExpressionExplorer.jl")
include("./PlutoReactiveCore/Topology.jl")
include("./PlutoReactiveCore/Errors.jl")
include("./PlutoReactiveCore/TopologicalOrder.jl")
include("./PlutoReactiveCore/topological_order.jl")
include("./PlutoReactiveCore/TopologyUpdate.jl")

end