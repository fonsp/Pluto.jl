const adjectives = [
	"groundbreaking"
	"important"
	"novel"
	"fun"
	"interesting"
	"fascinating"
	"surprising"
	"remarkable"
	"wonderful"
	"stunning"
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
]

function cutename()
    titlecase(rand(adjectives)) * " " * rand(nouns)
end

"""
Return `base` * `suffix` if the file does not exist yet.

If it does, return `base * sep * string(n) * suffix`, where `n` is the smallest natural number such that the file is new. (no 0 is not a natural number you snake)
"""
function numbered_until_new(base::AbstractString; sep=" ", suffix=".jl", create_file=true)
    chosen = base * suffix
    n = 1
    while isfile(chosen)
        n += 1
        chosen = base * sep * string(n) * suffix
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