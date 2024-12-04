import Base64: base64decode

# from https://github.com/JuliaLang/julia/pull/36425
function detectwsl()
    Sys.islinux() &&
    isfile("/proc/sys/kernel/osrelease") &&
    occursin(r"Microsoft|WSL"i, read("/proc/sys/kernel/osrelease", String))
end

"""
    maybe_convert_path_to_wsl(path)
    
Return the WSL path if the system is using the Windows Subsystem for Linux (WSL) and return `path` otherwise.
WSL mounts the windows drive to /mnt/ and provides a utility tool to convert windows
paths into WSL paths. This function will try to use this tool to automagically
convert paths pasted from windows (with the right click -> copy as path functionality)
into paths Pluto can understand.

Example:
$(raw"C:\Users\pankg\OneDrive\Desktop\pluto\bakery_pnl_ready2.jl")
→
"/mnt/c/Users/pankg/OneDrive/Desktop/pluto/bakery_pnl_ready2.jl"

but "/mnt/c/Users/pankg/OneDrive/Desktop/pluto/bakery_pnl_ready2.jl" stays the same

"""
function maybe_convert_path_to_wsl(path)
    try
        isfile(path) && return path
        if detectwsl()
            # wslpath utility prints path to stderr if it fails to convert
            # (it used to fail for WSL-valid paths)
             !isnothing(match(r"^/mnt/\w+/", path)) && return path
            return readchomp(pipeline(`wslpath -u $(path)`; stderr=devnull))
        end
    catch e
        return path
    end
    return path
end

const adjectives = [
	"groundbreaking"
	"revolutionary"
	"important"
	"novel"
	"fun"
	"interesting"
	"fascinating"
	"exciting"
	"surprising"
	"remarkable"
	"wonderful"
	"stunning"
	"mini"
	"small"
	"tiny"
	"cute"
	"friendly"
	"wild"
]

const nouns = [
	"discovery"
	"experiment"
	"story"
	"journal"
	"notebook"
	"revelation"
	"computation"
	"creation"
	"analysis"
	"invention"
	"blueprint"
	"report"
	"science"
	"magic"
	"program"
	"notes"
	"lecture"
	"theory"
	"proof"
	"conjecture"
]

"""
Generate a filename like `"Cute discovery"`. Does not end with `.jl`.
"""
function cutename()
    titlecase(rand(adjectives)) * " " * rand(nouns)
end

function new_notebooks_directory()
    try
        path = get(
			ENV,
			"JULIA_PLUTO_NEW_NOTEBOOKS_DIR",
			joinpath(first(DEPOT_PATH), "pluto_notebooks")
		)
        if !isdir(path)
            mkdir(path)
        end
        path
    catch
        homedir()
    end
end

"""
Standard Pluto file extensions, including `.jl` and `.pluto.jl`. Pluto can open files with any extension, but the default extensions are used when searching for notebooks, or when trying to create a nice filename for something else, like the backup file.
"""
const pluto_file_extensions = [
    ".pluto.jl",
    ".Pluto.jl",
	".nb.jl",
    ".jl",
    ".plutojl",
    ".pluto",
	".nbjl",
	".pljl",
	".pluto.jl.txt", # MacOS can create these .txt files sometimes
	".jl.txt",
]

endswith_pluto_file_extension(s) = any(endswith(s, e) for e in pluto_file_extensions)

"""
Extract the Julia notebook file contents from a Pluto-exported HTML file.
"""
function embedded_notebookfile(html_contents::AbstractString)::String
	if !occursin("</html>", html_contents)
		throw(ArgumentError("Pass the contents of a Pluto-exported HTML file as argument."))
	end

	m = match(r"pluto_notebookfile.*\"data\:.*base64\,(.*)\"", html_contents)
	if m === nothing
		throw(ArgumentError("Notebook does not have an embedded notebook file."))
	else
		String(base64decode(m.captures[1]))
	end
end

"""
Does the path end with a pluto file extension (like `.jl` or `.pluto.jl`) and does the first line say `### A Pluto.jl notebook ###`? 
"""
is_pluto_notebook(path::String) = endswith_pluto_file_extension(path) && readline(path) == "### A Pluto.jl notebook ###"

function without_pluto_file_extension(s)
    for e in pluto_file_extensions
        if endswith(s, e)
            return s[1:prevind(s, ncodeunits(s), ncodeunits(e))]
        end
    end
    s
end

"""
Return `base` * `suffix` if the file does not exist yet.

If it does, return `base * sep * string(n) * suffix`, where `n` is the smallest natural number such that the file is new. (no 0 is not a natural number you snake)
"""
function numbered_until_new(base::AbstractString; sep::AbstractString=" ", suffix::AbstractString=".jl", create_file::Bool=true, skip_original::Bool=false)
    chosen = base * suffix
    n = 1
    while (n == 1 && skip_original) || isfile(chosen)
        chosen = base * sep * string(n) * suffix
        n += 1
	end
	if create_file
		touch(chosen)
	end
    chosen
end

backup_filename(path) = numbered_until_new(without_pluto_file_extension(path); sep=" backup ", suffix=".jl", create_file=false, skip_original=true)

"Like `cp` except we create the file manually (to fix permission issues). (It's not plagiarism if you use this function to copy homework.)"
function readwrite(from::AbstractString, to::AbstractString)
    write(to, read(from, String))
end

function tryexpanduser(path)
	try
		expanduser(path)
	catch ex
		path
	end
end

const tamepath = abspath ∘ tryexpanduser

"Block until reading the file two times in a row gave the same result."
function wait_until_file_unchanged(filename::String, timeout::Real, last_contents::String="-=-=-=-")::Nothing
	new_contents = try
        read(filename, String)
    catch
        ""
    end
    
    @info "Waiting for file to stabilize..."# last_contents new_contents

	if last_contents == new_contents
		# yayyy
        return
	else
        sleep(timeout)
		wait_until_file_unchanged(filename, timeout, new_contents)
	end
end