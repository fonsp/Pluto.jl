import HTTP
import Markdown: htmlesc

# Serve everything from `/assets`, and create HTTP endpoints to open notebooks.

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
        push!(response.headers, "Access-Control-Allow-Origin" => "*")
        response
    catch e
        HTTP.Response(404, "Not found!")
    end
end

function serve_onefile(path)
    return request::HTTP.Request->assetresponse(normpath(path))
end

function serve_asset(req::HTTP.Request)
    reqURI = req.target |> HTTP.URIs.unescapeuri |> HTTP.URI
    
    filepath = joinpath(PKG_ROOT_DIR, relpath(reqURI.path, "/"))
    assetresponse(filepath)
end

const PLUTOROUTER = HTTP.Router()

function notebook_redirect(notebook)
    response = HTTP.Response(302, "")
    push!(response.headers, "Location" => ENV["PLUTO_ROOT_URL"] * "edit?id=" * string(notebook.notebook_id))
    return response
end

function serve_sample(req::HTTP.Request)
    uri = HTTP.URI(req.target)
    path = split(uri.path, "sample/")[2]
    try
        nb = load_notebook_nobackup(joinpath(PKG_ROOT_DIR, "sample", path))
        nb.path = tempname() * ".jl"
        save_notebook(nb)
        notebooks[nb.notebook_id] = nb
        if ENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
            run_reactive_async!(nb, nb.cells)
        end
        @async putplutoupdates!(clientupdate_notebook_list(notebooks))
        return notebook_redirect(nb)
    catch e
        return serve_errorpage(500, "Failed to load sample", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
    end
end

function serve_openfile(req::HTTP.Request)
    uri = HTTP.URI(req.target)
    query = HTTP.URIs.unescapeuri(replace(uri.query, '+' => ' '))

    if length(query) > 5
        path = tamepath(query[6:end])
        if (isfile(path))
            try
                for nb in values(notebooks)
                    if realpath(nb.path) == realpath(path)
                        return notebook_redirect(nb)
                    end
                end

                nb = load_notebook(path)
                notebooks[nb.notebook_id] = nb
                if ENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
                    run_reactive_async!(nb, nb.cells) # TODO: send message when initial run completed
                end
                @async putplutoupdates!(clientupdate_notebook_list(notebooks))
                return notebook_redirect(nb)
            catch e
                return serve_errorpage(500, "Failed to load notebook", "The file <code>$(htmlesc(path))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
            end
        else
            return serve_errorpage(404, "Can't find a file here", "Please check whether <code>$(htmlesc(path))</code> exists.")
        end
    end
    return serve_errorpage(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
end

function serve_newfile(req::HTTP.Request)
    nb = emptynotebook()
    save_notebook(nb)
    notebooks[nb.notebook_id] = nb
    if ENV["PLUTO_RUN_NOTEBOOK_ON_LOAD"] == "true"
        run_reactive_async!(nb, nb.cells)
    end
    @async putplutoupdates!(clientupdate_notebook_list(notebooks))
    return notebook_redirect(nb)
end

function serve_errorpage(status_code::Integer, title, advice, body="")
    template = read(joinpath(PKG_ROOT_DIR, "assets", "error.jl.html"), String)

    body_title = body == "" ? "" : "Error message:"
    filled_in = replace(replace(replace(replace(template, "\$TITLE" => title), "\$ADVICE" => advice), "\$BODYTITLE" => body_title), "\$BODY" => htmlesc(body))

    response = HTTP.Response(status_code, filled_in)
    push!(response.headers, "Content-Type" => string(mime_fromfilename(".html")))
    response
end

HTTP.@register(PLUTOROUTER, "GET", "/", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "welcome.html")))
HTTP.@register(PLUTOROUTER, "GET", "/index", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "welcome.html")))
HTTP.@register(PLUTOROUTER, "GET", "/index.html", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "welcome.html")))

HTTP.@register(PLUTOROUTER, "GET", "/sw.js", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "sw.js")))

HTTP.@register(PLUTOROUTER, "GET", "/new", serve_newfile)
HTTP.@register(PLUTOROUTER, "GET", "/open", serve_openfile)
HTTP.@register(PLUTOROUTER, "GET", "/edit", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "editor.html")))
HTTP.@register(PLUTOROUTER, "GET", "/sample", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "sample.html")))
HTTP.@register(PLUTOROUTER, "GET", "/sample/*", serve_sample)

HTTP.@register(PLUTOROUTER, "GET", "/favicon.ico", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "img", "favicon.ico")))
HTTP.@register(PLUTOROUTER, "GET", "/assets/*", serve_asset)

HTTP.@register(PLUTOROUTER, "GET", "/ping", r->HTTP.Response(200, JSON.json("OK!")))
HTTP.@register(PLUTOROUTER, "GET", "/statistics-info", serve_onefile(joinpath(PKG_ROOT_DIR, "assets", "statistics-info.html")))