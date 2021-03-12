import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState

Base.@kwdef struct CellOutput
    body::Union{Nothing,String,Vector{UInt8},Dict}=nothing
    mime::MIME=MIME("text/plain")
    rootassignee::Union{Symbol,Nothing}=nothing

    "Time that the last output was created, used only on the frontend to rerender the output"
    last_run_timestamp::Float64=0
    
    "Whether `this` inside `<script id=something>` should refer to the previously returned object in HTML output. This is used for fancy animations. true iff a cell runs as a reactive consequence."
    persist_js_state::Bool=false
end

"The building block of a `Notebook`. Contains code, output, reactivity data, mitochondria and ribosomes."
Base.@kwdef mutable struct Cell
    "Because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    cell_id::UUID=uuid1()

    code::String=""
    code_folded::Bool=false
    
    output::CellOutput=CellOutput()
    queued::Bool=false
    running::Bool=false
    
    errored::Bool=false
    runtime::Union{Nothing,UInt64}=nothing

    # information to display cell dependencies
    # Open: move to another place?
    downstream_cells_map::Dict{Symbol,Vector{Cell}}=Dict{Symbol,Vector{Cell}}()
    upstream_cells_map::Dict{Symbol,Vector{Cell}}=Dict{Symbol,Vector{Cell}}()
    precedence_heuristic::Int=99

    # execution barrier
    "user defined execution barrier"
    has_execution_barrier::Bool=false
    "is this barrier active? requires `has_execution_barrier=true`"
    barrier_is_active::Bool=false
    "is this cell deactivated, either by having itself an activated execution barrier or upstream?"
    is_deactivated::Bool=false

end

Cell(cell_id, code) = Cell(cell_id=cell_id, code=code)
Cell(code) = Cell(uuid1(), code)

cell_id(cell::Cell) = cell.cell_id

function Base.convert(::Type{Cell}, cell::Dict)
	Cell(
        cell_id=UUID(cell["cell_id"]),
        code=cell["code"],
        code_folded=cell["code_folded"],
        has_execution_barrier=cell["has_execution_barrier"],
    )
end
function Base.convert(::Type{UUID}, string::String)
    UUID(string)
end