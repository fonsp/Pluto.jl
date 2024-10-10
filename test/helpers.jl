# Collect timing and allocations information; this is printed later.
using TimerOutputs: TimerOutput, @timeit
const TOUT = TimerOutput()
macro timeit_include(path::AbstractString) :(@timeit TOUT $path include($path)) end
function print_timeroutput()
    # Sleep to avoid old logs getting tangled up in the output.
    sleep(6)
    println()
    show(TOUT; compact=true, sortby=:firstexec)
    println()
end

@timeit TOUT "import Pluto" import Pluto
using ExpressionExplorer
using Sockets
using Test
using HTTP
import Pkg
import Malt
import Malt.Distributed



function insert_cell!(notebook, cell)
    notebook.cells_dict[cell.cell_id] = cell
    push!(notebook.cell_order, cell.cell_id)
end

function delete_cell!(notebook, cell)
    deleteat!(notebook.cell_order, findfirst(==(cell.cell_id), notebook.cell_order))
    delete!(notebook.cells_dict, cell.cell_id)
end

function setcode!(cell, newcode)
    cell.code = newcode
end

function noerror(cell; verbose=true)
    if cell.errored && verbose
        @show cell.output.body cell.logs
    end
    !cell.errored
end

function occursinerror(needle, haystack::Pluto.Cell)
    haystack.errored && occursin(needle, haystack.output.body[:msg])
end

function expecterror(err, cell; strict=true)
    cell.errored || return false
    msg = sprint(showerror, err)

    # UndefVarError(:x, #undef)
    if err isa UndefVarError && !isdefined(err, :scope) && VERSION >= v"1.11"
        strict = false
        msg = first(split(msg, '\n'; limit=2))
    end

    if strict
        return cell.output.body[:msg] == msg
    else
        return occursin(msg, cell.output.body[:msg])
    end
end

"Test notebook equality, ignoring cell UUIDs and such."
macro test_notebook_inputs_equal(nbA, nbB, check_paths_equality::Bool=true)
    quote
        nbA = $(esc(nbA))
        nbB = $(esc(nbB))
        if $(check_paths_equality)
            @test normpath(nbA.path) == normpath(nbB.path)
        end
        
        @test length(nbA.cells) == length(nbB.cells)
        @test getproperty.(nbA.cells, :cell_id) == getproperty.(nbB.cells, :cell_id)
        @test getproperty.(nbA.cells, :code_folded) == getproperty.(nbB.cells, :code_folded)
        @test getproperty.(nbA.cells, :code) == getproperty.(nbB.cells, :code)
        @test get_metadata_no_default.(nbA.cells) ==  get_metadata_no_default.(nbB.cells)
        
    end |> Base.remove_linenums!
end

"Whether the given .jl file can be run without any errors. While notebooks cells can be in arbitrary order, their order in the save file must be topological.

If `only_undefvar` is `true`, all errors other than an `UndefVarError` will be ignored."
function jl_is_runnable(path; only_undefvar=false)
    🔖 = Symbol("lab", time_ns())
    🏡 = Core.eval(Main, :(module $(🔖) end))
    try
        Core.eval(🏡, :(include($path)))
        true
    catch ex
        if (!only_undefvar) || ex isa UndefVarError || (ex isa LoadError && ex.error isa UndefVarError)
            println(stderr, "\n$(path) failed to run. File contents:")

            println(stderr, "\n\n\n")
            println.(enumerate(readlines(path; keep=true)))
            println(stderr, "\n\n\n")

            showerror(stderr, ex, stacktrace(catch_backtrace()))
            println(stderr)
            false
        else
            true
        end
    end
end

"Whether the `notebook` runs without errors."
function nb_is_runnable(session::Pluto.ServerSession, notebook::Pluto.Notebook)
    Pluto.update_run!(session, notebook, notebook.cells)
    errored = filter(c -> c.errored, notebook.cells)
    if !isempty(errored)
        @show errored
    end
    isempty(errored)
end

"The converse of Julia's `Base.sprint`."
function sread(f::Function, input::String, args...)
    io = IOBuffer(input)
    output = f(io, args...)
    close(io)
    return output
end

function num_backups_in(dir::AbstractString)
    count(readdir(dir)) do fn
        occursin("backup", fn)
    end
end

has_embedded_pkgfiles(contents::AbstractString) = 
    occursin("PROJECT", contents) && occursin("MANIFEST", contents)

has_embedded_pkgfiles(nb::Pluto.Notebook) = 
    read(nb.path, String) |> has_embedded_pkgfiles

"""
Log an error message if there are any running processes created by Distrubted, that were not shut down.
"""
function verify_no_running_processes()
    if length(Distributed.procs()) != 1 || !isempty(Malt.__iNtErNaL_get_running_procs())
        @error "Not all notebook processes were closed during tests!" Distributed.procs() Malt.__iNtErNaL_get_running_procs()
    end
end

# We have our own registry for these test! Take a look at https://github.com/JuliaPluto/PlutoPkgTestRegistry#readme for more info about the test packages and their dependencies.

const pluto_test_registry_spec = Pkg.RegistrySpec(;
    url="https://github.com/JuliaPluto/PlutoPkgTestRegistry", 
    uuid=Base.UUID("96d04d5f-8721-475f-89c4-5ee455d3eda0"),
    name="PlutoPkgTestRegistry",
)

const snapshots_dir = joinpath(@__DIR__, "snapshots")

isdir(snapshots_dir) && rm(snapshots_dir; force=true, recursive=true)
mkdir(snapshots_dir)

function cleanup(session, notebook)
    testset_stack = get(task_local_storage(), :__BASETESTNEXT__, Test.AbstractTestSet[])
    name = replace(join((t.description for t in testset_stack), " – "), r"[\:\?\r\n<>\|\*]" => "-")
    
    path = Pluto.numbered_until_new(joinpath(snapshots_dir, name); suffix=".html", create_file=true)
    
    write(path, Pluto.generate_html(notebook))
    
    WorkspaceManager.unmake_workspace((session, notebook))
end

