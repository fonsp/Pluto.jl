# Will be evaluated _inside_ the workspace.

module PlutoRunner

using Markdown
import Markdown: html, htmlinline, LaTeX, withtag, htmlesc
import Distributed
import Base64
import REPL.REPLCompletions: completions, complete_path, completion_text
import Base: show, istextmime
import UUIDs: UUID

export @bind

###
# WORKSPACE MANAGER
###

"Will be set to the latest workspace module"
current_module = Main

function set_current_module(newname)
    global current_module = getfield(Main, newname)
    global iocontext = IOContext(iocontext, :module => current_module)
end

cell_results = Dict{UUID, WeakRef}()

function fetch_formatted_result(id::UUID, ends_with_semicolon::Bool)::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{Tuple{String,MIME},Bool,Bool,Union{UInt64, Missing}}}
    ans = cell_results[id].value
    errored = ans isa CapturedException
    output_formatted = (!ends_with_semicolon || errored) ? format_output(ans) : ("", MIME"text/plain"())
    (output_formatted = output_formatted, errored = errored, interrupted = false, runtime = Main.runtime)
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

"Return whether the `method` was defined inside this notebook, and not in external code."
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

function try_showerror(io::IO, e, args...)
    try
        showerror(io, e, args...)
    catch show_ex
        print(io, "\nFailed to show error:\n\n")
        try_showerror(io, show_ex, stacktrace(catch_backtrace()))
    end
end

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
iocontext = IOContext(stdout, :color => false, :compact => true, :limit => true, :displaysize => (18, 120))
const imagemimes = [MIME"image/svg+xml"(), MIME"image/png"(), MIME"image/jpg"(), MIME"image/bmp"(), MIME"image/gif"()]
# in order of coolness
# text/plain always matches
const allmimes = [MIME"application/vnd.pluto.tree+xml"(); MIME"text/html"(); imagemimes; MIME"text/plain"()]


"""Format `val` using the richest possible output, return formatted string and used MIME type.

See `PlutoRunner.allmimes` for the ordered list of supported MIME types."""
function format_output(val::Any)::Tuple{String, MIME}
    try
        sprint_withreturned(show_richest, val; context=iocontext)
    catch ex
        title = ErrorException("Failed to show value: \n" * sprint(try_showerror, ex))
        bt = stacktrace(catch_backtrace())
        format_output(CapturedException(title, bt))
    end
end

format_output(val::Nothing)::Tuple{String, MIME} = "", MIME"text/plain"()

function format_output(val::CapturedException)::Tuple{String, MIME}
    ## We hide the part of the stacktrace that belongs to Pluto's evalling of user code.
    stack = [s for (s,_) in val.processed_bt]

    for _ in 1:2
        until = findfirst(b -> b.func == :eval, reverse(stack))
        stack = until === nothing ? stack : stack[1:(length(stack) - until)]
    end

    pretty = map(stack[1:end]) do s
        Dict(
            :call => pretty_stackcall(s, s.linfo),
            :inlined => s.inlined,
            :file => basename(String(s.file)),
            :line => s.line,
        )
    end
    sprint(json, Dict(:msg => sprint(try_showerror, val.ex), :stacktrace => pretty)), MIME"application/vnd.pluto.stacktrace+json"()
end

# from the Julia source code:
function pretty_stackcall(frame::Base.StackFrame, linfo::Nothing)
    if frame.func isa Symbol
        String(frame.func)
    else
        repr(frame.func)
    end
end

function pretty_stackcall(frame::Base.StackFrame, linfo::Core.CodeInfo)
    "top-level scope"
end

function pretty_stackcall(frame::Base.StackFrame, linfo::Core.MethodInstance)
    if linfo.def isa Method
        sprint(Base.show_tuple_as_call, linfo.def.name, linfo.specTypes)
    else
        sprint(Base.show, linfo)
    end
end

"Like `Base.sprint`, but return `(String, Any)` tuple containing function output as second entry."
function sprint_withreturned(f::Function, args...; context=nothing, sizehint::Integer=0)
    s = IOBuffer(sizehint=sizehint)
    val = if context !== nothing
        f(IOContext(s, context), args...)
    else
        f(s, args...)
    end
    String(resize!(s.data, s.size)), val
end

struct 🥔 end
const struct_showmethod = which(show, (IO, 🥔))
const struct_showmethod_mime = which(show, (IO, MIME"text/plain", 🥔))

function show_richest(io::IO, @nospecialize(x); onlyhtml::Bool=false)::MIME
    mime = Iterators.filter(m -> Base.invokelatest(showable, m, x), allmimes) |> first
    t = typeof(x)

    isstruct = 
        mime isa MIME"text/plain" && 
        t isa DataType &&
        which(show, (IO, MIME"text/plain", t)) === struct_showmethod_mime &&
        which(show, (IO, t)) === struct_showmethod
    
    if isstruct
        # we have a struct with no specialised show function
        # we display it as an interactive tree
        show_struct(io, x)
        return MIME"application/vnd.pluto.tree+xml"()
    end

    if istextmime(mime)
        onlyhtml && (mime isa MIME"text/plain") && print(io, "<pre>")
        show(io, mime, x)
        onlyhtml && (mime isa MIME"text/plain") && print(io, "</pre>")
        return mime
    else
        enc_pipe = Base64.Base64EncodePipe(io)
        io_64 = IOContext(enc_pipe, iocontext)
        if onlyhtml
            print(io, "<img src=\"data:", mime, ";base64,")
            show(io_64, mime, x)
            close(enc_pipe)
            print(io, "\">")
            return MIME"text/html"()
        else
            print(io, "data:", mime, ";base64,")
            show(io_64, mime, x)
            close(enc_pipe)
            return mime
        end
    end
