import UUIDs: UUID, uuid1

mutable struct Notebook
    path::String
    
    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells::Array{Cell,1}
    
    uuid::UUID
    combined_funcdefs::Dict{Vector{Symbol}, SymbolsState}

    # buffer will contain all unfetched updates - must be big enough
    pendingupdates::Channel

    executetoken::Channel
end
# We can keep 128 updates pending. After this, any put! calls (i.e. calls that push an update to the notebook) will simply block, which is fine.
# This does mean that the Notebook can't be used if nothing is clearing the update channel.
Notebook(path::String, cells::Array{Cell,1}, uuid) = let
    et = Channel{Nothing}(1)
    put!(et, nothing)
    Notebook(path, cells, uuid, Dict{Vector{Symbol}, SymbolsState}(), Channel(1024), et)
end
Notebook(path::String, cells::Array{Cell,1}) = Notebook(path, cells, uuid1())
Notebook(cells::Array{Cell,1}) = Notebook(tempname() * ".jl", cells)

function selectcell_byuuid(notebook::Notebook, uuid::UUID)::Union{Cell,Nothing}
    cellIndex = findfirst(c->c.uuid == uuid, notebook.cells)
    if cellIndex === nothing
        @warn "Requested non-existing cell with UUID $(uuid)\nTry refreshing the page in your browser."
        return nothing
    end
    notebook.cells[cellIndex]
end

# We use a creative delimiter to avoid accidental use in code
const _uuid_delimiter = "# ╔═╡ "
const _order_delimiter = "# ╠═"
const _order_delimiter_folded = "# ╟─"
const _cell_appendix = "\n\n"

emptynotebook(path) = Notebook(path, [Cell("")])
emptynotebook() = emptynotebook(tempname() * ".jl")

function save_notebook(io, notebook::Notebook)
    write(io, "### A Pluto.jl notebook ###\n")
    write(io, "# " * PLUTO_VERSION_STR * "\n")
    # Anything between the version string and the first UUID delimiter will be ignored by the notebook loader.
    println(io, "")
    println(io, "using Markdown")
    # Super Advanced Code Analysis™ to add the @bind macro to the saved file if it's used somewhere.
    if any(occursin("@bind", c.code) for c in notebook.cells)
        write(io, PlutoRunner.fake_bind)
    end
    # TODO: this can be optimised by caching the topological order:
    # maintain cache with ordered UUIDs
    # whenever a run_reactive is done, move the found cells **up** until they are in one group, and order them topologcally within that group. Errable cells go to the bottom.

    # we first move cells to the front if they call an import
    # MergeSort because it is a stable sort: leaves cells in order if they are in the same category
    prelim_order = sort(notebook.cells, alg=MergeSort, by=(c -> !isempty(c.module_usings)))
    # the next call took 2ms for a small-medium sized notebook: (so not too bad)
    celltopology = dependent_cells(notebook, prelim_order)

    cells_ordered = union(celltopology.runnable, keys(celltopology.errable))

    for c in cells_ordered
        write(io, _uuid_delimiter * string(c.uuid) * "\n")
        write(io, c.code)
        write(io, _cell_appendix)
    end

    write(io, _uuid_delimiter * "Cell order:" * "\n")
    for c in notebook.cells
        delim = c.code_folded ? _order_delimiter_folded : _order_delimiter
        write(io, delim * string(c.uuid) * "\n")
    end
end

function save_notebook(notebook::Notebook, path::String)
    open(path, "w") do io
        save_notebook(io, notebook)
    end
end

save_notebook(notebook::Notebook) = save_notebook(notebook, notebook.path)

function load_notebook_nobackup(io, path)
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
    readuntil(io, _uuid_delimiter)

    last_read = ""
    while !eof(io)
        uuid_str = String(readline(io))
        if uuid_str == "Cell order:"
            break
        else
            uuid = UUID(uuid_str)
            code = String(readuntil(io, _uuid_delimiter))
            # Change windows line endings to linux; remove the cell appendix.
            code_normalised = replace(code, "\r\n" => "\n")[1:end - ncodeunits(_cell_appendix)]

            read_cell = Cell(uuid, code_normalised)

            collected_cells[uuid] = read_cell
        end
    end

    ordered_cells = Cell[]
    while !eof(io)
        uuid_str = String(readline(io))
        o, c = startswith(uuid_str, _order_delimiter), 
        if length(uuid_str) >= 36
            uuid = let
                UUID(uuid_str[end-35:end])
            end
            next_cell = collected_cells[uuid]
            next_cell.code_folded = startswith(uuid_str, _order_delimiter_folded)
            push!(ordered_cells, next_cell)
        end
    end

    Notebook(path, ordered_cells)
end

function load_notebook_nobackup(path::String)
    local loaded
    open(path, "r") do io
        loaded = load_notebook_nobackup(io, path)
    end
    loaded
end

function load_notebook(path::String)
    local backupNum = 1
    backupPath = path
    while isfile(backupPath)
        backupPath = path * ".backup" * string(backupNum)
        backupNum += 1
    end
    cp(path, backupPath)

    loaded = load_notebook_nobackup(path)

    save_notebook(loaded)

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
function only_versions_or_lineorder_differ(pathA::AbstractString, pathB::AbstractString)
    Set(readlines(pathA)[3:end]) == Set(readlines(pathB)[3:end])
end

function only_versions_differ(pathA::AbstractString, pathB::AbstractString)
    readlines(pathA)[3:end] == readlines(pathB)[3:end]
end

function tryexpanduser(path)
	try
		expanduser(path)
	catch ex
		path
	end
end

tamepath = normpath ∘ tryexpanduser