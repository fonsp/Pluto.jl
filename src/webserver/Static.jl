import HTTP
import Markdown: htmlesc
import UUIDs: UUID

# Serve everything from `/frontend`, and create HTTP endpoints to open notebooks.

"Attempts to find the MIME pair corresponding to the extension of a filename. Defaults to `text/plain`."
function mime_fromfilename(filename)
    # This bad boy is from: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    mimepairs = Dict(".aac" => "audio/aac", ".bin" => "application/octet-stream", ".bmp" => "image/bmp", ".css" => "text/css", ".csv" => "text/csv", ".eot" => "application/vnd.ms-fontobject", ".gz" => "application/gzip", ".gif" => "image/gif", ".htm" => "text/html", ".html" => "text/html", ".ico" => "image/vnd.microsoft.icon", ".jpeg" => "image/jpeg", ".jpg" => "image/jpeg", ".js" => "text/javascript", ".json" => "application/json", ".jsonld" => "application/ld+json", ".mjs" => "text/javascript", ".mp3" => "audio/mpeg", ".mp4" => "video/mp4", ".mpeg" => "video/mpeg", ".oga" => "audio/ogg", ".ogv" => "video/ogg", ".ogx" => "application/ogg", ".opus" => "audio/opus", ".otf" => "font/otf", ".png" => "image/png", ".pdf" => "application/pdf", ".rtf" => "application/rtf", ".sh" => "application/x-sh", ".svg" => "image/svg+xml", ".tar" => "application/x-tar", ".tif" => "image/tiff", ".tiff" => "image/tiff", ".ttf" => "font/ttf", ".txt" => "text/plain", ".wav" => "audio/wav", ".weba" => "audio/webm", ".webm" => "video/webm", ".webp" => "image/webp", ".woff" => "font/woff", ".woff2" => "font/woff2", ".xhtml" => "application/xhtml+xml", ".xml" => "application/xml", ".xul" => "application/vnd.mozilla.xul+xml", ".zip" => "application/zip")
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

function http_router_for(session::ServerSession, security::ServerSecurity)
    router = HTTP.Router()
    
    function create_serve_onefile(path)
        return request::HTTP.Request -> asset_response(normpath(path))
    end
    
    HTTP.@register(router, "GET", "/", create_serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "index.html")))
    HTTP.@register(router, "GET", "/edit", create_serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "editor.html")))
    
    HTTP.@register(router, "GET", "/ping", r -> HTTP.Response(200, "OK!"))
    HTTP.@register(router, "GET", "/websocket_url_please", r -> HTTP.Response(200, string(session.secret)))
    HTTP.@register(router, "GET", "/favicon.ico", create_serve_onefile(joinpath(PKG_ROOT_DIR, "frontend", "img", "favicon.ico")))
    
    function try_launch_notebook_response(action::Function, path_or_url::AbstractString; title="", advice="", home_url="./")
        try
            nb = action(session, path_or_url)
            notebook_redirect_response(nb; home_url=home_url)
        catch e
            if e isa SessionActions.NotebookIsRunningException
                notebook_redirect_response(e.notebook; home_url=home_url)
            else
                error_response(500, title, advice, sprint(showerror, e, stacktrace(catch_backtrace())))
            end
        end
    end

    function serve_newfile(req::HTTP.Request)
        return notebook_redirect_response(SessionActions.new(session))
    end
    HTTP.@register(router, "GET", "/new", serve_newfile)
    

    function serve_openfile(req::HTTP.Request)
        uri = HTTP.URI(req.target)        
        try
            query = HTTP.queryparams(uri)

            if security.require_token_for_open_links && (UUID(get(query, "secret", string(uuid1()))) != session.secret)
                error_response(405, "Functionality disabled", "This Pluto server does not allow the requested action. If you are running the server yourself, have a look at the <em>security</em> keyword argument to <em>Pluto.run</em>. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a> if you did not expect it!")
            else
                if haskey(query, "path")
                    path = tamepath(query["path"])
                    if isfile(path)
                        return try_launch_notebook_response(SessionActions.open, path, title="Failed to load notebook", advice="The file <code>$(htmlesc(path))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
                    else
                        return error_response(404, "Can't find a file here", "Please check whether <code>$(htmlesc(path))</code> exists.")
                    end
                elseif haskey(query, "url")
                    url = query["url"]
                    return try_launch_notebook_response(SessionActions.open_url, url, title="Failed to load notebook", advice="The notebook from <code>$(htmlesc(url))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
                else
                    error("Empty request")
                end
            end
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end

    HTTP.@register(router, "GET", "/open", serve_openfile)
    
    function serve_sample(req::HTTP.Request)
        uri = HTTP.URI(req.target)
        sample_path = HTTP.URIs.unescapeuri(split(uri.path, "sample/")[2])
        sample_path_without_dotjl = "sample " * sample_path[1:end - 3]
        
        path = numbered_until_new(joinpath(tempdir(), sample_path_without_dotjl))
        readwrite(joinpath(PKG_ROOT_DIR, "sample", sample_path), path)
        
        return try_launch_notebook_response(SessionActions.open, path, home_url="../", title="Failed to load sample", advice="Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
    end
    HTTP.@register(router, "GET", "/sample/*", serve_sample)

    function serve_notebookfile(req::HTTP.Request)
        uri = HTTP.URI(req.target)        
        try
            query = HTTP.queryparams(uri)
            id = UUID(query["id"])
            notebook = session.notebooks[id]

            response = HTTP.Response(200, sprint(save_notebook, notebook))
            push!(response.headers, "Content-Type" => "text/plain; charset=utf-8")
            push!(response.headers, "Content-Disposition" => "inline; filename=\"$(basename(notebook.path))\"")
            response
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end
    HTTP.@register(router, "GET", "/notebookfile", serve_notebookfile)
    
    function serve_asset(req::HTTP.Request)
        reqURI = req.target |> HTTP.URIs.unescapeuri |> HTTP.URI
        
        filepath = joinpath(PKG_ROOT_DIR, "frontend", relpath(reqURI.path, "/"))
        asset_response(filepath)
    end
    HTTP.@register(router, "GET", "/*", serve_asset)

    return router
end