module Pluto
export Notebook, prints

using Pages
using JSON
using UUIDs
using HTTP
import Base: show
include("./React.jl")


const packagerootdir = normpath(joinpath(@__DIR__, ".."))



"The `IOContext` used for converting arbitrary objects to pretty strings."
iocontext = IOContext(stdout, :color => false, :compact => true, :limit => true, :displaysize => (18, 120))


struct NotebookUpdateMessage
    type::Symbol
    message::Any
end


function notebookupdate_cell_output(cell::Cell)
    # TODO: Here we could do even richer formatting
    # interactive Arrays!
    # use Weave.jl? that would be sw€€t

    # in order of coolness
    # text/plain always matches
    mimes = ["text/html", "text/plain"]
    
    mime = first(filter(m->showable(m, cell.output), mimes))

    # TODO: limit output!

    payload = repr(mime, cell.output; context = iocontext)

    if cell.output === nothing
        payload = ""
    end

    return NotebookUpdateMessage(:update_output, 
        Dict(:uuid => string(cell.uuid),
             :mime => mime,
             :output => payload,
             :errormessage => cell.errormessage,
            ))
end

function notebookupdate_cell_added(cell::Cell, new_index::Integer)
    return NotebookUpdateMessage(:cell_added, 
        Dict(:uuid => string(cell.uuid),
             :index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ))
end

function notebookupdate_cell_deleted(cell::Cell)
    return NotebookUpdateMessage(:cell_deleted, 
        Dict(:uuid => string(cell.uuid),
            ))
end

function notebookupdate_cell_moved(cell::Cell, new_index::Integer)
    return NotebookUpdateMessage(:cell_moved, 
        Dict(:uuid => string(cell.uuid),
             :index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ))
end


# struct PlutoDisplay <: AbstractDisplay
#     io::IO
# end

# display(d::PlutoDisplay, x) = display(d, MIME"text/plain"(), x)
# function display(d::PlutoDisplay, M::MIME, x)
#     displayable(d, M) || throw(MethodError(display, (d, M, x)))
#     println(d.io, "SATURN 1")
#     println(d.io, repr(M, x))
# end
# function display(d::PlutoDisplay, M::MIME"text/plain", x)
#     println(d.io, "SATURN 2")
#     println(d.io, repr(M, x))
# end
# displayable(d::PlutoDisplay, M::MIME"text/plain") = true


# sd_io = IOBuffer()
# plutodisplay = PlutoDisplay(sd_io)
# pushdisplay(plutodisplay)


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
function serve_notebook(port::Int64 = 8000, launchbrowser = false)
    # We use `Pages.jl` to serve the API
    # docs are straightforward
    # Eventually we might want to switch to pure `HTTP.jl` but it looked difficult :(    


    # STATIC: Serve index.html, which is the same for every notebook - it's a ⚡🤑🌈 web app
    # index.html also contains the CSS and JS

    function assetserver(assetname)
        return request::HTTP.Request->read(joinpath(packagerootdir, "assets", assetname), String)
    end
    Endpoint(assetserver("editor.html"), "/index.html", GET)
    Endpoint(assetserver("editor.html"), "/index", GET)
    Endpoint(assetserver("editor.html"), "/", GET)

    Endpoint(assetserver("light.css"), "/customstyle.css", GET)

    Endpoint("/ping", GET) do request::HTTP.Request
        HTTP.Response(200, JSON.json("OK!"))
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

    function handleChangeCell(uuid, newcode)
        # i.e. Ctrl+Enter was pressed on this cell
        # we update our `Notebook` and start execution

        cell = selectcell_byuuid(notebook, uuid)
        if cell === nothing
            return false
        end
        # don't reparse when code is identical (?)
        if cell.code != newcode
            cell.code = newcode
            cell.parsedcode = nothing
        end

        # TODO: this should be done async, so that the HTTP server can return a list of dependent cells immediately.
        # we could pass `pendingclientupdates` to `run_cell`, and handle cell updates there
        to_update = run_cell(notebook, cell)
        for cell in to_update
            put!(pendingclientupdates, notebookupdate_cell_output(cell))
        end
        
        # TODO: evaluation async
        return true
    end

    Endpoint("/addcell", POST) do request::HTTP.Request
        bodyobject = JSON.parse(String(request.body))
        display(bodyobject)
        new_index = bodyobject["index"] + 1 # 0-based index (js) to 1-based index (julia)

        new_cell = createcell_fromcode("")

        insert!(notebook.cells, new_index, new_cell)

        put!(pendingclientupdates, notebookupdate_cell_added(new_cell, new_index))
        
        HTTP.Response(200, JSON.json("OK!"))
    end

    Endpoint("/deletecell", DELETE) do request::HTTP.Request
        bodyobject = JSON.parse(String(request.body))
        uuid = UUID(bodyobject["uuid"])

        # Before deleting the cell, we change its code to the empty string and run it
        # This will delete any definitions of that cell
        changecell_succes = handleChangeCell(uuid, "")
        if !changecell_succes
            HTTP.Response(404, JSON.json("Cell not found!"))
        end

        to_delete = selectcell_byuuid(notebook, uuid)
        
        filter!(cell->cell.uuid ≠ uuid, notebook.cells)

        put!(pendingclientupdates, notebookupdate_cell_deleted(to_delete))

        HTTP.Response(200, JSON.json("OK!"))
    end

    Endpoint("/movecell", PUT) do request::HTTP.Request
        bodyobject = JSON.parse(String(request.body))
        uuid = UUID(bodyobject["uuid"])
        to_move = selectcell_byuuid(notebook, uuid)

        # Indexing works as if a new cell is added.
        # e.g. if the third cell (at julia-index 3) of [0, 1, 2, 3, 4]
        # is moved to the end, that would be new julia-index 6

        new_index = bodyobject["index"] + 1 # 0-based index (js) to 1-based index (julia)
        old_index = findfirst(isequal(to_move), notebook.cells)

        # Because our cells run in _topological_ order, we don't need to reevaluate anything.
        if new_index < old_index
            deleteat!(notebook.cells, old_index)
            insert!(notebook.cells, new_index, to_move)
        elseif new_index > old_index + 1
            insert!(notebook.cells, new_index, to_move)
            deleteat!(notebook.cells, old_index)
        end

        put!(pendingclientupdates, notebookupdate_cell_moved(to_move, new_index))

        HTTP.Response(200, JSON.json("OK!"))
    end

    Endpoint("/changecell", PUT) do request::HTTP.Request
        bodyobject = JSON.parse(String(request.body))
        uuid = UUID(bodyobject["uuid"])
        newcode = bodyobject["code"]

        success = handleChangeCell(uuid, newcode)
        if success
            HTTP.Response(200, JSON.json("OK!"))
        else
            HTTP.Response(404, JSON.json("Cell not found!"))
        end
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
        # TOOD: when reloading, the old client will get the first update
        # to solve this, it might be better to move this for loop to the client:
        for cell in notebook.cells
            put!(pendingclientupdates, notebookupdate_cell_output(cell))
        end
        JSON.json(serialize.(notebook.cells))
    end

    println("Serving notebook...")
    println("Go to http://localhost:$(port)/ to start programming! ⚙")

    launchbrowser && Pages.launch("http://localhost:$(port)/")

    Pages.start(port)
end

end
