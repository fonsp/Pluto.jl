import UUIDs: UUID, uuid1
import .ExploreExpression: SymbolsState
import JSON: lower

"The building block of `Notebook`s. Contains code, output and reactivity data."
mutable struct Cell
    "because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    uuid::UUID
    code::String
    
    output_repr::Union{String, Nothing}
    error_repr::Union{String, Nothing}
    repr_mime::MIME
    runtime::Union{Missing,UInt64}
    code_folded::Bool
    running::Bool
    
    parsedcode::Any
    symstate::SymbolsState
    module_usings::Set{Expr}
end

Cell(uuid, code) = Cell(uuid, code, nothing, nothing, MIME("text/plain"), missing, false, false, nothing, SymbolsState(), Set{Expr}())
Cell(code) = Cell(uuid1(), code)