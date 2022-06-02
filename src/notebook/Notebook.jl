import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState, FunctionNameSignaturePair, FunctionName
import .Configuration
import .PkgCompat: PkgCompat, PkgContext
import Pkg
import TOML


const DEFAULT_NOTEBOOK_METADATA = Dict{String, Any}()

mutable struct BondValue
    value::Any
end
function Base.convert(::Type{BondValue}, dict::AbstractDict)
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
    cell_order::Vector{UUID}

    path::String
    notebook_id::UUID=uuid1()
    topology::NotebookTopology
    _cached_topological_order::Union{Nothing,TopologicalOrder}=nothing
    _cached_cell_dependencies_source::Union{Nothing,NotebookTopology}=nothing

    # buffer will contain all unfetched updates - must be big enough
    # We can keep 1024 updates pending. After this, any put! calls (i.e. calls that push an update to the notebook) will simply block, which is fine.
    # This does mean that the Notebook can't be used if nothing is clearing the update channel.
    pendingupdates::Channel=Channel(1024)

    executetoken::Token=Token()

    # per notebook compiler options
    # nothing means to use global session compiler options
    compiler_options::Union{Nothing,Configuration.CompilerOptions}=nothing
    # nbpkg_ctx::Union{Nothing,PkgContext}=nothing
    nbpkg_ctx::Union{Nothing,PkgContext}=PkgCompat.create_empty_ctx()
    nbpkg_ctx_instantiated::Bool=false
    nbpkg_restart_recommended_msg::Union{Nothing,String}=nothing
    nbpkg_restart_required_msg::Union{Nothing,String}=nothing
    nbpkg_terminal_outputs::Dict{String,String}=Dict{String,String}()
    nbpkg_busy_packages::Vector{String}=String[]
    nbpkg_installed_versions_cache::Dict{String,String}=Dict{String,String}()

    process_status::String=ProcessStatus.starting
    wants_to_interrupt::Bool=false
    last_save_time::typeof(time())=time()
    last_hot_reload_time::typeof(time())=zero(time())

    bonds::Dict{Symbol,BondValue}=Dict{Symbol,BondValue}()

    metadata::Dict{String, Any}=copy(DEFAULT_NOTEBOOK_METADATA)
end

_collect_cells(cells_dict::Dict{UUID,Cell}, cells_order::Vector{UUID}) = 
    map(i -> cells_dict[i], cells_order)
_initial_topology(cells_dict::Dict{UUID,Cell}, cells_order::Vector{UUID}) =
    NotebookTopology(;
        cell_order=ImmutableVector(_collect_cells(cells_dict, cells_order)),
    )

function Notebook(cells::Vector{Cell}, @nospecialize(path::AbstractString), notebook_id::UUID)
    cells_dict=Dict(map(cells) do cell
        (cell.cell_id, cell)
    end)
    cell_order=map(x -> x.cell_id, cells)
    Notebook(;
        cells_dict,
        cell_order,
        topology=_initial_topology(cells_dict, cell_order),
        path,
        notebook_id
    )
end

Notebook(cells::Vector{Cell}, path::AbstractString=numbered_until_new(joinpath(new_notebooks_directory(), cutename()))) = Notebook(cells, path, uuid1())

function Base.getproperty(notebook::Notebook, property::Symbol)
    if property == :cells
        _collect_cells(notebook.cells_dict, notebook.cell_order)
    elseif property == :cell_inputs
        notebook.cells_dict
    else
        getfield(notebook, property)
    end
end


emptynotebook(args...) = Notebook([Cell()], args...)

function sample_notebook(name::String)
    file = project_relative_path("sample", name * ".jl")
    nb = load_notebook_nobackup(file)
    nb.path = tempname() * ".jl"
    nb
end

create_cell_metadata(metadata::Dict{String,<:Any}) = merge(DEFAULT_CELL_METADATA, metadata)
create_notebook_metadata(metadata::Dict{String,<:Any}) = merge(DEFAULT_NOTEBOOK_METADATA, metadata)
get_metadata(cell::Cell)::Dict{String,Any} = cell.metadata
get_metadata(notebook::Notebook)::Dict{String,Any} = notebook.metadata
get_metadata_no_default(cell::Cell)::Dict{String,Any} = Dict{String,Any}(setdiff(pairs(cell.metadata), pairs(DEFAULT_CELL_METADATA)))
get_metadata_no_default(notebook::Notebook)::Dict{String,Any} = Dict{String,Any}(setdiff(pairs(notebook.metadata), pairs(DEFAULT_NOTEBOOK_METADATA)))
