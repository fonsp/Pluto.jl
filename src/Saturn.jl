module Saturn
export Notebook

using Pages
using JSON
using UUIDs
using HTTP
import Base: display

const packagerootdir = normpath(joinpath(@__DIR__, ".."))

"The building block of `Notebook`s. Contains both code and output."
mutable struct Cell
    uuid::UUID
    code::String
    parsedcode
    output
end

"Turn a `Cell` into an object that can be serialized using `JSON.json`, to be sent to the client."
function serialize(cell::Cell)
    Dict(:uuid => string(cell.uuid), :code => cell.code, :output => cell.output)
end

createcell_fromcode(code::String) = Cell(uuid1(), code, nothing, nothing)


mutable struct Notebook
    name::String

    cells::Array{Cell,1}
end

function cellbyuuid(notebook::Notebook, uuid::UUID)::Union{Cell, Nothing}
    cellIndex = findfirst(c -> c.uuid == uuid, notebook.cells)
    if cellIndex === nothing
        @warn "Requested non-existing cell with UUID $(uuid)\nTry refreshing the page in your browser."
        return nothing
    end
    notebook.cells[cellIndex]
end


function samplenotebook()
    cells = Cell[]

    push!(cells, createcell_fromcode("x = 1 + 1"))
    push!(cells, createcell_fromcode("html\"<h1>Hi!</h1>\n<p>My name is <em>kiki</em></p>\""))
    push!(cells, createcell_fromcode("md\"# Hi!\nMy name is **baba**\""))

    Notebook("test.jl", cells)
end


# Code will be executed _inside_ this module (in imperative mode)
# It serves as a 'playground' for defined variables.
module SaturnNotebook
end


function evaluate_cell(notebook::Notebook, cell::Cell)
    @show cell.code
    # TODO: REACTIVE :))) that's why notebook is a param
    if cell.parsedcode === nothing
        cell.parsedcode = Meta.parse(cell.code)
    end
    @show cell.parsedcode

    # REACTIVE: will be its own module
    result = Core.eval(SaturnNotebook, cell.parsedcode)
    # TODO: capture display(), println(), throw() and such
    println("RESULT")
    # show(result |> typeof)
    show(result)

    # TODO: Here we could do richer formatting
    # MIME types and stuff!
    # interactive Arrays!

    # TODO: limit output!
    # (very easy way to improve upon jupyter)

    resultPayload = repr(MIME("text/plain"), result)

    put!(pendingclientupdates, Dict(:uuid => cell.uuid, :output => resultPayload))
end


pendingclientupdates = Channel(128)



# struct SaturnDisplay <: AbstractDisplay
#     io::IO
# end

# display(d::SaturnDisplay, x) = display(d, MIME"text/plain"(), x)
# function display(d::SaturnDisplay, M::MIME, x)
#     displayable(d, M) || throw(MethodError(display, (d, M, x)))
#     println(d.io, "SATURN 1")
#     println(d.io, repr(M, x))
# end
# function display(d::SaturnDisplay, M::MIME"text/plain", x)
#     println(d.io, "SATURN 2")
#     println(d.io, repr(M, x))
# end
# displayable(d::SaturnDisplay, M::MIME"text/plain") = true


# sd_io = IOBuffer()
# saturndisplay = SaturnDisplay(sd_io)
# pushdisplay(saturndisplay)


greet() = show("hello word")


"Will _synchronously_ run the notebook server."
function serve(;port::Int64=8000, launchbrowser=false)

    # STATIC: Serve index.html, which is the same for every notebook

    serveindex(request::HTTP.Request) = read(joinpath(packagerootdir,"assets","editor.html"),String)

    Endpoint(serveindex, "/index.html",GET)
    Endpoint(serveindex, "/index",GET)
    Endpoint(serveindex, "/",GET)

    Endpoint("/ping", GET) do request::HTTP.Request
        JSON.json("OK!")
    end

    notebook::Notebook = samplenotebook()
    

    # DYNAMIC: Input from user
    # TODO: this is not thread safe of course

    Endpoint("/addcell",POST) do request::HTTP.Request
        println(request)
        JSON.json("OK!")
    end

    Endpoint("/changecell",PUT) do request::HTTP.Request
        println(request)

        bodyobject = JSON.parse(String(request.body))
        uuid = UUID(bodyobject["uuid"])
        newcode = bodyobject["code"]

        cell = cellbyuuid(notebook, uuid)
        if cell === nothing
            return HTTP.Response(404, JSON.json("Cell not found!"))
        end
        cell.code = newcode
        cell.parsedcode = nothing

        evaluate_cell(notebook, cell)
        
        JSON.json("OK!")
    end

    Endpoint("/deletecell",DELETE) do request::HTTP.Request
        println(request)

        JSON.json("OK!")
    end

    # DYNAMIC: Returning cell output to user

    # This is done using so-called "HTTP long polling": the server stalls for every request, until an update needs to be sent, and then responds with that update.
    # (Hacky solution that powers millions of printis around the globe)
    # TODO: change to WebSockets implementation, is built into Pages.jl?
    Endpoint("/nextcellupdate",GET) do request::HTTP.Request
        
        # TODO: a new request to this endpoint should close all standing long-polls.
        # Maybe this can be done by like so:

        #if !isready(pendingclientupdates)
        #   put!(pendingclientupdates, "STOP")
        #end

        nextUpdate = take!(pendingclientupdates)

        #nextUpdate == "STOP" && return nothing

        JSON.json(nextUpdate)
    end

    Endpoint("/getcell",GET) do request::HTTP.Request
        println(request)
        "which cell?"
    end

    Endpoint("/getallcells",GET) do request::HTTP.Request
        JSON.json(serialize.(notebook.cells))
    end

    
    
    # Endpoint()


    println("Serving notebook...")
    println("Go to http://localhost:$(port)/ to start programming! ⚙")

    launchbrowser && Pages.launch("http://localhost:$(port)/")

    Pages.start(port)
end

serve(p=1234) = serve(;port=p)


end
