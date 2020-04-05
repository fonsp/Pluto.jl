using Test
using Pluto
import Pluto: samplenotebook, Notebook ,Cell, load_notebook, load_notebook_nobackup, save_notebook, run_reactive!

function notebook_inputs_equal(nbA, nbB)
    x = normpath(nbA.path) == normpath(nbB.path)

    to_compare(cell) = (cell.uuid, cell.code)
    y = to_compare.(nbA.cells) == to_compare.(nbB.cells)
    
    x && y
end

"The converse of Julia's `Base.sprint`."
function sread(f::Function, input::String, args...)
    io = IOBuffer(input)
    output = f(io, args...)
    close(io)
    return output
end

@testset "Notebook File I/O" begin
    notebookA = samplenotebook()
    notebookB = Notebook(joinpath(tempdir(), "é🧡💛.jl"), [
        Cell("z = y"),
        Cell("v = u"),
        Cell("y = x"),
        Cell("x = w"),
        Cell("using Base"),
        Cell("t = 1"),
        Cell("w = v"),
        Cell("u = t"),
    ])

    @testset "I/O" begin
        @test let
            nb = notebookB
            save_notebook(nb)
            result = load_notebook_nobackup(nb.path)
            notebook_inputs_equal(nb, result)
        end
    end
    @testset "Line endings" for nb in [notebookA, notebookB]
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
    @testset "Bad code" begin
        nb = Notebook(joinpath(tempdir(), "é🧡💛.jl"), [
            Cell("z = y"),
            Cell("y = z")
        ])
        @test let
            file_contents = sprint(save_notebook, nb)
            result = sread(load_notebook_nobackup, sprint(save_notebook, nb), nb.path)
            notebook_inputs_equal(nb, result)
        end
    end
    @testset "Backup" begin
        notebookA.path = tempname() * ".jl"
        notebookB.path = tempname() * ".jl"
        backup_path = notebookB.path * ".backup"
        isfile(backup_path) && rm(backup_path)
        run_reactive!(notebookB, notebookB.cells)
        save_notebook(notebookB)
        notebookC = load_notebook(notebookB.path)
        @test !isfile(backup_path)
    end

    # TODO: tests for things mentioned in https://github.com/fonsp/Pluto.jl/issues/9
    # TODO: test bad dirs, filenames, permissions
end