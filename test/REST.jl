using Test
import Pluto: REST, Notebook, Cell, ServerSession, update_run!
import Pluto.WorkspaceManager: poll
import Pluto
import HTTP
using PlutoRESTClient

@testset "REST API" begin
    # test REST module's functions directly with no HTTP middle-man
    @testset "Serverless" begin
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

    # test REST functions through HTTP requests to live Pluto server
    @testset "Live Server" begin
        port = 13432
        host = "localhost"
        local_url(suffix) = "http://$host:$port/$suffix"

        
        server_running() = HTTP.get(local_url("favicon.ico")).status == 200 && HTTP.get(local_url("edit")).status == 200
        

        options = Pluto.Configuration.from_flat_kwargs(; port, launch_browser=false, workspace_use_distributed=false, require_secret_for_access=false, require_secret_for_open_links=false)
        🍭 = Pluto.ServerSession(; options)
        server_task = @async Pluto.run(🍭)
        @test poll(5) do
            server_running()
        end


        # store this so we can delete it after completing tests
        nb_path = Pluto.numbered_until_new(joinpath(Pluto.new_notebooks_directory(), Pluto.cutename()))

        ints = [11, 34, 17, 52, 26, 13, 40, 20]
        floats = [Float64(3.141592), Float32(2.71828), Float16(2.530)]
        strs = ["Hello, world!", "This is the way"]
        test_nb = Notebook([
            # integer types
            Cell("""i64  = Int64($(ints[1]))"""),
            Cell("""i32  = Int32($(ints[2]))"""),
            Cell("""i16  = Int16($(ints[3]))"""),
            Cell("""i8   = Int8($(ints[4]))"""),
            Cell("""ui64 = UInt64($(ints[5]))"""),
            Cell("""ui32 = UInt32($(ints[6]))"""),
            Cell("""ui16 = UInt16($(ints[7]))"""),
            Cell("""ui8  = UInt8($(ints[8]))"""),

            # float types
            Cell("""f64 = Float64($(floats[1]))"""),
            Cell("""f32 = Float32($(floats[2]))"""),
            Cell("""f16 = Float16($(floats[3]))"""),

            # bool
            Cell("""b = true"""),
            
            # higher-order types
            Cell("""str1 = \"$(strs[1])\""""),
            Cell("""str2 = \"$(strs[2])\""""),
            Cell("""t1 = Tuple{Int, Int}((3, 4))"""),
            Cell("""t2 = Tuple{Int, String}((3, "🐤"))"""),
            Cell("""c1 = \'C\'"""),
            Cell("""cx1 = 1 + 2im"""),
            Cell("""arr1 = Char['A', 'C', 'B', 'D']"""),
            Cell("""arr2 = UInt8[0xFF, 0x90, 0x00]"""),

            # dependencies
            Cell("""d1 = 1"""),
            Cell("""d2 = 2"""),
            Cell("""d3 = d1 + d2"""),
            Cell("""d4 = zeros(Int, d3)"""),
        ], nb_path)

        🍭.notebooks[test_nb.notebook_id] = test_nb
        update_run!(🍭, test_nb, test_nb.cells)

        rest_nb = PlutoNotebook(basename(nb_path), "$host:$port")
        # check values
        @test rest_nb.i64  == ints[1]
        @test rest_nb.i32  == ints[2]
        @test rest_nb.i16  == ints[3]
        @test rest_nb.i8   == ints[4]
        @test rest_nb.ui64 == ints[5]
        @test rest_nb.ui32 == ints[6]
        @test rest_nb.ui16 == ints[7]
        @test rest_nb.ui8  == ints[8]
        @test rest_nb.f64  == floats[1]
        @test rest_nb.f32  == floats[2]
        @test rest_nb.f16  == floats[3]
        @test rest_nb.b

        # check types
        @test typeof(rest_nb.i64)  == Int64
        @test typeof(rest_nb.i32)  == Int32
        @test typeof(rest_nb.i16)  == Int16
        @test typeof(rest_nb.i8)   == Int8
        @test typeof(rest_nb.ui64) == UInt64
        @test typeof(rest_nb.ui32) == UInt32
        @test typeof(rest_nb.ui16) == UInt16
        @test typeof(rest_nb.ui8)  == UInt8
        @test typeof(rest_nb.f64)  == Float64
        @test typeof(rest_nb.f32)  == Float32
        @test typeof(rest_nb.f16)  == Float16
        @test typeof(rest_nb.b)    == Bool

        # higher-order types
        @test rest_nb.str1 == strs[1]
        @test rest_nb.str2 == strs[2]
        @test rest_nb.t1   == (3, 4)
        @test rest_nb.t2   == (3, "🐤")
        @test rest_nb.c1   == 'C'
        @test rest_nb.cx1  == 1 + 2im
        @test all(rest_nb.arr1 .== Char['A', 'C', 'B', 'D'])
        @test all(rest_nb.arr2 .== UInt8[0xFF, 0x90, 0x00])

        @test typeof(rest_nb.str1) == String
        @test typeof(rest_nb.str2) == String
        @test typeof(rest_nb.t1)   == Tuple{Int64, Int64}
        @test typeof(rest_nb.t2)   == Tuple{Int64, String}
        @test typeof(rest_nb.c1)   == Char
        @test typeof(rest_nb.cx1)  == Complex{Int64}
        @test typeof(rest_nb.arr1) == Vector{Char}
        @test typeof(rest_nb.arr2) == Vector{UInt8}


        # dependencies
        @test rest_nb.d1 == 1
        @test rest_nb.d2 == 2
        @test rest_nb.d3 == 3
        @test length(rest_nb.d4) == 3
        @test rest_nb(; d1=0, d2=0).d3 == 0
        @test length(rest_nb(; d1=0, d2=0).d4) == 0
        @test length(rest_nb(; d1=0, d2=2).d4) == 2
        @test length(rest_nb(; d1=0, d2=200).d4) == 200
        @test length(rest_nb(; d1=10, d2=200).d4) == 210
        @test length(rest_nb(; d1=10, d2=200, d3=300).d4) == 210  # we prefer the upstream values over downstream ones
        @test rest_nb(d1 = "Hello world").d1 == "Hello world"
        @test rest_nb(d1 = "Hello world").d2 == 2
        @test rest_nb(d4 = zeros(50)).d3 == 3


        @async schedule(server_task, InterruptException(); error=true)
        rm(nb_path)
    end
end
