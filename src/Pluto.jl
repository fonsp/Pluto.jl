
module Pluto
export Notebook, prints

using Pkg

const packagerootdir = normpath(joinpath(@__DIR__, ".."))
const version_str = 'v' * Pkg.TOML.parsefile(joinpath(packagerootdir, "Project.toml"))["version"]

@info """\n
    Welcome to Pluto $(version_str)! ⚡

    Let us know what you think:
    https://github.com/fonsp/Pluto.jl
\n"""

include("./Cell.jl")
include("./Notebook.jl")
include("./ExploreExpression.jl")
include("./React.jl")

using JSON
using UUIDs
using HTTP
using Sockets
using Markdown
import Base: show
import Markdown: html, htmlinline, LaTeX, withtag, htmlesc

# We add a method for the Markdown -> HTML conversion that takes a LaTeX chunk from the Markdown tree and adds our custom span
function htmlinline(io::IO, x::LaTeX)
    withtag(io, :span, :class => "tex") do
        print(io, '$')
        htmlesc(io, x.formula)
        print(io, '$')
    end
end

# This one for block equations: (double $$)
function html(io::IO, x::LaTeX)
    withtag(io, :p, :class => "tex") do
        print(io, '$', '$')
        htmlesc(io, x.formula)
        print(io, '$', '$')
    end
end

"The `IOContext` used for converting arbitrary objects to pretty strings."
iocontext = IOContext(stdout, :color => false, :compact => true, :limit => true, :displaysize => (18, 120))


mutable struct Client
    id::Symbol
    stream::Any
    connected_notebook::Union{Notebook,Nothing}
    pendingupdates::Channel
end

Client(id::Symbol, stream) = Client(id, stream, nothing, Channel(128))

struct UpdateMessage
    type::Symbol
    message::Any
    notebook::Union{Notebook,Nothing}
    cell::Union{Cell,Nothing}
    initiator::Union{Client,Nothing}
end

UpdateMessage(type::Symbol, message::Any) = UpdateMessage(type, message, nothing, nothing, nothing)
UpdateMessage(type::Symbol, message::Any, notebook::Notebook) = UpdateMessage(type, message, notebook, nothing, nothing)


function serialize_message(message::UpdateMessage)
    to_send = Dict(:type => message.type, :message => message.message)
    if message.notebook !== nothing
        to_send[:notebookID] = string(message.notebook.uuid)
    end
    if message.cell !== nothing
        to_send[:cellID] = string(message.cell.uuid)
    end
    if message.initiator !== nothing
        to_send[:initiatorID] = string(message.initiator.id)
    end

    JSON.json(to_send)
end


function clientupdate_cell_output(initiator::Client, notebook::Notebook, cell::Cell)
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

    return UpdateMessage(:cell_output, 
            Dict(:mime => mime,
             :output => payload,
             :errormessage => cell.errormessage,
            ),
            notebook, cell, initiator)
end

function clientupdate_cell_input(initiator::Client, notebook::Notebook, cell::Cell)
    return UpdateMessage(:cell_input, 
        Dict(:code => cell.code), notebook, cell, initiator)
end

function clientupdate_cell_added(initiator::Client, notebook::Notebook, cell::Cell, new_index::Integer)
    return UpdateMessage(:cell_added, 
        Dict(:index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ), notebook, cell, initiator)
end

