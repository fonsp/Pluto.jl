include("./helpers.jl")

# tests that start new processes:
include("./WorkspaceManager.jl")
verify_no_running_processes()
include("./packages/Basic.jl")
verify_no_running_processes()
include("./Bonds.jl")
verify_no_running_processes()
include("./RichOutput.jl")
verify_no_running_processes()
include("./React.jl")
verify_no_running_processes()
include("./Dynamic.jl")
verify_no_running_processes()
include("./MacroAnalysis.jl")
verify_no_running_processes()
include("./webserver.jl")
verify_no_running_processes()
include("./Notebook.jl")
verify_no_running_processes()
include("./Configuration.jl")
verify_no_running_processes()

# tests that don't start new processes:
include("./ReloadFromFile.jl")
include("./packages/PkgCompat.jl")
include("./ExpressionExplorer.jl")
include("./MethodSignatures.jl")
include("./MoreAnalysis.jl")
include("./Analysis.jl")
include("./webserver_utils.jl")
include("./DependencyCache.jl")
include("./Throttled.jl")
include("./cell_disabling.jl")

verify_no_running_processes()

# TODO: test PlutoRunner functions like:
# - from_this_notebook

# TODO: test include() inside notebooks

# TODO: test async execution order
# TODO: test @bind

# TODO: test if notebooks are saved correctly after edits
