include("./helpers.jl")

include("./ExploreExpression.jl")
include("./Notebook.jl")
include("./React.jl")
include("./WorkspaceManager.jl")

# TODO: test PlutoRunner functions like:
# - from_this_notebook

# TODO: test HTTP
# We could use NodeJS.jl to run these tests without a browser
# We could also do real browser testing, but that seems difficult

# TODO: test include() inside notebooks