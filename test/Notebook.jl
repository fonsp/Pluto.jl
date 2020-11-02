using Test
import Pluto: Notebook, ServerSession, ClientSession, Cell, load_notebook, load_notebook_nobackup, save_notebook, WorkspaceManager, cutename, numbered_until_new
import Random

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
    ])
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
    ])
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
    ])
end

function bad_code_notebook()
    Notebook([
        Cell("z = y"),
        Cell("y = z"),
        Cell(""";lka;fd;jasdf;;;\n\n\n\n\nasdfasdf
        
        [[["""),
        Cell("using Aasdfdsf"),
    ])
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
    ])
end

@testset "Notebook Files" begin
    nbs = [String(nameof(f)) => f() for f in [basic_notebook, shuffled_notebook, shuffled_with_imports_notebook, bad_code_notebook, bonds_notebook]]

    @testset "Sample notebooks " begin
        # Also adds them to the `nbs` list
        for file in ["Basic.jl", "Tower of Hanoi.jl", "Interactivity.jl"]
            path = normpath(Pluto.project_relative_path("sample", file))

            @testset "$(file)" begin
                nb = @test_nowarn load_notebook_nobackup(path)
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
            @test let
                save_notebook(nb)
                result = load_notebook_nobackup(nb.path)
                notebook_inputs_equal(nb, result)
            end
        end
    end

    @testset "I/O overloaded" begin
        @testset "$(name)" for (name, nb) in nbs
            @test let
                tasks = []
                for i in 1:16
                    push!(tasks, @async save_notebook(nb))
                    if i <= 8
                        sleep(0.01)
                    end
                end
                wait.(tasks)
                result = load_notebook_nobackup(nb.path)
                notebook_inputs_equal(nb, result)
            end
        end
    end

    # Some notebooks are designed to error (inside/outside Pluto)
    expect_error = [String(nameof(bad_code_notebook)), "sample Interactivity.jl"]

    @testset "Runnable without Pluto" begin
        @testset "$(name)" for (name, nb) in nbs
            new_path = tempname()
            @assert !isfile(new_path)
            cp(nb.path, new_path)

            # load_notebook also does parsing and analysis - this is needed to save the notebook with cells in their correct order
            # laod_notebook is how they are normally loaded, load_notebook_nobackup
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
            end
        end
    end

    @testset "Line endings" begin
        @testset "$(name)" for (name, nb) in nbs
            file_contents = sprint(save_notebook, nb)

            @test let
                result = sread(load_notebook_nobackup, file_contents, nb.path)
                notebook_inputs_equal(nb, result)
            end

            @test let
                file_contents_windowsed = replace(file_contents, "\n" => "\r\n")
                result_windowsed = sread(load_notebook_nobackup, file_contents_windowsed, nb.path)
                notebook_inputs_equal(nb, result_windowsed)
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
            cp(nb.path, new_path, force=true)
            to_write = readlines(new_path)[1:end - 1]
            write(new_path, join(to_write, '\n'))
            @test_logs (:warn, r"Backup saved to") load_notebook(new_path)
            @test num_backups_in(new_dir) == 1

            # Add a line
            cp(nb.path, new_path, force=true)
            to_write = push!(readlines(new_path), "1+1")
            write(new_path, join(to_write, '\n'))
            @test_logs (:warn, r"Backup saved to") load_notebook(new_path)
            @test num_backups_in(new_dir) == 2
        end
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

    # TODO: test bad dirs, filenames, permissions
end