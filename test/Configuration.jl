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
    secret = session.secret
    server_task = @async Pluto.run(session)

    local_url(suffix) = "http://$host:$port/$suffix"
    @test HTTP.get(local_url("favicon.ico")).status == 200

    function access_denied(url)
        r = HTTP.get(url, status_exception=false)
        r.status == 403 || r.status == 404
    end

    function access_granted(url)
        url = occursin('?', url) ? "$url&secret=$secret" : "$url?secret=$secret"
        r = HTTP.get(url, status_exception=false)
        r.status != 403
    end

    routes = [
        "/",
        "edit/",
        # Interactivity.jl sample.
        "edit?id=f30203d4-b88c-11eb-3320-a39e462705a0",
        "foo",
        "foo/",
        "new",
        "notebookfile/",
        "notebookexport/",
        "open/",
        "statefile",
    ]
    for suffix in routes
        url = local_url(suffix)
        @test access_denied(url)

        if suffix != "new"
            @test access_granted(url)
        end
    end

    @async schedule(server_task, InterruptException(); error=true)
end

end # testset
