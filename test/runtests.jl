include("./helpers.jl")
include("./DependencyCache.jl")
include("./WorkspaceManager.jl")
include("./RichOutput.jl")
include("./React.jl")
include("./ExpressionExplorer.jl")
include("./Dynamic.jl")
include("./MethodSignatures.jl")
include("./Notebook.jl")
include("./Configuration.jl")
include("./Analysis.jl")
include("./Diffing.jl")
include("./Throttled.jl")

# TODO: test PlutoRunner functions like:
# - from_this_notebook
# - tree viewer

# TODO: test include() inside notebooks

# TODO: test async execution order
# TODO: test @bind

# TODO: test if notebooks are saved correctly after edits