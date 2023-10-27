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
    @test _convert_to_flags(Configuration.CompilerOptions(threads="123")) ==
        ["--startup-file=no", "--history-file=no", "--threads=123"]

    @test _convert_to_flags(Configuration.CompilerOptions(threads=123)) ==
        ["--startup-file=no", "--history-file=no", "--threads=123"]

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
    @test HTTP.get(local_url("favicon.ico")).status == 200

    function requeststatus(url, method)
        r = HTTP.request(method, url, nothing, method == "POST" ? read(basic_nb_path) : UInt8[]; status_exception=false, redirect=false)
        r.status
    end
    

    nb = SessionActions.open(🍭, basic_nb_path; as_sample=true)

    simple_routes = [
        ("", "GET"),
        ("edit?id=$(nb.notebook_id)", "GET"),
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

    for (suffix, method) in simple_routes ∪ effect_routes
        url = local_url(suffix)
        @test requeststatus(url, method) == 403
    end

    # no notebooks were opened
    @test length(🍭.notebooks) == 1

    for (suffix, method) in simple_routes
        url = local_url(suffix) |> withsecret
        @test requeststatus(url, method)  ∈ 200:299
    end

    for (suffix, method) in effect_routes
        old_ids = collect(keys(🍭.notebooks))
        
        url = local_url(suffix) |> withsecret
        @test requeststatus(url, method) ∈ 200:399 # 3xx are redirects
        
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

end
