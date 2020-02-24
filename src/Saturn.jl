module Saturn
export Notebook, prints

using Pages
using JSON
using UUIDs
using HTTP
import Base: show

const packagerootdir = normpath(joinpath(@__DIR__, ".."))

"The building block of `Notebook`s. Contains both code and output."
mutable struct Cell
    "because Cells can be reordered, they get a UUID. The JavaScript frontend indexes cells using the UUID."
    uuid::UUID
    code::String
    parsedcode::Any
    output::Any
end

"Turn a `Cell` into an object that can be serialized using `JSON.json`, to be sent to the client."
function serialize(cell::Cell)
    Dict(:uuid => string(cell.uuid), :code => cell.code)# , :output => cell.output)
end

createcell_fromcode(code::String) = Cell(uuid1(), code, nothing, nothing)


mutable struct Notebook
    name::String

    "Cells are ordered in a `Notebook`, and this order can be changed by the user. Cells will always have a constant UUID."
    cells::Array{Cell,1}
end

function selectcell_byuuid(notebook::Notebook, uuid::UUID)::Union{Cell,Nothing}
    cellIndex = findfirst(c->c.uuid == uuid, notebook.cells)
    if cellIndex === nothing
        @warn "Requested non-existing cell with UUID $(uuid)\nTry refreshing the page in your browser."
        return nothing
    end
    notebook.cells[cellIndex]
end


function samplenotebook()
    cells = Cell[]

    push!(cells, createcell_fromcode("x = 1 + 1"))
    push!(cells, createcell_fromcode("html\"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>\""))
    push!(cells, createcell_fromcode("using Markdown; md\"# Cześć!\nMy name is **baba** and I like \$maths\$\n\n_(Markdown -> HTML is for free, for LaTeX we need to pre-/post-process the HTML, and import a latex-js lib)_\""))

    Notebook("test.jl", cells)
end


# Code will be executed _inside_ this module (in imperative mode)
# It serves as a 'playground' for defined variables.
# module SaturnNotebook
# end
# executionModule = SaturnNotebook

# nvm, we can execute in Main!
executionModule = Main

"The `IOContext` used for converting arbitrary objects to pretty strings."
iocontext = IOContext(stdout, :color => false, :compact => true, :limit => true, :displaysize => (18, 120))


function evaluate_cell(notebook::Notebook, cell::Cell)
    # TODO: REACTIVE :))) that's why notebook is a param
    if cell.parsedcode === nothing
        cell.parsedcode = Meta.parse(cell.code)
    end
    @show cell.parsedcode

    # REACTIVE: will be its own module
    result = Core.eval(executionModule, cell.parsedcode)
    # TODO: capture display(), println(), throw() and such
    # @show result |> typeof
    @show result

    # TODO: Here we could do richer formatting
    # See Julia IO docs for the full explanation
    # MIME types and stuff!
    # interactive Arrays!
    # use Weave.jl? that would be sw€€t

    # in order of coolness
    # text/plain always matches
    mimes = ["text/html", "text/plain"]
    
    mime = first(filter(m->showable(m, result), mimes))

    # TODO: limit output!

    resultPayload = repr(mime, result; context = iocontext)

    return Dict(:uuid => string(cell.uuid), :mime => mime, :output => resultPayload)
end


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


struct RawDisplayString
 s::String
end

    function show(io::IO, z::RawDisplayString)
   print(io, z.s)
    end

prints(x::String) = RawDisplayString(x)
prints(x) = RawDisplayString(repr("text/plain", x; context = iocontext))


#### SERVER ####


