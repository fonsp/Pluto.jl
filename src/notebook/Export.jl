import Pkg
using Base64
using HypertextLiteral
import URIs

const default_binder_url = "https://mybinder.org/v2/gh/fonsp/pluto-on-binder/v$(string(PLUTO_VERSION))"

const cdn_version_override = nothing
# const cdn_version_override = "2a48ae2"

if cdn_version_override !== nothing
    @warn "Reminder to fonsi: Using a development version of Pluto for CDN assets. The binder button might not work. You should not see this on a released version of Pluto." cdn_version_override
end

cdnified_editor_html(; kwargs...) = cdnified_html("editor.html"; kwargs...)

function cdnified_html(filename::AbstractString;
        version::Union{Nothing,VersionNumber,AbstractString}=nothing, 
        pluto_cdn_root::Union{Nothing,AbstractString}=nothing,
    )
    should_use_bundled_cdn = version ∈ (nothing, PLUTO_VERSION) && pluto_cdn_root === nothing
    
    something(
        if should_use_bundled_cdn
            try
                original = read(project_relative_path("frontend-dist", filename), String)
                
                cdn_root = "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@$(string(PLUTO_VERSION))/frontend-dist/"

                @debug "Using CDN for Pluto assets:" cdn_root

                replace_with_cdn(original) do url
                    # Because parcel creates filenames with a hash in them, we can check if the file exists locally to make sure that everything is in order.
                    @assert isfile(project_relative_path("frontend-dist", url)) "Could not find the file $(project_relative_path("frontend-dist", url)) locally, that's a bad sign."
                    
                    URIs.resolvereference(cdn_root, url) |> string
                end
            catch e
                get(ENV, "JULIA_PLUTO_IGNORE_CDN_BUNDLE_WARNING", "false") == "true" || @warn "Could not use bundled CDN version of $(filename). You should only see this message if you are using a fork of Pluto." exception=(e,catch_backtrace()) maxlog=1
                nothing
            end
        end,
        let
            original = read(project_relative_path("frontend", filename), String)

            cdn_root = something(pluto_cdn_root, "https://cdn.jsdelivr.net/gh/fonsp/Pluto.jl@$(something(cdn_version_override, string(something(version, PLUTO_VERSION))))/frontend/")

            @debug "Using CDN for Pluto assets:" cdn_root
    
            replace_with_cdn(original) do url
                URIs.resolvereference(cdn_root, url) |> string
            end
        end
    )
end

const _insertion_meta = """<meta name="pluto-insertion-spot-meta">"""
const _insertion_parameters = """<meta name="pluto-insertion-spot-parameters">"""
const _insertion_preload = """<meta name="pluto-insertion-spot-preload">"""


inserted_html(original_contents::AbstractString; 
    meta::AbstractString="",
    parameters::AbstractString="",
    preload::AbstractString="",
) = replace_at_least_once(
    replace_at_least_once(
    replace_at_least_once(original_contents, 
        _insertion_meta => 
        """
        $(meta)
        $(_insertion_meta)
        """
    ),
    _insertion_parameters => 
    """
    $(parameters)
    $(_insertion_parameters)
    """
),
_insertion_preload => 
"""
$(preload)
$(_insertion_preload)
"""
)

function prefetch_statefile_html(statefile_js::AbstractString)
    if length(statefile_js) < 300 && startswith(statefile_js, '"') && endswith(statefile_js, '"') && !startswith(statefile_js, "\"data:")
        """\n<link rel="preload" as="fetch" href=$(statefile_js) crossorigin>\n"""
    else
        ""
    end
end

"""
This function takes the `editor.html` file from Pluto's source code, and uses string replacements to insert custom data. By inserting a statefile (and more), you can create an HTML file that will display a notebook when opened: this is how the Static HTML export works.

See [PlutoSliderServer.jl](https://github.com/JuliaPluto/PlutoSliderServer.jl) if you are interested in exporting notebooks programatically.
"""
function generate_html(;
        version::Union{Nothing,VersionNumber,AbstractString}=nothing, 
        pluto_cdn_root::Union{Nothing,AbstractString}=nothing,
        
        notebookfile_js::AbstractString="undefined", 
        statefile_js::AbstractString="undefined", 
        
        slider_server_url_js::AbstractString="undefined", 
        binder_url_js::AbstractString=repr(default_binder_url),
        
        disable_ui::Bool=true, 
        preamble_html_js::AbstractString="undefined",
        notebook_id_js::AbstractString="undefined", 
        isolated_cell_ids_js::AbstractString="undefined",

        header_html::AbstractString="",
    )::String

    cdnified = cdnified_editor_html(; version, pluto_cdn_root)
    
    length(statefile_js) > 32000000 && @error "Statefile embedded in HTML is very large. The file can be opened with Chrome and Safari, but probably not with Firefox. If you are using PlutoSliderServer to generate this file, then we recommend the setting `baked_statefile=false`. If you are not using PlutoSliderServer, then consider reducing the size of figures and output in the notebook." length(statefile_js)
    
    parameters = """
    <script data-pluto-file="launch-parameters">
    window.pluto_notebook_id = $(notebook_id_js);
    window.pluto_isolated_cell_ids = $(isolated_cell_ids_js);
    window.pluto_notebookfile = $(notebookfile_js);
    window.pluto_disable_ui = $(disable_ui ? "true" : "false");
    window.pluto_slider_server_url = $(slider_server_url_js);
    window.pluto_binder_url = $(binder_url_js);
    window.pluto_statefile = $(statefile_js);
    window.pluto_preamble_html = $(preamble_html_js);
    </script>
    """
    
    preload = prefetch_statefile_html(statefile_js)
    
    inserted_html(cdnified; meta=header_html, parameters, preload)
