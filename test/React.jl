using Test
using Pluto
import Pluto: Notebook, run_reactive!, createcell_fromcode

@testset "Reactivity" begin
@testset "Basic" begin
    notebook = Notebook("test.jl", [
        createcell_fromcode("x = 1"),
        createcell_fromcode("y = x")
    ])
    run_reactive!(notebook, notebook.cells[1])
    run_reactive!(notebook, notebook.cells[2])
    @test notebook.cells[1].output == notebook.cells[2].output
    notebook.cells[1].code = "x = 12"
    run_reactive!(notebook, notebook.cells[1])
    @test notebook.cells[1].output == notebook.cells[2].output
end

@testset "Cyclic" begin
    notebook = Notebook("test.jl", [
        createcell_fromcode("x = y"),
        createcell_fromcode("y = x")
    ])
    run_reactive!(notebook, notebook.cells[1])
    run_reactive!(notebook, notebook.cells[2])
    @test occursin("Cyclic reference", notebook.cells[1].errormessage)
    @test occursin("Cyclic reference", notebook.cells[2].errormessage)
end

@testset "Variable deletion" begin
    notebook = Notebook("test.jl", [
        createcell_fromcode("x = 1"),
        createcell_fromcode("y = x")
    ])
    run_reactive!(notebook, notebook.cells[1])
    run_reactive!(notebook, notebook.cells[2])
    @test notebook.cells[1].output == notebook.cells[2].output
    notebook.cells[1].code = ""
    run_reactive!(notebook, notebook.cells[1])
    @test notebook.cells[1].output == nothing
    @test notebook.cells[1].errormessage == nothing
    @test notebook.cells[2].output == nothing
    @test occursin("x not defined", notebook.cells[2].errormessage)
end
end