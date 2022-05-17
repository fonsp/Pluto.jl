using Test
import Pluto: Notebook, ServerSession, ClientSession, Cell, load_notebook, load_notebook_nobackup, save_notebook, WorkspaceManager, cutename, numbered_until_new, readwrite, without_pluto_file_extension, update_run!, get_cell_metadata_no_default, is_disabled, create_metadata
import Pluto.WorkspaceManager: poll, WorkspaceManager
import Random
import Pkg
import UUIDs: UUID

# We define some notebooks explicitly, and not as a .jl notebook file, to avoid circular reasoning 🤔
function basic_notebook()
    Notebook([
        Cell("100*a + b"),
        Cell("a = 1"),
        Cell("💩 = :💩"), # ends with 4-byte character
        Cell("b = let\n\tx = a + a\n\tx*x\nend"),
        Cell("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""),
        # test included Markdown import
        Cell("""md"# Cześć!
        My name is **baba** and I like \$\\LaTeX\$ _support!_
        
        \$\$\\begin{align}
        \\varphi &= \\sum_{i=1}^{\\infty} \\frac{\\left(\\sin{x_i}^2 + \\cos{x_i}^2\\right)}{i^2} \\\\
        b &= \\frac{1}{2}\\,\\log \\exp{\\varphi}
        \\end{align}\$\$

        ### The spectacle before us was indeed sublime.
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectator on a hillside, the sable cloud beneath was dished out, and the car seemed to float in the middle of an immense dark sphere, whose upper half was strewn with silver. Looking down into the dark gulf below, I could see a ruddy light streaming through a rift in the clouds."
        """),
        # test included InteractiveUtils import
        Cell("subtypes(Number)"),
    ]) |> init_packages!
end

function cell_metadata_notebook()
    Notebook([
        Cell(
            code="100*a + b",
            metadata=Dict(
                "a metadata tag" => Dict(
                    "boolean" => true,
                    "string" => "String",
                    "number" => 10000,
                ),
                "disabled" => true,
            ) |> create_metadata,
        ),
    ]) |> init_packages!
end

function notebook_metadata_notebook()
    nb = Notebook([
        Cell(code="n * (n + 1) / 2"),
    ]) |> init_packages!
    nb.metadata = Dict(
        "boolean" => true,
        "string" => "String",
        "number" => 10000,
        "ozymandias" => Dict(
            "l1" => "And on the pedestal, these words appear:",
            "l2" => "My name is Ozymandias, King of Kings;",
            "l3" => "Look on my Works, ye Mighty, and despair!",
        ),
    )
    nb
end

function shuffled_notebook()
    Notebook([
        Cell("z = y"),
        Cell("v = u"),
        Cell("y = x"),
        Cell("x = w"),
        Cell("using Dates"),
        Cell("t = 1"),
        Cell("w = v"),
        Cell("u = t"),
    ]) |> init_packages!
end

function shuffled_with_imports_notebook()
    Notebook([
        Cell("c = uuid1()"),
        Cell("a = (b, today())"),
        Cell("y = 2"),
        Cell("using UUIDs"),
        Cell("y"),
        Cell("x = y"),
        Cell("b = base64encode"),
        Cell("""
        begin
            using Dates
            using Base64
        end"""),
        Cell("BasicREPL"),
        Cell("""
        begin
            x
            using REPL
        end"""),
    ]) |> init_packages!
end

function init_packages!(nb::Notebook)
    nb.topology = Pluto.updated_topology(nb.topology, nb, nb.cells)
    Pluto.sync_nbpkg_core(nb, nb.topology, nb.topology)
    return nb
end

function bad_code_notebook()
    Notebook([
        Cell("z = y"),
        Cell("y = z"),
        Cell(""";lka;fd;jasdf;;;\n\n\n\n\nasdfasdf
        
        [[["""),
        Cell("using Aasdfdsf"),
    ]) |> init_packages!
end

function bonds_notebook()
    Notebook([
        Cell("y = x"),
        Cell("@bind x html\"<input type='range'>\""),
        Cell("@assert y === missing"),
        Cell("""struct Wow
            x
        end"""),
        Cell("Base.get(w::Wow) = w.x"),
        Cell("Base.show(io::IO, ::MIME\"text/html\", w::Wow) = nothing"),
        Cell("w = Wow(10)"),
        Cell("@bind z w"),
        Cell("@assert z == 10"),
    ]) |> init_packages!
end


function project_notebook()
    Notebook([
        Cell("using Dates"),
        Cell("using Example"),
    ]) |> init_packages!
end

@testset "Notebook Files" begin
    nbs = [String(nameof(f)) => f() for f in [basic_notebook, shuffled_notebook, shuffled_with_imports_notebook, bad_code_notebook, bonds_notebook, project_notebook]]

    @testset "Sample notebooks " begin
        # Also adds them to the `nbs` list
        for file in ["Basic.jl", "Tower of Hanoi.jl", "Interactivity.jl"]
            path = normpath(Pluto.project_relative_path("sample", file))

            @testset "$(file)" begin
                nb = @test_nowarn load_notebook_nobackup(path)
                @test length(nb.cells) > 0
                push!(nbs, "sample " * file => nb)
            end
        end
    end

    🍭 = ServerSession()
    for (name, nb) in nbs
        nb.path = tempname() * "é🧡💛.jl"

        client = ClientSession(Symbol("client", rand(UInt16)), nothing)
        client.connected_notebook = nb

        🍭.connected_clients[client.id] = client
    end

    @testset "I/O basic" begin
        @testset "$(name)" for (name, nb) in nbs
            save_notebook(nb)
            # @info "File" name Text(read(nb.path,String))
            result = load_notebook_nobackup(nb.path)
            @test_notebook_inputs_equal(nb, result)
        end
    end

    @testset "Cell Metadata" begin
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = false
        fakeclient = ClientSession(:fake, nothing)
        🍭.connected_clients[fakeclient.id] = fakeclient

        @testset "Disabling & Metadata" begin
            nb = notebook_metadata_notebook()
            update_run!(🍭, nb, nb.cells)
            cell = first(values(nb.cells_dict))
            @test get_cell_metadata_no_default(cell) == Dict(
                "a metadata tag" => Dict(
                    "boolean" => true,
                    "string" => "String",
                    "number" => 10000,
                ),
                "disabled" => true, # enhanced metadata because cell is disabled
            )

            save_notebook(nb)
            result = load_notebook_nobackup(nb.path)
            @test_notebook_inputs_equal(nb, result)
            cell = first(nb.cells)
            @test is_disabled(cell)
            @test get_cell_metadata_no_default(cell) == Dict(
                "a metadata tag" => Dict(
                    "boolean" => true,
                    "string" => "String",
                    "number" => 10000,
                ),
                "disabled" => true,
            )
        end
    end

    @testset "Notebook Metadata" begin
        🍭 = ServerSession()
        🍭.options.evaluation.workspace_use_distributed = false
        fakeclient = ClientSession(:fake, nothing)
        🍭.connected_clients[fakeclient.id] = fakeclient

        nb = notebook_metadata_notebook()
        update_run!(🍭, nb, nb.cells)
        
        @test nb.metadata == Dict(
            "boolean" => true,
            "string" => "String",
            "number" => 10000,
            "ozymandias" => Dict(
                "l1" => "And on the pedestal, these words appear:",
                "l2" => "My name is Ozymandias, King of Kings;",
                "l3" => "Look on my Works, ye Mighty, and despair!",
            ),
        )

        save_notebook(nb)
        nb_loaded = load_notebook_nobackup(nb.path)
        @test nb.metadata == nb_loaded.metadata
    end

    @testset "I/O overloaded" begin
        @testset "$(name)" for (name, nb) in nbs
            let
                tasks = []
                for i in 1:16
                    push!(tasks, @async save_notebook(nb))
                    if i <= 8
                        sleep(0.01)
                    end
                end
                wait.(tasks)
                result = load_notebook_nobackup(nb.path)
                @test_notebook_inputs_equal(nb, result)
            end
        end
    end

    @testset "Bijection test" begin
        @testset "$(name)" for (name, nb) in nbs
            new_path = tempname()
            @assert !isfile(new_path)
            readwrite(nb.path, new_path)

            # load_notebook also does parsing and analysis - this is needed to save the notebook with cells in their correct order
            # load_notebook is how they are normally loaded, load_notebook_nobackup
            new_nb = load_notebook(new_path)

            before_contents = read(new_path, String)

            after_path = tempname()
            write(after_path, before_contents)

            after = load_notebook(after_path)
            after_contents = read(after_path, String)
            
            if name != String(nameof(bad_code_notebook))
                @test Text(before_contents) == Text(after_contents)
            end
        end
    end
    
    @testset "Recover from bad cell order" begin
        contents = """
        ### A Pluto.jl notebook ###
        # v0.17.3

        using Markdown
        using InteractiveUtils

        # ╔═╡ cdd40e28-61be-11ec-28fd-111111111111
        x = 1

        # ╔═╡ cdd40e28-61be-11ec-28fd-222222222222
        y = 2

        # ╔═╡ cdd40e28-61be-11ec-28fd-333333333333
        z = 3

        # ╔═╡ Cell order:
        # ╠═cdd40e28-61be-11ec-28fd-111111111111
        # ╠═cdd40e28-61be-11ec-28fd-333333333333
        # ╠═cdd40e28-61be-11ec-28fd-444444444444
        """
        
        path = tempname()
        write(path, contents)
        
        nb = load_notebook(path)
        
        @test nb.cell_order == UUID.([
            "cdd40e28-61be-11ec-28fd-111111111111",
            "cdd40e28-61be-11ec-28fd-333333333333",
            "cdd40e28-61be-11ec-28fd-222222222222",
        ])
        @test keys(nb.cells_dict) == Set(nb.cell_order)
    end

    # Some notebooks are designed to error (inside/outside Pluto)
    expect_error = [String(nameof(bad_code_notebook)), String(nameof(project_notebook)), "sample Interactivity.jl"]


    @testset "Runnable without Pluto" begin
        @testset "$(name)" for (name, nb) in nbs
            new_path = tempname()
            @assert !isfile(new_path)
            cp(nb.path, new_path)

            new_nb = load_notebook(new_path)

            # println(read(new_nb.path, String))

            if name ∉ expect_error
                @test jl_is_runnable(new_nb.path; only_undefvar=false)
            end
        end
    end

    @testset "Runnable with Pluto" begin
        @testset "$(name)" for (name, nb) in nbs
            if name ∉ expect_error
                @test nb_is_runnable(🍭, nb)
                WorkspaceManager.unmake_workspace((🍭, nb))
            end
        end
    end

    @testset "Line endings" begin
        @testset "$(name)" for (name, nb) in nbs
            file_contents = sprint(save_notebook, nb)

            let
                result = sread(load_notebook_nobackup, file_contents, nb.path)
                @test_notebook_inputs_equal(nb, result)
            end

            let
                file_contents_windowsed = replace(file_contents, "\n" => "\r\n")
                result_windowsed = sread(load_notebook_nobackup, file_contents_windowsed, nb.path)
                @test_notebook_inputs_equal(nb, result_windowsed)
            end
        end
    end

    @testset "Backups" begin
        @testset "$(name)" for (name, nb) in nbs
            save_notebook(nb)
            
            new_dir = mktempdir()
            new_path = joinpath(new_dir, "nb.jl")
            cp(nb.path, new_path)
            @test_nowarn load_notebook(new_path)
            @test num_backups_in(new_dir) == 0

            # Delete last line
            # cp(nb.path, new_path, force=true)
            # to_write = readlines(new_path)[1:end - 1]
            # write(new_path, join(to_write, '\n'))
            # @test_logs (:warn, r"Backup saved to") load_notebook(new_path)
            # @test num_backups_in(new_dir) == 1

            # Duplicate first line
            cp(nb.path, new_path, force=true)
            to_write = let
                old_lines = readlines(new_path)
                [old_lines[1], old_lines...]
            end
            write(new_path, join(to_write, '\n'))
            
            @test_nowarn load_notebook(new_path)
            @test num_backups_in(new_dir) == 0
            @test readdir(new_dir) == ["nb.jl"]
            
            
            # Extra stuff in preamble
            cp(nb.path, new_path, force=true)
            to_write = let
                old_content = read(new_path, String)
                replace(old_content, "using Markdown" => "using Markdown\n1 + 1")
            end
            write(new_path, to_write)
            
            @test_nowarn load_notebook(new_path)
            @test num_backups_in(new_dir) == 0
            @test readdir(new_dir) == ["nb.jl"]
            
            
            
            
            # Extra stuff at the end of the file
            cp(nb.path, new_path, force=true)
            to_write = let
                old_lines = readlines(new_path)
                [old_lines..., "", "1 + 1", Pluto._cell_id_delimiter * "heyyyy", "# coolio"]
            end
            
            write(new_path, join(to_write, '\n'))
            
            @test_logs (:warn, r"Backup saved to") load_notebook(new_path)
            @test num_backups_in(new_dir) == 1

            @test readdir(new_dir) == ["nb backup 1.jl", "nb.jl"]
            
            # AGAIN
            
            write(new_path, join(to_write, '\n'))
            
            @test_logs (:warn, r"Backup saved to") load_notebook(new_path)
            @test num_backups_in(new_dir) == 2

            @test Set(readdir(new_dir)) == Set(["nb backup 2.jl", "nb backup 1.jl", "nb.jl"] )
        end
    end

    @testset "Import & export HTML" begin
        nb = basic_notebook()
        export_html = Pluto.generate_html(nb)

        embedded_jl = Pluto.embedded_notebookfile(export_html)
        jl_path = tempname()
        write(jl_path, embedded_jl)
        
        result = load_notebook_nobackup(jl_path)
        @test_notebook_inputs_equal(nb, result, false)

        
        filename = "howdy.jl"

        export_html = Pluto.generate_html(nb; notebookfile_js=filename)
        @test occursin(filename, export_html)
        @test_throws ArgumentError Pluto.embedded_notebookfile(export_html)
    end

    @testset "Utilities" begin
        @testset "Cute file names" begin
            trash = mktempdir()
            for i in 1:200
                numbered_until_new(joinpath(trash, cutename()); create_file=true)
            end

            @test all(!isfile, [numbered_until_new(joinpath(trash, cutename()); create_file=false) for _ in 1:200])
        end
    end
    
    @test without_pluto_file_extension("julia编程.jl") == "julia编程"
    @test without_pluto_file_extension("julia编程.jl🐼") == "julia编程.jl🐼"
    @test without_pluto_file_extension("asdf.pluto.jl") == "asdf"
    @test without_pluto_file_extension("asdf.jl") == "asdf"

    # TODO: test bad dirs, filenames, permissions
end