function clientupdate_cell_deleted(initiator::Client, notebook::Notebook, cell::Cell)
    return UpdateMessage(:cell_deleted, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_cell_moved(initiator::Client, notebook::Notebook, cell::Cell, new_index::Integer)
    return UpdateMessage(:cell_moved, 
        Dict(:index => new_index - 1, # 1-based index (julia) to 0-based index (js)
            ), notebook, cell, initiator)
end

function clientupdate_cell_dependecies(initiator::Client, notebook::Notebook, cell::Cell, dependentcells)
    return UpdateMessage(:cell_dependecies, 
        Dict(:depenentcells => [string(c.uuid) for c in dependentcells],
            ), notebook, cell, initiator)
end

function clientupdate_cell_running(initiator::Client, notebook::Notebook, cell::Cell)
    return UpdateMessage(:cell_running, 
        Dict(), notebook, cell, initiator)
end

function clientupdate_notebook_entry(initiator::Client, notebook::Notebook)
    return UpdateMessage(:notebook_entry,
        Dict(:uuid => notebook.uuid,
            :path => notebook.path,
        ), notebook)
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

# STATIC: Serve index.html, which is the same for every notebook - it's a ⚡🤑🌈 web app
# index.html also contains the CSS and JS

"Attempts to find the MIME pair corresponding to the extension of a filename. Defaults to `text/plain`."
function mime_fromfilename(filename)
    # This bad boy is from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    mimepairs = Dict(".aac" => "audio/aac", ".bin" => "application/octet-stream", ".bmp" => "image/bmp", ".css" => "text/css", ".csv" => "text/csv", ".eot" => "application/vnd.ms-fontobject", ".gz" => "application/gzip", ".gif" => "image/gif", ".htm" => "text/html", ".html" => "text/html", ".ico" => "image/vnd.microsoft.icon", ".jpeg" => "image/jpeg", ".jpg" => "image/jpeg", ".js" => "text/javascript", ".json" => "application/json", ".jsonld" => "application/ld+json", ".mjs" => "text/javascript", ".mp3" => "audio/mpeg", ".mpeg" => "video/mpeg", ".oga" => "audio/ogg", ".ogv" => "video/ogg", ".ogx" => "application/ogg", ".opus" => "audio/opus", ".otf" => "font/otf", ".png" => "image/png", ".pdf" => "application/pdf", ".rtf" => "application/rtf", ".sh" => "application/x-sh", ".svg" => "image/svg+xml", ".tar" => "application/x-tar", ".tif" => "image/tiff", ".tiff" => "image/tiff", ".ttf" => "font/ttf", ".txt" => "text/plain", ".wav" => "audio/wav", ".weba" => "audio/webm", ".webm" => "video/webm", ".webp" => "image/webp", ".woff" => "font/woff", ".woff2" => "font/woff2", ".xhtml" => "application/xhtml+xml", ".xml" => "application/xml", ".xul" => "application/vnd.mozilla.xul+xml", ".zip" => "application/zip")
    file_extension = getkey(mimepairs, '.' * split(filename, '.')[end], ".txt")
    MIME(mimepairs[file_extension])
end

function assetresponse(path)
    try
        @assert isfile(path)
        response = HTTP.Response(200, read(path, String))
        push!(response.headers, "Content-Type" => string(mime_fromfilename(path)))
        return response
    catch e
        HTTP.Response(404, "Not found!: $(e)")
    end
end

function serveonefile(path)
    return request::HTTP.Request->assetresponse(normpath(path))
end

function serveasset(req::HTTP.Request)
    reqURI = HTTP.URI(req.target)
    
    filepath = joinpath(packagerootdir, relpath(reqURI.path, "/"))
    assetresponse(filepath)
end

const PLUTOROUTER = HTTP.Router()

HTTP.@register(PLUTOROUTER, "GET", "/", serveonefile(joinpath(packagerootdir, "assets", "editor.html")))
HTTP.@register(PLUTOROUTER, "GET", "/index", serveonefile(joinpath(packagerootdir, "assets", "editor.html")))
HTTP.@register(PLUTOROUTER, "GET", "/index.html", serveonefile(joinpath(packagerootdir, "assets", "editor.html")))

HTTP.@register(PLUTOROUTER, "GET", "/favicon.ico", serveonefile(joinpath(packagerootdir, "assets", "favicon.ico")))

HTTP.@register(PLUTOROUTER, "GET", "/assets/*", serveasset)

HTTP.@register(PLUTOROUTER, "GET", "/ping", r->HTTP.Response(200, JSON.json("OK!")))

function handle_changecell(initiator, notebook, cell, newcode)
    # i.e. Ctrl+Enter was pressed on this cell
    # we update our `Notebook` and start execution

    # don't reparse when code is identical (?)
    if cell.code != newcode
        cell.code = newcode
        cell.parsedcode = nothing
    end

    putnotebookupdates(notebook, clientupdate_cell_input(initiator, notebook, cell))

    @time to_update = run_reactive!(initiator, notebook, cell)
    
    # TODO: evaluation async
end


# These will hold all 'response handlers': functions that respond to a WebSocket request from the client
# There are three levels:

responses = Dict{Symbol,Function}()
addresponse(f::Function, endpoint::Symbol) = responses[endpoint] = f

# DYNAMIC: Input from user
# TODO: actions on the notebook are not thread safe
addresponse(:addcell) do (initiator, body, notebook)
    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)

    new_cell = createcell_fromcode("")

    insert!(notebook.cells, new_index, new_cell)

    putnotebookupdates(notebook, clientupdate_cell_added(initiator, notebook, new_cell, new_index))
    nothing
