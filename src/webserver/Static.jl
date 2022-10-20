import HTTP
import Markdown: htmlesc
import UUIDs: UUID
import Pkg
import MIMEs

const found_is_pluto_dev = Ref{Union{Nothing,Bool}}(nothing)
function is_pluto_dev()
    if found_is_pluto_dev[] !== nothing
        return found_is_pluto_dev[]
    end
    found_is_pluto_dev[] = try
        deps = Pkg.dependencies()

        p_index = findfirst(p -> p.name == "Pluto", deps)
        p = deps[p_index]

        p.is_tracking_path
    catch
        false
    end
end

function frontend_directory(; allow_bundled::Bool=true)
    if allow_bundled && isdir(project_relative_path("frontend-dist")) && (get(ENV, "JULIA_PLUTO_FORCE_BUNDLED", "nein") == "ja" || !is_pluto_dev())
        "frontend-dist"
    else
        "frontend"
    end
end

function should_cache(path::String)
    dir, filename = splitdir(path)
    endswith(dir, "frontend-dist") && occursin(r"\.[0-9a-f]{8}\.", filename)
end

# Serve everything from `/frontend`, and create HTTP endpoints to open notebooks.

const day = let 
    second = 1
    hour = 60second
    day = 24hour
end

function default_404(req = nothing)
    HTTP.Response(404, "Not found!")
end

function asset_response(path; cacheable::Bool=false)
    if !isfile(path) && !endswith(path, ".html")
        return asset_response(path * ".html"; cacheable)
    end
    if isfile(path)
        data = read(path)
        response = HTTP.Response(200, data)
        HTTP.setheader(response, "Content-Type" => MIMEs.contenttype_from_mime(MIMEs.mime_from_path(path, MIME"application/octet-stream"())))
        HTTP.setheader(response, "Content-Length" => string(length(data)))
        HTTP.setheader(response, "Access-Control-Allow-Origin" => "*")
        cacheable && HTTP.setheader(response, "Cache-Control" => "public, max-age=$(30day), immutable")
        response
    else
        default_404()
    end
end

function error_response(
    status_code::Integer, title, advice, body="")
    template = read(project_relative_path(frontend_directory(), "error.jl.html"), String)

    body_title = body == "" ? "" : "Error message:"
    filled_in = replace(replace(replace(replace(replace(template, 
        "\$STYLE" => """<style>$(read(project_relative_path("frontend", "error.css"), String))</style>"""), 
        "\$TITLE" => title), 
        "\$ADVICE" => advice), 
        "\$BODYTITLE" => body_title), 
        "\$BODY" => htmlesc(body))

    response = HTTP.Response(status_code, filled_in)
    HTTP.setheader(response, "Content-Type" => MIMEs.contenttype_from_mime(MIME"text/html"()))
    response
end

function notebook_response(notebook; home_url="./", as_redirect=true)
    if as_redirect
        response = HTTP.Response(302, "")
        HTTP.setheader(response, "Location" => home_url * "edit?id=" * string(notebook.notebook_id))
        return response
    else
        HTTP.Response(200, string(notebook.notebook_id))
    end
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

"""
    scoped_router(base_url::String, base_router::HTTP.Router)::HTTP.Router

Returns a new `HTTP.Router` which delegates all requests to `base_router` but with requests trimmed
so that they seem like they arrived at `/**` instead of `/\$base_url/**`.
"""
function scoped_router(base_url, base_router)
    @assert startswith(base_url, '/') "base_url \"$base_url\" should start with a '/'"
    @assert endswith(base_url, '/')  "base_url \"$base_url\" should end with a '/'"
    @assert !occursin('*', base_url) "'*' not allowed in base_url \"$base_url\" "

    function handler(request)
        request.target = request.target[length(base_url):end]
        return base_router(request)
    end

    router = HTTP.Router(base_router._404, base_router._405)
    HTTP.register!(router, base_url * "**", handler)
    HTTP.register!(router, base_url, handler)

    return router
end

# Function to print the url with secret on the Julia CLI when a request comes to the server without the secret. Executes at most once every 5 seconds
print_secret_throttled = simple_leading_throttle(5) do session::ServerSession, request::HTTP.Request
    host = HTTP.header(request, "Host")
    target = request.target
    url = "http://$host$target"
    full_url = occursin('?', url) ? "$url&secret=$(session.secret)" : "$url?secret=$(session.secret)"
    @info("The Pluto server received a request that did not contain the secret, here is the requested url with the added secret:", url=full_url)
end

