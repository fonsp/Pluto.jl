using Test
using Pluto
using Pluto.Configuration
using Pluto.Configuration: overlayed, notebook_path_suggestion, from_flat_kwargs
using Pluto.WorkspaceManager: _convert_to_flags

@testset "Configurations" begin

cd(Pluto.project_relative_path("test")) do
    @test notebook_path_suggestion() == joinpath(pwd(), "")
end

@testset "overlayed" begin
    opt = Configuration.CompilerOptions()
    @test opt.compile === nothing
    @test overlayed(opt; compile="min").compile == "min"    
end

@testset "from_flat_kwargs" begin
    opt = from_flat_kwargs(;compile="min", project="test")
    @test opt.compiler.compile == "min"
    @test opt.compiler.project == "test"

    @test_throws ArgumentError from_flat_kwargs(;fake_project="test")    
end

@testset "flag conversion" begin
    if VERSION > v"1.5.0-"
        @test _convert_to_flags(Configuration.CompilerOptions(threads="123")) ==
            ["--project=@.", "--startup-file=no", "--history-file=no", "--threads=123"]

        @test _convert_to_flags(Configuration.CompilerOptions()) ⊇
            ["--project=@.", "--startup-file=no", "--history-file=no"]
    else
        @test _convert_to_flags(Configuration.CompilerOptions()) ==
            ["--project=@.", "--startup-file=no", "--history-file=no"]
    end
    @test _convert_to_flags(Configuration.CompilerOptions(compile="min")) ⊇
    ["--compile=min", "--project=@.", "--startup-file=no", "--history-file=no"]

    @test _convert_to_flags(Configuration.CompilerOptions(compile="min", project="test")) ⊇
    ["--compile=min", "--project=test", "--startup-file=no", "--history-file=no"]
end

end # testset