end

addresponse(:deletecell) do (initiator, body, notebook, cell)    
    to_delete = cell

    changecell_succes = handle_changecell(initiator, notebook, to_delete, "")
    
    filter!(c->c.uuid ≠ to_delete.uuid, notebook.cells)

    putnotebookupdates(notebook, clientupdate_cell_deleted(initiator, notebook, to_delete))
    nothing
end

addresponse(:movecell) do (initiator, body, notebook, cell)
    to_move = cell

    # Indexing works as if a new cell is added.
    # e.g. if the third cell (at julia-index 3) of [0, 1, 2, 3, 4]
    # is moved to the end, that would be new julia-index 6

    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)
    old_index = findfirst(isequal(to_move), notebook.cells)

    # Because our cells run in _topological_ order, we don't need to reevaluate anything.
    if new_index < old_index
        deleteat!(notebook.cells, old_index)
        insert!(notebook.cells, new_index, to_move)
    elseif new_index > old_index + 1
        insert!(notebook.cells, new_index, to_move)
        deleteat!(notebook.cells, old_index)
    end

    putnotebookupdates(notebook, clientupdate_cell_moved(initiator, notebook, to_move, new_index))
    nothing
end

addresponse(:changecell) do (initiator, body, notebook, cell)
    newcode = body["code"]

    handle_changecell(initiator, notebook, cell, newcode)
    nothing
end


# DYNAMIC: Returning cell output to user

# TODO:
# addresponse(:getcell) do (initiator, body, notebook, cell)
    
# end

addresponse(:getallcells) do (initiator, body, notebook)
    # TODO: 
    updates = []
    for (i, cell) in enumerate(notebook.cells)
        push!(updates, clientupdate_cell_added(initiator, notebook, cell, i))
        push!(updates, clientupdate_cell_input(initiator, notebook, cell))
        push!(updates, clientupdate_cell_output(initiator, notebook, cell))
    end
    # [clientupdate_cell_added(notebook, c, i) for (i, c) in enumerate(notebook.cells)]

    updates
end


connectedclients = Dict{Symbol,Client}()
notebooks = Dict{UUID,Notebook}()
sn = samplenotebook()
notebooks[sn.uuid] = sn

addresponse(:getallnotebooks) do (initiator, body)
    # TODO: 
    updates = []
    for n in notebooks
        push!(updates, clientupdate_notebook_entry(n))
    end
    updates
end


function putnotebookupdates(notebook, messages...)
    listeners = filter(c->c.connected_notebook.uuid == notebook.uuid, collect(values(connectedclients)))
    if isempty(listeners)
        @info "no clients connected to this notebook!"
    else
        for next_to_send in messages, client in listeners
            put!(client.pendingupdates, next_to_send)
        end
    end
    flushallclients(listeners)
    listeners
end

flushtoken = Channel{Nothing}(1)
put!(flushtoken, nothing)

function flushclient(client)
    # take!(flushtoken)
    # println("$(client.id) requesting update")
    didsomething = false
    while isready(client.pendingupdates)
        didsomething = true
        next_to_send = take!(client.pendingupdates)
        
        if isopen(client.stream)
            write(client.stream, serialize_message(next_to_send))
        else
            println("Client $(client.id) stream closed.")
            return false
        end
    end
    # put!(flushtoken, nothing)
    # !didsomething && println("$(client.id) had no updates")
    true
end

function flushallclients(subset)
    disconnected = Set{Symbol}()
    for client in subset
        stillconnected = flushclient(client)
        if !stillconnected
            push!(disconnected, client.id)
        end
    end
    for to_deleteID in disconnected
        delete!(connectedclients, to_deleteID)
    end
