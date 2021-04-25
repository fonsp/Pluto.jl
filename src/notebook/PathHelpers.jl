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

function cutename()
    titlecase(rand(adjectives)) * " " * rand(nouns)
end

function new_notebooks_directory()
    try
        path = joinpath(first(DEPOT_PATH), "pluto_notebooks")
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
Does the path end with a pluto file extension (like `.jl` or `.pluto.jl`) and does the first line say `### A Pluto.jl notebook ###`? 
"""
is_pluto_notebook(path::String) = endswith_pluto_file_extension(path) && readline(path) == "### A Pluto.jl notebook ###"

function without_pluto_file_extension(s)
    for e in pluto_file_extensions
        if endswith(s, e)
            return s[1:end-length(e)]
        end
    end
    s
end

"""
Return `base` * `suffix` if the file does not exist yet.

If it does, return `base * sep * string(n) * suffix`, where `n` is the smallest natural number such that the file is new. (no 0 is not a natural number you snake)
"""
function numbered_until_new(base::AbstractString; sep::AbstractString=" ", suffix::AbstractString=".pluto.jl", create_file::Bool=true, skip_original::Bool=false)
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

tamepath = abspath ∘ tryexpanduser