# Will be defined _inside_ the workspace.

module PlutoRunner

using Markdown
import Markdown: html, htmlinline, LaTeX, withtag, htmlesc
import Distributed
import Base64
import REPL.REPLCompletions: completions, complete_path, completion_text

export @bind
###
# WORKSPACE MANAGER
###

"Will be set to the latest workspace module"
current_module = Main

function set_current_module(newname)
    global current_module = getfield(Main, newname)
end

function fetch_formatted_ans()::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{Tuple{String,MIME},Bool,Bool,Union{UInt64, Missing}}}
    (output_formatted = format_output(Main.ans), errored = isa(Main.ans, CapturedException), interrupted = false, runtime = Main.runtime)
end

function move_vars(old_workspace_name::Symbol, new_workspace_name::Symbol, vars_to_delete::Set{Symbol}, funcs_to_delete::Set{Vector{Symbol}}, module_imports_to_move::Set{Expr})
    old_workspace = getfield(Main, old_workspace_name)
    new_workspace = getfield(Main, new_workspace_name)

    for expr in module_imports_to_move
        try
            Core.eval(new_workspace, expr)
        catch; end # TODO catch specificallly
    end

    # TODO: delete
    Core.eval(new_workspace, :(import ..($(old_workspace_name))))

    old_names = names(old_workspace, all=true, imported=true)

    for symbol in old_names
        if symbol ∉ vars_to_delete
            # var will not be redefined in the new workspace, move it over
            if !(symbol == :eval || symbol == :include || string(symbol)[1] == '#' || startswith(string(symbol), "workspace"))
                try
                    val = getfield(old_workspace, symbol)

                    # Expose the variable in the scope of `new_workspace`
                    Core.eval(new_workspace, :(import ..($(old_workspace_name)).$(symbol)))
                catch ex
                    @warn "Failed to move variable $(symbol) to new workspace:"
                    showerror(stderr, ex, stacktrace(catch_backtrace()))
                end
            end
        else
            # var will be redefined - unreference the value so that GC can snoop it

            # free memory for other variables
            # & delete methods created in the old module:
            # for example, the old module might extend an imported function:
            # `import Base: show; show(io::IO, x::Flower) = print(io, "🌷")`
            # when you delete/change this cell, you want this extension to disappear.
            if isdefined(old_workspace, symbol)
                # try_delete_toplevel_methods(old_workspace, symbol)

                try
                    # it could be that `symbol ∈ vars_to_move`, but the _value_ has already been moved to the new reference in `new_module`.
                    # so clearing the value of this reference does not affect the reference in `new_workspace`.
                    Core.eval(old_workspace, :($(symbol) = nothing))
                catch; end # sometimes impossible, eg. when $symbol was constant
            end
        end
    end
    try_delete_toplevel_methods.([old_workspace], funcs_to_delete)
end

"Return whether the `method` was defined inside this notebook or in external code."
isfromtoplevel(method::Method) = startswith(nameof(method.module) |> string, "workspace")

function delete_toplevel_methods(f::Function)
    # we can delete methods of functions!
    # instead of deleting all methods, we only delete methods that were defined in this notebook. This is necessary when the notebook code extends a function from remote code
    methods_table = typeof(f).name.mt
    deleted_sigs = Set{Type}()
    Base.visit(methods_table) do method # iterates through all methods of `f`, including overridden ones
        if isfromtoplevel(method) && getfield(method, deleted_world) == alive_world_val
            Base.delete_method(method)
            push!(deleted_sigs, method.sig)
        end
    end

    # if `f` is an extension to an external function, and we defined a method that overrides a method, for example,
    # we define `Base.isodd(n::Integer) = rand(Bool)`, which overrides the existing method `Base.isodd(n::Integer)`
    # calling `Base.delete_method` on this method won't bring back the old method, because our new method still exists in the method table, and it has a world age which is newer than the original. (our method has a deleted_world value set, which disables it)
    # 
    # To solve this, we iterate again, and _re-enable any methods that were hidden in this way_, by adding them again to the method table with an even newer `primary_world`.
    if !isempty(deleted_sigs)
        to_insert = Set{Method}()
        Base.visit(methods_table) do method
            if !isfromtoplevel(method) && method.sig ∈ deleted_sigs
                push!(to_insert, method)
            end
        end
        # separate loop to avoid visiting the recently added method
        for method in to_insert
            setfield!(method, primary_world, one(typeof(alive_world_val))) # `1` will tell Julia to increment the world counter and set it as this function's world
            ccall(:jl_method_table_insert, Cvoid, (Any, Any, Ptr{Cvoid}), methods_table, method, C_NULL) # i dont like doing this either!
        end
    end
end

function try_delete_toplevel_methods(workspace::Module, name::Symbol)
    try_delete_toplevel_methods(workspace, [name])
end

function try_delete_toplevel_methods(workspace::Module, name_parts::Vector{Symbol})
    try
        val = workspace
        for name in name_parts
            val = getfield(val, name)
        end
        try
            (val isa Function) && delete_toplevel_methods(val)
        catch ex
            @warn "Failed to delete methods for $(name_parts)"
            showerror(stderr, ex, stacktrace(catch_backtrace()))
        end
    catch; end
end

