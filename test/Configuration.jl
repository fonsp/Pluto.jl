using HTTP
using Test
using Pluto
using Pluto: ServerSession
using Pluto.Configuration
using Pluto.Configuration: notebook_path_suggestion, from_flat_kwargs, _convert_to_flags

@testset "Configurations" begin

cd(Pluto.project_relative_path("test")) do
    @test notebook_path_suggestion() == joinpath(pwd(), "")
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

        @test _convert_to_flags(Configuration.CompilerOptions(threads=123)) ==
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

@testset "authentication" begin
    port = 1238
    server = Pluto.Configuration.ServerOptions(; port=port, launch_browser=false)
    options = Pluto.Configuration.Options(; server=server)
    session = Pluto.ServerSession(; options=options)
    host = session.options.server.host
    @async Pluto.run(session)

    url(suffix) = "http://$host:$port/$suffix"
    @test HTTP.get(url("favicon.ico")).status == 200

    function access_denied(url)
        try
            HTTP.get(url)
            return false
        catch e
            return e.status == 403 || e.status == 404
        end
    end

    routes = [
        "",
        "edit",
        "foo",
        "new",
        "notebookfile",
        "notebookexport",
        "open",
        "sample/Interactivity.jl",
        "statefile",
    ]
    for suffix in routes
        @test access_denied(url(suffix))
    end
end

end # testset
