import UUIDs: UUID, uuid1

# Hello! 👋 Check out the `Cell` struct.


const METADATA_DISABLED_KEY = "disabled"
const METADATA_SHOW_LOGS_KEY = "show_logs"
const METADATA_SKIP_AS_SCRIPT_KEY = "skip_as_script"

# Make sure to keep this in sync with DEFAULT_CELL_METADATA in ../frontend/components/Editor.js
const DEFAULT_CELL_METADATA = Dict{String, Any}(
    METADATA_DISABLED_KEY => false,
    METADATA_SHOW_LOGS_KEY => true,
    METADATA_SKIP_AS_SCRIPT_KEY => false,
)

Base.@kwdef struct CellOutput
    body::Union{Nothing,String,Vector{UInt8},Dict}=nothing
    mime::MIME=MIME("text/plain")
    rootassignee::Union{Symbol,Nothing}=nothing

    "Time that the last output was created, used only on the frontend to rerender the output"
    last_run_timestamp::Float64=0
    
    "Whether `this` inside `<script id=something>` should refer to the previously returned object in HTML output. This is used for fancy animations. true iff a cell runs as a reactive consequence."
    persist_js_state::Bool=false

    "Whether this cell uses @use_state or @use_effect"
    has_pluto_hook_features::Bool=false
end

struct CellDependencies{T} # T == Cell, but this has to be parametric to avoid a circular dependency of the structs
    downstream_cells_map::Dict{Symbol,Vector{T}}
    upstream_cells_map::Dict{Symbol,Vector{T}}
    precedence_heuristic::Int
end

"The building block of a `Notebook`. Contains code, output, reactivity data, mitochondria and ribosomes."
Base.@kwdef mutable struct Cell <: PlutoDependencyExplorer.AbstractCell
    "Because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    cell_id::UUID=uuid1()

    code::String=""
    code_folded::Bool=false
    
    output::CellOutput=CellOutput()
    queued::Bool=false
    running::Bool=false

    published_objects::Dict{String,Any}=Dict{String,Any}()
    
    logs::Vector{Dict{String,Any}}=Vector{Dict{String,Any}}()
    
    errored::Bool=false
    runtime::Union{Nothing,UInt64}=nothing

    # note that this field might be moved somewhere else later. If you are interested in visualizing the cell dependencies, take a look at the cell_dependencies field in the frontend instead.
    cell_dependencies::CellDependencies{Cell}=CellDependencies{Cell}(Dict{Symbol,Vector{Cell}}(), Dict{Symbol,Vector{Cell}}(), 99)

    depends_on_disabled_cells::Bool=false
    depends_on_skipped_cells::Bool=false

    metadata::Dict{String,Any}=copy(DEFAULT_CELL_METADATA)
end

Cell(cell_id, code) = Cell(; cell_id, code)
Cell(code) = Cell(uuid1(), code)

cell_id(cell::Cell) = cell.cell_id

function Base.convert(::Type{Cell}, cell::Dict)
	Cell(
        cell_id=UUID(cell["cell_id"]),
        code=cell["code"],
        code_folded=cell["code_folded"],
        metadata=cell["metadata"],
    )
end

"Returns whether or not the cell is **explicitely** disabled."
is_disabled(c::Cell) = get(c.metadata, METADATA_DISABLED_KEY, DEFAULT_CELL_METADATA[METADATA_DISABLED_KEY])
set_disabled(c::Cell, value::Bool) = if value == DEFAULT_CELL_METADATA[METADATA_DISABLED_KEY]
    delete!(c.metadata, METADATA_DISABLED_KEY)
else
    c.metadata[METADATA_DISABLED_KEY] = value
end
can_show_logs(c::Cell) = get(c.metadata, METADATA_SHOW_LOGS_KEY, DEFAULT_CELL_METADATA[METADATA_SHOW_LOGS_KEY])
is_skipped_as_script(c::Cell) = get(c.metadata, METADATA_SKIP_AS_SCRIPT_KEY, DEFAULT_CELL_METADATA[METADATA_SKIP_AS_SCRIPT_KEY])
must_be_commented_in_file(c::Cell) = is_disabled(c) || is_skipped_as_script(c) || c.depends_on_disabled_cells || c.depends_on_skipped_cells
