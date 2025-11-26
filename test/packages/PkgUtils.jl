
using Pluto.WorkspaceManager: WorkspaceManager, poll
using Pluto


without_pluto_version(s) = replace(s, r"# v.*" => "")


@testset "PkgUtils" begin
    
    @testset "activate_notebook_environment" begin
        file = Pluto.PkgUtils.testnb()
        before = without_pluto_version(read(file, String))
        @assert :activate_notebook_environment in names(Pluto)
        
        @test !occursin("Artifacts", Pluto.PkgCompat.read_project_file(Pluto.load_notebook_nobackup(file)))
        
        ap_before = Base.ACTIVE_PROJECT[]
        
        
        ###
        
        Pluto.activate_notebook_environment(file; show_help=false)
        @test Base.ACTIVE_PROJECT[] != ap_before
        
        @test sort(collect(keys(Pkg.project().dependencies))) == ["Dates"]
        
        Pkg.add("Artifacts")
        @test sort(collect(keys(Pkg.project().dependencies))) == ["Artifacts", "Dates"]
        
        
        ### EXIT, activate another env
        Base.ACTIVE_PROJECT[] = ap_before
        
        
        ###
        # get embedded project.toml from notebook:
        # (poll to wait for our previous changes to get picked up)
        @test poll(60, 1/4) do
            occursin("Artifacts", Pluto.PkgCompat.read_project_file(Pluto.load_notebook_nobackup(file)))
        end
        
        after = without_pluto_version(read(file, String))
        @test before != after
        @test occursin("Artifacts", after)
    end
    
    
    
    
    @testset "activate_notebook_environment, functional 1" begin
        file = Pluto.PkgUtils.testnb()
        before = read(file, String)
        @assert :activate_notebook_environment in names(Pluto)
        
        ###
        projs = Pluto.activate_notebook_environment(file) do
            Pkg.project()
        end
        
        after = read(file, String)
        
        @test projs !== nothing
        @test sort(collect(keys(projs.dependencies))) == ["Dates"]
        
        @test before == after
    end
    
    
    
    
    @testset "activate_notebook_environment, functional 2" begin
        file = Pluto.PkgUtils.testnb()
        before = without_pluto_version(read(file, String))
        @assert :activate_notebook_environment in names(Pluto)
        
        @test !occursin("Artifacts", Pluto.PkgCompat.read_project_file(Pluto.load_notebook_nobackup(file)))
        @test !occursin("Artifacts", before)
        
        
        ###
        projs = Pluto.activate_notebook_environment(file) do
            Pkg.add("Artifacts")
        end
        
        after = without_pluto_version(read(file, String))
        
        @test occursin("Artifacts", Pluto.PkgCompat.read_project_file(Pluto.load_notebook_nobackup(file)))
        
        @test before != after
        @test occursin("Artifacts", after)
    end
    
    
    
    
    @testset "reset_notebook_environment" begin
        file = Pluto.PkgUtils.testnb()
        before = without_pluto_version(read(file, String))
        @assert :reset_notebook_environment in names(Pluto)
        
        # project.toml fake cell id
        @test occursin("00001", before)
        @test occursin("[deps]", before)
        
        
        ###
        Pluto.reset_notebook_environment(file; backup=false)
        
        
        after = without_pluto_version(read(file, String))
        
        @test before != after
        # project.toml fake cell id
        @test !occursin("00001", after)
        @test !occursin("[deps]", after)
        
    end
    
    
    
    
    # TODO: too lazy to get a notebook with updatable package so just running the function and checking for errors
    @testset "update_notebook_environment" begin
        file = Pluto.PkgUtils.testnb()
        before = without_pluto_version(read(file, String))
        @assert :update_notebook_environment in names(Pluto)
        
        ###
        Pluto.update_notebook_environment(file)
        
        
        # whatever
        after = without_pluto_version(read(file, String))
        @test occursin("[deps]", after)
    end
    
    
    
    @testset "will_use_pluto_pkg" begin
        file = Pluto.PkgUtils.testnb()
        before = read(file, String)
        @assert :will_use_pluto_pkg in names(Pluto)
        
        ###
        @test Pluto.will_use_pluto_pkg(file)
        
        
        after = read(file, String)
        @test before == after
        
        
        file2 = Pluto.PkgUtils.testnb("pkg_cell.jl")
        @test !Pluto.will_use_pluto_pkg(file2)
    end
end


