import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState, FunctionNameSignaturePair, FunctionName
import .Configuration

"The (information needed to create the) dependency graph of a notebook. Cells are linked by the names of globals that they define and reference. 🕸"
Base.@kwdef struct NotebookTopology
    nodes::Dict{Cell,ReactiveNode} = Dict{Cell,ReactiveNode}()
end

# `topology[cell]` is a shorthand for `get(topology, cell, ReactiveNode())`
# with the performance benefit of only generating ReactiveNode() when needed
function Base.getindex(topology::NotebookTopology, cell::Cell)::ReactiveNode
    get!(ReactiveNode, topology.nodes, cell)
end


"Like a [`Diary`](@ref) but more serious. 📓"
mutable struct Notebook
    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells::Array{Cell,1}
    
    # i still don't really know what an AbstractString is but it makes this package look more professional
    path::AbstractString
    notebook_id::UUID
    topology::NotebookTopology

    # buffer will contain all unfetched updates - must be big enough
    pendingupdates::Channel

    executetoken::Token

    # per notebook compiler options
    # nothing means to use global session compiler options
    compiler_options::Union{Nothing,Configuration.CompilerOptions}
end
# We can keep 128 updates pending. After this, any put! calls (i.e. calls that push an update to the notebook) will simply block, which is fine.
# This does mean that the Notebook can't be used if nothing is clearing the update channel.
Notebook(cells::Array{Cell,1}, path::AbstractString, notebook_id::UUID) = 
    Notebook(cells, path, notebook_id, NotebookTopology(), Channel(1024), Token(), nothing)

Notebook(cells::Array{Cell,1}, path::AbstractString=numbered_until_new(joinpath(new_notebooks_directory(), cutename()))) = Notebook(cells, path, uuid1())

function cell_index_from_id(notebook::Notebook, cell_id::UUID)::Union{Int,Nothing}
    findfirst(c -> c.cell_id == cell_id, notebook.cells)
end




const _notebook_header = "### A Pluto.jl notebook ###"
# We use a creative delimiter to avoid accidental use in code
# so don't get inspired to suddenly use these in your code!
const _cell_id_delimiter = "# ╔═╡ "
const _order_delimiter = "# ╠═"
const _order_delimiter_folded = "# ╟─"
const _cell_suffix = "\n\n"

emptynotebook(args...) = Notebook([Cell()], args...)

"""
Save the notebook to `io`, `file` or to `notebook.path`.

In the produced file, cells are not saved in the notebook order. If `notebook.topolgy` is up-to-date, I will save cells in _topological order_. This guarantees that you can run the notebook file outside of Pluto, with `julia my_notebook.jl`.

Have a look at our [JuliaCon 2020 presentation](https://youtu.be/IAF8DjrQSSk?t=1085) to learn more!
"""
function save_notebook(io, notebook::Notebook)
    println(io, _notebook_header)
    println(io, "# ", PLUTO_VERSION_STR)
    # Anything between the version string and the first UUID delimiter will be ignored by the notebook loader.
    println(io, "")
    println(io, "using Markdown")
    println(io, "using InteractiveUtils")
    # Super Advanced Code Analysis™ to add the @bind macro to the saved file if it's used somewhere.
    if any(occursin("@bind", c.code) for c in notebook.cells)
        println(io, "")
        println(io, "# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).")
        println(io, PlutoRunner.fake_bind)
    end
    println(io)

    # TODO: this can be optimised by caching the topological order:
    # maintain cache with ordered UUIDs
    # whenever a run_reactive! is done, move the found cells **down** until they are in one group, and order them topologically within that group. Errable cells go to the bottom.

    # the next call took 2ms for a small-medium sized notebook: (so not too bad)
    # 15 ms for a massive notebook - 120 cells, 800 lines
    notebook_topo_order = topological_order(notebook, notebook.topology, notebook.cells)

    cells_ordered = union(notebook_topo_order.runnable, keys(notebook_topo_order.errable))

    for c in cells_ordered
        println(io, _cell_id_delimiter, string(c.cell_id))
        print(io, c.code)
        print(io, _cell_suffix)
    end

    println(io, _cell_id_delimiter, "Cell order:")
    for c in notebook.cells
        delim = c.code_folded ? _order_delimiter_folded : _order_delimiter
        println(io, delim, string(c.cell_id))
    end
    notebook
end

function save_notebook(notebook::Notebook, path::String)
    open(path, "w") do io
        save_notebook(io, notebook)
    end
end

save_notebook(notebook::Notebook) = save_notebook(notebook, notebook.path)

