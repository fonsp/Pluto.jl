using Test
using Pluto
import Pluto: Notebook, Client, Cell, load_notebook, load_notebook_nobackup, save_notebook, run_reactive!, WorkspaceManager
import Random

# We define some notebooks explicitly, and not as a .jl notebook file, to avoid circular reasoning 🤔
function basic_notebook()
    Notebook(tempname(), [
        Cell("100*a + b"),
        Cell("a = 1"),
        Cell("💩 = :💩"), # ends with 4-byte character
        Cell("b = let\n\tx = a + a\n\tx*x\nend"),
        Cell("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""),
        Cell("""md"# Cześć!
        My name is **baba** and I like \$\\LaTeX\$ _support!_
        
        \$\$\\begin{align}
        \\varphi &= \\sum_{i=1}^{\\infty} \\frac{\\left(\\sin{x_i}^2 + \\cos{x_i}^2\\right)}{i^2} \\\\
        b &= \\frac{1}{2}\\,\\log \\exp{\\varphi}
        \\end{align}\$\$

        ### The spectacle before us was indeed sublime.
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectator on a hillside, the sable cloud beneath was dished out, and the car seemed to float in the middle of an immense dark sphere, whose upper half was strewn with silver. Looking down into the dark gulf below, I could see a ruddy light streaming through a rift in the clouds."
        """),
    ])
end

function shuffled_notebook()
    Notebook(joinpath(tempdir(), "é🧡💛.jl"), [
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
    Notebook(tempname(), [
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
        Cell("json(1)"),
        Cell("""
        begin
            x
            using JSON
        end"""),
    ])
end

function bad_code_notebook()
    Notebook(tempname(), [
        Cell("z = y"),
        Cell("y = z"),
        Cell(""";lka;fd;jasdf;;;\n\n\n\n\nasdfasdf
        
        [[["""),
        Cell("using Aasdfdsf"),
    ])
end

function bonds_notebook()
    Notebook(tempname(), [
        Cell("y = x"),
        Cell("@bind x html\"<input type='range'>\""),
        Cell("""struct Wow
            x
        end"""),
        Cell("Base.peek(w::Wow) = w.x"),
        Cell("Base.show(io::IO, ::MIME\"text/html\", w::Wow) = nothing"),
        Cell("w = Wow(10)"),
        Cell("@bind z w"),
        Cell("@assert z == 10"),
    ])
end

@testset "Notebook File I/O" begin
    nbs = [String(nameof(f)) => f() for f in [basic_notebook, shuffled_notebook, shuffled_with_imports_notebook, bad_code_notebook, bonds_notebook]]

    @testset "Sample notebooks " begin
        # Also adds them to the `nbs` list
        for file in ["basic.jl", "tower-of-hanoi.jl", "ui.jl"]
            path = normpath(joinpath(Pluto.PKG_ROOT_DIR, "sample", file))

            @testset "$(file)" begin
                nb = @test_nowarn load_notebook_nobackup(path)
                nb.path = tempname() * ".jl"

                push!(nbs, "sample " * file => nb)
            end
        end
    end

    for (name, nb) in nbs
        client = Client(Symbol("client", rand(UInt16)), nothing)
        client.connected_notebook = nb
        Pluto.connectedclients[client.id] = client
    end

    @testset "I/O" begin
        @testset "$(name)" for (name, nb) in nbs
            @test let
                save_notebook(nb)
                result = load_notebook_nobackup(nb.path)
                notebook_inputs_equal(nb, result)
            end
        end
    end

    # Some notebooks are designed to error (inside/outside Pluto)
    expect_error = [String(nameof(bad_code_notebook)), "sample ui.jl"]

    @testset "Runnable without Pluto" begin
        @testset "$(name)" for (name, nb) in nbs
            Random.seed!(time_ns())
            new_path = tempname()
            cp(nb.path, new_path)
            new_nb = load_notebook(new_path)

            @test jl_is_runnable(new_path; only_undefvar=true)
            if name ∉ expect_error
                @test jl_is_runnable(new_path; only_undefvar=false)
            end
        end
    end

    @testset "Runnable with Pluto" begin
        @testset "$(name)" for (name, nb) in nbs
            if name ∉ expect_error
                @test nb_is_runnable(nb)
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

    # TODO: tests for things mentioned in https://github.com/fonsp/Pluto.jl/issues/9
    # TODO: test bad dirs, filenames, permissions
end