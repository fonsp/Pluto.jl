using Test
import Pluto
import Pluto: update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell


@testset "Bonds" begin

    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = false
    fakeclient = ClientSession(:fake, nothing)
    🍭.connected_clients[fakeclient.id] = fakeclient
    
    @testset "AbstractPlutoDingetjes.jl" begin
        🍭.options.evaluation.workspace_use_distributed = true
        notebook = Notebook([
                Cell("""
                begin
                    import Pkg
                    try
                        Pkg.UPDATED_REGISTRY_THIS_SESSION[] = true
                    catch; end
                    Pkg.activate(mktempdir())
                    Pkg.add(Pkg.PackageSpec(name="AbstractPlutoDingetjes", rev="30f4f76"))
                    import AbstractPlutoDingetjes
                    const APD = AbstractPlutoDingetjes
                    import AbstractPlutoDingetjes.Bonds
                end
                """),
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
                Cell("""
                @bind x_simple html"<input type=range>"
                """),
                Cell("""
                x_simple
                """),
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
                Cell("""
                begin
                    struct NewSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::NewSlider) = write(io, "<input type=range value=1>")
                    
                    Bonds.initial_value(os::NewSlider) = 1
                end
                """),
                Cell("""
                @bind x_new NewSlider()
                """),
                Cell("""
                x_new
                """),
                Cell("""
                begin
                    struct TransformSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::TransformSlider) = write(io, "<input type=range value=1>")
                    
                    Bonds.initial_value(os::TransformSlider) = "x"
                    Bonds.transform_value(os::TransformSlider, from_js) = repeat("x", from_js)
                end
                """),
                Cell("""
                @bind x_transform TransformSlider()
                """),
                Cell("""
                x_transform
                """),
                Cell("""
                begin
                    struct BadTransformSlider end
                    
                    Base.show(io::IO, m::MIME"text/html", os::BadTransformSlider) = write(io, "<input type=range value=1>")
                    
                    Bonds.initial_value(os::BadTransformSlider) = "x"
                    Bonds.transform_value(os::BadTransformSlider, from_js) = repeat("x", from_js)
                end
                """),
                Cell("""
                @bind x_badtransform BadTransformSlider()
                """),
                Cell("""
                x_badtransform
                """),
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
                Cell("""
                @assert x_old == 1
                """),
                Cell("""
                @assert x_new == 1
                """),
                Cell("""
                @assert x_transform == "x"
                """),
            ])
        fakeclient.connected_notebook = notebook

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
        
        
        function set_bond_value(name, value, is_first_value=false)
            notebook.bonds[name] = Dict("value" => value, "is_first_value" => is_first_value)
            Pluto.set_bond_values_reactive(;
                session=🍭,
                notebook=notebook,
                bound_sym_names=[name],
                run_async=false,
            )
        end
        
        
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
        set_bond_value(:x_badtransform, 1, true)
        @test notebook.cells[22].output.body != "missing"
        set_bond_value(:x_badtransform, 7, false)
        @test notebook.cells[22].output.body != "missing"
        
        
        @test notebook.cells[25].output.body == "1"
        set_bond_value(:x_counter, 1, true)
        @test notebook.cells[25].output.body == "1"
        set_bond_value(:x_counter, 7, false)
        @test notebook.cells[25].output.body == "2"
        
        
        WorkspaceManager.unmake_workspace((🍭, notebook))
        🍭.options.evaluation.workspace_use_distributed = false
        
        
        @test jl_is_runnable(notebook.path)
        
        # should_not_run = """
        # @assert 1 == 2
        # """
        # p = tempname()
        # write(p, should_not_run)
        # @test !jl_is_runnable(p)
        
    end
end
