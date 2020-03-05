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

function notebookupdate_cell_dependecies(cell::Cell, dependentcells)
    return NotebookUpdateMessage(:cell_dependecies, 
        Dict(:uuid => string(cell.uuid),
             :depenentcells => [string(c.uuid) for c in dependentcells],
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

    # TODO: crawl assets folder and serve all files

    "Attempts to find the MIME pair corresponding to the extension of a filename. Defaults to `text/plain`."
    function mime_fromfilename(filename)
        # This bad boy is from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
        mimepairs = Dict(".aac" => "audio/aac", ".bin" => "application/octet-stream", ".bmp" => "image/bmp", ".css" => "text/css", ".csv" => "text/csv", ".eot" => "application/vnd.ms-fontobject", ".gz" => "application/gzip", ".gif" => "image/gif", ".htm" => "text/html", ".html" => "text/html", ".ico" => "image/vnd.microsoft.icon", ".jpeg" => "image/jpeg", ".jpg" => "image/jpeg", ".js" => "text/javascript", ".json" => "application/json", ".jsonld" => "application/ld+json", ".mjs" => "text/javascript", ".mp3" => "audio/mpeg", ".mpeg" => "video/mpeg", ".oga" => "audio/ogg", ".ogv" => "video/ogg", ".ogx" => "application/ogg", ".opus" => "audio/opus", ".otf" => "font/otf", ".png" => "image/png", ".pdf" => "application/pdf", ".rtf" => "application/rtf", ".sh" => "application/x-sh", ".svg" => "image/svg+xml", ".tar" => "application/x-tar", ".tif" => "image/tiff", ".tiff" => "image/tiff", ".ttf" => "font/ttf", ".txt" => "text/plain", ".wav" => "audio/wav", ".weba" => "audio/webm", ".webm" => "video/webm", ".webp" => "image/webp", ".woff" => "font/woff", ".woff2" => "font/woff2", ".xhtml" => "application/xhtml+xml", ".xml" => "application/xml", ".xul" => "application/vnd.mozilla.xul+xml", ".zip" => "application/zip")
        file_extension = getkey(mimepairs, '.' * split(filename, '.')[end], ".txt")
        MIME(mimepairs[file_extension])
    end

    function servefile(path)
        return request::HTTP.Request->let 
            response = HTTP.Response(200, read(path, String))
            push!(response.headers, "Content-Type" => string(mime_fromfilename(path)))
            response
        end
    end

    Endpoint(servefile(joinpath(packagerootdir, "assets", "editor.html")), "/index.html", GET)
    Endpoint(servefile(joinpath(packagerootdir, "assets", "editor.html")), "/index", GET)
    Endpoint(servefile(joinpath(packagerootdir, "assets", "editor.html")), "/", GET)

    # Serve all files in the /assets folder. Only server files present when Pluto was started.
    for (path, dirs, files) in walkdir(joinpath(packagerootdir, "assets"))
        for f in files
            urlpath = relpath(path, packagerootdir)
            if Sys.iswindows()
                urlpath = replace(path, "\\" => "/")
            end
            if !endswith(urlpath, "/")
                urlpath = urlpath * "/"
            end

            @show (joinpath(path, f), "/" * urlpath * f)
            Endpoint(servefile(joinpath(path, f)), "/" * urlpath * f, GET)
        end
    end

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

    function handle_changecell(uuid, newcode)
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
        # we could pass `pendingclientupdates` to `run_reactive!`, and handle cell updates there
        @time to_update = run_reactive!(notebook, cell)
        for cell in to_update
            put!(pendingclientupdates, notebookupdate_cell_output(cell))
        end
        
        # TODO: evaluation async
        return true
    end

    Endpoint("/addcell", POST) do request::HTTP.Request
        bodyobject = JSON.parse(String(request.body))
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
        changecell_succes = handle_changecell(uuid, "")
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

        success = handle_changecell(uuid, newcode)
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
