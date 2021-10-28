include("./helpers.jl")


const test_id = Ref(0)
function forme()
    num_test_runners = parse(Int, get(ENV, "PLUTO_TEST_NUM_RUNNERS", "1"))
    my_id = parse(Int, get(ENV, "PLUTO_TEST_RUNNER_ID", "0"))
    
    
    should_run = (my_id % num_test_runners) == (test_id[] % num_test_runners)
    
    test_id[] += 1
    should_run
end


# tests that start new processes:
forme() && include("./WorkspaceManager.jl")
forme() && include("./packages/Basic.jl")
forme() && (VERSION < v"1.7.0-a" && include("./RichOutput.jl"))
forme() && include("./React.jl")
forme() && include("./Dynamic.jl")
forme() && include("./MacroAnalysis.jl")

# for SOME reason 😞 the Notebook.jl tests need to run AFTER all the tests above, or the Github Actions runner on Windows gets internal julia errors.
forme() && include("./Notebook.jl")

# tests that don't start new processes:
forme() && include("./ReloadFromFile.jl")
forme() && include("./packages/PkgCompat.jl")
forme() && include("./ExpressionExplorer.jl")
forme() && include("./MethodSignatures.jl")
forme() && (VERSION < v"1.7.0-a" && include("./Configuration.jl"))
forme() && include("./Analysis.jl")
forme() && include("./Firebasey.jl")
forme() && include("./DependencyCache.jl")
forme() && include("./Throttled.jl")
forme() && include("./cell_disabling.jl")

# TODO: test PlutoRunner functions like:
# - from_this_notebook

# TODO: test include() inside notebooks

# TODO: test async execution order
# TODO: test @bind

# TODO: test if notebooks are saved correctly after edits
