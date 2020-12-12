# Example:

# PLUTO_NOTEBOOK_PACKAGES = [
# 	(name="a", rev="safdf", version=v"1.2.3"),
# 	(name="c", version=v"1.2.3"),
# 	(name="b", path="/a/b/c"),
# ]


variable_name = "PLUTO_NOTEBOOK_PACKAGES"

function serialize_project(io::IO, project::Vector{<:NamedTuple})
	if isempty(project)
		write(io, variable_name, " = []\n")
	else
		write(io, variable_name, " = [\n")
		for p in project
			print(io, "\t", p, ",\n")
		end
		write(io, "]\n")
	end
end
serialize_project(project::Vector{<:NamedTuple}) = sprint(serialize_project, project)




function deserialize_project(str::String, start::Integer)::Vector{<:NamedTuple}
	expr = Meta.parse(str, start; raise=false)[1]
	@assert is_safe_pkg_vect(expr.args[2])
	Core.eval(Main, expr.args[2])
end

function deserialize_project_auto(str::String)::Vector{<:NamedTuple}
	i = findfirst(variable_name, str)
	deserialize_project(str, first(i))
end




function is_safe_pkg_vect(e::Expr)
	e.head == :vect &&
	all(e.args) do a
		a isa Expr && a.head == :tuple && all(a.args) do f
			f isa Expr && f.head == :(=) && length(f.args) == 2 && (
					f.args[1] isa Symbol &&
					safe_pkg_entry_field_value(f.args[2])
				)
		end
	end
end
is_safe_pkg_vect(::Any) = false

function safe_pkg_entry_field_value(e::Expr)
	e.head == :macrocall && length(e.args) == 3 && (
		e.args[1] == Symbol("@v_str") &&
		e.args[2] isa LineNumberNode &&
		e.args[3] isa String
	)
end
safe_pkg_entry_field_value(::String) = true
safe_pkg_entry_field_value(::Any) = false
