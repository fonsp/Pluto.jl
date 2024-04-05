using Test
import Pluto
import Pluto: update_run!, update_save_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell
import Malt

@testset "Bonds" begin

    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false
    
    @testset "Don't write to file" begin
        notebook = Notebook([
            Cell("""
            @bind x html"<input>"
            """),
            Cell("x"),
        ])
        update_save_run!(🍭, notebook, notebook.cells)
        
        old_mtime = mtime(notebook.path)
        setcode!(notebook.cells[2], "x #asdf")
        update_save_run!(🍭, notebook, notebook.cells[2])
        @test old_mtime != mtime(notebook.path)
        
        
        old_mtime = mtime(notebook.path)
        function set_bond_value(name, value, is_first_value=false)
            notebook.bonds[name] = Dict("value" => value)
            Pluto.set_bond_values_reactive(; session=🍭, notebook, bound_sym_names=[name],
                is_first_values=[is_first_value],
                run_async=false,
            )
        end
        
        set_bond_value(:x, 1, true)
        @test old_mtime == mtime(notebook.path)
        set_bond_value(:x, 2, false)
        @test old_mtime == mtime(notebook.path)
    end
    
    @testset "AbstractPlutoDingetjes.jl" begin
        🍭.options.evaluation.workspace_use_distributed = true # because we use AbstractPlutoDingetjes
        notebook = Notebook([
                # 1
                Cell("""
                begin
                    import AbstractPlutoDingetjes as APD
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

                # 35 - https://github.com/fonsp/Pluto.jl/issues/2465
                Cell(""),
                Cell("@bind ts2465 TransformSlider()"),
                Cell("ts2465"),
            ])

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
        @test length(notebook.cells) == 37
        
        
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

        # https://github.com/fonsp/Pluto.jl/issues/2465
        update_run!(🍭, notebook, notebook.cells[35:37])

        @test noerror(notebook.cells[35])
        @test noerror(notebook.cells[36])
        @test noerror(notebook.cells[37])
        @test notebook.cells[37].output.body == "\"x\""
        @test isempty(notebook.cells[35].code)

        # this should not deregister the TransformSlider
        setcode!(notebook.cells[35], notebook.cells[36].code)
        setcode!(notebook.cells[36], "")

        update_run!(🍭, notebook, notebook.cells[35:36])
        @test noerror(notebook.cells[35])
        @test noerror(notebook.cells[36])
        @test notebook.cells[37].output.body == "\"x\""

        set_bond_value(:ts2465, 2, false)
        @test noerror(notebook.cells[35])
        @test noerror(notebook.cells[36])
        @test notebook.cells[37].output.body == "\"xx\""

        cleanup(🍭, notebook)
        🍭.options.evaluation.workspace_use_distributed = false
        
        
        # test that the notebook file is runnable:
        
        test_proc = Malt.Worker()
        Malt.remote_eval_wait(test_proc, quote
            import Pkg
            try
                Pkg.UPDATED_REGISTRY_THIS_SESSION[] = true
            catch; end
            Pkg.activate(mktempdir())
            Pkg.add("AbstractPlutoDingetjes")
        end)
        @test Malt.remote_eval_fetch(test_proc, quote
            include($(notebook.path))
            true
        end)
        Malt.stop(test_proc)
    end

    @testset "Dependent Bound Variables" begin
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = true
        notebook = Notebook([
            Cell(raw"""@bind x HTML("<input type=range min=1 max=10>")"""),
            Cell(raw"""@bind y HTML("<input type=range min=1 max=$(x)>")"""),
            Cell(raw"""x"""), #3
            Cell(raw"""y"""), #4
            Cell(raw"""
            begin
                struct TransformSlider
                    range::AbstractRange
                end
                
                Base.show(io::IO, m::MIME"text/html", os::TransformSlider) = write(io, "<input type=range value=$(minimum(os.range)) min=$(minimum(os.range)) max=$(maximum(os.range))>")
                
                Bonds.initial_value(os::TransformSlider) = Bonds.transform_value(os, minimum(os.range))
                Bonds.possible_values(os::TransformSlider) = os.range
                Bonds.transform_value(os::TransformSlider, from_js) = from_js * 2
            end
            """),
            Cell(raw"""begin
                hello1 = 123
                @bind a TransformSlider(1:10)
            end"""),
            Cell(raw"""begin
                hello2 = 234
                @bind b TransformSlider(1:a)
            end"""),
            Cell(raw"""a"""), #8
            Cell(raw"""b"""), #9
            Cell(raw"""hello1"""), #10
            Cell(raw"""hello2"""), #11
            Cell(raw"""using AbstractPlutoDingetjes"""),
        ])
        update_run!(🍭, notebook, notebook.cells)

        # Test the get_bond_names function
        @test Pluto.get_bond_names(🍭, notebook) == Set([:a, :b, :x, :y])

        function set_bond_values!(notebook:: Notebook, bonds:: Dict; is_first_value=false)
            for (name, value) in bonds
                notebook.bonds[name] = Dict("value" => value)
            end
            Pluto.set_bond_values_reactive(; session=🍭, notebook, bound_sym_names=collect(keys(bonds)), run_async=false, is_first_values=fill(is_first_value, length(bonds)))
        end
        
        @test notebook.cells[3].output.body == "missing"
        @test notebook.cells[4].output.body == "missing" # no initial value defined for simple html slider (in contrast to TransformSlider)
        @test notebook.cells[8].output.body == "2"
        @test notebook.cells[9].output.body == "2"
        @test notebook.cells[10].output.body == "123"
        @test notebook.cells[11].output.body == "234"

        set_bond_values!(notebook, Dict(:x => 1, :a => 1); is_first_value=true)
        @test notebook.cells[3].output.body == "1"
        @test notebook.cells[4].output.body == "missing" # no initial value defined for simple html slider (in contrast to TransformSlider)
        @test notebook.cells[8].output.body == "2" # TransformSlider scales values *2
        @test notebook.cells[9].output.body == "2"
        @test notebook.cells[10].output.body == "123"
        @test notebook.cells[11].output.body == "234"

        set_bond_values!(notebook, Dict(:y => 1, :b => 1); is_first_value=true)
        @test notebook.cells[3].output.body == "1"
        @test notebook.cells[4].output.body == "1"
        @test notebook.cells[8].output.body == "2"
        @test notebook.cells[9].output.body == "2"
        @test notebook.cells[10].output.body == "123"
        @test notebook.cells[11].output.body == "234"

        set_bond_values!(notebook, Dict(:x => 5))
        @test notebook.cells[3].output.body == "5"
        @test notebook.cells[4].output.body == "missing" # the slider object is re-defined, therefore its value is the default one

        set_bond_values!(notebook, Dict(:y => 3))
        @test notebook.cells[3].output.body == "5"
        @test notebook.cells[4].output.body == "3"

        set_bond_values!(notebook, Dict(:x => 10, :y => 5))
        @test notebook.cells[3].output.body == "10"
        @test notebook.cells[4].output.body == "5" # this would fail without PR #2014 - previously `y` was reset to the default value `missing`

        set_bond_values!(notebook, Dict(:b => 2))
        @test notebook.cells[8].output.body == "2"
        @test notebook.cells[9].output.body == "4"
        @test notebook.cells[10].output.body == "123"
        @test notebook.cells[11].output.body == "234"

        set_bond_values!(notebook, Dict(:a => 8, :b => 12))
        @test notebook.cells[8].output.body == "16"
        @test notebook.cells[9].output.body == "24" # this would fail without PR #2014
        @test notebook.cells[10].output.body == "123"
        @test notebook.cells[11].output.body == "234"
        
        set_bond_values!(notebook, Dict(:a => 1, :b => 1))
        setcode!(notebook.cells[10], "a + hello1")
        setcode!(notebook.cells[11], "b + hello2")
        update_run!(🍭, notebook, notebook.cells[10:11])
        
        @test notebook.cells[10].output.body == "125"
        @test notebook.cells[11].output.body == "236"
        
        set_bond_values!(notebook, Dict(:a => 2, :b => 2))
        @test notebook.cells[10].output.body == "127"
        @test notebook.cells[11].output.body == "238"
        set_bond_values!(notebook, Dict(:b => 3))
        @test notebook.cells[10].output.body == "127"
        @test notebook.cells[11].output.body == "240"
        set_bond_values!(notebook, Dict(:a => 1))
        @test notebook.cells[10].output.body == "125"
        @test notebook.cells[11].output.body == "236" # changing a will reset b
        
        

        cleanup(🍭, notebook)

    end
end
