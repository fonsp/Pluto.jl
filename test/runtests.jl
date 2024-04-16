include("helpers.jl")

# tests that start new processes:

@timeit_include("compiletimes.jl")
verify_no_running_processes()
if get(ENV, "PLUTO_TEST_ONLY_COMPILETIMES", nothing) == "true"
    print_timeroutput()
    exit(0)
end
@timeit_include("Events.jl")
verify_no_running_processes()
@timeit_include("Configuration.jl")
verify_no_running_processes()
@timeit_include("React.jl")
verify_no_running_processes()
@timeit_include("Bonds.jl")
verify_no_running_processes()
@timeit_include("RichOutput.jl")
verify_no_running_processes()
@timeit_include("packages/Basic.jl")
verify_no_running_processes()
@timeit_include("Dynamic.jl")
verify_no_running_processes()
@timeit_include("MacroAnalysis.jl")
verify_no_running_processes()
@timeit_include("Logging.jl")
verify_no_running_processes()
@timeit_include("webserver.jl")
verify_no_running_processes()
@timeit_include("Firebasey.jl")
verify_no_running_processes()
@timeit_include("Notebook.jl")
verify_no_running_processes()
@timeit_include("WorkspaceManager.jl")
verify_no_running_processes()

# tests that don't start new processes:
@timeit_include("ReloadFromFile.jl")
@timeit_include("packages/PkgCompat.jl")
@timeit_include("MethodSignatures.jl")
@timeit_include("MoreAnalysis.jl")
@timeit_include("is_just_text.jl")
@timeit_include("webserver_utils.jl")
@timeit_include("DependencyCache.jl")
@timeit_include("Throttled.jl")
@timeit_include("cell_disabling.jl")

verify_no_running_processes()

print_timeroutput()
@timeit_include("ExpressionExplorer.jl")

