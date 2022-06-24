
const FrontMatter = Dict{String,Any}

"""
	frontmatter(nb::Notebook; raise::Bool=false)::Dict{String,Any}
	frontmatter(nb_path::String; raise::Bool=false)::Dict{String,Any}

Extract frontmatter from a notebook, which is extra meta-information that the author attaches to the notebook, often including *title*, *description*, *tags*, *author*, and more. Search for *frontmatter* online to learn more.

If `raise` is true, then parsing errors will be rethrown. If `false`, this function will always return a `Dict`.
"""
function frontmatter(nb::Notebook; raise::Bool=false)
	convert(FrontMatter, 
		get(() -> FrontMatter(), get_metadata(nb), "frontmatter")
	)
end

function frontmatter(abs_path::String; raise::Bool=false)
    try
		# this will load the notebook to analyse, it won't run it
		frontmatter(load_notebook_nobackup(abs_path); raise)
	catch e
		if raise
			rethrow(e)
		else
			@error "Error reading notebook file." abs_path exception=(e,catch_backtrace())
			FrontMatter()
		end
	end
end

"""
```julia
set_frontmatter!(nb::Notebook, new_value::Dict)
```

Set the new frontmatter of the [`Notebook`](@ref). Use [`frontmatter(nb)`](@ref) to get the old dictionary.

If you want to save the file, call [`save_notebook(nb)`](@ref) afterwards.

`set_frontmatter!(nb, nothing)` will delete the frontmatter.

"""
function set_frontmatter!(nb::Notebook, ::Nothing)
	delete!(nb.metadata, "frontmatter")
end

function set_frontmatter!(nb::Notebook, new_value::Dict)
	nb.metadata["frontmatter"] = convert(FrontMatter, new_value)
end