const primary_world = filter(in(fieldnames(Method)), [:primary_world, :min_world]) |> first # Julia v1.3 and v1.0 resp.
const deleted_world = filter(in(fieldnames(Method)), [:deleted_world, :max_world]) |> first # Julia v1.3 and v1.0 resp.
const alive_world_val = getfield(methods(Base.sqrt).ms[1], deleted_world) # typemax(UInt) in Julia v1.3, Int(-1) in Julia 1.0

###
# FORMATTING
###

# We add a method for the Markdown -> HTML conversion that takes a LaTeX chunk from the Markdown tree and adds our custom span
function htmlinline(io::IO, x::LaTeX)
    withtag(io, :span, :class => "tex") do
        print(io, '$')
        htmlesc(io, x.formula)
        print(io, '$')
    end
end

# this one for block equations: (double $$)
function html(io::IO, x::LaTeX)
    withtag(io, :p, :class => "tex") do
        print(io, '$', '$')
        htmlesc(io, x.formula)
        print(io, '$', '$')
    end
end

"The `IOContext` used for converting arbitrary objects to pretty strings."
const iocontext = IOContext(stdout, :color => false, :compact => true, :limit => true, :displaysize => (18, 120))

"""Format `val` using the richest possible output, return formatted string and used MIME type.

Currently, the MIME type is one of `text/html` or `text/plain`, the former being richest."""
function format_output(val::Any)::Tuple{String, MIME}
    # in order of coolness
    # text/plain always matches
    mime = let
        mimes = [MIME("text/html"), MIME("image/svg+xml"), MIME("image/png"), MIME("image/jpg"), MIME("text/plain")]
        first(filter(m->Base.invokelatest(showable, m, val), mimes))
    end

    if val === nothing
        "", mime
    else
        try
            result = Base.invokelatest(repr, mime, val; context = iocontext)
            # MIME rewrites for types other than text/plain or text/html
            if mime ∈ [MIME("image/png"), MIME("image/jpg")]
                result = "<img src=\"data:$(mime);base64,$(Base64.base64encode(result))\" />"
                mime = MIME("text/html")
            end
            result, mime
        catch ex
            "Failed to show value: \n" * sprint(showerror, ex, stacktrace(catch_backtrace())), MIME("text/plain")
        end
    end
end

function format_output(ex::Exception, bt::Array{Any, 1})::Tuple{String, MIME}
    sprint(showerror, ex, bt), MIME("text/plain")
end

function format_output(ex::Exception)::Tuple{String, MIME}
    sprint(showerror, ex), MIME("text/plain")
end

function format_output(val::CapturedException)::Tuple{String, MIME}

    ## We hide the part of the stacktrace that belongs to Pluto's evalling of user code.

    bt = try
        new_bt = val.processed_bt
        # If this is a ModuleWorkspace, then that's everything starting from the last `eval`.
        # For a ProcessWorkspace, it's everything starting from the 2nd to last `eval`.
        howdeep = Distributed.myid() == 1 ? 1 : 2

        for _ in 1:howdeep
            until = findfirst(b -> b[1].func == :eval, reverse(new_bt))
            new_bt = until === nothing ? new_bt : new_bt[1:(length(new_bt) - until)]
        end

        # We don't include the deepest item of the stacktrace, since it is always
        # `top-level scope at none:0`
        new_bt[1:end-1]
    catch ex
        val.processed_bt
    end

    format_output(val.ex, bt)
end


###
# REPL THINGS
###

function completion_fetcher(query, pos, workspace::Module=current_module)
    results, loc, found = completions(query, pos, workspace)
    (completion_text.(results), loc, found)
end

function doc_fetcher(query, workspace::Module=current_module)
    try
        obj = getfield(workspace, Symbol(query))
        (repr(MIME("text/html"), Docs.doc(obj)), :👍)
    catch ex
        (nothing, :👎)
    end
end

###
# BONDS
###

struct Bond
    element::Any
    defines::Symbol
    Bond(element, defines::Symbol) = showable(MIME("text/html"), element) ? new(element, defines) : error("""Can only bind to html-showable objects, ie types T for which show(io, ::MIME"text/html", x::T) is defined.""")
end

import Base: show
function show(io::IO, ::MIME"text/html", bond::Bond)
    print(io, "<bond def=\"$(bond.defines)\">")
    show(io, MIME("text/html"), bond.element)
    print(io, "</bond>")
end

"""`@bind symbol element`

Returns the HTML `element`, and uses its latest JavaScript value as the definition of `symbol`.

# Example

```julia
@bind x html"<input type='range'>"
```
and in another cell:
```julia
x^2
```

The first cell will show a slider as the cell's output, ranging from 0 until 100.
The second cell will show the square of `x`, and is updated in real-time as the slider is moved.
"""
macro bind(def, element)
	if def isa Symbol
		quote
			local el = $(esc(element))
            global $(esc(def)) = Core.applicable(Base.peek, el) ? Base.peek(el) : missing
			PlutoRunner.Bond(el, $(Meta.quot(def)))
		end
	else
		:(throw(ArgumentError("""\nMacro example usage: \n\n\t@bind my_number html"<input type='range'>"\n\n""")))
	end
end

"Will be inserted in saved notebooks that use the @bind macro, make sure that they still contain legal syntax when executed as a vanilla Julia script. Overloading `Base.peek` for custom UI objects gives bound variables a sensible value."
const fake_bind = """macro bind(def, element)
    quote
        local el = \$(esc(element))
        global \$(esc(def)) = Core.applicable(Base.peek, el) ? Base.peek(el) : missing
        el
    end
end
"""

end
