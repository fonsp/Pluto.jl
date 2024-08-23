
function wrap_dot(ref::GlobalRef)
    complete_mod_name = fullname(ref.mod) |> wrap_dot
    Expr(:(.), complete_mod_name, QuoteNode(ref.name))
end
function wrap_dot(name)
    if length(name) == 1
        name[1]
    else
        Expr(:(.), wrap_dot(name[1:end-1]), QuoteNode(name[end]))
    end
end

"""
    collect_and_eliminate_globalrefs!(ref::Union{GlobalRef,Expr}, mutable_ref_list::Vector{Pair{Symbol,Symbol}}=[])

Goes through an expression and removes all "global" references to workspace modules (e.g. Main.workspace#XXX).
It collects the names that we replaced these references with, so that we can add assignments to these special names later.

This is useful for us because when we macroexpand, the global refs will normally point to the module it was built in.
We don't re-build the macro in every workspace, so we need to remove these refs manually in order to point to the new module instead.

TODO? Don't remove the refs, but instead replace them with a new ref pointing to the new module?
"""
function collect_and_eliminate_globalrefs!(ref::GlobalRef, mutable_ref_list=[])
    if is_pluto_workspace(ref.mod)
        new_name = gensym(ref.name)
        push!(mutable_ref_list, ref.name => new_name)
        new_name
    else
        ref
    end
end
function collect_and_eliminate_globalrefs!(expr::Expr, mutable_ref_list=[])
    # Fix for .+ and .|> inside macros
    # https://github.com/fonsp/Pluto.jl/pull/1032#issuecomment-868819317
    # I'm unsure if this was all necessary but 🤷‍♀️
    # I take the :call with a GlobalRef to `.|>` or `.+` as args[1],
    #   and then I convert it into a `:.` expr, which is basically (|>).(args...)
    #   which is consistent for us to handle.
    if expr.head == :call && expr.args[1] isa GlobalRef && startswith(string(expr.args[1].name), ".")
        old_globalref = expr.args[1]
        non_broadcast_name = string(old_globalref.name)[begin+1:end]
        new_globalref = GlobalRef(old_globalref.mod, Symbol(non_broadcast_name))
        new_expr = Expr(:., new_globalref, Expr(:tuple, expr.args[begin+1:end]...))
        result = collect_and_eliminate_globalrefs!(new_expr, mutable_ref_list)
        return result
    else
        Expr(expr.head, map(arg -> collect_and_eliminate_globalrefs!(arg, mutable_ref_list), expr.args)...)
    end
end
collect_and_eliminate_globalrefs!(other, mutable_ref_list=[]) = other

function globalref_to_workspaceref(expr)
    mutable_ref_list = Pair{Symbol, Symbol}[]
    new_expr = collect_and_eliminate_globalrefs!(expr, mutable_ref_list)

    Expr(:block,
        # Create new lines to assign to the replaced names of the global refs.
        # This way the expression explorer doesn't care (it just sees references to variables outside of the workspace), 
        # and the variables don't get overwriten by local assigments to the same name (because we have special names). 
        (mutable_ref_list .|> ref -> :(local $(ref[2])))...,
        map(mutable_ref_list) do ref
            # I can just do Expr(:isdefined, ref[1]) here, but it feels better to macroexpand,
            #   because it's more obvious what's going on, and when they ever change the ast, we're safe :D
            macroexpand(Main, quote
                if @isdefined($(ref[1]))
                    $(ref[2]) = $(ref[1])
                end
            end)
        end...,
        new_expr,
    )
end


replace_pluto_properties_in_expr(::GiveMeCellID; cell_id, kwargs...) = cell_id
replace_pluto_properties_in_expr(::GiveMeRerunCellFunction; rerun_cell_function, kwargs...) = rerun_cell_function
replace_pluto_properties_in_expr(::GiveMeRegisterCleanupFunction; register_cleanup_function, kwargs...) = register_cleanup_function
replace_pluto_properties_in_expr(expr::Expr; kwargs...) = Expr(expr.head, map(arg -> replace_pluto_properties_in_expr(arg; kwargs...), expr.args)...)
replace_pluto_properties_in_expr(m::Module; kwargs...) = if is_pluto_workspace(m)
    PLUTO_INNER_MODULE_NAME
