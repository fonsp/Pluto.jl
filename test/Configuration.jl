using HTTP
using Test
using Pluto
using Pluto: ServerSession, ClientSession, SessionActions
using Pluto.Configuration
using Pluto.Configuration: notebook_path_suggestion, from_flat_kwargs, _convert_to_flags
using Pluto.WorkspaceManager: poll
import URIs

@testset "Configurations" begin

cd(Pluto.project_relative_path("test")) do
    @test notebook_path_suggestion() == joinpath(pwd(), "")
end

@testset "from_flat_kwargs" begin
    opt = from_flat_kwargs(; compile="min", launch_browser=false)
    @test opt.compiler.compile == "min"
    @test opt.server.launch_browser == false

    @test_throws MethodError from_flat_kwargs(; asdfasdf="test")

    structs_kwargs = let
        structs = [
            Pluto.Configuration.ServerOptions,
            Pluto.Configuration.SecurityOptions,
            Pluto.Configuration.EvaluationOptions,
            Pluto.Configuration.CompilerOptions
        ]
        sets = [collect(fieldnames(s)) for s in structs]
        vcat(sets...)::Vector{Symbol}
    end

    from_flat_kwargs_kwargs = let
        method = only(methods(Pluto.Configuration.from_flat_kwargs))
        syms = method.slot_syms
        names = split(syms, "\0")[2:end-1]
        Symbol.(names)::Vector{Symbol}
    end

    # Verify that all struct fields can be set via `from_flat_kwargs`.
    # Also verifies ordering to improve code readability.
    @test structs_kwargs == from_flat_kwargs_kwargs
end

@testset "flag conversion" begin
    reference_flags = ["--startup-file=no", "--history-file=no", "--threads=123"]

    @test _convert_to_flags(Configuration.CompilerOptions(threads="123")) == reference_flags
    @test _convert_to_flags(Configuration.CompilerOptions(threads=123)) == reference_flags

    @test _convert_to_flags(Configuration.CompilerOptions()) ⊇
        ["--startup-file=no", "--history-file=no"]

    @test _convert_to_flags(Configuration.CompilerOptions(compile="min")) ⊇
    ["--compile=min", "--startup-file=no", "--history-file=no"]
end

