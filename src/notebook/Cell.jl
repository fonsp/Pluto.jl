import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState

"The building block of a `Notebook`. Contains code, output, reactivity data, mitochondria and ribosomes."
Base.@kwdef mutable struct Cell
    "Because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    cell_id::UUID=uuid1()

    code::String=""
    
    output_repr::Union{Nothing,String,Vector{UInt8},Dict}=nothing
    repr_mime::MIME=MIME("text/plain")
    errored::Bool=false
    runtime::Union{Missing,UInt64}=missing
    code_folded::Bool=false
    queued::Bool=false
    running::Bool=false

    "Time that the last output was created, used only on the frontend to rerender the output"
    last_run_timestamp::Float64=0
    "Whether `this` inside `<script id=something>` should refer to the previously returned object in HTML output. This is used for fancy animations. true iff a cell runs as a reactive consequence."
    persist_js_state::Bool=false
    
    parsedcode::Union{Nothing,Expr}=nothing
    module_usings::Set{Expr}=Set{Expr}()
    rootassignee::Union{Nothing,Symbol}=nothing
end

Cell(cell_id, code) = Cell(cell_id=cell_id, code=code)
Cell(code) = Cell(uuid1(), code)