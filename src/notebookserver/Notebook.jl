import UUIDs: UUID, uuid1

mutable struct Notebook
    path::String
    
    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells::Array{Cell,1}
    
    notebook_id::UUID
    combined_funcdefs::Dict{Vector{Symbol}, SymbolsState}

    # buffer will contain all unfetched updates - must be big enough
    pendingupdates::Channel

    executetoken::Channel
end
# We can keep 128 updates pending. After this, any put! calls (i.e. calls that push an update to the notebook) will simply block, which is fine.
# This does mean that the Notebook can't be used if nothing is clearing the update channel.
Notebook(path::String, cells::Array{Cell,1}, notebooID) = let
    et = Channel{Nothing}(1)
    put!(et, nothing)
    Notebook(path, cells, notebooID, Dict{Vector{Symbol}, SymbolsState}(), Channel(1024), et)
end
Notebook(path::String, cells::Array{Cell,1}) = Notebook(path, cells, uuid1())
Notebook(cells::Array{Cell,1}) = Notebook(tempname() * ".jl", cells)

function cellindex_fromID(notebook::Notebook, cell_id::UUID)::Union{Int,Nothing}
    findfirst(c->c.cell_id == cell_id, notebook.cells)
end

# We use a creative delimiter to avoid accidental use in code
const _cell_id_delimiter = "# ╔═╡ "
const _order_delimiter = "# ╠═"
const _order_delimiter_folded = "# ╟─"
const _cell_suffix = "\n\n"

emptynotebook(path) = Notebook(path, [Cell("")])
emptynotebook() = emptynotebook(tempname() * ".jl")

function save_notebook(io, notebook::Notebook)
    println(io, "### A Pluto.jl notebook ###")
    println(io, "# ", PLUTO_VERSION_STR)
    # Anything between the version string and the first UUID delimiter will be ignored by the notebook loader.
    println(io, "")
    println(io, "using Markdown")
    # Super Advanced Code Analysis™ to add the @bind macro to the saved file if it's used somewhere.
    if any(occursin("@bind", c.code) for c in notebook.cells)
        println(io, PlutoRunner.fake_bind)
    end
    println(io)

    # TODO: this can be optimised by caching the topological order:
    # maintain cache with ordered UUIDs
    # whenever a run_reactive is done, move the found cells **up** until they are in one group, and order them topologcally within that group. Errable cells go to the bottom.

    # the next call took 2ms for a small-medium sized notebook: (so not too bad)
    celltopology = topological_order(notebook, notebook.cells)

    cells_ordered = union(celltopology.runnable, keys(celltopology.errable))

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
    
    if firstline != "### A Pluto.jl notebook ###"
        @error "File is not a Pluto.jl notebook"
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
            code = code_normalised[1 : prevind(code_normalised, end, length(_cell_suffix))]

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
                UUID(cell_id_str[end-35:end])
            end
            next_cell = collected_cells[cell_id]
            next_cell.code_folded = startswith(cell_id_str, _order_delimiter_folded)
            push!(ordered_cells, next_cell)
        end
    end

    Notebook(path, ordered_cells)
end

function load_notebook_nobackup(path::String)::Notebook
    local loaded
    open(path, "r") do io
        loaded = load_notebook_nobackup(io, path)
    end
    loaded
end

"Create a backup of the given file, load the file as a .jl Pluto notebook, save the loaded notebook, compare the two files, and delete the backup of the newly saved file is equal to the backup."
function load_notebook(path::String)::Notebook
    local backupNum = 1
    backupPath = path
    while isfile(backupPath)
        backupPath = path * ".backup" * string(backupNum)
        backupNum += 1
    end
    cp(path, backupPath)

    loaded = load_notebook_nobackup(path)
    # Analyze cells so that the initial save is in topological order
    update_caches!(loaded, loaded.cells)
    save_notebook(loaded)
    # Clear symstates if autorun/autofun is disabled. Otherwise running a single cell for the first time will also run downstream cells.
    if ENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] != "true"
        for cell in loaded.cells
            cell.symstate = SymbolsState()
        end
    end

    if only_versions_or_lineorder_differ(path, backupPath)
        rm(backupPath)
    else
        @warn "Old Pluto notebook might not have loaded correctly. Backup saved to: " backupPath
    end

    loaded
end

function move_notebook(notebook::Notebook, newpath::String)
    # Will throw exception and return if anything goes wrong, so at least one file is guaranteed to exist.
    oldpath = notebook.path
    save_notebook(notebook, oldpath)
    save_notebook(notebook, newpath)
    @assert only_versions_differ(oldpath, newpath)
    notebook.path = newpath
    rm(oldpath)
end

"Check if two savefiles are identical, up to their version numbers and a possible line shuffle.

If a notebook has not yet had all of its cells run, we can't deduce the topological cell order."
function only_versions_or_lineorder_differ(pathA::AbstractString, pathB::AbstractString)::Bool
    Set(readlines(pathA)[3:end]) == Set(readlines(pathB)[3:end])
end

function only_versions_differ(pathA::AbstractString, pathB::AbstractString)::Bool
    readlines(pathA)[3:end] == readlines(pathB)[3:end]
end

function tryexpanduser(path)
	try
		expanduser(path)
	catch ex
		path
	end
end

tamepath = abspath ∘ tryexpanduser