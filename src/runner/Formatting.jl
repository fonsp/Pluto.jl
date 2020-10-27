# Will be evaluated _inside_ the workspace process.

# Pluto does most things on process 1 (the server), and it uses little workspace processes to evaluate notebook code in.
# These baby processes don't import Pluto, they only import this module. Functions from this module are called by WorkspaceManager.jl, using Distributed

# So when reading this file, pretend that you are living in process 2, and you are communicating with Pluto's server, who lives in process 1.

module Formatting

using Markdown
import Markdown: html, htmlinline, LaTeX, withtag, htmlesc
import Distributed
import Base64
import REPL.REPLCompletions: completions, complete_path, completion_text, Completion, ModuleCompletion
import Base: show, istextmime
import UUIDs: UUID

import ..PlutoRunner: PlutoRunner

include("./JSON.jl")
using .JSON

export formatted_result_of, format_output, show_richest

MimedOutput = Tuple{Union{String,Vector{UInt8}}, MIME}

function formatted_result_of(id::UUID, ends_with_semicolon::Bool)::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{MimedOutput,Bool,Bool,Union{UInt64, Missing}}}
    ans = PlutoRunner.cell_results[id].value
    errored = ans isa CapturedException
    output_formatted = (!ends_with_semicolon || errored) ? format_output(ans) : ("", MIME"text/plain"())
    (output_formatted = output_formatted, errored = errored, interrupted = false, runtime = Main.runtime)
end

###
# FORMATTING
###

"Because even showerror can error... 👀"
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

const imagemimes = [MIME"image/svg+xml"(), MIME"image/png"(), MIME"image/jpg"(), MIME"image/jpeg"(), MIME"image/bmp"(), MIME"image/gif"()]
# in order of coolness
# text/plain always matches
"""
The MIMEs that Pluto supports, in order of how much I like them. 

`text/plain` should always match - the difference between `show(::IO, ::MIME"text/plain", x)` and `show(::IO, x)` is an unsolved mystery.
"""
const allmimes = [MIME"application/vnd.pluto.tree+xml"(); MIME"text/html"(); imagemimes; MIME"text/latex"(); MIME"text/plain"()]


"""
Format `val` using the richest possible output, return formatted string and used MIME type.

See [`allmimes`](@ref) for the ordered list of supported MIME types.
"""
function format_output(@nospecialize(val))::MimedOutput
    try
        result, mime = sprint_withreturned(show_richest, val; context=PlutoRunner.iocontext)
        if mime ∈ imagemimes
            result, mime
        else
            String(result), mime
        end
    catch ex
        title = ErrorException("Failed to show value: \n" * sprint(try_showerror, ex))
        bt = stacktrace(catch_backtrace())
        format_output(CapturedException(title, bt))
    end
end

format_output(val::Nothing)::MimedOutput = "", MIME"text/plain"()

function format_output(val::CapturedException)::MimedOutput
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

"Like `Base.sprint`, but return a `(String, Any)` tuple containing function output as the second entry."
function sprint_withreturned(f::Function, args...; context=nothing, sizehint::Integer=0)
    s = IOBuffer(sizehint=sizehint)
    val = if context !== nothing
        f(IOContext(s, context), args...)
    else
        f(s, args...)
    end
    resize!(s.data, s.size), val
end

"Super important thing don't change."
struct 🥔 end
const struct_showmethod = which(show, (IO, 🥔))
const struct_showmethod_mime = which(show, (IO, MIME"text/plain", 🥔))

"""
Like two-argument `Base.show`, except:
1. the richest MIME type available to Pluto will be used
2. the used MIME type is returned
3. 'raw' data (e.g. image data) is always base64 encoded, with base64 header. This will change when/if we switch to a binary message format

With `onlyhtml=true`, the returned MIME type will always be MIME"text/html", and other MIME types are converted to this type. For example, an image with MIME type MIME"image/png" defined will display as:
```
<img src="data:image/png;base64,ahsdf87hf278hwh7823hr..." >
```
instead of (`onlyhtml=false`)
```
data:image/png;base64,ahsdf87hf278hwh7823hr...
```
"""
function show_richest(io::IO, @nospecialize(x); onlyhtml::Bool=false)::MIME
    mime = Iterators.filter(m -> Base.invokelatest(showable, m, x), allmimes) |> first
    t = typeof(x)

    # types that have no specialized show methods (their fallback is text/plain) are displayed using Pluto's interactive tree viewer. 
    # this is how we check whether this display method is appropriate:
    isstruct = try
        mime isa MIME"text/plain" && 
        t isa DataType &&
        # there are two ways to override the plaintext show method: 
        which(show, (IO, MIME"text/plain", t)) === struct_showmethod_mime &&
        which(show, (IO, t)) === struct_showmethod
    catch
        false
    end
    
    if isstruct
        PlutoRunner.show_struct(io, x)
        return MIME"application/vnd.pluto.tree+xml"()
    end

    if mime ∈ imagemimes
        if onlyhtml
            # if only html output is accepted, we need to base64 encode the result and use it as image source.
            enc_pipe = Base64.Base64EncodePipe(io)
            io_64 = IOContext(enc_pipe, PlutoRunner.iocontext)

            print(io, "<img src=\"data:", mime, ";base64,")
            show(io_64, mime, x)
            close(enc_pipe)
            print(io, "\">")
            return MIME"text/html"()
        else
            show(io, mime, x)
            return mime
        end
    else
        if onlyhtml || mime isa MIME"text/latex"
            # see onlyhtml description in docstring
            if mime isa MIME"text/plain"
                withtag(io, :pre) do 
                    htmlesc(io, repr(mime, x; context=PlutoRunner.iocontext_compact))
                end
            elseif mime isa MIME"text/latex"
                # Wrapping with `\text{}` allows for LaTeXStrings with mixed text/math
                texed = repr(mime, x)
                html(io, Markdown.LaTeX("\\text{$texed}"))
            else                
                show(io, mime, x)
            end
            return MIME"text/html"()
        else
            # the classic:
            show(io, mime, x)
            return mime
        end
    end
end

end