"Will _synchronously_ run the notebook server. (i.e. blocking call)"
function serve(;port::Int64 = 8000, launchbrowser = false)
    # We use `Pages.jl` to serve the API
    # docs are straightforward
    # Eventually we might want to switch to pure `HTTP.jl` but it looked difficult :(    


    # STATIC: Serve index.html, which is the same for every notebook - it's a ⚡🤑🌈 web app
    # index.html also contains the CSS and JS

    serveindex(request::HTTP.Request) = read(joinpath(packagerootdir, "assets", "editor.html"), String)

    Endpoint(serveindex, "/index.html", GET)
    Endpoint(serveindex, "/index", GET)
    Endpoint(serveindex, "/", GET)

    Endpoint("/ping", GET) do request::HTTP.Request
        JSON.json("OK!")
    end

    notebook::Notebook = samplenotebook()
    
    # For long polling (see `/nextcellupdate`):

    # buffer must contain all undisplayed outputs
    pendingclientupdates = Channel(128)
    # buffer size is max. number of concurrent/messed up connections
    longpollers = Channel{Nothing}(32)
    # unbuffered
    longpollerclosing = Channel{Nothing}(0)


    # DYNAMIC: Input from user
    # TODO: actions on the notebook are not thread safe

    Endpoint("/addcell", POST) do request::HTTP.Request
        println(request)

        # TODO: NOT IMPLEMENTED
        
        JSON.json("OK!")
    end

    Endpoint("/deletecell", DELETE) do request::HTTP.Request
        println(request)

        # TODO: NOT IMPLEMENTED

        JSON.json("OK!")
    end

    Endpoint("/movecell", PUT) do request::HTTP.Request
        println(request)

        # TODO: NOT IMPLEMENTED

        JSON.json("OK!")
    end

    Endpoint("/changecell", PUT) do request::HTTP.Request
        # println(request)

        # i.e. Ctrl+Enter was pressed on this cell
        # we update our `Notebook` and start execution

        bodyobject = JSON.parse(String(request.body))
        uuid = UUID(bodyobject["uuid"])
        newcode = bodyobject["code"]

        cell = selectcell_byuuid(notebook, uuid)
        if cell === nothing
            return HTTP.Response(404, JSON.json("Cell not found!"))
        end
        # don't reparse when code is identical (?)
        if cell.code != newcode
            cell.code = newcode
            cell.parsedcode = nothing
        end

        # TODO: REACTIVE: this is unreactive!
        result = evaluate_cell(notebook, cell)
        put!(pendingclientupdates, result)
        
        # TODO: try catch around evaluation? evaluation async?
        JSON.json("OK!")
    end

    
    # DYNAMIC: Returning cell output to user

    # This is done using so-called "HTTP long polling": the server stalls for every request, until an update needs to be sent, and then responds with that update.
    # (Hacky solution that powers millions of printis around the globe)
    # TODO: change to WebSockets implementation, is built into Pages.jl?
    Endpoint("/nextcellupdate", GET) do request::HTTP.Request
        # This method became a bit complicated - it needs to close old requests when a new one came in.
        # otherwise it would be one line:
        # JSON.json(take!(pendingclientupdates))
        
        # println("nextcellupdate")
        # @show isready(pendingclientupdates), isready(longpollers)

        # while there are other long poll requests
        while isready(longpollers)
            # stop the next poller
            put!(pendingclientupdates, "STOP")
            # and remove it from the list (this must be done by me, not the other poller, because i am running the while loop)
            take!(longpollers)
            # wait for it to close...
            take!(longpollerclosing)
        end

        # register on the list of long pollers
        put!(longpollers, nothing)
        # and start polling (this call is blocking)
        nextUpdate = take!(pendingclientupdates)
        # we now have the next update
        if nextUpdate == "STOP"
            # TODO: the stream might be closed, we should handle this more gracefully
            put!(longpollerclosing, nothing)
            return HTTP.Messages.Response(0)
        end
        
        # remove ourself from the list
        take!(longpollers)

        JSON.json(nextUpdate)
    end

    Endpoint("/getcell", GET) do request::HTTP.Request
        println(request)

        bodyobject = JSON.parse(String(request.body))
        uuid = UUID(bodyobject["uuid"])
        
        cell = selectcell_byuuid(notebook, uuid)
        if cell === nothing
            return HTTP.Response(404, JSON.json("Cell not found!"))
        end
        
        JSON.json(serialize(cell))
    end

    Endpoint("/getallcells", GET) do request::HTTP.Request
        JSON.json(serialize.(notebook.cells))
    end

    println("Serving notebook...")
    println("Go to http://localhost:$(port)/ to start programming! ⚙")

    launchbrowser && Pages.launch("http://localhost:$(port)/")

    Pages.start(port)
end

serve(p = 8000) = serve(;port = p)

end
