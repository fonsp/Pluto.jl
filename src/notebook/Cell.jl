# import UUIDs: UUID, uuid1
# import .ExpressionExplorer: SymbolsState

# "The building block of a `Notebook`. Contains code, output, reactivity data, mitochondria and ribosomes."
# mutable struct Cell
#     "Because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
#     cell_id::UUID
#     code::String
    
#     output_repr::Union{Vector{UInt8},String,Nothing}
#     repr_mime::MIME
#     errored::Bool
#     runtime::Union{Missing,UInt64}
#     code_folded::Bool
#     queued::Bool
#     running::Bool
#     last_run_timestamp::Float64
    
#     parsedcode::Union{Nothing,Expr}
#     module_usings::Set{Expr}
#     rootassignee::Union{Nothing,Symbol}
# end

# Cell(cell_id, code) = Cell(cell_id, code, nothing, MIME("text/plain"), false, missing, false, false, false, 0, nothing, Set{Expr}(), nothing)
# Cell(code) = Cell(uuid1(), code)
# Cell() = Cell("")

import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState

"The building block of a `Notebook`. Contains code, output, reactivity data, mitochondria and ribosomes."
Base.@kwdef mutable struct Cell
    "Because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    cell_id::UUID=uuid1()

    code::String=""
    
    output_repr::Union{Vector{UInt8},String,Nothing}=nothing
    repr_mime::MIME=MIME("text/plain")
    errored::Bool=false
    runtime::Union{Missing,UInt64}=missing
    code_folded::Bool=false
    queued::Bool=false
    running::Bool=false

    "Time that the last output was created, used only on the frontend to rerender the output"
    last_run_timestamp::Float64=0
    
    parsedcode::Union{Nothing,Expr}=nothing
    module_usings::Set{Expr}=Set{Expr}()
    rootassignee::Union{Nothing,Symbol}=nothing
end

Cell(cell_id, code) = Cell(cell_id=cell_id, code=code)
Cell(code) = Cell(uuid1(), code)