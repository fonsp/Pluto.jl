# using LibGit2
import Pkg
using Test
using Pluto.Configuration: CompilerOptions
import Pluto: update_save_run!, update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell, project_relative_path, SessionActions, load_notebook
import Pluto.PkgUtils
import Pluto.PkgCompat
import Malt


@testset "Built-in Pkg" begin
    
    # We have our own registry for these test! Take a look at https://github.com/JuliaPluto/PlutoPkgTestRegistry#readme for more info about the test packages and their dependencies.
    Pkg.Registry.add(pluto_test_registry_spec)

    @testset "Basic $(use_distributed_stdlib ? "Distributed" : "Malt")" for use_distributed_stdlib in (false, true)
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed_stdlib = use_distributed_stdlib

        # See https://github.com/JuliaPluto/PlutoPkgTestRegistry

        notebook = Notebook([
            Cell("import PlutoPkgTestA"), # cell 1
            Cell("PlutoPkgTestA.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestB"), # cell 3
            Cell("PlutoPkgTestB.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestC"), # cell 5
            Cell("PlutoPkgTestC.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestD"), # cell 7
            Cell("PlutoPkgTestD.MY_VERSION |> Text"),
            Cell("import Dates"),
            # eval to hide the import from Pluto's analysis
            Cell("eval(:(import DataFrames))"),
            Cell("import HelloWorldC_jll"),
        ])

        @test !notebook.nbpkg_ctx_instantiated
        
        update_save_run!(🍭, notebook, notebook.cells[[1, 2, 7, 8]]) # import A and D
        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])
        @test noerror(notebook.cells[7])
        @test noerror(notebook.cells[8])

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing
        @test notebook.nbpkg_ctx_instantiated
        @test notebook.nbpkg_install_time_ns > 0
        @test notebook.nbpkg_busy_packages |> isempty
        last_install_time = notebook.nbpkg_install_time_ns

        terminals = notebook.nbpkg_terminal_outputs

        @test haskey(terminals, "PlutoPkgTestA")
        @test haskey(terminals, "PlutoPkgTestD")
        # they were installed in one batch, so their terminal outputs should be the same
        @test terminals["PlutoPkgTestA"] == terminals["PlutoPkgTestD"]
        # " [9e88b42a] PackageName" should be present in terminal output
        @test !isnothing(match(r"\[........\] ", terminals["PlutoPkgTestA"]))

        @test notebook.cells[2].output.body == "0.3.1" # A
        @test notebook.cells[8].output.body == "0.1.0" # D
        
        @test PkgCompat.get_manifest_version(notebook.nbpkg_ctx, "PlutoPkgTestA") == v"0.3.1"
        @test PkgCompat.get_manifest_version(notebook.nbpkg_ctx, "PlutoPkgTestD") == v"0.1.0"


        old_A_terminal = deepcopy(terminals["PlutoPkgTestA"])
        # @show old_A_terminal

        update_save_run!(🍭, notebook, notebook.cells[[3, 4]]) # import B

        @test noerror(notebook.cells[3])
        @test noerror(notebook.cells[4])

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing
        @test notebook.nbpkg_ctx_instantiated
        @test notebook.nbpkg_install_time_ns > last_install_time
        @test notebook.nbpkg_busy_packages |> isempty
        last_install_time = notebook.nbpkg_install_time_ns

        @test haskey(terminals, "PlutoPkgTestB")
        @test terminals["PlutoPkgTestA"] == terminals["PlutoPkgTestD"] == old_A_terminal

        @test terminals["PlutoPkgTestA"] != terminals["PlutoPkgTestB"]


        @test notebook.cells[4].output.body == "1.0.0" # B

        # running the 5th cell will import PlutoPkgTestC, putting a 0.2 compatibility bound on PlutoPkgTestA. This means that a notebook restart is required, since PlutoPkgTestA was already loaded at version 0.3.1.
        update_save_run!(🍭, notebook, notebook.cells[[5, 6]])

        @test noerror(notebook.cells[5])
        @test noerror(notebook.cells[6])
        
        @test notebook.nbpkg_ctx !== nothing
        @test (
            notebook.nbpkg_restart_recommended_msg !==  nothing || notebook.nbpkg_restart_required_msg !== nothing
        )
        @test notebook.nbpkg_restart_required_msg !== nothing
        @test notebook.nbpkg_install_time_ns > last_install_time

        # running cells again should persist the restart message

        update_save_run!(🍭, notebook, notebook.cells[1:8])
        @test notebook.nbpkg_restart_required_msg !== nothing

        Pluto.response_restart_process(Pluto.ClientRequest(
            session=🍭,
            notebook=notebook,
        ); run_async=false)

        # @test_nowarn SessionActions.shutdown(🍭, notebook; keep_in_session=true, async=true)
        # @test_nowarn update_save_run!(🍭, notebook, notebook.cells[1:8]; , save=true)

        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])
        @test noerror(notebook.cells[3])
        @test noerror(notebook.cells[4])
        @test noerror(notebook.cells[5])
        @test noerror(notebook.cells[6])
        @test noerror(notebook.cells[7])
        @test noerror(notebook.cells[8])
        @test noerror(notebook.cells[11])

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing


        @test notebook.cells[2].output.body == "0.2.2"
        @test notebook.cells[4].output.body == "1.0.0"
        @test notebook.cells[6].output.body == "1.0.0"
        @test notebook.cells[8].output.body == "0.1.0"


        update_save_run!(🍭, notebook, notebook.cells[9])

        @test noerror(notebook.cells[9])
        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing


        # we should have an isolated environment, so importing DataFrames should not work, even though it is available in the parent process.
        update_save_run!(🍭, notebook, notebook.cells[10])
        @test notebook.cells[10].errored == true


        ptoml_contents() = PkgCompat.read_project_file(notebook)
        mtoml_contents() = PkgCompat.read_manifest_file(notebook)

        nb_contents() = read(notebook.path, String)

        @testset "Project & Manifest stored in notebook" begin
            
            @test occursin(ptoml_contents(), nb_contents())
            @test occursin(mtoml_contents(), nb_contents())

            @test occursin("PlutoPkgTestA", mtoml_contents())
            @test occursin("PlutoPkgTestB", mtoml_contents())
            @test occursin("PlutoPkgTestC", mtoml_contents())
            @test occursin("PlutoPkgTestD", mtoml_contents())
            @test occursin("Dates", mtoml_contents())
            @test count("PlutoPkgTestA", ptoml_contents()) == 2 # once in [deps], once in [compat]
            @test count("PlutoPkgTestB", ptoml_contents()) == 2
            @test count("PlutoPkgTestC", ptoml_contents()) == 2
            @test count("PlutoPkgTestD", ptoml_contents()) == 2
            @test count("Dates", ptoml_contents()) == 1 # once in [deps], but not in [compat] because it is a stdlib

            ptoml = Pkg.TOML.parse(ptoml_contents())

            @test haskey(ptoml["compat"], "PlutoPkgTestA")
            @test haskey(ptoml["compat"], "PlutoPkgTestB")
            @test haskey(ptoml["compat"], "PlutoPkgTestC")
            @test haskey(ptoml["compat"], "PlutoPkgTestD")
            @test !haskey(ptoml["compat"], "Dates")
        end

        ## remove `import Dates`
        setcode!(notebook.cells[9], "")
        update_save_run!(🍭, notebook, notebook.cells[9])

        # removing a stdlib does not require a restart
        @test noerror(notebook.cells[9])
        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        @test count("Dates", ptoml_contents()) == 0


        ## remove `import PlutoPkgTestD`
        setcode!(notebook.cells[7], "")
        update_save_run!(🍭, notebook, notebook.cells[7])

        @test noerror(notebook.cells[7])
        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg !== nothing # recommend restart
        @test notebook.nbpkg_restart_required_msg === nothing
        @test notebook.nbpkg_install_time_ns === nothing # removing a package means that we lose our estimate

        @test count("PlutoPkgTestD", ptoml_contents()) == 0


        cleanup(🍭, notebook)
    end

    simple_import_path = joinpath(@__DIR__, "simple_import.jl")
    simple_import_notebook = read(simple_import_path, String)

    @testset "Manifest loading" begin
        🍭 = ServerSession()

        dir = mktempdir()
        path = joinpath(dir, "hello.jl")
        write(path, simple_import_notebook)

        notebook = SessionActions.open(🍭, path; run_async=false)
        
        @test num_backups_in(dir) == 0


        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])

        @test notebook.cells[2].output.body == "0.2.2"

        cleanup(🍭, notebook)
    end
    
    @testset "Package added by url" begin
        url_notebook = read(joinpath(@__DIR__, "url_import.jl"), String)

        🍭 = ServerSession()

        dir = mktempdir()
        path = joinpath(dir, "hello.jl")
        write(path, url_notebook)

        notebook = SessionActions.open(🍭, path; run_async=false)
        
        @test num_backups_in(dir) == 0

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])

        @test notebook.cells[2].output.body == "1.0.0"

        cleanup(🍭, notebook)
    end
    
    future_notebook = read(joinpath(@__DIR__, "future_nonexisting_version.jl"), String)
    @testset "Recovery from unavailable versions" begin
        🍭 = ServerSession()

        dir = mktempdir()
        path = joinpath(dir, "hello.jl")
        write(path, future_notebook)

        notebook = SessionActions.open(🍭, path; run_async=false)
        
        @test num_backups_in(dir) == 0


        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])

        @test notebook.cells[2].output.body == "0.3.1"

        cleanup(🍭, notebook)
    end


    @testset "Pkg cell -- dynamically added" begin
        🍭 = ServerSession()
        
        notebook = Notebook([
            Cell("1"),
            Cell("2"),
            Cell("3"),
            Cell("4"),
            Cell("5"),
            Cell("6"),
        ])

        update_save_run!(🍭, notebook, notebook.cells)

        # not necessary since there are no packages:
        # @test has_embedded_pkgfiles(notebook)

        setcode!(notebook.cells[1], "import Pkg")
        update_save_run!(🍭, notebook, notebook.cells[1])
        setcode!(notebook.cells[2], "Pkg.activate(mktempdir())")
        update_save_run!(🍭, notebook, notebook.cells[2])

        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])
        @test notebook.nbpkg_ctx === nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing
        @test !has_embedded_pkgfiles(notebook)

        setcode!(notebook.cells[3], "Pkg.add(\"JSON\")")
        update_save_run!(🍭, notebook, notebook.cells[3])
        setcode!(notebook.cells[4], "using JSON")
        update_save_run!(🍭, notebook, notebook.cells[4])
        setcode!(notebook.cells[5], "using Dates")
        update_save_run!(🍭, notebook, notebook.cells[5])

        @test noerror(notebook.cells[3])
        @test noerror(notebook.cells[4])
        @test notebook.cells[5] |> noerror

        @test !has_embedded_pkgfiles(notebook)

        setcode!(notebook.cells[2], "2")
        setcode!(notebook.cells[3], "3")
        update_save_run!(🍭, notebook, notebook.cells[2:3])
        
        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_required_msg !== nothing
        @test has_embedded_pkgfiles(notebook)

        cleanup(🍭, notebook)
    end
    
    pkg_cell_notebook = read(joinpath(@__DIR__, "pkg_cell.jl"), String)
    @testset "Pkg cell -- loaded from file" begin
        🍭 = ServerSession()

        dir = mktempdir()
        for n in ["Project.toml", "Manifest.toml"]
            cp(joinpath(@__DIR__, "pkg_cell_env", n), joinpath(dir, n))
        end
        path = joinpath(dir, "hello.jl")
        write(path, pkg_cell_notebook)
        @test length(readdir(dir)) == 3

        @test num_backups_in(dir) == 0

        notebook = SessionActions.open(🍭, path; run_async=false)
        nb_contents() = read(notebook.path, String)
        
        @test num_backups_in(dir) == 0
        # @test num_backups_in(dir) == 1
        
        
        @test noerror(notebook.cells[1])
        @test noerror(notebook.cells[2])
        @test noerror(notebook.cells[3])
        @test noerror(notebook.cells[4])
        @test noerror(notebook.cells[5])
        @test noerror(notebook.cells[6])
        @test noerror(notebook.cells[7])
        @test noerror(notebook.cells[8])
        @test noerror(notebook.cells[9])
        @test noerror(notebook.cells[10])

        @test notebook.cells[3].output.body == "0.2.0"

        
        

        file_after_loading = read(path, String)

        # test that no pkg cells got added
        @test !has_embedded_pkgfiles(notebook)
        # we can remove this test in the future if our file format changes
        same_num_chars = -10 < length(replace(file_after_loading, '\r' => "")) - length(replace(pkg_cell_notebook, '\r' => "")) < 10
        if !same_num_chars
            @show file_after_loading pkg_cell_notebook
        end
        @test same_num_chars

        @test notebook.nbpkg_ctx === nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        cleanup(🍭, notebook)
    end

    @testset "DrWatson cell" begin
        🍭 = ServerSession()

        notebook = Notebook([
            Cell("using Plots"),
            Cell("@quickactivate"),
            Cell("using DrWatson"),
        ])

        notebook.topology = Pluto.updated_topology(Pluto.NotebookTopology{Cell}(cell_order=Pluto.ImmutableVector(notebook.cells)), notebook, notebook.cells) |> Pluto.static_resolve_topology

        @test !Pluto.use_plutopkg(notebook.topology)
        order = collect(Pluto.topological_order(notebook))
        index_order = map(order) do order_cell
            findfirst(==(order_cell.cell_id), notebook.cell_order)
        end

        @test index_order == [3, 2, 1]
    end

    pre_pkg_notebook = read(joinpath(@__DIR__, "old_import.jl"), String)
    local post_pkg_notebook = nothing

    @testset "File format -- Backwards compat" begin
        🍭 = ServerSession()

        dir = mktempdir()
        path = joinpath(dir, "hello.jl")
        write(path, pre_pkg_notebook)

        @test num_backups_in(dir) == 0

        notebook = SessionActions.open(🍭, path; run_async=false)
        nb_contents() = read(notebook.path, String)
        
        @test num_backups_in(dir) == 0
        # @test num_backups_in(dir) == 1

        post_pkg_notebook = read(path, String)

        # test that pkg cells got added
        @test length(post_pkg_notebook) > length(pre_pkg_notebook) + 50
        @test has_embedded_pkgfiles(notebook)

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        cleanup(🍭, notebook)
    end

    @static if VERSION < v"1.10.0-0" # see https://github.com/fonsp/Pluto.jl/pull/2626#issuecomment-1671244510
        @testset "File format -- Forwards compat" begin
            # Using Distributed, we will create a new Julia process in which we install Pluto 0.14.7 (before PlutoPkg). We run the new notebook file on the old Pluto.
            test_worker = Malt.Worker()

            @test post_pkg_notebook isa String

            Malt.remote_eval_wait(Main, test_worker, quote
                path = tempname()
                write(path, $(post_pkg_notebook))
                import Pkg
                # optimization:
                if isdefined(Pkg, :UPDATED_REGISTRY_THIS_SESSION)
                    Pkg.UPDATED_REGISTRY_THIS_SESSION[] = true
                end

                Pkg.activate(;temp=true)
                Pkg.add(Pkg.PackageSpec(;name="Pluto",version=v"0.14.7"))
                # Distributed is required for old Pluto to work!
                Pkg.add("Distributed") 

                import Pluto
                @info Pluto.PLUTO_VERSION
                @assert Pluto.PLUTO_VERSION == v"0.14.7"
            end)

            @test Malt.remote_eval_fetch(Main, test_worker, quote
                s = Pluto.ServerSession()
                nb = Pluto.SessionActions.open(s, path; run_async=false)
                nb.cells[2].errored == false
            end)

            # Cells that use Example will error because the package is not installed.

            # @test Malt.remote_eval_fetch(Main, test_worker, quote
            #     nb.cells[1].errored == false
            # end)
            @test Malt.remote_eval_fetch(Main, test_worker, quote
                nb.cells[2].errored == false
            end)
            # @test Malt.remote_eval_fetch(Main, test_worker, quote
            #     nb.cells[3].errored == false
            # end)
            # @test Malt.remote_eval_fetch(Main, test_worker, quote
            #     nb.cells[3].output.body == "25"
            # end)

            Malt.stop(test_worker)
        end
    end

    @testset "PkgUtils -- reset" begin
        dir = mktempdir()
        f = joinpath(dir, "hello.jl")

        write(f, simple_import_notebook)
        
        @test num_backups_in(dir) == 0
        Pluto.reset_notebook_environment(f)

        @test num_backups_in(dir) == 1
        @test !has_embedded_pkgfiles(read(f, String))
    end

    @testset "PkgUtils -- update" begin
        dir = mktempdir()
        f = joinpath(dir, "hello.jl")

        write(f, simple_import_notebook)
        @test !occursin("0.3.1", read(f, String))

        @test num_backups_in(dir) == 0
        Pluto.update_notebook_environment(f)

        @test num_backups_in(dir) == 1
        @test has_embedded_pkgfiles(read(f, String))
        @test !Pluto.only_versions_differ(f, simple_import_path)
        @test occursin("0.3.1", read(f, String))

        Pluto.update_notebook_environment(f)
        @test_skip num_backups_in(dir) == 1
    end

    @testset "Bad files" begin
        @testset "$(name)" for name in ["corrupted_manifest", "unregistered_import"]

            original_path = joinpath(@__DIR__, "$(name).jl")
            original_contents = read(original_path, String)

            🍭 = ServerSession()
    
            dir = mktempdir()
            path = joinpath(dir, "hello.jl")
            write(path, original_contents)
    
            @test num_backups_in(dir) == 0
    
            notebook = SessionActions.open(🍭, path; run_async=false)
            nb_contents() = read(notebook.path, String)

            should_restart = (
                notebook.nbpkg_restart_recommended_msg !==  nothing || notebook.nbpkg_restart_required_msg !== nothing
            )

            # if name == "corrupted_manifest"
            #     @test !should_restart
            # end

            # this breaks julia for somee reason:
            #     # we don't want to recommend restart right after launch, but it's easier for us
            #     @test_broken !should_restart
            # end

            if should_restart
                Pluto.response_restart_process(Pluto.ClientRequest(
                    session=🍭,
                    notebook=notebook,
                ); run_async=false)
            end

            if name != "unregistered_import"
                @test noerror(notebook.cells[1])
                @test noerror(notebook.cells[2])
                @test notebook.cells[2].output.body == "0.2.2" # the Project.toml remained, so we did not lose our compat bound.
                @test has_embedded_pkgfiles(notebook)
            end


            @test !Pluto.only_versions_differ(notebook.path, original_path)
    
            @test notebook.nbpkg_ctx !== nothing
            @test notebook.nbpkg_restart_recommended_msg === nothing
            @test notebook.nbpkg_restart_required_msg === nothing

            setcode!(notebook.cells[2], "1 + 1")
            update_save_run!(🍭, notebook, notebook.cells[2])
            @test notebook.cells[2].output.body == "2"

            
            setcode!(notebook.cells[2], """
            begin
                import PlutoPkgTestD
                PlutoPkgTestD.MY_VERSION |> Text
            end
            """)
            update_save_run!(🍭, notebook, notebook.cells[2])
            @test notebook.cells[2].output.body == "0.1.0"

            @test has_embedded_pkgfiles(notebook)

            cleanup(🍭, notebook)
        end

    end

    @testset "Race conditions" begin
        🍭 = ServerSession()
        lag = 0.2
        🍭.options.server.simulated_pkg_lag = lag

        # See https://github.com/JuliaPluto/PlutoPkgTestRegistry

        notebook = Notebook([
            Cell("import PlutoPkgTestA"), # cell 1
            Cell("PlutoPkgTestA.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestB"), # cell 3
            Cell("PlutoPkgTestB.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestC"), # cell 5
            Cell("PlutoPkgTestC.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestD"), # cell 7
            Cell("PlutoPkgTestD.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestE"), # cell 9
            Cell("PlutoPkgTestE.MY_VERSION |> Text"),
        ])

        @test !notebook.nbpkg_ctx_instantiated
        
        running_tasks = Task[]
        remember(t) = push!(running_tasks, t)
        
        update_save_run!(🍭, notebook, notebook.cells[[7, 8]]; run_async=false)            # import D (not async)
        update_save_run!(🍭, notebook, notebook.cells[[1, 2]]; run_async=true) |> remember # import A
        
        for _ in 1:5
            sleep(lag / 2)
            setcode!(notebook.cells[9], "import PlutoPkgTestE")
            update_save_run!(🍭, notebook, notebook.cells[[9]]; run_async=true) |> remember # import E
            
            sleep(lag / 2)
            setcode!(notebook.cells[9], "")
            update_save_run!(🍭, notebook, notebook.cells[[9]]; run_async=true) |> remember # don't import E
        end
        
        while !all(istaskdone, running_tasks)
            @test all(noerror, notebook.cells)
            
            sleep(lag / 3)
        end
        
        @test all(istaskdone, running_tasks)
        wait.(running_tasks)
        empty!(running_tasks)

        cleanup(🍭, notebook)
    end

    @testset "PlutoRunner Syntax Error" begin
        🍭 = ServerSession()

        notebook = Notebook([
            Cell("1 +"),
            Cell("PlutoRunner.throw_syntax_error"),
            Cell("PlutoRunner.throw_syntax_error(1)"),
        ])

        update_run!(🍭, notebook, notebook.cells)

        @test notebook.cells[1].errored
        @test noerror(notebook.cells[2])
        @test notebook.cells[3].errored

        @test Pluto.is_just_text(notebook.topology, notebook.cells[1])
        @test !Pluto.is_just_text(notebook.topology, notebook.cells[2]) # Not a syntax error form
        @test Pluto.is_just_text(notebook.topology, notebook.cells[3])

        cleanup(🍭, notebook)
    end

    @testset "Precompilation" begin
        compilation_dir = joinpath(DEPOT_PATH[1], "compiled", "v$(VERSION.major).$(VERSION.minor)")
        @assert isdir(compilation_dir)
        compilation_dir_testA = joinpath(compilation_dir, "PlutoPkgTestA")
        precomp_entries() = readdir(mkpath(compilation_dir_testA))
        
        # clear cache
        let
            # sleep workaround for julia issue 34700.
            sleep(3)
            isdir(compilation_dir_testA) && rm(compilation_dir_testA; force=true, recursive=true)
        end
        @test precomp_entries() == []

        @testset "Match compiler options: $(match)" for match in [true, false]
            
            before_sync = precomp_entries()
            
            🍭 = ServerSession()
            # make compiler settings of the worker (not) match the server settings
            let
                # you can find out which settings are relevant for cache validation by running JULIA_DEBUG="loading" julia and then missing a cache. Example output on julia1.9.0-rc1:
                # ┌ Debug: Rejecting cache file /Applications/Julia-1.9.0-beta4 ARM.app/Contents/Resources/julia/share/julia/compiled/v1.9/SuiteSparse_jll/ME9At_bvckq.ji for  [top-level] since the flags are mismatched
                # │   current session: use_pkgimages = true, debug_level = 1, check_bounds = 0, inline = true, opt_level = 2
                # │   cache file:      use_pkgimages = true, debug_level = 1, check_bounds = 1, inline = true, opt_level = 2
                # └ @ Base loading.jl:2668
                flip = !match
                if VERSION >= v"1.9.0-aaa"
                    🍭.options.compiler.pkgimages = (flip ⊻ Base.JLOptions().use_pkgimages == 1) ? "yes" : "no"
                end
                🍭.options.compiler.check_bounds = (flip ⊻ Base.JLOptions().check_bounds == 1) ? "yes" : "no"
                🍭.options.compiler.inline = (flip ⊻ Base.JLOptions().can_inline == 1) ? "yes" : "no"
                🍭.options.compiler.optimize = match ? Base.JLOptions().opt_level : 3 - Base.JLOptions().opt_level
                # cant set the debug level but whatevs
            end
            

            notebook = Notebook([
                # An import for Pluto to recognize, but don't actually run it. When you run an import, Julia will precompile the package if necessary, which would skew our results.
                Cell("false && import PlutoPkgTestA"),
            ])

            @test !notebook.nbpkg_ctx_instantiated
            update_save_run!(🍭, notebook, notebook.cells)
            @test notebook.nbpkg_ctx_instantiated
            
            after_sync = precomp_entries()
            
            # syncing should have called Pkg.precompile(), which should have generated new precompile caches. 
            # If `match == false`, then this is the second run, and the precompile caches should be different. 
            # These new caches use the same filename (weird...), EXCEPT when the pkgimages flag changed, then you get a new filename.
            if match == true || VERSION >= v"1.9.0-aaa"
                @test before_sync != after_sync
                @test length(before_sync) < length(after_sync)
            end
            
            
            
            # Now actually run the import.
            setcode!(notebook.cells[1], """begin
            ENV["JULIA_DEBUG"] = "loading"
            
            PlutoRunner.Logging.shouldlog(logger::PlutoRunner.PlutoCellLogger, level, _module, _...) = true # https://github.com/fonsp/Pluto.jl/issues/2487
            
            import PlutoPkgTestA
            end""")
            update_save_run!(🍭, notebook, notebook.cells[1])
            @test noerror(notebook.cells[1])
            
            after_run = precomp_entries()
            

            # There should be a log message about loading the cache.
            VERSION >= v"1.8.0-aaa" && @test any(notebook.cells[1].logs) do log
                occursin(r"Loading.*cache"i, log["msg"][1])
            end
            # There should NOT be a log message about rejecting the cache.
            @test !any(notebook.cells[1].logs) do log
                occursin(r"reject.*cache"i, log["msg"][1])
            end
            
            # Running the import should not have triggered additional precompilation, everything should have been precompiled during Pkg.precompile() (in sync_nbpkg).
            @test after_sync == after_run
            
            cleanup(🍭, notebook)
        end
    end

    @testset "Inherit load path" begin
        notebook = Notebook([
            Cell("import Pkg; Pkg.activate()"),
            Cell("LOAD_PATH[begin]"),
            Cell("LOAD_PATH[end]"),
        ])
        🍭 = ServerSession()
        update_run!(🍭, notebook, notebook.cells)
        @test isnothing(notebook.nbpkg_ctx)
        @test notebook.cells[2].output.body == sprint(Base.show, LOAD_PATH[begin])
        @test notebook.cells[3].output.body == sprint(Base.show, LOAD_PATH[end])
        cleanup(🍭, notebook)
    end

    Pkg.Registry.rm(pluto_test_registry_spec)
    # Pkg.Registry.add("General")
end

# reg_path = mktempdir()
# repo = LibGit2.clone("https://github.com/JuliaRegistries/General.git", reg_path)

# LibGit2.checkout!(repo, "aef26d37e1d0e8f8387c011ccb7c4a38398a18f6")

