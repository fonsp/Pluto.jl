using UUIDs

mutable struct Notebook
    path::String
    
    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells::Array{Cell,1}
    
    uuid::UUID
    combined_funcdefs::Dict{Symbol, SymbolsState}

    # buffer must contain all undisplayed outputs
    pendingupdates::Channel

    executetoken::Channel
end
# We can keep 128 updates pending. After this, any put! calls (i.e. calls that push an update to the notebook) will simply block, which is fine.
# This does mean that the Notebook can't be used if nothing is clearing the update channel.
Notebook(path::String, cells::Array{Cell,1}, uuid) = let
    et = Channel{Nothing}(1)
    put!(et, nothing)
    Notebook(path, cells, uuid, Dict{Symbol, SymbolsState}(), Channel(128), et)
end
Notebook(path::String, cells::Array{Cell,1}) = Notebook(path, cells, uuid1())

function selectcell_byuuid(notebook::Notebook, uuid::UUID)::Union{Cell,Nothing}
    cellIndex = findfirst(c->c.uuid == uuid, notebook.cells)
    if cellIndex === nothing
        @warn "Requested non-existing cell with UUID $(uuid)\nTry refreshing the page in your browser."
        return nothing
    end
    notebook.cells[cellIndex]
end

# We use a creative delimiter to avoid accidental use in code
_uuid_delimiter = "# ╔═╡ "
_order_delimited = "# ○ "
_cell_appendix = "\n\n"

emptynotebook(path) = Notebook(path, [Cell("")])
emptynotebook() = emptynotebook(tempname() * ".jl")

function samplenotebook()
    cells = Cell[]

    push!(cells, Cell("100*a + b"))
    push!(cells, Cell("a = 1"))
    push!(cells, Cell("b = let\n\tx = a + a\n\tx*x\nend"))
    push!(cells, Cell("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""))
    push!(cells, Cell("""md"# Cześć!
    My name is **baba** and I like \$\\LaTeX\$ _support!_
    
    \$\$\\begin{align}
    \\varphi &= \\sum_{i=1}^{\\infty} \\frac{\\left(\\sin{x_i}^2 + \\cos{x_i}^2\\right)}{i^2} \\\\
    b &= \\frac{1}{2}\\,\\log \\exp{\\varphi}
    \\end{align}\$\$

    ### The spectacle before us was indeed sublime.
    Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectator on a hillside, the sable cloud beneath was dished out, and the car seemed to float in the middle of an immense dark sphere, whose upper half was strewn with silver. Looking down into the dark gulf below, I could see a ruddy light streaming through a rift in the clouds."
    """))

    Notebook(tempname() * ".jl", cells)
end

function save_notebook(io, notebook::Notebook)
    write(io, "### A Pluto.jl notebook ###\n")
    write(io, "# " * PLUTO_VERSION_STR * "\n")

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
        write(io, _order_delimited * string(c.uuid) * "\n")
    end
end

function save_notebook(notebook::Notebook, path::String)
    open(path, "w") do io
        save_notebook(io, notebook)
    end
end

save_notebook(notebook::Notebook) = save_notebook(notebook, notebook.path)

function load_notebook(io, path)
    firstline = String(readline(io))
    
    if firstline != "### A Pluto.jl notebook ###"
        @error "File is not a Pluto.jl notebook"
    end

    file_VERSION_STR = readline(io)[3:end]
    if file_VERSION_STR != PLUTO_VERSION_STR
        @warn "Loading a notebook saved with Pluto $(file_VERSION_STR). This is Pluto $(PLUTO_VERSION_STR)."
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
        if startswith(uuid_str, _order_delimited)
            uuid = let
                # Because we support Unicode, this is not just `length(_order_delimited) + 1`.
                uuid_index = ncodeunits(_order_delimited) + 1
                UUID(uuid_str[uuid_index:end])
            end
            push!(ordered_cells, collected_cells[uuid])
        end
    end

    Notebook(path, ordered_cells)
end

function load_notebook(path::String)
    backupPath = path
    while isfile(backupPath)
        backupPath = backupPath * ".backup"
    end
    cp(path, backupPath)

    local loaded
    open(path, "r") do io
        loaded = load_notebook(io, path)
    end

    save_notebook(loaded)

    if only_versions_differ(path, backupPath)
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

function only_versions_differ(pathA::AbstractString, pathB::AbstractString)
    readlines(pathA)[3:end] == readlines(pathB)[3:end]
end