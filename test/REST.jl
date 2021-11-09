using Test
import Pluto: REST, Notebook, Cell, ServerSession, update_run!

@testset "REST API" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false

    @testset "Simple Distance Example" begin
        # my favorite simple example
        dist_nb = Notebook([
            Cell("""a=3"""),
            Cell("""b=4"""),
            Cell("""c=√(a^2 + b^2)"""),

            Cell("""pt=[1., 2, 3, 4, 5]"""),
            Cell("""dist=√(sum(pt .^ 2))"""),

            Cell("""distnd(p...) = √(sum(p .^ 2))""")
        ])

        🍭.notebooks[dist_nb.notebook_id] = dist_nb
        update_run!(🍭, dist_nb, dist_nb.cells)

        # test directly defined variable value
        a_var_req = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(), Set([:a]))
        @test haskey(a_var_req, :a)
        @test a_var_req[:a] == 3

        # test indirectly defined variable value
        c_var_req = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(), Set([:c]))
        @test haskey(c_var_req, :c)
        @test c_var_req[:c] == 5.

        # test direct update
        b_mod_val = 3.141592
        b_mod_req = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(:b => b_mod_val), Set([:b]))
        @test haskey(b_mod_req, :b)
        @test b_mod_req[:b] == b_mod_val

        # test unrelated update
        b_mod_a_req = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(:b => b_mod_val), Set([:a]))
        @test haskey(b_mod_a_req, :a)
        @test b_mod_a_req[:a] == 3

        # test indirect update
        ab_mod_c_req = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(:a => 5, :b => 12), Set([:c]))
        @test haskey(ab_mod_c_req, :c)
        @test ab_mod_c_req[:c] == 13

        # tests for slightly more complex input/output function
        pt_mod_dist_req1 = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(:pt => [3, 4]), Set([:dist]))
        @test haskey(pt_mod_dist_req1, :dist)
        @test pt_mod_dist_req1[:dist] == 5

        pt_mod_dist_req2 = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(:pt => [12, 3, 4]), Set([:dist]))
        @test haskey(pt_mod_dist_req2, :dist)
        @test pt_mod_dist_req2[:dist] == 13

        pt_mod_dist_req3 = REST.get_notebook_output(🍭, dist_nb, dist_nb.topology, Dict{Symbol, Any}(:pt => collect(repeat([1], 16))), Set([:dist]))
        @test haskey(pt_mod_dist_req3, :dist)
        @test pt_mod_dist_req3[:dist] == 4

        # test local session function call
        @test REST.get_notebook_call(🍭, dist_nb, :distnd, [3, 4], Dict()) == 5.
        @test REST.get_notebook_call(🍭, dist_nb, :distnd, [3, 12, 4], Dict()) == 13.
        @test REST.get_notebook_call(🍭, dist_nb, :distnd, collect(repeat([1], 16)), Dict()) == 4.
    end
end
