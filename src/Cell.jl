using UUIDs


"The building block of `Notebook`s. Contains both code and output."
mutable struct Cell
    "because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    uuid::UUID
    code::String
    parsedcode::Any
    output::Any
    errormessage::Any
    modified_symbols::Set{Symbol}
    referenced_symbols::Set{Symbol}
end

"Turn a `Cell` into an object that can be serialized using `JSON.json`, to be sent to the client."
function serialize(cell::Cell)
    Dict(:uuid => string(cell.uuid), :code => cell.code)# , :output => cell.output)
end

createcell_fromcode(code::String) = Cell(uuid1(), code, nothing, nothing, nothing, Set{Symbol}(), Set{Symbol}())