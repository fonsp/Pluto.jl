import Pkg
using Base64

const default_binder_url = "https://mybinder.org/v2/gh/fonsp/pluto-on-binder/v$(string(PLUTO_VERSION))"

"""
See [PlutoSliderServer.jl](https://github.com/JuliaPluto/PlutoSliderServer.jl) if you are interested in exporting notebooks programatically.
"""
function generate_html(;
        version=nothing, pluto_cdn_root=nothing,
        notebookfile_js="undefined", statefile_js="undefined", 
        slider_server_url_js="undefined", binder_url_js=repr(default_binder_url),
        disable_ui=true
    )::String

    original = read(project_relative_path("frontend", "editor.html"), String)

    cdn_root = if pluto_cdn_root === nothing
        if version isa Nothing
            version = PLUTO_VERSION
        end
        "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@$(string(version))/frontend/"
    else
        pluto_cdn_root
    end

    @debug "Using CDN for Pluto assets:" cdn_root

    cdnified = replace(
    replace(original, 
        "href=\"./" => "href=\"$(cdn_root)"),
        "src=\"./" => "src=\"$(cdn_root)")

    result = replace(cdnified, 
        "<!-- [automatically generated launch parameters can be inserted here] -->" => 
        """
        <script data-pluto-file="launch-parameters">
        window.pluto_notebookfile = $(notebookfile_js)
        window.pluto_disable_ui = $(disable_ui ? "true" : "false")
        window.pluto_slider_server_url = $(slider_server_url_js)
        window.pluto_binder_url = $(binder_url_js)
        window.pluto_statefile = $(statefile_js)
        </script>
        <!-- [automatically generated launch parameters can be inserted here] -->
        """
    )

    return result
end


function generate_html(notebook; kwargs...)::String
    state = notebook_to_js(notebook)

    notebookfile_js = let
        notebookfile64 = base64encode() do io
            save_notebook(io, notebook)
        end

        "\"data:text/julia;charset=utf-8;base64,$(notebookfile64)\""
    end

    statefile_js = let
        statefile64 = base64encode() do io
            pack(io, state)
        end

        "\"data:;base64,$(statefile64)\""
    end
    
    generate_html(; statefile_js=statefile_js, notebookfile_js=notebookfile_js, kwargs...)
end