end

function flushallclients()
    flushallclients(values(connectedclients))
end

# function startflushloopclientasync(client)
#     global t = @task flushloopclient(client)
#     schedule(t)
# end

"Will _synchronously_ run the notebook server. (i.e. blocking call)"
function run(port::Int64 = 1234, launchbrowser = false)

    @async HTTP.serve(Sockets.localhost, UInt16(port), stream = true) do http::HTTP.Stream
        # messy messy code so that we can use the websocket on the same port as the HTTP server

        if HTTP.WebSockets.is_upgrade(http.message)
            try
            HTTP.WebSockets.upgrade(http) do clientstream
                if !isopen(clientstream)
                    return
                end
                while !eof(clientstream)
                    try
                        data = String(readavailable(clientstream))
                        parentbody = JSON.parse(data)

                        clientID = Symbol(parentbody["clientID"])
                        client = Client(clientID, clientstream)
                        connectedclients[clientID] = client
                        
                        type = Symbol(parentbody["type"])

                        if type == :disconnect
                            delete!(connectedclients, clientID)
                        elseif type == :connect

                        else
                            
                            body = parentbody["body"]
    
                            args = []
                            if haskey(parentbody, "notebookID")
                                notebookID = Symbol(parentbody["notebookID"])
                                notebook = get(notebooks, notebookID, nothing)
                                notebook = sn
                                if notebook === nothing
                                    # TODO: returning a http 404 response is not what we want,
                                    # we should send back a websocket message.
                                    # does 404 close the socket?
                                    @warn "Remote notebook not found locally!"
                                    return HTTP.Response(200, "OK")
                                end
                                client.connected_notebook = notebook
                                push!(args, notebook)
                            end
    
                            if haskey(parentbody, "cellID")
                                cellID = UUID(parentbody["cellID"])
                                cell = selectcell_byuuid(notebook, cellID)
                                if cell === nothing
                                    @warn "Remote cell not found locally!"
                                    return HTTP.Response(200, "OK") 
                                end
                                push!(args, cell)
                            end
                            
                            if haskey(responses, type)
                                responsefunc = responses[type]
                                response = responsefunc((client, body, args...))
                                if response !== nothing
                                    putnotebookupdates(notebook, response...)
                                end
                            else
                                @warn "Don't know how to respond to $(type)"
                            end
                        end
                    catch e
                        # TODO: idem
                        if !isa(e, HTTP.WebSockets.WebSocketError) && !isa(e, InexactError)
                            @warn "Reading WebSocket client stream failed for unknown reason:" e
                        end
                    end
                    nothing
                end
                HTTP.Response(200, "OK")
            end
            catch e
                @info "HTTP upgrade failed, should be fine" e
            end
            nothing
            HTTP.Response(200, "OK")

        else
            request::HTTP.Request = http.message
            request.body = read(http)
            closeread(http)
    
            request_body = IOBuffer(HTTP.payload(request))
            if eof(request_body)
                # no request body
                response_body = HTTP.handle(PLUTOROUTER, request)
            else
                # there's a body, so pass it on to the handler we dispatch to
                response_body = HTTP.handle(PLUTOROUTER, request, JSON.parse(request_body))
            end
    
            request.response::HTTP.Response = response_body
            request.response.request = request
            try
                startwrite(http)
                write(http, request.response.body)
            catch e
                if isa(e, HTTP.IOError)
                    @warn "Attempted to write to a closed stream at $(request.target)"
                else
                    rethrow(e)
                end
            end
        end
    end

    # for notebook in values(notebooks)
    #    # TODO: this needs to be done when notebooks are added, not here
    #    println("starting flush $(notebook.uuid)")
    #    @async flushloopnotebook(notebook.uuid, connectedclients) 
    # end

    println("Go to http://localhost:$(port)/ to start programming! ⚙")

    launchbrowser && @warn "Not implemented yet"

    
    # create blocking call:
    try
        # take!(Channel(0))
        while true
            sleep(typemax(UInt64))
            # yield()
        end
    catch e
        if isa(e, InterruptException)
            println("\nClosing Pluto... Bye! 🎈")
        else
            rethrow(e)
        end
    end
end

end