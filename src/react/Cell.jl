using UUIDs

"The building block of `Notebook`s. Contains both code and output."
mutable struct Cell
    "because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    uuid::UUID
    code::String
    parsedcode::Any
    output_repr::Union{String, Nothing}
    error_repr::Union{String, Nothing}
    repr_mime::MIME
    runtime::Union{Missing,UInt64}
    symstate::SymbolsState
    module_usings::Set{Expr}
end

Cell(uuid, code) = Cell(uuid, code, nothing, nothing, nothing, MIME("text/plain"), missing, SymbolsState(), Set{Expr}())

"Turn a `Cell` into an object that can be serialized using `JSON.json`, to be sent to the client."
function serialize(cell::Cell)
    Dict(:uuid => string(cell.uuid), :code => cell.code)
end

createcell_fromcode(code::String) = Cell(uuid1(), code)