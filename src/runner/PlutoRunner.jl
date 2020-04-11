# Will be defined _inside_ the workspace.

module PlutoRunner

using Markdown
import Markdown: html, htmlinline, LaTeX, withtag, htmlesc
import Distributed
import Base64
import REPL.REPLCompletions: completions, complete_path, completion_text

###
# WORKSPACE MANAGER
###

current_module = missing

function set_current_module(newname)
    global current_module = Core.eval(Main, newname)
end

function fetch_formatted_ans()::NamedTuple{(:output_formatted, :errored, :interrupted, :runtime),Tuple{Tuple{String,MIME},Bool,Bool,Union{UInt64, Missing}}}
    (output_formatted = format_output(Main.ans), errored = isa(Main.ans, CapturedException), interrupted = false, runtime = Main.runtime)
end

function move_vars(old_workspace_name::Symbol, new_workspace_name::Symbol, vars_to_move::Set{Symbol}=Set{Symbol}(), module_imports_to_move::Set{Expr}=Set{Expr}(); invert_vars_set=false)
    old_workspace = Core.eval(Main, old_workspace_name)
    new_workspace = Core.eval(Main, new_workspace_name)

    for expr in module_imports_to_move
        try
            Core.eval(new_workspace, expr)
        catch; end # TODO catch specificallly
    end

    # TODO: delete
    Core.eval(new_workspace, :(import ..($(old_workspace_name))))

    old_names = names(old_workspace, all=true, imported=true)
    vars_to_move = if invert_vars_set
        setdiff(old_names, vars_to_move)
    else
        vars_to_move
    end

    for symbol in old_names
        if symbol in vars_to_move
            # var will not be redefined in the new workspace, move it over
            if !(symbol == :eval || symbol == :include || string(symbol)[1] == '#' || startswith(string(symbol), "workspace"))
                try
                    val = Core.eval(old_workspace, symbol)

                    # Expose the variable in the scope of `new_workspace`
                    Core.eval(new_workspace, :(import ..($(old_workspace_name)).$(symbol)))
                catch ex
                    @warn "Failed to move variable $(symbol) to new workspace:"
                    showerror(stderr, ex, stacktrace(backtrace()))
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
                val = Core.eval(old_workspace, symbol)

                if val isa Function
                    try
                        ms = methods(val).ms

                        Base.delete_method.(filter(m -> startswith(nameof(m.module) |> string, "workspace"), ms))
                    catch ex
                        @warn "Failed to delete methods for $(symbol)"
                        showerror(stderr, ex, stacktrace(backtrace()))
                    end
                end

                try
                    # it could be that `symbol ∈ vars_to_move`, but the _value_ has already been moved to the new reference in `new_module`.
                    # so clearing the value of this reference does not affect the reference in `new_workspace`.
                    Core.eval(old_workspace, :($(symbol) = nothing))
                catch; end # sometimes impossible, eg. when $symbol was constant
            end
        end
    end
end


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
iocontext = IOContext(stdout, :color => false, :compact => true, :limit => true, :displaysize => (18, 120))

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
            "Failed to show value: \n" * sprint(showerror, ex, stacktrace(backtrace())), MIME("text/plain")
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

function completion_fetcher(query, pos, mod=current_module)
    results, loc, found = completions(query, pos, mod)
    (completion_text.(results), loc, found)
end

function doc_fetcher(query, mod=current_module)
    try
        obj = Core.eval(mod, query |> Symbol)
        (repr(MIME("text/html"), Docs.doc(obj)), :👍)
    catch ex
        (nothing, :👎)
    end
end

end