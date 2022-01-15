using Test
import Pluto
import Pluto: update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell
import Distributed

@testset "Bonds" begin

    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false
    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient
    
    @testset "AbstractPlutoDingetjes.jl" begin
        🍭.options.evaluation.workspace_use_distributed = true
        notebook = Notebook([
                # 1
                Cell("""
                begin
                    import AbstractPlutoDingetjes
                    const APD = AbstractPlutoDingetjes
                    import AbstractPlutoDingetjes.Bonds
                end
                """),
                # 2
                Cell("""
                begin
                    struct HTMLShower
                        f::Function
                    end
                    Base.show(io::IO, m::MIME"text/html", hs::HTMLShower) = hs.f(io)
                end
                """),
                Cell("""
                APD.is_inside_pluto()
                """),
                # 4
                Cell("""
                HTMLShower() do io
                    write(io, string(APD.is_inside_pluto(io)))
                end
                """),
                Cell("""
                HTMLShower() do io
                    write(io, string(APD.is_supported_by_display(io, Bonds.initial_value)))
                end
                """),
                Cell("""
                HTMLShower() do io
                    write(io, string(APD.is_supported_by_display(io, Bonds.transform_value)))
                end
                """),
                Cell("""
                HTMLShower() do io
                    write(io, string(APD.is_supported_by_display(io, Bonds.validate_value)))
                end
                """),
                Cell("""
                HTMLShower() do io
                    write(io, string(APD.is_supported_by_display(io, sqrt)))
                end
                """),
                # 9
                Cell("""
                @bind x_simple html"<input type=range>"
                """),
                Cell("""
                x_simple
                """),
                # 11
                Cell("""
                begin
                    struct OldSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::OldSlider) = write(io, "<input type=range value=1>")
                    
                    Base.get(os::OldSlider) = 1
                end
                """),
                Cell("""
                @bind x_old OldSlider()
                """),
                Cell("""
                x_old
                """),
                # 14
                Cell("""
                begin
                    struct NewSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::NewSlider) = write(io, "<input type=range value=1>")
                    
                    Bonds.initial_value(os::NewSlider) = 1

                    Bonds.possible_values(s::NewSlider) = [1,2,3]
                end
                """),
                Cell("""
                @bind x_new NewSlider()
                """),
                Cell("""
                x_new
                """),
                # 17
                Cell("""
                begin
                    struct TransformSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::TransformSlider) = write(io, "<input type=range value=1>")
                    
                    Bonds.initial_value(os::TransformSlider) = "x"
                    Bonds.possible_values(os::TransformSlider) = 1:10
                    Bonds.transform_value(os::TransformSlider, from_js) = repeat("x", from_js)
                end
                """),
                Cell("""
                @bind x_transform TransformSlider()
                """),
                Cell("""
                x_transform
                """),
                # 20
                Cell("""
                begin
                    struct BadTransformSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::BadTransformSlider) = write(io, "<input type=range value=1>")
                    
                    Bonds.initial_value(os::BadTransformSlider) = "x"
                    Bonds.possible_values(os::BadTransformSlider) = 1:10
                    Bonds.transform_value(os::BadTransformSlider, from_js) = error("bad")
                end
                """),
                Cell("""
                @bind x_badtransform BadTransformSlider()
                """),
                Cell("""
                x_badtransform
                """),
                # 23
                Cell("""
                count = Ref(0)
                """),
                Cell("""
                @bind x_counter NewSlider() #or OldSlider(), same idea
                """),
                Cell("""
                let
                    x_counter
                    count[] += 1
                end
                """),
                # 26
                Cell("""
                @assert x_old == 1
                """),
                Cell("""
                @assert x_new == 1
                """),
                Cell("""
                @assert x_transform == "x"
                """),
                # 29
                Cell("""
                begin
                    struct PossibleValuesTest
                        possible_values::Any
                    end
                    
                    Base.show(io::IO, m::MIME"text/html", ::PossibleValuesTest) = write(io, "hello")
                    
                    Bonds.possible_values(pvt::PossibleValuesTest) = pvt.possible_values
                end
                """),
                Cell("@bind pv1 PossibleValuesTest(Bonds.NotGiven())"),
                Cell("@bind pv2 PossibleValuesTest(Bonds.InfinitePossibilities())"),
                Cell("@bind pv3 PossibleValuesTest([1,2,3])"),
                Cell("@bind pv4 PossibleValuesTest((x+1 for x in 1:10))"),
                # 34
                Cell("@bind pv5 PossibleValuesTest(1:10)"),
            ])
        fakeclient.connected_notebook = notebook
        
        
        function set_bond_value(name, value, is_first_value=false)
            notebook.bonds[name] = Dict("value" => value)
            Pluto.set_bond_values_reactive(; session=🍭, notebook, bound_sym_names=[name],
                is_first_values=[is_first_value],
                run_async=false,
            )
        end

        # before loading AbstractPlutoDingetjes, test the default behaviour:
        update_run!(🍭, notebook, notebook.cells[9:10])
        @test noerror(notebook.cells[9])
        @test noerror(notebook.cells[10])
        
        @test Pluto.possible_bond_values(🍭, notebook, :x_simple) == :NotGiven
        @test notebook.cells[10].output.body == "missing"
        set_bond_value(:x_simple, 1, true)
        @test notebook.cells[10].output.body == "1"
        
        
        update_run!(🍭, notebook, notebook.cells)

        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])
        @test noerror(notebook.cells[3])
        @test noerror(notebook.cells[4])
        @test noerror(notebook.cells[5])
        @test noerror(notebook.cells[6])
        @test noerror(notebook.cells[7])
        @test noerror(notebook.cells[8])
        
        @test notebook.cells[3].output.body == "true"
        @test notebook.cells[4].output.body == "true"
        @test notebook.cells[5].output.body == "true"
        @test notebook.cells[6].output.body == "true"
        @test notebook.cells[7].output.body == "false"
        @test notebook.cells[8].output.body == "false"
        
        @test noerror(notebook.cells[9])
        @test noerror(notebook.cells[10])
        @test noerror(notebook.cells[11])
        @test noerror(notebook.cells[12])
        @test noerror(notebook.cells[13])
        @test noerror(notebook.cells[14])
        @test noerror(notebook.cells[15])
        @test noerror(notebook.cells[16])
        @test noerror(notebook.cells[17])
        @test noerror(notebook.cells[18])
        @test noerror(notebook.cells[19])
        @test noerror(notebook.cells[20])
        @test noerror(notebook.cells[21])
        @test noerror(notebook.cells[22])
        @test noerror(notebook.cells[23])
        @test noerror(notebook.cells[24])
        @test noerror(notebook.cells[25])
        @test noerror(notebook.cells[26])
        @test noerror(notebook.cells[27])
        @test noerror(notebook.cells[28])
        @test noerror(notebook.cells[29])
        @test noerror(notebook.cells[30])
        @test noerror(notebook.cells[31])
        @test noerror(notebook.cells[32])
        @test noerror(notebook.cells[33])
        @test noerror(notebook.cells[34])
        @test length(notebook.cells) == 34
        
        
        @test Pluto.possible_bond_values(🍭, notebook, :x_new) == [1,2,3]
        @test_throws Exception Pluto.possible_bond_values(🍭, notebook, :asdfasdfx_new)
        @test Pluto.possible_bond_values(🍭, notebook, :pv1) == :NotGiven
        @test Pluto.possible_bond_values(🍭, notebook, :pv2) == :InfinitePossibilities
        @test Pluto.possible_bond_values(🍭, notebook, :pv3) == [1,2,3]
        @test Pluto.possible_bond_values(🍭, notebook, :pv4) == 2:11
        @test Pluto.possible_bond_values(🍭, notebook, :pv5) === 1:10
        @test Pluto.possible_bond_values_length(🍭, notebook, :pv1) == :NotGiven
        @test Pluto.possible_bond_values_length(🍭, notebook, :pv2) == :InfinitePossibilities
        @test Pluto.possible_bond_values_length(🍭, notebook, :pv3) == 3
        @test Pluto.possible_bond_values_length(🍭, notebook, :pv4) == 10
        @test Pluto.possible_bond_values_length(🍭, notebook, :pv5) == 10

        
        
        @test notebook.cells[10].output.body == "missing"
        set_bond_value(:x_simple, 1, true)
        @test notebook.cells[10].output.body == "1"
        
        
        @test notebook.cells[13].output.body == "1"
        set_bond_value(:x_old, 1, true)
        @test notebook.cells[13].output.body == "1"
        set_bond_value(:x_old, 99, false)
        @test notebook.cells[13].output.body == "99"
        
        
        @test notebook.cells[16].output.body == "1"
        set_bond_value(:x_new, 1, true)
        @test notebook.cells[16].output.body == "1"
        set_bond_value(:x_new, 99, false)
        @test notebook.cells[16].output.body == "99"
        
        
        @test notebook.cells[19].output.body == "\"x\""
        set_bond_value(:x_transform, 1, true)
        @test notebook.cells[19].output.body == "\"x\""
        set_bond_value(:x_transform, 3, false)
        @test notebook.cells[19].output.body == "\"xxx\""
        
        
        @test notebook.cells[22].output.body != "missing"
        @info "The following error is expected:"
        set_bond_value(:x_badtransform, 1, true)
        @test notebook.cells[22].output.body != "missing"
        
        
        @test notebook.cells[25].output.body == "1"
        set_bond_value(:x_counter, 1, true)
        @test notebook.cells[25].output.body == "1"
        set_bond_value(:x_counter, 7, false)
        @test notebook.cells[25].output.body == "2"
        
        
        WorkspaceManager.unmake_workspace((🍭, notebook))
        🍭.options.evaluation.workspace_use_distributed = false
        
        
        # test that the notebook file is runnable:
        
        test_proc = Distributed.addprocs(1)[1]
        
        Distributed.remotecall_eval(Main, test_proc, quote
            import Pkg
            try
                Pkg.UPDATED_REGISTRY_THIS_SESSION[] = true
            catch; end
            Pkg.activate(mktempdir())
            Pkg.add("AbstractPlutoDingetjes")
        end)
        @test Distributed.remotecall_eval(Main, test_proc, quote
            include($(notebook.path))
            true
        end)
        Distributed.rmprocs(test_proc)
    end
end
