using UUIDs


"The building block of `Notebook`s. Contains both code and output."
mutable struct Cell
    "because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    uuid::UUID
    code::String
    parsedcode::Any
    output::Any
    runtime::Union{Missing,UInt64}
    errormessage::Any
    symstate::SymbolsState
    resolved_funccalls::Set{Symbol}
    resolved_symstate::SymbolsState
    module_usings::Set{Expr}
end

Cell(uuid, code) = Cell(uuid, code, nothing, nothing, missing, nothing, SymbolsState(), Set{Symbol}(), SymbolsState(), Set{Expr}())

"Turn a `Cell` into an object that can be serialized using `JSON.json`, to be sent to the client."
function serialize(cell::Cell)
    Dict(:uuid => string(cell.uuid), :code => cell.code)# , :output => cell.output)
end

createcell_fromcode(code::String) = Cell(uuid1(), code)

function relay_output!(cell::Cell, output::Any)
    cell.output = output
    cell.errormessage = nothing
end

function relay_error!(cell::Cell, message::String)
    cell.output = nothing
    cell.errormessage = message
end

relay_error!(cell::Cell, err::Exception) = relay_error!(cell, sprint(showerror, err))
function relay_error!(cell::Cell, err::Exception, backtrace::Array{Base.StackTraces.StackFrame,1})
    until = findfirst(sf -> sf.func == :run_single!, backtrace)
    backtrace_trimmed = until === nothing ? backtrace : backtrace[1:until-1]
    relay_error!(cell, sprint(showerror, err, backtrace_trimmed))
end