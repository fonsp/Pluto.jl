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

    @testset "Minimal 2D Physics Model" begin
        #=
        Model of body with two points thrust can be applied
        No gravity or nonconservative forces

        thrust_left     thrust_right
        ↑_______________↑  ← physical body
                |◞ θ
                |

        Has initial conditions x₀, y₀, θ₀, vx₀, vy₀, ω₀
        =#
        model_nb = Notebook([
            # body properties
            Cell("mass = 1."),
            Cell("radius = 0.5"),
            Cell("rotational_inertia = 1."),

            # body initial state
            Cell("x₀, y₀, θ₀ = 0., 0., π/2"),
            Cell("vx₀, vy₀, ω₀ = 0., 0., 0."),
            Cell("initial_state = (; x=x₀, y=y₀, vx=vx₀, vy=vy₀, θ=θ₀, ω=ω₀)"),

            # simulation parameters
            Cell("t_final = 5"),
            Cell("Δt = 0.01"),
            Cell("tspan = 0:Δt:t_final"),
            Cell("thrust_left, thrust_right = 0., 0."),
            Cell("T(state_log) = [thrust_left, thrust_right]"),

            # simulation code
            Cell("""
                state_transition(s, P, Δt) = begin
                    T = sum(P)
                    
                    ax = T * cos(s.θ) / mass
                    ay = T * sin(s.θ) / mass
                    α = (radius / rotational_inertia) * (P[2] - P[1])
                    
                    (
                        x  = s.x + s.vx * Δt + 0.5 * ax * Δt^2,
                        y  = s.y + s.vy * Δt + 0.5 * ay * Δt^2,
                        vx = s.vx + ax * Δt,
                        vy = s.vy + ay * Δt,
                        θ  = s.θ + s.ω * Δt,
                        ω  = s.ω + α * Δt
                    )
                end
            """),
            Cell("""
                function state_during_steps(s, T, t_final, Δt)
                    state_log = [s]
                    thrust_log = [T(state_log)]
                    for t ∈ Δt:Δt:t_final
                        thrust = T(state_log)
                        push!(state_log, state_transition(state_log |> last, thrust, Δt))
                        push!(thrust_log, thrust)
                    end
                    state_log, thrust_log
                end
            """),
            Cell("states, thrusts = state_during_steps(initial_state, T, t_final, Δt)"),
            Cell("last_state = states |> last")
        ])

        🍭.notebooks[model_nb.notebook_id] = model_nb
        update_run!(🍭, model_nb, model_nb.cells)

        # by default no forces are applied and body is at rest
        # meaning no change to initial conditions should occur
        last_state_req1 = REST.get_notebook_output(🍭, model_nb, model_nb.topology, Dict{Symbol, Any}(), Set([:last_state]))
        @test haskey(last_state_req1, :last_state)
        @test last_state_req1[:last_state].x ≈ 0.
        @test last_state_req1[:last_state].y ≈ 0.

        # test the model with constant velocity
        t_final2, vx2, vy2 = 5., 1., 2.
        last_state_req2 = REST.get_notebook_output(🍭, model_nb, model_nb.topology, Dict{Symbol, Any}(
            :t_final => t_final2,
            :vx₀ => vx2,
            :vy₀ => vy2
        ), Set([:last_state]))
        @test haskey(last_state_req2, :last_state)
        @test last_state_req2[:last_state].x ≈ t_final2 * vx2
        @test last_state_req2[:last_state].y ≈ t_final2 * vy2

        # test the model with constant acceleration and an initial velocity
        # the body is rotated upwards, so thrust is applied along y-axis
        t_final3, thrust3, vx3, vy3 = 5., 1., -1., 0.5
        last_state_req3 = REST.get_notebook_output(🍭, model_nb, model_nb.topology, Dict{Symbol, Any}(
            :t_final => t_final3,
            :thrust_left => thrust3,
            :thrust_right => thrust3,
            :vx₀ => vx3,
            :vy₀ => vy3
        ), Set([:last_state]))
        @test haskey(last_state_req3, :last_state)
        @test last_state_req3[:last_state].x ≈ vx3 * t_final3
        @test last_state_req3[:last_state].y ≈ 0.5 * (2 * thrust3) * t_final3 ^ 2 + vy3 * t_final3
    end
end
