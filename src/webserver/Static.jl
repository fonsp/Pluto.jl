import HTTP
import Markdown: htmlesc
import Pkg
import MIMEs


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

const day = let 
    second = 1
    hour = 60second
    day = 24hour
end

function default_404_response(req = nothing)
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
        default_404_response()
    end
end

function error_response(
    status_code::Integer, title, advice, body="")
    template = read(project_relative_path(frontend_directory(), "error.jl.html"), String)

    body_title = body == "" ? "" : "Error message:"
    filled_in = replace(template, 
        "\$STYLE" => """<style>$(read(project_relative_path("frontend", "error.css"), String))</style>""",
        "\$TITLE" => title,
        "\$ADVICE" => advice,
        "\$BODYTITLE" => body_title,
        "\$BODY" => htmlesc(body),
    )

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

const found_is_pluto_dev = Ref{Bool}()
"""
Is the Pluto package `dev`ed? Returns `false` for normal Pluto installation from the registry.
"""
function is_pluto_dev()
    if isassigned(found_is_pluto_dev)
        return found_is_pluto_dev[]
    end

    found_is_pluto_dev[] = try
        # is the package located in .julia/packages ?
        if startswith(pkgdir(@__MODULE__), joinpath(get(DEPOT_PATH, 1, "zzz"), "packages"))
            false
        else
            deps = Pkg.dependencies()

            p_index = findfirst(p -> p.name == "Pluto", deps)
            p = deps[p_index]

            p.is_tracking_path
        end
    catch e
        @debug "is_pluto_dev failed" e
        false
    end
end