function http_router_for(session::ServerSession)
    router = HTTP.Router(default_404)
    security = session.options.security

    function add_set_secret_cookie!(response::HTTP.Response)
        HTTP.setheader(response, "Set-Cookie" => "secret=$(session.secret); SameSite=Strict; HttpOnly")
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
                if !required
                    filter!(p -> p[1] != "Access-Control-Allow-Origin", response.headers)
                    HTTP.setheader(response, "Access-Control-Allow-Origin" => "*")
                end
                response
            else
                print_secret_throttled(session, request)
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
    HTTP.register!(router, "GET", "/", with_authentication(
        create_serve_onefile(project_relative_path(frontend_directory(), "index.html"));
        required=security.require_secret_for_access
        ))
    HTTP.register!(router, "GET", "/edit", with_authentication(
        create_serve_onefile(project_relative_path(frontend_directory(), "editor.html"));
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links,
    ))
    # the /edit page also uses with_authentication, but this is not how access to notebooks is secured: this is done by requiring the WS connection to be authenticated.
    # we still use it for /edit to do the cookie stuff, and show a more helpful error, instead of the WS never connecting.
    
    HTTP.register!(router, "GET", "/ping", r -> HTTP.Response(200, "OK!"))
    HTTP.register!(router, "GET", "/possible_binder_token_please", r -> session.binder_token === nothing ? HTTP.Response(200,"") : HTTP.Response(200, session.binder_token))
    
    function try_launch_notebook_response(action::Function, path_or_url::AbstractString; title="", advice="", home_url="./", as_redirect=true, action_kwargs...)
        try
            nb = action(session, path_or_url; action_kwargs...)
            notebook_response(nb; home_url, as_redirect)
        catch e
            if e isa SessionActions.NotebookIsRunningException
                notebook_response(e.notebook; home_url, as_redirect)
            else
                error_response(500, title, advice, sprint(showerror, e, stacktrace(catch_backtrace())))
            end
        end
    end

    serve_newfile = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        notebook_response(SessionActions.new(session); as_redirect=(request.method == "GET"))
    end
    HTTP.register!(router, "GET", "/new", serve_newfile)
    HTTP.register!(router, "POST", "/new", serve_newfile)

    # This is not in Dynamic.jl because of bookmarks, how HTML works,
    # real loading bars and the rest; Same for CustomLaunchEvent
    serve_openfile = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        try
            uri = HTTP.URI(request.target)
            query = HTTP.queryparams(uri)
            as_sample = haskey(query, "as_sample")
            if haskey(query, "path")
                path = tamepath(maybe_convert_path_to_wsl(query["path"]))
                if isfile(path)
                    return try_launch_notebook_response(
                        SessionActions.open, path; 
                        as_redirect=(request.method == "GET"), 
                        as_sample, 
                        title="Failed to load notebook", 
                        advice="The file <code>$(htmlesc(path))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!",
                    )
                else
                    return error_response(404, "Can't find a file here", "Please check whether <code>$(htmlesc(path))</code> exists.")
                end
            elseif haskey(query, "url")
                url = query["url"]
                return try_launch_notebook_response(
                    SessionActions.open_url, url;
                    as_redirect=(request.method == "GET"), 
                    as_sample, 
                    title="Failed to load notebook", 
                    advice="The notebook from <code>$(htmlesc(url))</code> could not be loaded. Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!"
                )
            else
                # You can ask Pluto to handle CustomLaunch events
                # and do some magic with how you open files.
                # You are responsible to keep this up to date.
                # See Events.jl for types and explanation
                #
                maybe_notebook_response = try_event_call(session, CustomLaunchEvent(query, request, try_launch_notebook_response))
                isnothing(maybe_notebook_response) && return error("Empty request")
                return maybe_notebook_response
            end
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end

    HTTP.register!(router, "GET", "/open", serve_openfile)
    HTTP.register!(router, "POST", "/open", serve_openfile)


    # normally shutdown is done through Dynamic.jl, with the exception of shutdowns made from the desktop app
    serve_shutdown = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        notebook = notebook_from_uri(request)
        SessionActions.shutdown(session, notebook)
        return HTTP.Response(200)
    end

    HTTP.register!(router, "GET", "/shutdown", serve_shutdown)
    HTTP.register!(router, "POST", "/shutdown", serve_shutdown)


    # used in desktop app
    # looks like `/move?id=<notebook-id>&newpath=<new-notebook-path>``
    serve_move = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        uri = HTTP.URI(request.target)        
        query = HTTP.queryparams(uri)

        notebook = notebook_from_uri(request)
        newpath = query["newpath"]
        
        try
            SessionActions.move(session, notebook, newpath)
            HTTP.Response(200, notebook.path)
        catch e
            error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end

    HTTP.register!(router, "GET", "/move", serve_move)
    HTTP.register!(router, "POST", "/move", serve_move)


    serve_notebooklist = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        return HTTP.Response(200, pack(Dict(k => v.path for (k, v) in session.notebooks)))
    end

    HTTP.register!(router, "GET", "/notebooklist", serve_notebooklist)

    
    serve_sample = with_authentication(;
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        uri = HTTP.URI(request.target)
        sample_filename = split(HTTP.unescapeuri(uri.path), "sample/")[2]
        sample_path = project_relative_path("sample", sample_filename)
        
        try_launch_notebook_response(
            SessionActions.open, sample_path; 
            as_redirect=(request.method == "GET"), 
            home_url="../", 
            as_sample=true, 
            title="Failed to load sample", 
            advice="Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!"
        )
    end
    HTTP.register!(router, "GET", "/sample/*", serve_sample)
    HTTP.register!(router, "POST","/sample/*", serve_sample)

    notebook_from_uri(request) = let
        uri = HTTP.URI(request.target)        
        query = HTTP.queryparams(uri)
        id = UUID(query["id"])
        session.notebooks[id]
    end
    serve_notebookfile = with_authentication(; 
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        try
            notebook = notebook_from_uri(request)
            response = HTTP.Response(200, sprint(save_notebook, notebook))
            HTTP.setheader(response, "Content-Type" => "text/julia; charset=utf-8")
            HTTP.setheader(response, "Content-Disposition" => "inline; filename=\"$(basename(notebook.path))\"")
            response
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end
    HTTP.register!(router, "GET", "/notebookfile", serve_notebookfile)

    serve_statefile = with_authentication(; 
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        try
            notebook = notebook_from_uri(request)
            response = HTTP.Response(200, Pluto.pack(Pluto.notebook_to_js(notebook)))
            HTTP.setheader(response, "Content-Type" => "application/octet-stream")
            HTTP.setheader(response, "Content-Disposition" => "inline; filename=\"$(without_pluto_file_extension(basename(notebook.path))).plutostate\"")
            response
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end
    HTTP.register!(router, "GET", "/statefile", serve_statefile)

    serve_notebookexport = with_authentication(; 
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        try
            notebook = notebook_from_uri(request)
            response = HTTP.Response(200, generate_html(notebook))
            HTTP.setheader(response, "Content-Type" => "text/html; charset=utf-8")
            HTTP.setheader(response, "Content-Disposition" => "inline; filename=\"$(basename(notebook.path)).html\"")
            response
        catch e
            return error_response(400, "Bad query", "Please <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!", sprint(showerror, e, stacktrace(catch_backtrace())))
        end
    end
    HTTP.register!(router, "GET", "/notebookexport", serve_notebookexport)
    
    serve_notebookupload = with_authentication(; 
        required=security.require_secret_for_access || 
        security.require_secret_for_open_links
    ) do request::HTTP.Request
        uri = HTTP.URI(request.target)
        query = HTTP.queryparams(uri)
        
        save_path = SessionActions.save_upload(request.body; filename_base=get(query, "name", nothing))
        
        try_launch_notebook_response(
            SessionActions.open,
            save_path;
            as_redirect=false,
            as_sample=false,
            clear_frontmatter=!isnothing(get(query, "clear_frontmatter", nothing)),
            title="Failed to load notebook",
            advice="The contents could not be read as a Pluto notebook file. When copying contents from somewhere else, make sure that you copy the entire notebook file.  You can also <a href='https://github.com/fonsp/Pluto.jl/issues'>report this error</a>!"
        )
    end
    HTTP.register!(router, "POST", "/notebookupload", serve_notebookupload)
    
    function serve_asset(request::HTTP.Request)
        uri = HTTP.URI(request.target)
        filepath = project_relative_path(frontend_directory(), relpath(HTTP.unescapeuri(uri.path), "/"))
        asset_response(filepath; cacheable=should_cache(filepath))
    end
    HTTP.register!(router, "GET", "/**", serve_asset)
    HTTP.register!(router, "GET", "/favicon.ico", create_serve_onefile(project_relative_path(frontend_directory(allow_bundled=false), "img", "favicon.ico")))

    base_url = session.options.server.base_url
    if base_url != "/"
        return scoped_router(base_url, router)
    end

    return router
end