@testset "Authentication" begin
    basic_nb_path = Pluto.project_relative_path("sample", "Basic.jl")

    port = 1238
    options = Pluto.Configuration.from_flat_kwargs(; port, launch_browser=false, workspace_use_distributed=false)
    🍭 = Pluto.ServerSession(; options)
    host = 🍭.options.server.host
    secret = 🍭.secret
    println("Launching test server...")
    server = Pluto.run!(🍭)

    local_url(suffix) = "http://$host:$port/$suffix"
    withsecret(url) = occursin('?', url) ? "$url&secret=$secret" : "$url?secret=$secret"

    function request(url, method; kwargs...)
        HTTP.request(method, url, nothing, method == "POST" ? read(basic_nb_path) : UInt8[]; status_exception=false, redirect=false, cookies=false, kwargs...)
    end
    
    function shares_secret(response)
        any(occursin(secret, y) for (x,y) in response.headers)
    end
    
    public_routes = [
        ("favicon.ico", "GET"),
        ("possible_binder_token_please", "GET"),
        ("index.css", "GET"),
        ("index.js", "GET"),
        ("img/favicon-32x32.png", "GET"),
    ]
    
    broken_routes = [
        ("../tsconfig.json", "GET"),
        ("/img/", "GET"),
        ("open.png?url=$(URIs.escapeuri("https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.14.5/sample/Basic.jl"))", "GET"),
    ]
    
    for (suffix, method) in public_routes
        url = local_url(suffix)
        r = request(url, method)
        @test r.status == 200
        @test !shares_secret(r)
    end
    
    for (suffix, method) in broken_routes
        url = local_url(suffix)
        r = request(url, method)
        @test r.status ∈ 400:499
        @test !shares_secret(r)
    end
    

    nb = SessionActions.open(🍭, basic_nb_path; as_sample=true)

    simple_routes = [
        ("", "GET"),
        ("edit?id=$(nb.notebook_id)", "GET"),
        ("editor.html", "GET"),
        ("notebookfile?id=$(nb.notebook_id)", "GET"),
        ("notebookexport?id=$(nb.notebook_id)", "GET"),
        ("statefile?id=$(nb.notebook_id)", "GET"),
    ]

    function tempcopy(x)
        p = tempname()
        Pluto.readwrite(x, p)
        p
    end
    @assert isfile(basic_nb_path)

    effect_routes = [
        ("new", "GET"),
        ("new", "POST"),
        ("open?url=$(URIs.escapeuri("https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.14.5/sample/Basic.jl"))", "GET"),
        ("open?url=$(URIs.escapeuri("https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.14.5/sample/Basic.jl"))&execution_allowed=asdf", "GET"),
        ("open?url=$(URIs.escapeuri("https://raw.githubusercontent.com/fonsp/Pluto.jl/v0.14.5/sample/Basic.jl"))", "POST"),
        ("open?path=$(URIs.escapeuri(basic_nb_path |> tempcopy))", "GET"),
        ("open?path=$(URIs.escapeuri(basic_nb_path |> tempcopy))", "POST"),
        ("sample/Basic.jl", "GET"),
        ("sample/Basic.jl", "POST"),
        ("notebookupload", "POST"),
        ("notebookupload?execution_allowed=asdf", "POST"),
    ]

    @testset "simple & effect w/o auth $suffix $method" for (suffix, method) in simple_routes ∪ effect_routes
        url = local_url(suffix)
        r = request(url, method)
        @test r.status == 403
        @test !shares_secret(r)
    end

    # no notebooks were opened
    @test length(🍭.notebooks) == 1
    
    @testset "require secret only for open links" begin
        @test !shares_secret(request(local_url(""), "GET"))
        jar = HTTP.Cookies.CookieJar()
        
        # Let's test the config
        # require_secret_for_access = false
        # require_secret_for_open_links = true
        🍭.options.security.require_secret_for_access = false
        
        # Effectful paths should not work without a secret.
        @testset "simple & effect w/o auth 1 $suffix $method" for (suffix, method) in effect_routes
            url = local_url(suffix)
            r = request(url, method; cookies=true, jar)
            @test r.status == 403
            @test !shares_secret(r)
        end
        
        # With this config, the / path should work and share the secret, even when requested without a secret.
        r = request(local_url(""), "GET"; cookies=true, jar)
        @test r.status == 200
        @test shares_secret(r)
        
        # Now, the other effectful paths should work bc of the secret.
        @testset "simple w/o auth 2 $suffix $method" for (suffix, method) in simple_routes
            url = local_url(suffix)
            r = request(url, method; cookies=true, jar)
            @test r.status ∈ 200:299 # 2xx is OK
            @test shares_secret(r)
        end
        
        🍭.options.security.require_secret_for_access = true
    end
    
    jar = HTTP.Cookies.CookieJar()
    
    @test shares_secret(request(local_url("") |> withsecret, "GET"; cookies=true, jar))
    

    @testset "simple w/ auth $suffix $method" for (suffix, method) in simple_routes
        # should work because of cookie
        url = local_url(suffix)
        r = request(url, method; cookies=true, jar)
        @test r.status ∈ 200:299 # 2xx is OK
        @test shares_secret(r) # see reasoning in of https://github.com/fonsp/Pluto.jl/commit/20515dd46678a49ca90e042fcfa3eab1e5c8e162

        # Without cookies, but with secret in URL
        r = request(url |> withsecret, method)
        @test r.status ∈ 200:299 # 2xx is OK
        @test shares_secret(r)
    end

    @testset "effect w/ auth $suffix $method" for (suffix, method) in effect_routes
        old_ids = collect(keys(🍭.notebooks))
        
        url = local_url(suffix) |> withsecret
        r = request(url, method)
        @test r.status ∈ 200:399 # 3xx are redirects
        @test shares_secret(r) # see reasoning in of https://github.com/fonsp/Pluto.jl/commit/20515dd46678a49ca90e042fcfa3eab1e5c8e162
        
        new_ids = collect(keys(🍭.notebooks))
        nb = 🍭.notebooks[only(setdiff(new_ids, old_ids))]

        if any(x -> occursin(x, suffix), ["new", "execution_allowed", "sample/Basic.jl"])
            @test Pluto.will_run_code(nb)
            @test Pluto.will_run_pkg(nb)
        else
            @test !Pluto.will_run_code(nb)
            @test !Pluto.will_run_pkg(nb)
            @test nb.process_status === Pluto.ProcessStatus.waiting_for_permission
        end
    end

    close(server)
end

@testset "disable mimetype via workspace_custom_startup_expr" begin
    🍭 = ServerSession()
    🍭.options.evaluation.workspace_use_distributed = true
    🍭.options.evaluation.workspace_custom_startup_expr = """
        1 + 1
        PlutoRunner.is_mime_enabled(m::MIME"application/vnd.pluto.tree+object") = false
    """

    nb = Pluto.Notebook([
        Pluto.Cell("x = [1, 2]")
        Pluto.Cell("struct Foo; x; end")
        Pluto.Cell("Foo(x)")
    ])

    Pluto.update_run!(🍭, nb, nb.cells)
    @test nb.cells[1].output.body == repr(MIME"text/plain"(), [1,2])
    @test nb.cells[1].output.mime isa MIME"text/plain"
    @test nb.cells[3].output.mime isa MIME"text/plain"

    Pluto.WorkspaceManager.unmake_workspace((🍭, nb))
end

@testset "Code Coverage" begin
    options = Pluto.Configuration.from_flat_kwargs(; launch_browser=false)

    🍭 = ServerSession(; options)
    nb = Pluto.Notebook([
        Pluto.Cell("str(x) = x == C_NULL ? nothing : unsafe_string(x)")
        Pluto.Cell("Base.JLOptions().code_coverage")
        Pluto.Cell("let opt = Base.JLOptions()
        hasproperty(opt, :tracked_path) ? opt.tracked_path |> str : nothing
        end")
        Pluto.Cell("Base.JLOptions().output_code_coverage |> str")
    ])
    sn = (🍭, nb)

    function coverage_data(nb)
        function str(x) 
            s = strip(x, '"')
            # Deal with Windows paths
            out = replace(s, "\\\\" => "\\") |> String
        end
        (;
            code_coverage = parse(Int, nb.cells[2].output.body),
            tracked_path = nb.cells[3].output.body |> str,
            output_code_coverage = nb.cells[4].output.body |> str,
        )
    end
    # Tests inspired by https://github.com/JuliaLang/julia/blob/4e7294423f4462244617af6f9eea425bd06a78a6/test/cmdlineargs.jl#L459
    Pluto.update_run!(🍭, nb, nb.cells)
    nd = coverage_data(nb)
    @test nd.code_coverage == 0 # Defaults to 0, `none`
    @test nd.tracked_path == ""
    @test nd.output_code_coverage == ""
    Pluto.WorkspaceManager.unmake_workspace(sn)

    🍭.options.compiler.code_coverage_track = "user"
    Pluto.update_run!(🍭, nb, nb.cells)
    nd = coverage_data(nb)
    @test nd.code_coverage == 1 # 1 is `user`
    @test nd.tracked_path == ""
    @test nd.output_code_coverage  == ""
    Pluto.WorkspaceManager.unmake_workspace(sn)

    🍭.options.compiler.code_coverage_track = "all"
    Pluto.update_run!(🍭, nb, nb.cells)
    nd = coverage_data(nb)
    @test nd.code_coverage == 2 # 2 is `all`
    @test nd.tracked_path == ""
    @test nd.output_code_coverage  == ""
    Pluto.WorkspaceManager.unmake_workspace(sn)

    if VERSION >= v"1.8"
        # This option with path was only introduced in v1.8
        filepath = @__FILE__
        🍭.options.compiler.code_coverage_track = "@$filepath"
        Pluto.update_run!(🍭, nb, nb.cells)
        nd = coverage_data(nb)
        @test nd.code_coverage == 3 # 3 is `@<path>`
        @test nd.tracked_path == filepath
        @test nd.output_code_coverage  == ""
        Pluto.WorkspaceManager.unmake_workspace(sn)
    end

    🍭.options.compiler.code_coverage_file = "coverage.info"
        🍭.options.compiler.code_coverage_track = "user"
    Pluto.update_run!(🍭, nb, nb.cells)
    nd = coverage_data(nb)
    @test nd.code_coverage == 1
    @test nd.tracked_path == ""
    @test endswith(nd.output_code_coverage , "coverage.info")
    Pluto.WorkspaceManager.unmake_workspace(sn)
end

end
