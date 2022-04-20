
const FrontMatter = Dict{String,Any}


"""
    frontmatter(nb::Notebook; raise::Bool=false)::Dict{String,Any}

Extract frontmatter from a notebook, which is extra meta-information that the author attaches to the notebook, often including *title*, *description*, *tags*, *author*, and more. Search for *frontmatter* online to learn more.

If `raise` is true, then parsing errors will be rethrown. If `false`, this function will always return a `Dict`.

Currently, you can give frontmatter to a notebook by defining a global variable `frontmatter` anywhere in the notebook, which should be a named tuple. Like so:

```julia
frontmatter = (
	title = "⚡️ JavaScript for widgets",
	description = "A simple notebook demonstrating the Julia syntax essentials",
	layout = "layout.jlhtml",
	tags = ["docs", "advanced", "widgets"],
);
```

This definition will be picked up (using syntax analysis) and evaluated. Note:
- You are not allowed to use variables defined in other cells. (But you can *use* `frontmatter` in your notebook.)
- You can use `;` to hide it from being displayed, only the definition matters.


!!! warning
    This will change in the future, because we might make this a GUI thing! Consider this function in the experimental phase.
"""
function frontmatter(nb::Notebook; raise::Bool=false)
    top = updated_topology(nb.topology, nb, nb.cells)
    
	cs = where_assigned(top, Set([:frontmatter]))
	if isempty(cs)
		FrontMatter()
	else
		try
			c = only(cs)
			m = Module()
			Core.eval(m, Meta.parse(c.code))
			result = Core.eval(m, :frontmatter)
			if result isa FrontMatter
				result
			else
				FrontMatter(String(k)=>v for (k,v) in pairs(result))
			end
		catch e
            if raise
                rethrow(e)
            else
                @error "Error reading frontmatter. Make sure that `frontmatter` is a `NamedTuple` or a `Dict{String,Any}`, and that it does not use global variables." nb.path exception=(e,catch_backtrace())
                FrontMatter()
            end
		end
	end
end


function frontmatter(abs_path::String)
	# this will load the notebook to analyse, it won't run it
    frontmatter(load_notebook_nobackup(abs_path))
end