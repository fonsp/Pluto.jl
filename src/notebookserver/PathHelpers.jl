const adjectives = [
	"groundbreaking"
	"important"
	"novel"
	"fun"
	"interesting"
	"fascinating"
	"surprising"
	"unexpected"
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

function numbered_until_new(base::AbstractString; sep=" ", suffix=".jl")
    chosen = base * suffix
    n = 1
    while isfile(chosen)
        n += 1
        chosen = base * sep * string(n) * suffix
    end
    chosen
end



"Like `cp` except we create the file manually (to fix permission issues)."
function copy_write(from::AbstractString, to::AbstractString)
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