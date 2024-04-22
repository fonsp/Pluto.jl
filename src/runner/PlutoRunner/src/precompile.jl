using PrecompileTools: PrecompileTools
using UUIDs: uuid1

const __TEST_NOTEBOOK_ID = uuid1()

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
    workspace = Module()
    PlutoRunner.run_expression(workspace, expr, __TEST_NOTEBOOK_ID, cell_id, nothing);
    PlutoRunner.formatted_result_of(__TEST_NOTEBOOK_ID, cell_id,
                                    false, String[], nothing, workspace; capture_stdout=true)
    foreach(("sq", "\\sq", "Base.a", "sqrt(", "sum(x; dim")) do s
        PlutoRunner.completion_fetcher(s, ncodeunits(s), Main)
    end
end
