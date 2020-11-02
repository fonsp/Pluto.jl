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
    template = read(project_relative_path("frontend", "error.jl.html"), String)

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

"""
Return whether the `request` was authenticated in one of two ways:
1. the session's `secret` was included in the URL as a search parameter, or
2. the session's `secret` was included in a cookie.
"""
function is_authenticated(session::ServerSession, request::HTTP.Request)
    (
        secret_in_url = try
            uri = HTTP.URI(request.target)
            query = HTTP.queryparams(uri)
            get(query, "secret", "") == session.secret
        catch e
            @warn "Failed to authenticate request using URL" exception = (e, catch_backtrace())
            false
        end
    ) || (
        secret_in_cookie = try
            cookies = HTTP.cookies(request)
            any(cookies) do cookie
                cookie.name == "secret" && cookie.value == session.secret
            end
        catch e
            @warn "Failed to authenticate request using cookies" exception = (e, catch_backtrace())
            false
        end
    )
    # that ) || ( kind of looks like Krabs from spongebob
end

function http_router_for(session::ServerSession)
    router = HTTP.Router()
    security = session.options.security

    function add_set_secret_cookie!(response::HTTP.Response)
        push!(response.headers, "Set-Cookie" => "secret=$(session.secret); SameSite=Strict; HttpOnly")
        response
    end

    """
        with_authentication(f::Function)
    
    Returns a function `HTTP.Request → HTTP.Response` which does three things:
    1. Check whether the request is authenticated (by calling `is_authenticated`), if not, return a 403 error.
    2. Call your `f(request)` to create the response message.
    3. Add a `Set-Cookie` header to the response with the session's `secret`.
    """
    function with_authentication(f::Function; required::Bool)::Function
        return function (request::HTTP.Request)
            if !required || is_authenticated(session, request)
                response = f(request)
                add_set_secret_cookie!(response)
                response
            else
                error_response(403, "Not yet authenticated", "<b>Open the link that was printed in the terminal where you launched Pluto.</b> It includes a <em>secret</em>, which is needed to access this server.<br><br>If you are running the server yourself and want to change this configuration, have a look at the keyword arguments to <em>Pluto.run</em>. <br><br>Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a> if you did not expect it!")
            end
        end
    end
    
    function create_serve_onefile(path)
        return request::HTTP.Request -> asset_response(normpath(path))
    end
    
    # / does not need security.require_secret_for_open_links
    # because this is how we handle the case:
    #    require_secret_for_open_links == true
    #    require_secret_for_access == false
    # Access to all 'risky' endpoints is still restricted to requests that have the secret cookie, but visiting `/` is allowed, and it will set the cookie. From then on the security situation is identical to 
    #    secret_for_access == true
    HTTP.@register(router, "GET", "/", with_authentication(
        create_serve_onefile(project_relative_path("frontend", "index.html"));
        required=security.require_secret_for_access
        ))
    HTTP.@register(router, "GET", "/edit", with_authentication(
        create_serve_onefile(project_relative_path("frontend", "editor.html"));
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links,
    ))
    # the /edit page also uses with_authentication, but this is not how access to notebooks is secured: this is done by requiring the WS connection to be authenticated.
    # we still use it for /edit to do the cookie stuff, and show a more helpful error, instead of the WS never connecting.
    
    HTTP.@register(router, "GET", "/ping", r -> HTTP.Response(200, "OK!"))
    HTTP.@register(router, "GET", "/possible_binder_token_please", r -> HTTP.Response(200, session.binder_token === nothing ? "" : session.binder_token))
    
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

    serve_newfile = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        notebook_redirect_response(SessionActions.new(session))
    end
    HTTP.@register(router, "GET", "/new", serve_newfile)

    serve_openfile = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        try
            uri = HTTP.URI(request.target)
            query = HTTP.queryparams(uri)
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
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end

    HTTP.@register(router, "GET", "/open", serve_openfile)
    
    serve_sample = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        uri = HTTP.URI(request.target)
        sample_path = split(HTTP.unescapeuri(uri.path), "sample/")[2]
        sample_path_without_dotjl = "sample " * sample_path[1:end - 3]
        
        path = numbered_until_new(joinpath(new_notebooks_directory(), sample_path_without_dotjl))
        readwrite(project_relative_path("sample", sample_path), path)
        
        try_launch_notebook_response(SessionActions.open, path, home_url="../", title="Failed to load sample", advice="Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!")
    end
    HTTP.@register(router, "GET", "/sample/*", serve_sample)

    serve_notebookfile = with_authentication(; 
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        try
            uri = HTTP.URI(request.target)        
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
    
    function serve_asset(request::HTTP.Request)
        uri = HTTP.URI(request.target)
        
        filepath = project_relative_path("frontend", relpath(HTTP.unescapeuri(uri.path), "/"))
        asset_response(filepath)
    end
    HTTP.@register(router, "GET", "/*", serve_asset)
    HTTP.@register(router, "GET", "/favicon.ico", create_serve_onefile(project_relative_path("frontend", "img", "favicon.ico")))

    return router
end