end

###
# TREE VIEWER
###

tree_display_limit = 50

function show_array_row(io::IO, pair::Tuple)
    i, el = pair
    print(io, "<r><k>", i, "</k><v>")
    show_richest(io, el; onlyhtml=true)
    print(io, "</v></r>")
end

function show_dict_row(io::IO, pair::Pair)
    k, el = pair
    print(io, "<r><k>")
    show_richest(io, k; onlyhtml=true)
    print(io, "</k><v>")
    show_richest(io, el; onlyhtml=true)
    print(io, "</v></r>")
end

istextmime(::MIME"application/vnd.pluto.tree+xml") = true

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::AbstractArray{<:Any, 1})
    print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
    print(io, eltype(x))
    print(io, "<jlarray>")
    if length(x) <= tree_display_limit
        show_array_row.([io], enumerate(x))
    else
        from_end = tree_display_limit > 20 ? 10 : 1
        show_array_row.([io], enumerate(x[1:tree_display_limit-from_end]))
        
        print(io, "<r><more></more></r>")
        
        indices = 1+length(x)-from_end:length(x)
        show_array_row.([io], zip(indices, x[indices]))
    end
    
    print(io, "</jlarray>")
    print(io, "</jltree>")
end

function show(io::IO, ::MIME"application/vnd.pluto.tree+xml", x::AbstractDict{<:Any, <:Any})
    print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
    print(io, "Dict")
    print(io, "<jldict>")
    row_index = 1
    for pair in x
        show_dict_row(io, pair)
        if row_index == tree_display_limit
            print(io, "<r><more></more></r>")
            break
        end
        row_index += 1
    end
    
    print(io, "</jldict>")
    print(io, "</jltree>")
end

# Based on Julia source code, but HTML-ified
function show_struct(io::IO, @nospecialize(x))
    t = typeof(x)
    nf = nfields(x)
    nb = sizeof(x)
    if nf != 0 || nb == 0
        print(io, """<jltree class="collapsed" onclick="onjltreeclick(this, event)">""")
        show(io, t)
        print(io, "<jlstruct>")
        
        if !Base.show_circular(io, x)
            recur_io = IOContext(io, Pair{Symbol,Any}(:SHOWN_SET, x),
                                 Pair{Symbol,Any}(:typeinfo, Any))
            for i in 1:nf
                f = fieldname(t, i)
                if !isdefined(x, f)
                    print(io, "<r>", Base.undef_ref_str, "</r>")
                else
                    show_array_row(recur_io, (f, getfield(x, i)))
                end
            end
        end

        print(io, "</jlstruct>")
        print(io, "</jltree>")
    else
        Base.show_default(io, x)
    end
end

###
# JSON SERIALIZER
###

# We define a minimal JSON serializer here so that the notebook process does not need to depend on JSON.jl
# Performance is about 0.5-1.0x JSON.jl, but that's okay since it is only used for special output types like stack traces
# Not designed/tested for use outside of Pluto

struct ReplacePipe <: IO
	outstream::IO
end

# to get these character codes:
# [c => UInt8(c) for c in "\"\\/\b\f\n\r\t"]
# we can do this escaping per-byte because UTF-8 is backwards compatible with ASCII, i.e. these special characters are never part of a UTF-8 encoded character other than the ASCII characters they represent. Cool!
function Base.write(rp::ReplacePipe, x::UInt8)
	if x == 0x22 || x== 0x5c || x== 0x2f # https://www.json.org/json-en.html
        write(rp.outstream, '\\')
        write(rp.outstream, x)
    elseif x < 0x10 # ish
        write(rp.outstream, escape_string(String([Char(x)]))) # the Julia escaping 'happens' to coincide with what we want
    else
        write(rp.outstream, x)
    end
end
function sanitize_pipe(func::Function, outstream::IO, args...)
	func(ReplacePipe(outstream), args...)
end


function json(io, arr::AbstractArray)
    write(io, '[')
    len = length(arr)
    for (i, val) in enumerate(arr)
        json(io, val)
        (i != len) && write(io, ',')
    end
    write(io, ']')
end

function json(io, d::Dict{Symbol, T}) where T
    write(io, '{')
    len = length(d)
    for (i, val) in enumerate(d)
        write(io, '"', val.first, '"', ':')
        json(io, val.second)
        (i != len) && write(io, ',')
    end
    write(io, '}')
end

function json(io, str::T) where T<:AbstractString
    write(io, '"')
    sanitize_pipe(write, io, str)
    write(io, '"')
end

function json(io, val::Any)
    show(io, val)
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
        obj = Core.eval(workspace, Meta.parse(query))
        if obj isa Expr
            (nothing, :👎)
        else
            (repr(MIME"text/html"(), Docs.doc(obj)), :👍)
        end
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
    Bond(element, defines::Symbol) = showable(MIME"text/html"(), element) ? new(element, defines) : error("""Can only bind to html-showable objects, ie types T for which show(io, ::MIME"text/html", x::T) is defined.""")
end

import Base: show
function show(io::IO, ::MIME"text/html", bond::Bond)
    print(io, "<bond def=\"$(bond.defines)\">")
    show(io, MIME"text/html"(), bond.element)
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
end"""

end
