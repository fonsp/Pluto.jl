import HTTP
import Markdown: htmlesc

# Serve everything from `/frontend`, and create HTTP endpoints to open notebooks.

"Attempts to find the MIME pair corresponding to the extension of a filename. Defaults to `text/plain`."
function mime_fromfilename(filename)
    # This bad boy is from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    mimepairs = Dict(".aac" => "audio/aac", ".bin" => "application/octet-stream", ".bmp" => "image/bmp", ".css" => "text/css", ".csv" => "text/csv", ".eot" => "application/vnd.ms-fontobject", ".gz" => "application/gzip", ".gif" => "image/gif", ".htm" => "text/html", ".html" => "text/html", ".ico" => "image/vnd.microsoft.icon", ".jpeg" => "image/jpeg", ".jpg" => "image/jpeg", ".js" => "text/javascript", ".json" => "application/json", ".jsonld" => "application/ld+json", ".mjs" => "text/javascript", ".mp3" => "audio/mpeg", ".mpeg" => "video/mpeg", ".oga" => "audio/ogg", ".ogv" => "video/ogg", ".ogx" => "application/ogg", ".opus" => "audio/opus", ".otf" => "font/otf", ".png" => "image/png", ".pdf" => "application/pdf", ".rtf" => "application/rtf", ".sh" => "application/x-sh", ".svg" => "image/svg+xml", ".tar" => "application/x-tar", ".tif" => "image/tiff", ".tiff" => "image/tiff", ".ttf" => "font/ttf", ".txt" => "text/plain", ".wav" => "audio/wav", ".weba" => "audio/webm", ".webm" => "video/webm", ".webp" => "image/webp", ".woff" => "font/woff", ".woff2" => "font/woff2", ".xhtml" => "application/xhtml+xml", ".xml" => "application/xml", ".xul" => "application/vnd.mozilla.xul+xml", ".zip" => "application/zip")
    file_extension = getkey(mimepairs, '.' * split(filename, '.')[end], ".txt")
    MIME(mimepairs[file_extension])
end

function asset_response(path)
    if !isfile(path) && !endswith(path, ".html")
        return asset_response(path * ".html")
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

function error_response(status_code::Integer, title, advice, body="")
    template = read(joinpath(PKG_ROOT_DIR, "frontend", "error.jl.html"), String)

    body_title = body == "" ? "" : "Error message:"
    filled_in = replace(replace(replace(replace(template, "\$TITLE" => title), "\$ADVICE" => advice), "\$BODYTITLE" => body_title), "\$BODY" => htmlesc(body))

    response = HTTP.Response(status_code, filled_in)
    push!(response.headers, "Content-Type" => string(mime_fromfilename(".html")))
    response
end

function notebook_redirect_response(notebook; home_url="./")
    response = HTTP.Response(302, "")
    push!(response.headers, "Location" => home_url * "edit?id=" * string(notebook.notebook_id))
    return response
end


function http_router_for(session::ServerSession)
    router = HTTP.Router()
    
    function create_serve_onefile(path)
        return request::HTTP.Request -> asset_response(normpath(path))
    end
    
    HTTP.@register(router, "GET", "/", create_serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "index.html")))
    HTTP.@register(router, "GET", "/edit", create_serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "editor.html")))

    HTTP.@register(router, "GET", "/ping", r -> HTTP.Response(200, "OK!"))
    HTTP.@register(router, "GET", "/websocket_url_please", r -> HTTP.Response(200, string(session.secret)))
    HTTP.@register(router, "GET", "/favicon.ico", create_serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "img", "favicon.ico")))

    function launch_notebook_response(path::AbstractString; title="", advice="", home_url="./")
        try
            for nb in values(session.notebooks)
                if realpath(nb.path) == realpath(path)
                    return notebook_redirect_response(nb; home_url=home_url)
                end
            end

            nb = load_notebook(path)
            session.notebooks[nb.notebook_id] = nb
            if get_pl_env("PLUTO_RUN_NOTEBOOK_ON_LOAD") == "true"
                update_save_run!(session, nb, nb.cells; run_async=true)
                # TODO: send message when initial run completed
            end
            @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
            return notebook_redirect_response(nb; home_url=home_url)
        catch e
            return error_response(500, title, advice, sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end

    function serve_newfile(req::HTTP.Request)
        nb = emptynotebook()
        update_save_run!(session, nb, nb.cells; run_async=true)
        session.notebooks[nb.notebook_id] = nb
        @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
        return notebook_redirect_response(nb)
    end
    HTTP.@register(router, "GET", "/new", serve_newfile)
    

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
    HTTP.@register(router, "GET", "/open", serve_openfile)
    
    function serve_sample(req::HTTP.Request)
        uri = HTTP.URI(req.target)
        sample_path = HTTP.URIs.unescapeuri(split(uri.path, "sample/")[2])
        sample_path_without_dotjl = "sample " * sample_path[1:end - 3]
        
        path = numbered_until_new(joinpath(tempdir(), sample_path_without_dotjl))
        readwrite(joinpath(PKG_ROOT_DIR, "sample", sample_path), path)
        
        return launch_notebook_response(path, home_url="../", title="Failed to load sample", advice="Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
    end
    HTTP.@register(router, "GET", "/sample/*", serve_sample)
    
    function serve_asset(req::HTTP.Request)
        reqURI = req.target |> HTTP.URIs.unescapeuri |> HTTP.URI
        
        filepath = joinpath(PKG_ROOT_DIR, "frontend", relpath(reqURI.path, "/"))
        asset_response(filepath)
    end
    HTTP.@register(router, "GET", "/*", serve_asset)

    return router
end