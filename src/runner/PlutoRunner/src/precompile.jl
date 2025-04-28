using PrecompileTools: PrecompileTools
using UUIDs: uuid1

const __TEST_NOTEBOOK_ID = uuid1()
const __precompile_test_workspace = VERSION < v"1.12.0-aaa" ? Module() : Main

PrecompileTools.@compile_workload begin
    let
        channel = Channel{Any}(10)
        PlutoRunner.setup_plutologger(
            __TEST_NOTEBOOK_ID,
            channel,
        )
    end
    expr = Expr(:toplevel, :(1 + 1))
    cell_id = uuid1()
    PlutoRunner.run_expression(__precompile_test_workspace, expr, __TEST_NOTEBOOK_ID, cell_id, nothing);
    PlutoRunner.formatted_result_of(__TEST_NOTEBOOK_ID, cell_id,
                                    false, String[], nothing, __precompile_test_workspace; capture_stdout=true)
    foreach(("sq", "\\sq", "Base.a", "sqrt(", "sum(x; dim")) do s
        PlutoRunner.completion_fetcher(s, s, Main)
    end
end
