# Will be evaluated _inside_ the workspace process.

# Pluto does most things on the server, but it uses worker processes to evaluate notebook code in.
# These processes don't import Pluto, they only import this module.
# Functions from this module are called by WorkspaceManager.jl via Malt.

# When reading this file, pretend that you are living in a worker process,
# and you are communicating with Pluto's server, who lives in the main process.
# The package environment that this file is loaded with is the NotebookProcessProject.toml file in this directory.

# SOME EXTRA NOTES

# 1. The entire PlutoRunner should be a single file.
# 2. Restrict the communication between this PlutoRunner and the Pluto server to only use *Base Julia types*, like `String`, `Dict`, `NamedTuple`, etc. 

# These restriction are there to allow flexibility in the way that this file is
# loaded on a runner process, which is something that we might want to change
# in the future.

# DEVELOPMENT TIP
# If you are editing this file, you cannot use Revise unfortunately.
# However! You don't need to restart Pluto to test your changes! You just need to restart the notebook from the Pluto main menu, and the new PlutoRunner.jl will be loaded.

module PlutoRunner

# import these two so that they can be imported from Main on the worker process if it launches without the stdlibs in its LOAD_PATH
import Markdown
import InteractiveUtils
using UUIDs

export @bind

const ObjectID = typeof(objectid("hello computer"))

struct CachedMacroExpansion
    original_expr_hash::UInt64
    expanded_expr::Expr
    expansion_duration::UInt64
    has_pluto_hook_features::Bool
    did_mention_expansion_time::Bool
    expansion_logs::Vector{Any}
end

const supported_integration_features = Any[]

abstract type SpecialPlutoExprValue end
struct GiveMeCellID <: SpecialPlutoExprValue end
struct GiveMeRerunCellFunction <: SpecialPlutoExprValue end
struct GiveMeRegisterCleanupFunction <: SpecialPlutoExprValue end


# TODO: clear key when a cell is deleted furever
const cell_results = Dict{UUID,Any}()
const cell_runtimes = Dict{UUID,Union{Nothing,UInt64}}()
const cell_published_objects = Dict{UUID,Dict{String,Any}}()
const cell_registered_bond_names = Dict{UUID,Set{Symbol}}()
const cell_expanded_exprs = Dict{UUID,CachedMacroExpansion}()



###
# WORKSPACE MANAGER
###

"""
`PlutoRunner.notebook_id[]` gives you the notebook ID used to identify a session.
"""
const notebook_id = Ref{UUID}(UUID(0))

include("./evaluation/workspace.jl")
include("./evaluation/return.jl")
include("./evaluation/macro.jl")
include("./evaluation/collect_soft_definitions.jl")
include("./evaluation/run_expression.jl")
include("./evaluation/deleting globals.jl")


include("./display/format_output.jl")


include("./display/IOContext.jl")

include("./display/syntax error.jl")
include("./display/Exception.jl")


include("./display/mime dance.jl")
include("./display/tree viewer.jl")


include("./integrations.jl")
include("./completions.jl")
include("./docs.jl")
include("./bonds.jl")
include("./js/published_to_js.jl")
include("./display/embed_display.jl")
include("./display/DivElement.jl")

include("./js/jslink.jl")
include("./logging.jl")
include("./precompile.jl")

end