end

function replace_at_least_once(s, pair)
    from, to = pair
    @assert occursin(from, s)
    replace(s, pair)
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
    
    fm = frontmatter(notebook)
    header_html = isempty(fm) ? "" : frontmatter_html(fm) # avoid loading HypertextLiteral if there is no frontmatter
    
    # We don't set `notebook_id_js` because this is generated by the server, the option is only there for funky setups.
    generate_html(; statefile_js, notebookfile_js, header_html, kwargs...)
end


const frontmatter_writers = (
    ("title", x -> @htl("""
        <title>$(x)</title>
        """)),
    ("description", x -> @htl("""
        <meta name="description" content=$(x)>
        """)),
    ("tags", x -> x isa Vector ? @htl("$((
        @htl("""
            <meta property="og:article:tag" content=$(t)>
            """)
        for t in x
    ))") : nothing),
)


const _og_properties = ("title", "type", "description", "image", "url", "audio", "video", "site_name", "locale", "locale:alternate", "determiner")

const _default_frontmatter = Dict{String, Any}(
    "type" => "article",
    # Note: these defaults are skipped when there is no frontmatter at all.
)

function frontmatter_html(frontmatter::Dict{String,Any}; default_frontmatter::Dict{String,Any}=_default_frontmatter)::String
    d = merge(default_frontmatter, frontmatter)
    repr(MIME"text/html"(), 
        @htl("""$((
            f(d[key])
            for (key, f) in frontmatter_writers if haskey(d, key)
        ))$((
            @htl("""<meta property=$("og:$(key)") content=$(val)>
            """)
            for (key, val) in d if key in _og_properties
        ))"""))
end


replace_substring(s::String, sub::SubString, newval::AbstractString) = *(
	SubString(s, 1, prevind(s, sub.offset + 1, 1)), 
	newval, 
	SubString(s, nextind(s, sub.offset + sub.ncodeunits))
)

const dont_cdnify = ("new","open","shutdown","move","notebooklist","notebookfile","statefile","notebookexport","notebookupload")

const source_pattern = r"\s(?:src|href)=\"(.+?)\""

function replace_with_cdn(cdnify::Function, s::String, idx::Integer=1)
	next_match = match(source_pattern, s, idx)
	if next_match === nothing
		s
	else
		url = only(next_match.captures)
		if occursin("//", url) || url ∈ dont_cdnify
			# skip this one
			replace_with_cdn(cdnify, s, nextind(s, next_match.offset))
		else
			replace_with_cdn(cdnify, replace_substring(
				s,
				url,
				cdnify(url)
			))
		end
	end
end

"""
Generate a custom index.html that is designed to display a custom set of featured notebooks, without the file UI or Pluto logo. This is to be used by [PlutoSliderServer.jl](https://github.com/JuliaPluto/PlutoSliderServer.jl) to show a fancy index page.
"""
function generate_index_html(;
    version::Union{Nothing,VersionNumber,AbstractString}=nothing, 
    pluto_cdn_root::Union{Nothing,AbstractString}=nothing,

    featured_direct_html_links::Bool=false,
    featured_sources_js::AbstractString="undefined",
)
    cdnified = cdnified_html("index.html"; version, pluto_cdn_root)
    
    meta = """
    <style>
    section#open,
    section#mywork,
    section#title {
        display: none !important;
    }
    </style>
    """
    
    parameters = """
    <script data-pluto-file="launch-parameters">
    window.pluto_featured_direct_html_links = $(featured_direct_html_links ? "true" : "false");
    window.pluto_featured_sources = $(featured_sources_js);
    </script>
    """
    
    preload = prefetch_statefile_html(featured_sources_js)
    
    inserted_html(cdnified; meta, parameters, preload)
end
