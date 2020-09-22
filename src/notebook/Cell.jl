import UUIDs: UUID, uuid1
import .ExpressionExplorer: SymbolsState

"The building block of a `Notebook`. Contains code, output, reactivity data, mitochondria and ribosomes."
mutable struct Cell
    "Because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    cell_id::UUID
    code::String
    
    output_repr::Union{Vector{UInt8},String,Nothing}
    repr_mime::MIME
    errored::Bool
    runtime::Union{Missing,UInt64}
    code_folded::Bool
    queued::Bool
    running::Bool
    
    parsedcode::Union{Nothing,Expr}
    module_usings::Set{Expr}
    rootassignee::Union{Nothing,Symbol}
end

Cell(cell_id, code) = Cell(cell_id, code, nothing, MIME("text/plain"), false, missing, false, false, false, nothing, Set{Expr}(), nothing)
Cell(code) = Cell(uuid1(), code)
Cell() = Cell("")