"Load a notebook without saving it or creating a backup; returns a `Notebook`. REMEMBER TO CHANGE THE NOTEBOOK PATH after loading it to prevent it from autosaving and overwriting the original file."
function load_notebook_nobackup(io, path)::Notebook
    firstline = String(readline(io))

    if firstline != _notebook_header
        error("File is not a Pluto.jl notebook")
    end

    file_VERSION_STR = readline(io)[3:end]
    if file_VERSION_STR != PLUTO_VERSION_STR
        # @info "Loading a notebook saved with Pluto $(file_VERSION_STR). This is Pluto $(PLUTO_VERSION_STR)."
    end

    collected_cells = Dict()

    # ignore first bits of file
    readuntil(io, _cell_id_delimiter)

    last_read = ""
    while !eof(io)
        cell_id_str = String(readline(io))
        if cell_id_str == "Cell order:"
            break
        else
            cell_id = UUID(cell_id_str)
            code_raw = String(readuntil(io, _cell_id_delimiter))
            # change Windows line endings to Linux
            code_normalised = replace(code_raw, "\r\n" => "\n")
            # remove the cell appendix
            code = code_normalised[1:prevind(code_normalised, end, length(_cell_suffix))]

            read_cell = Cell(cell_id, code)
            collected_cells[cell_id] = read_cell
        end
    end

    ordered_cells = Cell[]
    while !eof(io)
        cell_id_str = String(readline(io))
        o, c = startswith(cell_id_str, _order_delimiter),
        if length(cell_id_str) >= 36
            cell_id = let
                UUID(cell_id_str[end - 35:end])
            end
            next_cell = collected_cells[cell_id]
            next_cell.code_folded = startswith(cell_id_str, _order_delimiter_folded)
            push!(ordered_cells, next_cell)
        end
    end

    Notebook(ordered_cells, path)
end

function load_notebook_nobackup(path::String)::Notebook
    local loaded
    open(path, "r") do io
        loaded = load_notebook_nobackup(io, path)
    end
    loaded
end

"Create a backup of the given file, load the file as a .jl Pluto notebook, save the loaded notebook, compare the two files, and delete the backup of the newly saved file is equal to the backup."
function load_notebook(path::String, run_notebook_on_load::Bool=false)::Notebook
    backup_path = numbered_until_new(path; sep=".backup", suffix="", create_file=false)
    # local backup_num = 1
    # backup_path = path
    # while isfile(backup_path)
    #     backup_path = path * ".backup" * string(backup_num)
    #     backup_num += 1
    # end
    readwrite(path, backup_path)

    loaded = load_notebook_nobackup(path)
    # Analyze cells so that the initial save is in topological order
    update_caches!(loaded, loaded.cells)
    loaded.topology = updated_topology(loaded.topology, loaded, loaded.cells)
    save_notebook(loaded)
    # Clear symstates if autorun/autofun is disabled. Otherwise running a single cell for the first time will also run downstream cells.
    if run_notebook_on_load
        loaded.topology = NotebookTopology()
    end

    if only_versions_or_lineorder_differ(path, backup_path)
        rm(backup_path)
    else
        @warn "Old Pluto notebook might not have loaded correctly. Backup saved to: " backup_path
    end

    loaded
end

"""
Check if two savefiles are identical, up to their version numbers and a possible line shuffle.

If a notebook has not yet had all of its cells analysed, we can't deduce the topological cell order. (but can we ever??) (no)
"""
function only_versions_or_lineorder_differ(pathA::AbstractString, pathB::AbstractString)::Bool
    Set(readlines(pathA)[3:end]) == Set(readlines(pathB)[3:end])
end

function only_versions_differ(pathA::AbstractString, pathB::AbstractString)::Bool
    readlines(pathA)[3:end] == readlines(pathB)[3:end]
end

"Set `notebook.path` to the new value, save the notebook, verify file integrity, and if all OK, delete the old savefile. Normalizes the given path to make it absolute. Moving is always hard. 😢"
function move_notebook!(notebook::Notebook, newpath::String)
    # Will throw exception and return if anything goes wrong, so at least one file is guaranteed to exist.
    oldpath_tame = tamepath(notebook.path)
    newpath_tame = tamepath(newpath)
    save_notebook(notebook, oldpath_tame)
    save_notebook(notebook, newpath_tame)

    # @assert that the new file looks alright
    @assert only_versions_differ(oldpath_tame, newpath_tame)

    notebook.path = newpath_tame

    if oldpath_tame != newpath_tame
        rm(oldpath_tame)
    end
    notebook
end
