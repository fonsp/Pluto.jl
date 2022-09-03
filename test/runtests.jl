include("helpers.jl")

# tests that start new processes:

@timeit_include("compiletimes.jl")
if get(ENV, "PLUTO_TEST_ONLY_COMPILETIMES", nothing) == "true"
    print_timeroutput()
    exit(0)
end
@timeit_include("Events.jl")
@timeit_include("WorkspaceManager.jl")
@timeit_include("packages/Basic.jl")
@timeit_include("Bonds.jl")
@timeit_include("RichOutput.jl")
@timeit_include("React.jl")
@timeit_include("Dynamic.jl")
@timeit_include("MacroAnalysis.jl")
@timeit_include("Logging.jl")
@timeit_include("webserver.jl")
@timeit_include("Notebook.jl")
@timeit_include("Configuration.jl")

# tests that don't start new processes:
@timeit_include("ReloadFromFile.jl")
@timeit_include("packages/PkgCompat.jl")
@timeit_include("ExpressionExplorer.jl")
@timeit_include("MethodSignatures.jl")
@timeit_include("MoreAnalysis.jl")
@timeit_include("Analysis.jl")
@timeit_include("webserver_utils.jl")
@timeit_include("data structures.jl")
@timeit_include("DependencyCache.jl")
@timeit_include("Throttled.jl")
@timeit_include("cell_disabling.jl")

print_timeroutput()

# TODO: test PlutoRunner functions like:
# - from_this_notebook

# TODO: test include() inside notebooks

# TODO: test async execution order
# TODO: test @bind

# TODO: test if notebooks are saved correctly after edits