else
    m
end
replace_pluto_properties_in_expr(other; kwargs...) = other
function replace_pluto_properties_in_expr(ln::LineNumberNode; cell_id, kwargs...) # See https://github.com/fonsp/Pluto.jl/pull/2241
    file = string(ln.file)
    out = if endswith(file, string(cell_id))
        # We already have the correct cell_id in this LineNumberNode
        ln
    else
        # We append to the LineNumberNode file #@#==# + cell_id
        LineNumberNode(ln.line, Symbol(file * "#@#==#$(cell_id)"))
    end
    return out
end

"Similar to [`replace_pluto_properties_in_expr`](@ref), but just checks for existance and doesn't check for [`GiveMeCellID`](@ref)"
has_hook_style_pluto_properties_in_expr(::GiveMeRerunCellFunction) = true
has_hook_style_pluto_properties_in_expr(::GiveMeRegisterCleanupFunction) = true
has_hook_style_pluto_properties_in_expr(expr::Expr)::Bool = any(has_hook_style_pluto_properties_in_expr, expr.args)
has_hook_style_pluto_properties_in_expr(other) = false


function sanitize_expr(ref::GlobalRef)
    wrap_dot(ref)
end
function sanitize_expr(expr::Expr)
    Expr(expr.head, sanitize_expr.(expr.args)...)
end
sanitize_expr(linenumbernode::LineNumberNode) = linenumbernode
sanitize_expr(quoted::QuoteNode) = QuoteNode(sanitize_expr(quoted.value))

sanitize_expr(bool::Bool) = bool
sanitize_expr(symbol::Symbol) = symbol
sanitize_expr(number::Union{Int,Int8,Float32,Float64}) = number

# In all cases of more complex objects, we just don't send it.
# It's not like the expression explorer will look into them at all.
sanitize_expr(other) = nothing



function try_macroexpand(mod::Module, notebook_id::UUID, cell_id::UUID, expr; capture_stdout::Bool=true)
    # Remove the precvious cached expansion, so when we error somewhere before we update,
    # the old one won't linger around and get run accidentally.
    pop!(cell_expanded_exprs, cell_id, nothing)

    # Remove toplevel block, as that screws with the computer and everything
    expr_not_toplevel = if Meta.isexpr(expr, (:toplevel, :block))
        Expr(:block, expr.args...)
    else
        @warn "try_macroexpand expression not :toplevel or :block" expr
        Expr(:block, expr)
    end

    capture_logger = CaptureLogger(nothing, get_cell_logger(notebook_id, cell_id), Dict[])

    expanded_expr, elapsed_ns = with_logger_and_io_to_logs(capture_logger; capture_stdout) do
        elapsed_ns = time_ns()
        expanded_expr = macroexpand(mod, expr_not_toplevel)::Expr
        elapsed_ns = time_ns() - elapsed_ns
        expanded_expr, elapsed_ns
    end

    logs = capture_logger.logs

    # Removes baked in references to the module this was macroexpanded in.
    # Fix for https://github.com/fonsp/Pluto.jl/issues/1112
    expr_without_return = CantReturnInPluto.replace_returns_with_error(expanded_expr)::Expr
    expr_without_globalrefs = globalref_to_workspaceref(expr_without_return)

    has_pluto_hook_features = has_hook_style_pluto_properties_in_expr(expr_without_globalrefs)
    expr_to_save = replace_pluto_properties_in_expr(expr_without_globalrefs;
        cell_id,
        rerun_cell_function=() -> rerun_cell_from_notebook(cell_id),
        register_cleanup_function=(fn) -> UseEffectCleanups.register_cleanup(fn, cell_id),
    )

    did_mention_expansion_time = false
    cell_expanded_exprs[cell_id] = CachedMacroExpansion(
        expr_hash(expr),
        expr_to_save,
        elapsed_ns,
        has_pluto_hook_features,
        did_mention_expansion_time,
        logs,
    )

    return (sanitize_expr(expr_to_save), expr_hash(expr_to_save))
end