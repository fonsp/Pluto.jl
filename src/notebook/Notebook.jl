import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState, FunctionNameSignaturePair, FunctionName
import .Configuration

struct BondValue
    value::Any
end
function Base.convert(::Type{BondValue}, dict::Dict)
    BondValue(dict["value"])
end

const ProcessStatus = (
    ready="ready",
    starting="starting",
    no_process="no_process",
    waiting_to_restart="waiting_to_restart",
)

"Like a [`Diary`](@ref) but more serious. 📓"
Base.@kwdef mutable struct Notebook
    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells_dict::Dict{UUID,Cell}
    cell_order::Array{UUID,1}
    
    path::String
    notebook_id::UUID
    topology::NotebookTopology=NotebookTopology()
    _cached_topological_order::Union{Nothing,TopologicalOrder}=nothing

    # buffer will contain all unfetched updates - must be big enough
    # We can keep 1024 updates pending. After this, any put! calls (i.e. calls that push an update to the notebook) will simply block, which is fine.
    # This does mean that the Notebook can't be used if nothing is clearing the update channel.
    pendingupdates::Channel=Channel(1024)

    executetoken::Token=Token()

    # per notebook compiler options
    # nothing means to use global session compiler options
    compiler_options::Union{Nothing,Configuration.CompilerOptions}=nothing

    process_status::String=ProcessStatus.starting

    bonds::Dict{Symbol,BondValue}=Dict{Symbol,BondValue}()

    wants_to_interrupt::Bool=false
end

Notebook(cells::Array{Cell,1}, path::AbstractString, notebook_id::UUID) = Notebook(
    cells_dict=Dict(map(cells) do cell
        (cell.cell_id, cell)
    end),
    cell_order=map(x -> x.cell_id, cells),
    path=path,
    notebook_id=notebook_id,
)

Notebook(cells::Array{Cell,1}, path::AbstractString=numbered_until_new(joinpath(new_notebooks_directory(), cutename()))) = Notebook(cells, path, uuid1())

function Base.getproperty(notebook::Notebook, property::Symbol)
    if property == :cells
        cells_dict = getfield(notebook, :cells_dict)
        cell_order = getfield(notebook, :cell_order)
        map(cell_order) do id
            cells_dict[id]
        end
    elseif property == :cell_inputs
        getfield(notebook, :cells_dict)
    else
        getfield(notebook, property)
    end
end

const _notebook_header = "### A Pluto.jl notebook ###"
# We use a creative delimiter to avoid accidental use in code
# so don't get inspired to suddenly use these in your code!
const _cell_id_delimiter = "# ╔═╡ "
const _order_delimiter = "# ╠═"
const _order_delimiter_folded = "# ╟─"
const _cell_suffix = "\n\n"

const _running_disabled_prefix =               "#=╠═╡ disabled"
const _running_disabled_suffix =             "\n  ╠═╡ disabled =#"
const _depends_on_disabled_cells_prefix =      "#=╠═╡ depends on disabled cell(s)"
const _depends_on_disabled_cells_suffix =    "\n  ╠═╡ depends on disabled cell(s) =#"

emptynotebook(args...) = Notebook([Cell()], args...)

"""
Save the notebook to `io`, `file` or to `notebook.path`.

In the produced file, cells are not saved in the notebook order. If `notebook.topology` is up-to-date, I will save cells in _topological order_. This guarantees that you can run the notebook file outside of Pluto, with `julia my_notebook.jl`.

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

    cells_ordered = collect(topological_order(notebook))
    
    for c in cells_ordered
        println(io, _cell_id_delimiter, string(c.cell_id))
        # write the cell code and prevent collisions with the cell delimiter

        if c.running_disabled
            println(io, _running_disabled_prefix)
            print(io, replace(c.code, _cell_id_delimiter => "# "))
            println(io, _running_disabled_suffix)
        elseif c.depends_on_disabled_cells
            # if a cell is both disabled directly and indirectly, the first has higher priority
            println(io, _depends_on_disabled_cells_prefix)
            print(io, replace(c.code, _cell_id_delimiter => "# "))
            println(io, _depends_on_disabled_cells_suffix)
        else
            # cell is not disabled on startup
            print(io, replace(c.code, _cell_id_delimiter => "# "))
        end

        print(io, _cell_suffix)
    end

    println(io, _cell_id_delimiter, "Cell order:")
    for c in notebook.cells
        delim = c.code_folded ? _order_delimiter_folded : _order_delimiter
        println(io, delim, string(c.cell_id))
    end
    notebook
end

function open_safe_write(fn::Function, path, mode)
    file_content = sprint(fn)
    open(path, mode) do io
        print(io, file_content)
    end
end
    
function save_notebook(notebook::Notebook, path::String)
    open_safe_write(path, "w") do io
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
            
            # get the information if a cell is disabled
            running_disabled = startswith(code_normalised, _running_disabled_prefix)
            depends_on_disabled_cells = startswith(code_normalised, _depends_on_disabled_cells_prefix)

            # remove the disabled on startup comments for further processing in Julia
            code_normalised = replace(replace(code_normalised, _running_disabled_prefix * "\n" => ""), _running_disabled_suffix * "\n" => "")
            code_normalised = replace(replace(code_normalised, _depends_on_disabled_cells_prefix * "\n" => ""), _depends_on_disabled_cells_suffix * "\n" => "")

            # remove the cell suffix
            code = code_normalised[1:prevind(code_normalised, end, length(_cell_suffix))]

            read_cell = Cell(cell_id, code)
            read_cell.running_disabled = running_disabled
            read_cell.depends_on_disabled_cells = depends_on_disabled_cells || running_disabled
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
function load_notebook(path::String; disable_writing_notebook_files::Bool=false)::Notebook
    backup_path = numbered_until_new(without_pluto_file_extension(path); sep=" backup ", suffix=".jl", create_file=false, skip_original=true)
    # local backup_num = 1
    # backup_path = path
    # while isfile(backup_path)
    #     backup_path = path * ".backup" * string(backup_num)
    #     backup_num += 1
    # end
    disable_writing_notebook_files || readwrite(path, backup_path)

    loaded = load_notebook_nobackup(path)
    # Analyze cells so that the initial save is in topological order
    loaded.topology = updated_topology(loaded.topology, loaded, loaded.cells)
    update_dependency_cache!(loaded)

    disable_writing_notebook_files || save_notebook(loaded)
    loaded.topology = NotebookTopology()

    disable_writing_notebook_files || if only_versions_or_lineorder_differ(path, backup_path)
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
function move_notebook!(notebook::Notebook, newpath::String; disable_writing_notebook_files::Bool=false)
    # Will throw exception and return if anything goes wrong, so at least one file is guaranteed to exist.
    oldpath_tame = tamepath(notebook.path)
    newpath_tame = tamepath(newpath)

    if !disable_writing_notebook_files
        save_notebook(notebook, oldpath_tame)
        save_notebook(notebook, newpath_tame)

        # @assert that the new file looks alright
        @assert only_versions_differ(oldpath_tame, newpath_tame)

        notebook.path = newpath_tame

        if oldpath_tame != newpath_tame
            rm(oldpath_tame)
        end
    else
        notebook.path = newpath_tame
    end
    if isdir("$oldpath_tame.assets")
        mv("$oldpath_tame.assets", "$newpath_tame.assets")
    end
    notebook
end

function sample_notebook(name::String)
    file = project_relative_path("sample", name * ".jl")
    nb = load_notebook_nobackup(file)
    nb.path = tempname() * ".jl"
    nb
end