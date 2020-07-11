import HTTP
import Markdown: htmlesc
import FileWatching

# Serve everything from `/frontend`, and create HTTP endpoints to open notebooks.

"Attempts to find the MIME pair corresponding to the extension of a filename. Defaults to `text/plain`."
function mime_fromfilename(filename)
    # This bad boy is from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    mimepairs = Dict(".aac" => "audio/aac", ".bin" => "application/octet-stream", ".bmp" => "image/bmp", ".css" => "text/css", ".csv" => "text/csv", ".eot" => "application/vnd.ms-fontobject", ".gz" => "application/gzip", ".gif" => "image/gif", ".htm" => "text/html", ".html" => "text/html", ".ico" => "image/vnd.microsoft.icon", ".jpeg" => "image/jpeg", ".jpg" => "image/jpeg", ".js" => "text/javascript", ".json" => "application/json", ".jsonld" => "application/ld+json", ".mjs" => "text/javascript", ".mp3" => "audio/mpeg", ".mpeg" => "video/mpeg", ".oga" => "audio/ogg", ".ogv" => "video/ogg", ".ogx" => "application/ogg", ".opus" => "audio/opus", ".otf" => "font/otf", ".png" => "image/png", ".pdf" => "application/pdf", ".rtf" => "application/rtf", ".sh" => "application/x-sh", ".svg" => "image/svg+xml", ".tar" => "application/x-tar", ".tif" => "image/tiff", ".tiff" => "image/tiff", ".ttf" => "font/ttf", ".txt" => "text/plain", ".wav" => "audio/wav", ".weba" => "audio/webm", ".webm" => "video/webm", ".webp" => "image/webp", ".woff" => "font/woff", ".woff2" => "font/woff2", ".xhtml" => "application/xhtml+xml", ".xml" => "application/xml", ".xul" => "application/vnd.mozilla.xul+xml", ".zip" => "application/zip")
    file_extension = getkey(mimepairs, '.' * split(filename, '.')[end], ".txt")
    MIME(mimepairs[file_extension])
end

function assetresponse(path)
    if !isfile(path) && !endswith(path, ".html")
        return assetresponse(path * ".html")
    end
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
    return request::HTTP.Request -> assetresponse(normpath(path))
end

function serve_asset(req::HTTP.Request)
    reqURI = req.target |> HTTP.URIs.unescapeuri |> HTTP.URI
    
    filepath = joinpath(PKG_ROOT_DIR, "frontend", relpath(reqURI.path, "/"))
    assetresponse(filepath)
end

const pluto_router = HTTP.Router()

function notebook_redirect(notebook)
    response = HTTP.Response(302, "")
    push!(response.headers, "Location" => ENV["PLUTO_ROOT_URL"] * "edit?id=" * string(notebook.notebook_id))
    return response
end

function launch_notebook_response(path::AbstractString; title="", advice="")
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
        return error_response(500, title, advice, sprint(showerror, e, stacktrace(catch_backtrace())))
    end
end

function serve_sample(req::HTTP.Request)
    uri = HTTP.URI(req.target)
    sample_path = HTTP.URIs.unescapeuri(split(uri.path, "sample/")[2])
    sample_path_without_dotjl = sample_path[1:end - 3]

    path = numbered_until_new(joinpath(tempdir(), sample_path_without_dotjl))
    copy_write(joinpath(PKG_ROOT_DIR, "sample", sample_path), path)

    return launch_notebook_response(path, title="Failed to load sample", advice="Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
end

function serve_openfile(req::HTTP.Request)
    uri = HTTP.URI(req.target)
    query = HTTP.URIs.unescapeuri(replace(uri.query, '+' => ' '))

    if length(query) > 5
        path = tamepath(query[6:end])
        if (isfile(path))
            return launch_notebook_response(path, title="Failed to load notebook", advice="The file <code>$(htmlesc(path))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
        else
            return error_response(404, "Can't find a file here", "Please check whether <code>$(htmlesc(path))</code> exists.")
        end
    end
    return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
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

function error_response(status_code::Integer, title, advice, body="")
    template = read(joinpath(PKG_ROOT_DIR, "frontend", "error.jl.html"), String)

    body_title = body == "" ? "" : "Error message:"
    filled_in = replace(replace(replace(replace(template, "\$TITLE" => title), "\$ADVICE" => advice), "\$BODYTITLE" => body_title), "\$BODY" => htmlesc(body))

    response = HTTP.Response(status_code, filled_in)
    push!(response.headers, "Content-Type" => string(mime_fromfilename(".html")))
    response
end

HTTP.@register(pluto_router, "GET", "/", serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "index.html")))

HTTP.@register(pluto_router, "GET", "/favicon.ico", serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "img", "favicon.ico")))
HTTP.@register(pluto_router, "GET", "/*", serve_asset)

HTTP.@register(pluto_router, "GET", "/new", serve_newfile)
HTTP.@register(pluto_router, "GET", "/open", serve_openfile)
HTTP.@register(pluto_router, "GET", "/edit", serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "editor.html")))
HTTP.@register(pluto_router, "GET", "/sample/*", serve_sample)

HTTP.@register(pluto_router, "GET", "/ping", r -> HTTP.Response(200, JSON.json("OK!")))
