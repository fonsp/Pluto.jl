# Will be evaluated _inside_ the workspace process.

# Pluto does most things on process 1 (the server), and it uses little workspace processes to evaluate notebook code in.
# These baby processes don't import Pluto, they only import this module. Functions from this module are called by WorkspaceManager.jl, using Distributed

# So when reading this file, pretend that you are living in process 2, and you are communicating with Pluto's server, who lives in process 1.
# The package environment that this file is loaded with is the NotebookProcessProject.toml file in this directory.

module PlutoRunner

# import these two so that they can be imported from Main on the worker process if it launches without the stdlibs in its LOAD_PATH
import Markdown
import InteractiveUtils

using Markdown
import Markdown: html, htmlinline, LaTeX, withtag, htmlesc
import Distributed
import Base64
import FuzzyCompletions: Completion, ModuleCompletion, PropertyCompletion, FieldCompletion, PathCompletion, DictCompletion, completions, completion_text, score
import Base: show, istextmime
import UUIDs: UUID, uuid4
import Dates: DateTime
import Logging

export @bind

MimedOutput = Tuple{Union{String,Vector{UInt8},Dict{Symbol,Any}},MIME}
const ObjectID = typeof(objectid("hello computer"))
const ObjectDimPair = Tuple{ObjectID,Int64}

Base.@kwdef struct CachedMacroExpansion
    original_expr_hash::UInt64
    expanded_expr::Expr
    expansion_duration::UInt64
    has_pluto_hook_features::Bool
    did_mention_expansion_time::Bool=false
end
const cell_expanded_exprs = Dict{UUID,CachedMacroExpansion}()

const supported_integration_features = Any[]

abstract type SpecialPlutoExprValue end
struct GiveMeCellID <: SpecialPlutoExprValue end
struct GiveMeRerunCellFunction <: SpecialPlutoExprValue end
struct GiveMeRegisterCleanupFunction <: SpecialPlutoExprValue end

###
# WORKSPACE MANAGER
###

"""
`PlutoRunner.notebook_id[]` gives you the notebook ID used to identify a session.
"""
const notebook_id = Ref{UUID}(uuid4())

function revise_if_possible(m::Module)
    # Revise.jl support
    if isdefined(m, :Revise) &&
        isdefined(m.Revise, :revise) && m.Revise.revise isa Function &&
        isdefined(m.Revise, :revision_queue) && m.Revise.revision_queue isa AbstractSet

        if !isempty(m.Revise.revision_queue) # to avoid the sleep(0.01) in revise()
            m.Revise.revise()
        end
    end
end

"These expressions get evaluated inside every newly create module inside a `Workspace`."
const workspace_preamble = [
    :(using Main.PlutoRunner, Main.PlutoRunner.Markdown, Main.PlutoRunner.InteractiveUtils),
    :(show, showable, showerror, repr, string, print, println), # https://github.com/JuliaLang/julia/issues/18181
]

const moduleworkspace_count = Ref(0)
function increment_current_module()::Symbol
    id = (moduleworkspace_count[] += 1)
    new_workspace_name = Symbol("workspace#", id)

    new_module = Core.eval(Main, :(
        module $(new_workspace_name)
            $(workspace_preamble...)
            const var"#___this_module_name" = $(new_workspace_name)
        end
    ))

    new_workspace_name
end

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
    test_mod_name = nameof(ref.mod) |> string
    if startswith(test_mod_name, "workspace#")
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
replace_pluto_properties_in_expr(m::Module; kwargs...) = if startswith(string(nameof(m)), "workspace#")
    Symbol("#___this_module_name")
else
    m
end
replace_pluto_properties_in_expr(other; kwargs...) = other

"Similar to [`replace_pluto_properties_in_expr`](@ref), but just checks for existance and doesn't check for [`GiveMeCellID`](@ref)"
has_hook_style_pluto_properties_in_expr(::GiveMeRerunCellFunction) = true
has_hook_style_pluto_properties_in_expr(::GiveMeRegisterCleanupFunction) = true
has_hook_style_pluto_properties_in_expr(expr::Expr) = any(has_hook_style_pluto_properties_in_expr, expr.args)
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


"""
All code necessary for throwing errors when cells return.
Right now it just throws an error from the position of the return,
    this is nice because you get to the line number of the return.
However, now it is suddenly possibly to catch the return error...
    so we might want to actually return the error instead of throwing it,
    and then handle it in `run_expression` or something.
"""
module CantReturnInPluto
    struct CantReturnInPlutoException end
    function Base.showerror(io::IO, ::CantReturnInPlutoException)
        print(io, "Pluto: You can only use return inside a function.")
    end

    """
    We do macro expansion now, so we can also check for `return` statements "statically".
    This method goes through an expression and replaces all `return` statements with `throw(CantReturnInPlutoException())`
    """
    function replace_returns_with_error(expr::Expr)
        if expr.head == :return
            :(throw($(CantReturnInPlutoException())))
        elseif expr.head == :quote
            Expr(:quote, replace_returns_with_error_in_interpolation(expr.args[1]))
        elseif Meta.isexpr(expr, :(=)) && expr.args[1] isa Expr && (expr.args[1].head == :call || expr.args[1].head == :where || (expr.args[1].head == :(::) && expr.args[1].args[1] isa Expr && expr.args[1].args[1].head == :call))
            # f(x) = ...
            expr
        elseif expr.head == :function || expr.head == :macro || expr.head == :(->)
            expr
        else
            Expr(expr.head, map(arg -> replace_returns_with_error(arg), expr.args)...)
        end
    end
    replace_returns_with_error(other) = other

    "Go through a quoted expression and remove returns"
    function replace_returns_with_error_in_interpolation(ex::Expr)
        if ex.head == :$
            Expr(:$, replace_returns_with_error_in_interpolation(ex.args[1]))
        else
            # We are still in a quote, so we do go deeper, but we keep ignoring everything except :$'s
            Expr(expr.head, map(arg -> replace_returns_with_error_in_interpolation(arg), expr.args)...)
        end
    end
    replace_returns_with_error_in_interpolation(ex) = ex
end


function try_macroexpand(mod, cell_uuid, expr)
    # Remove the precvious cached expansion, so when we error somewhere before we update,
    # the old one won't linger around and get run accidentally.
    delete!(cell_expanded_exprs, cell_uuid)

    # Remove toplevel block, as that screws with the computer and everything
    expr_not_toplevel = if expr.head == :toplevel || expr.head == :block
        Expr(:block, expr.args...)
    else
        @warn "try_macroexpand expression not :toplevel or :block" expr
        Expr(:block, expr)
    end

    elapsed_ns = time_ns()
    expanded_expr = macroexpand(mod, expr_not_toplevel)
    elapsed_ns = time_ns() - elapsed_ns

    # Removes baked in references to the module this was macroexpanded in.
    # Fix for https://github.com/fonsp/Pluto.jl/issues/1112
    expr_without_return = CantReturnInPluto.replace_returns_with_error(expanded_expr)
    expr_without_globalrefs = globalref_to_workspaceref(expr_without_return)

    has_pluto_hook_features = has_hook_style_pluto_properties_in_expr(expr_without_globalrefs)
    expr_to_save = replace_pluto_properties_in_expr(expr_without_globalrefs,
        cell_id=cell_uuid,
        rerun_cell_function=() -> rerun_cell_from_notebook(cell_uuid),
        register_cleanup_function=(fn) -> UseEffectCleanups.register_cleanup(fn, cell_uuid),
    )

    cell_expanded_exprs[cell_uuid] = CachedMacroExpansion(
        original_expr_hash=expr_hash(expr),
        expanded_expr=expr_to_save,
        expansion_duration=elapsed_ns,
        has_pluto_hook_features=has_pluto_hook_features,
    )

    return (sanitize_expr(expr_to_save), expr_hash(expr_to_save))
end

function get_module_names(workspace_module, module_ex::Expr)
    try
        Core.eval(workspace_module, Expr(:call, :names, module_ex)) |> Set{Symbol}
    catch
        Set{Symbol}()
    end
end

function collect_soft_definitions(workspace_module, modules::Set{Expr})
  mapreduce(module_ex -> get_module_names(workspace_module, module_ex), union!, modules; init=Set{Symbol}())
end













###
# EVALUATING NOTEBOOK CODE
###

struct Computer
    f::Function
    expr_id::ObjectID
    input_globals::Vector{Symbol}
    output_globals::Vector{Symbol}
end

expr_hash(e::Expr) = objectid(e.head) + mapreduce(p -> objectid((p[1], expr_hash(p[2]))), +, enumerate(e.args); init=zero(ObjectID))
expr_hash(x) = objectid(x)

const computers = Dict{UUID,Computer}()
const computer_workspace = Main

const cells_with_hook_functionality_active = Set{UUID}()

"Registers a new computer for the cell, cleaning up the old one if there is one."
function register_computer(expr::Expr, key::ObjectID, cell_id::UUID, input_globals::Vector{Symbol}, output_globals::Vector{Symbol})
    @gensym result
    e = Expr(:function, Expr(:call, gensym(:function_wrapped_cell), input_globals...), Expr(:block,
        Expr(:(=), result, timed_expr(expr)),
        Expr(:tuple,
            result,
            Expr(:tuple, map(x -> :(@isdefined($(x)) ? $(x) : $(OutputNotDefined())), output_globals)...)
        )
    ))

    f = Core.eval(computer_workspace, e)

    if haskey(computers, cell_id)
        delete_computer!(computers, cell_id)
    end

    computers[cell_id] = Computer(f, key, input_globals, output_globals)
end

function delete_computer!(computers::Dict{UUID,Computer}, cell_id::UUID)
    computer = pop!(computers, cell_id)
    UseEffectCleanups.trigger_cleanup(cell_id)
    Base.visit(Base.delete_method, methods(computer.f).mt) # Make the computer function uncallable
end

parse_cell_id(filename::Symbol) = filename |> string |> parse_cell_id
parse_cell_id(filename::AbstractString) =
    match(r"#==#(.*)", filename).captures |> only |> UUID

module UseEffectCleanups
    import UUIDs: UUID

    const cell_cleanup_functions = Dict{UUID,Set{Function}}()

    function register_cleanup(f::Function, cell_id::UUID)
        cleanup_functions = get!(cell_cleanup_functions, cell_id, Set{Function}())
        push!(cleanup_functions, f)
        nothing
    end

    function trigger_cleanup(cell_id::UUID)
        for cleanup_func in get!(cell_cleanup_functions, cell_id, Set{Function}())
            try
                cleanup_func()
            catch error
                @warn "Cleanup function gave an error" cell_id error stacktrace=stacktrace(catch_backtrace())
            end
        end
        delete!(cell_cleanup_functions, cell_id)
    end
end

quote_if_needed(x) = x
quote_if_needed(x::Union{Expr, Symbol, QuoteNode, LineNumberNode}) = QuoteNode(x)

struct OutputNotDefined end

function compute(m::Module, computer::Computer)
    # 1. get the referenced global variables
    # this might error if the global does not exist, which is exactly what we want
    input_global_values = getfield.([m], computer.input_globals)

    # 2. run the function
    out = Base.invokelatest(computer.f, input_global_values...)
    result, output_global_values = out

    for (name, val) in zip(computer.output_globals, output_global_values)
        # Core.eval(m, Expr(:(=), name, quote_if_needed(val)))
        Core.eval(m, quote
            if $(quote_if_needed(val)) !== $(OutputNotDefined())
                $(name) = $(quote_if_needed(val))
            end
        end)
    end

    result
end

"Wrap `expr` inside a timing block."
function timed_expr(expr::Expr)::Expr
    # @assert ExpressionExplorer.is_toplevel_expr(expr)

    @gensym result
    @gensym elapsed_ns
    # we don't use `quote ... end` here to avoid the LineNumberNodes that it adds (these would taint the stack trace).
    Expr(:block,
        :(local $elapsed_ns = time_ns()),
        :(local $result = $expr),
        :($elapsed_ns = time_ns() - $elapsed_ns),
        :(($result, $elapsed_ns)),
    )
end

"""
Run the expression or function inside a try ... catch block, and verify its "return proof".
"""
function run_inside_trycatch(m::Module, f::Union{Expr,Function})::Tuple{Any,Union{UInt64,Nothing}}
    return try
        if f isa Expr
            # We eval `f` in the global scope of the workspace module:
            Core.eval(m, f)
        else
            # f is a function
            f()
        end
    catch ex
        bt = stacktrace(catch_backtrace())
        (CapturedException(ex, bt), nothing)
    end
end

add_runtimes(::Nothing, ::UInt64) = nothing
add_runtimes(a::UInt64, b::UInt64) = a+b

contains_macrocall(expr::Expr) = if expr.head == :macrocall
    true
elseif expr.head == :module
    # Modules don't get expanded, sadly, so we don't touch it
    false
else
    any(arg -> contains_macrocall(arg), expr.args)
end
contains_macrocall(other) = false


"""
Run the given expression in the current workspace module. If the third argument is `nothing`, then the expression will be `Core.eval`ed. The result and runtime are stored inside [`cell_results`](@ref) and [`cell_runtimes`](@ref).

If the third argument is a `Tuple{Set{Symbol}, Set{Symbol}}` containing the referenced and assigned variables of the expression (computed by the ExpressionExplorer), then the expression will be **wrapped inside a function**, with the references as inputs, and the assignments as outputs. Instead of running the expression directly, Pluto will call this function, with the right globals as inputs.

This function is memoized: running the same expression a second time will simply call the same generated function again. This is much faster than evaluating the expression, because the function only needs to be Julia-compiled once. See https://github.com/fonsp/Pluto.jl/pull/720
"""
function run_expression(
    m::Module, 
    expr::Any, 
    cell_id::UUID, 
    function_wrapped_info::Union{Nothing,Tuple{Set{Symbol},Set{Symbol}}}=nothing, 
    forced_expr_id::Union{ObjectID,Nothing}=nothing; 
    user_requested_run::Bool=true,
    capture_stdout::Bool=true,
)
    if user_requested_run
        # TODO Time elapsed? Possibly relays errors in cleanup function?
        UseEffectCleanups.trigger_cleanup(cell_id)

        # TODO Could also put explicit `try_macroexpand` here, to make clear that user_requested_run => fresh macro identity
    end

    currently_running_cell_id[] = cell_id

    # reset published objects
    cell_published_objects[cell_id] = Dict{String,Any}()

    # reset registered bonds
    for s in get(cell_registered_bond_names, cell_id, Set{Symbol}())
        delete!(registered_bond_elements, s)
    end
    cell_registered_bond_names[cell_id] = Set{Symbol}()

    # If the cell contains macro calls, we want those macro calls to preserve their identity,
    # so we macroexpand this earlier (during expression explorer stuff), and then we find it here.
    # NOTE Turns out sometimes there is no macroexpanded version even though the expression contains macro calls...
    # .... So I macroexpand when there is no cached version just to be sure 🤷‍♀️
    # NOTE Errors during try_macroexpand will cause no expanded version to be stored.
    # .... This is fine, because it allows us to try again here and throw the error...
    # .... But ideally we wouldn't re-macroexpand and store the error the first time (TODO-ish)
    if !haskey(cell_expanded_exprs, cell_id) || cell_expanded_exprs[cell_id].original_expr_hash != expr_hash(expr)
        try
            try_macroexpand(m, cell_id, expr)
        catch e
            result = CapturedException(e, stacktrace(catch_backtrace()))
            cell_results[cell_id], cell_runtimes[cell_id] = (result, nothing)
            return (result, nothing)
        end
    end

    # We can be sure there is a cached expression now, yay
    expanded_cache = cell_expanded_exprs[cell_id]
    original_expr = expr
    expr = expanded_cache.expanded_expr

    # We add the time it took to macroexpand to the time for the first call,
    # but we make sure we don't mention it on subsequent calls
    expansion_runtime = if expanded_cache.did_mention_expansion_time === false
        # Is this really the easiest way to clone a struct with some changes? Pfffft
        cell_expanded_exprs[cell_id] = CachedMacroExpansion(
            original_expr_hash=expanded_cache.original_expr_hash,
            expanded_expr=expanded_cache.expanded_expr,
            expansion_duration=expanded_cache.expansion_duration,
            did_mention_expansion_time=true,
            has_pluto_hook_features=expanded_cache.has_pluto_hook_features,
        )
        expanded_cache.expansion_duration
    else
        zero(UInt64)
    end

    if contains_macrocall(expr)
        @error "Expression contains a macrocall" expr
        throw("Expression still contains macro calls!!")
    end

    result, runtime = with_io_to_logs(; enabled=capture_stdout, loglevel=stdout_log_level) do
        if function_wrapped_info === nothing
            toplevel_expr = Expr(:toplevel, expr)
            wrapped = timed_expr(toplevel_expr)
            ans, runtime = run_inside_trycatch(m, wrapped)
            (ans, add_runtimes(runtime, expansion_runtime))
        else
            expr_id = forced_expr_id !== nothing ? forced_expr_id : expr_hash(expr)
            local computer = get(computers, cell_id, nothing)
            if computer === nothing || computer.expr_id !== expr_id
                try
                    computer = register_computer(expr, expr_id, cell_id, collect.(function_wrapped_info)...)
                catch e
                    # @error "Failed to generate computer function" expr exception=(e,stacktrace(catch_backtrace()))
                    return run_expression(m, original_expr, cell_id, nothing; user_requested_run=user_requested_run)
                end
            end

            # This check solves the problem of a cell like `false && variable_that_does_not_exist`. This should run without error, but will fail in our function-wrapping-magic because we get the value of `variable_that_does_not_exist` before calling the generated function.
            # The fix is to detect this situation and run the expression in the classical way.
            ans, runtime = if any(name -> !isdefined(m, name), computer.input_globals)
                # Do run_expression but with function_wrapped_info=nothing so it doesn't go in a Computer()
                # @warn "Got variables that don't exist, running outside of computer" not_existing=filter(name -> !isdefined(m, name), computer.input_globals)
                run_expression(m, original_expr, cell_id; user_requested_run)
            else
                run_inside_trycatch(m, () -> compute(m, computer))
            end

            ans, add_runtimes(runtime, expansion_runtime)
        end
    end

    if (result isa CapturedException) && (result.ex isa InterruptException)
        throw(result.ex)
    end
    
    cell_results[cell_id], cell_runtimes[cell_id] = result, runtime
end

# Channel to trigger implicits run
const run_channel = Channel{UUID}(10)

function rerun_cell_from_notebook(cell_id::UUID)
    # make sure only one of this cell_id is in the run channel
    # by emptying it and filling it again
    new_uuids = UUID[]
    while isready(run_channel)
        uuid = take!(run_channel)
        if uuid != cell_id
            push!(new_uuids, uuid)
        end
    end
    size = length(new_uuids)
    for uuid in new_uuids
        put!(run_channel, uuid)
    end

    put!(run_channel, cell_id)
end







###
# DELETING GLOBALS
###


function do_reimports(workspace_name, module_imports_to_move::Set{Expr})
    for expr in module_imports_to_move
        try
            Core.eval(workspace_name, expr)
        catch e end # TODO catch specificallly
    end
end

"""
Move some of the globals over from one workspace to another. This is how Pluto "deletes" globals - it doesn't, it just executes your new code in a new module where those globals are not defined.

Notebook code does run in `Main` - it runs in workspace modules. Every time that you run cells, a new module is created, called `Main.workspace123` with `123` an increasing number.

The trick boils down to two things:
1. When we create a new workspace module, we move over some of the global from the old workspace. (But not the ones that we want to 'delete'!)
2. If a function used to be defined, but now we want to delete it, then we go through the method table of that function and snoop out all methods that we defined by us, and not by another package. This is how we reverse extending external functions. For example, if you run a cell with `Base.sqrt(s::String) = "the square root of" * s`, and then delete that cell, then you can still call `sqrt(1)` but `sqrt("one")` will err. Cool right!
"""
function move_vars(old_workspace_name::Symbol, new_workspace_name::Symbol, vars_to_delete::Set{Symbol}, methods_to_delete::Set{Tuple{UUID,Vector{Symbol}}}, module_imports_to_move::Set{Expr})
    old_workspace = getfield(Main, old_workspace_name)
    new_workspace = getfield(Main, new_workspace_name)

    do_reimports(new_workspace, module_imports_to_move)

    # TODO: delete
    Core.eval(new_workspace, :(import ..($(old_workspace_name))))

    old_names = names(old_workspace, all=true, imported=true)

    funcs_with_no_methods_left = filter(methods_to_delete) do f
        !try_delete_toplevel_methods(old_workspace, f)
    end
    name_symbols_of_funcs_with_no_methods_left = last.(last.(funcs_with_no_methods_left))
    for symbol in old_names
        if (symbol ∈ vars_to_delete) || (symbol ∈ name_symbols_of_funcs_with_no_methods_left)
            # var will be redefined - unreference the value so that GC can snoop it

            # free memory for other variables
            # & delete methods created in the old module:
            # for example, the old module might extend an imported function:
            # `import Base: show; show(io::IO, x::Flower) = print(io, "🌷")`
            # when you delete/change this cell, you want this extension to disappear.
            if isdefined(old_workspace, symbol)
                # try_delete_toplevel_methods(old_workspace, symbol)

                try
                    # We are clearing this variable from the notebook, so we need to find it's root
                    # Just clearing out the definition in the old_module, besides giving an error (so that's what that `catch; end` is for)
                    # will not actually free it from Julia, the older module will still have a reference.
                    module_to_remove_from = which(old_workspace, symbol)
                    Core.eval(module_to_remove_from, :($(symbol) = nothing))
                catch; end # sometimes impossible, eg. when $symbol was constant
            end
        else
            # var will not be redefined in the new workspace, move it over
            if !(symbol == :eval || symbol == :include || string(symbol)[1] == '#' || startswith(string(symbol), "workspace#"))
                try
                    getfield(old_workspace, symbol)

                    # Expose the variable in the scope of `new_workspace`
                    Core.eval(new_workspace, :(import ..($(old_workspace_name)).$(symbol)))
                catch ex
                    if !(ex isa UndefVarError)
                        @warn "Failed to move variable $(symbol) to new workspace:"
                        showerror(original_stderr, ex, stacktrace(catch_backtrace()))
                    end
                end
            end
        end
    end

    revise_if_possible(new_workspace)
end

"Return whether the `method` was defined inside this notebook, and not in external code."
isfromcell(method::Method, cell_id::UUID) = endswith(String(method.file), string(cell_id))

"Delete all methods of `f` that were defined in this notebook, and leave the ones defined in other packages, base, etc. ✂

Return whether the function has any methods left after deletion."
function delete_toplevel_methods(f::Function, cell_id::UUID)::Bool
    # we can delete methods of functions!
    # instead of deleting all methods, we only delete methods that were defined in this notebook. This is necessary when the notebook code extends a function from remote code
    methods_table = typeof(f).name.mt
    deleted_sigs = Set{Type}()
    Base.visit(methods_table) do method # iterates through all methods of `f`, including overridden ones
        if isfromcell(method, cell_id) && getfield(method, deleted_world) == alive_world_val
            Base.delete_method(method)
            push!(deleted_sigs, method.sig)
        end
    end

    # if `f` is an extension to an external function, and we defined a method that overrides a method, for example,
    # we define `Base.isodd(n::Integer) = rand(Bool)`, which overrides the existing method `Base.isodd(n::Integer)`
    # calling `Base.delete_method` on this method won't bring back the old method, because our new method still exists in the method table, and it has a world age which is newer than the original. (our method has a deleted_world value set, which disables it)
    #
    # To solve this, we iterate again, and _re-enable any methods that were hidden in this way_, by adding them again to the method table with an even newer`primary_world`.
    if !isempty(deleted_sigs)
        to_insert = Method[]
        Base.visit(methods_table) do method
            if !isfromcell(method, cell_id) && method.sig ∈ deleted_sigs
                push!(to_insert, method)
            end
        end
        # separate loop to avoid visiting the recently added method
        for method in Iterators.reverse(to_insert)
            setfield!(method, primary_world, one(typeof(alive_world_val))) # `1` will tell Julia to increment the world counter and set it as this function's world
            setfield!(method, deleted_world, alive_world_val) # set the `deleted_world` property back to the 'alive' value (for Julia v1.6 and up)
            ccall(:jl_method_table_insert, Cvoid, (Any, Any, Ptr{Cvoid}), methods_table, method, C_NULL) # i dont like doing this either!
        end
    end
    return !isempty(methods(f).ms)
end

# function try_delete_toplevel_methods(workspace::Module, name::Symbol)
#     try_delete_toplevel_methods(workspace, [name])
# end

function try_delete_toplevel_methods(workspace::Module, (cell_id, name_parts)::Tuple{UUID,Vector{Symbol}})::Bool
    try
        val = workspace
        for name in name_parts
            val = getfield(val, name)
        end
        try
            (val isa Function) && delete_toplevel_methods(val, cell_id)
        catch ex
            @warn "Failed to delete methods for $(name_parts)"
            showerror(original_stderr, ex, stacktrace(catch_backtrace()))
            false
        end
    catch
        false
    end
end

# these deal with some inconsistencies in Julia's internal (undocumented!) variable names
const primary_world = filter(in(fieldnames(Method)), [:primary_world, :min_world]) |> first # Julia v1.3 and v1.0 resp.
const deleted_world = filter(in(fieldnames(Method)), [:deleted_world, :max_world]) |> first # Julia v1.3 and v1.0 resp.
const alive_world_val = getfield(methods(Base.sqrt).ms[1], deleted_world) # typemax(UInt) in Julia v1.3, Int(-1) in Julia 1.0


















###
# FORMATTING
###


# TODO: clear key when a cell is deleted furever
const cell_results = Dict{UUID,Any}()
const cell_runtimes = Dict{UUID,Union{Nothing,UInt64}}()
const cell_published_objects = Dict{UUID,Dict{String,Any}}()
const cell_registered_bond_names = Dict{UUID,Set{Symbol}}()

const tree_display_limit = 30
const tree_display_limit_increase = 40
const table_row_display_limit = 10
const table_row_display_limit_increase = 60
const table_column_display_limit = 8
const table_column_display_limit_increase = 30

const tree_display_extra_items = Dict{UUID,Dict{ObjectDimPair,Int64}}()

const FormattedCellResult = NamedTuple{(:output_formatted, :errored, :interrupted, :process_exited, :runtime, :published_objects, :has_pluto_hook_features),Tuple{PlutoRunner.MimedOutput,Bool,Bool,Bool,Union{UInt64,Nothing},Dict{String,Any},Bool}}

function formatted_result_of(
    cell_id::UUID, 
    ends_with_semicolon::Bool, 
    known_published_objects::Vector{String}=String[],
    showmore::Union{ObjectDimPair,Nothing}=nothing, 
    workspace::Module=Main,
)::FormattedCellResult
    load_integrations_if_needed()
    currently_running_cell_id[] = cell_id

    extra_items = if showmore === nothing
        tree_display_extra_items[cell_id] = Dict{ObjectDimPair,Int64}()
    else
        old = get!(() -> Dict{ObjectDimPair,Int64}(), tree_display_extra_items, cell_id)
        old[showmore] = get(old, showmore, 0) + 1
        old
    end

    has_pluto_hook_features = haskey(cell_expanded_exprs, cell_id) && cell_expanded_exprs[cell_id].has_pluto_hook_features
    ans = cell_results[cell_id]
    errored = ans isa CapturedException

    output_formatted = if (!ends_with_semicolon || errored)
        format_output(ans; context=IOContext(default_iocontext, :extra_items=>extra_items, :module => workspace))
    else
        ("", MIME"text/plain"())
    end
    
    published_objects = get(cell_published_objects, cell_id, Dict{String,Any}())
    
    for k in known_published_objects
        if haskey(published_objects, k)
            published_objects[k] = nothing
        end
    end
    
    return (
        output_formatted = output_formatted,
        errored = errored, 
        interrupted = false, 
        process_exited = false, 
        runtime = get(cell_runtimes, cell_id, nothing),
        published_objects = published_objects,
        has_pluto_hook_features = has_pluto_hook_features,
    )
end


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

# because i like that
Base.IOContext(io::IOContext, ::Nothing) = io

"The `IOContext` used for converting arbitrary objects to pretty strings."
const default_iocontext = IOContext(devnull, :color => false, :limit => true, :displaysize => (18, 88), :is_pluto => true, :pluto_supported_integration_features => supported_integration_features)

const default_stdout_iocontext = IOContext(devnull, :color => false, :limit => true, :displaysize => (18, 75), :is_pluto => false)

const imagemimes = [MIME"image/svg+xml"(), MIME"image/png"(), MIME"image/jpg"(), MIME"image/jpeg"(), MIME"image/bmp"(), MIME"image/gif"()]
# in descending order of coolness
# text/plain always matches - almost always
"""
The MIMEs that Pluto supports, in order of how much I like them.

`text/plain` should always match - the difference between `show(::IO, ::MIME"text/plain", x)` and `show(::IO, x)` is an unsolved mystery.
"""
const allmimes = [MIME"application/vnd.pluto.table+object"(); MIME"application/vnd.pluto.divelement+object"(); MIME"text/html"(); imagemimes; MIME"application/vnd.pluto.tree+object"(); MIME"text/latex"(); MIME"text/plain"()]


"""
Format `val` using the richest possible output, return formatted string and used MIME type.

See [`allmimes`](@ref) for the ordered list of supported MIME types.
"""
function format_output_default(@nospecialize(val), @nospecialize(context=default_iocontext))::MimedOutput
    try
        io_sprinted, (value, mime) = sprint_withreturned(show_richest, val; context=context)
        if value === nothing
            if mime ∈ imagemimes
                (io_sprinted, mime)
            else
                (String(io_sprinted), mime)
            end
        else
            (value, mime)
        end
    catch ex
        title = ErrorException("Failed to show value: \n" * sprint(try_showerror, ex))
        bt = stacktrace(catch_backtrace())
        format_output(CapturedException(title, bt))
    end
end

format_output(@nospecialize(x); context=default_iocontext) = format_output_default(x, context)

format_output(::Nothing; context=default_iocontext) = ("", MIME"text/plain"())

function format_output(val::CapturedException; context=default_iocontext)
    ## We hide the part of the stacktrace that belongs to Pluto's evalling of user code.
    stack = [s for (s, _) in val.processed_bt]

    # function_wrap_index = findfirst(f -> occursin("function_wrapped_cell", String(f.func)), stack)

    function_wrap_index = findlast(f -> occursin("#==#", String(f.file)), stack)

    if function_wrap_index === nothing
        for _ in 1:2
            until = findfirst(b -> b.func == :eval, reverse(stack))
            stack = until === nothing ? stack : stack[1:end - until]
        end
    else
        stack = stack[1:function_wrap_index]
    end

    pretty = map(stack) do s
        Dict(
            :call => pretty_stackcall(s, s.linfo),
            :inlined => s.inlined,
            :file => basename(String(s.file)),
            :path => String(s.file),
            :line => s.line,
        )
    end
    Dict{Symbol,Any}(:msg => sprint(try_showerror, val.ex), :stacktrace => pretty), MIME"application/vnd.pluto.stacktrace+object"()
end

function format_output(binding::Base.Docs.Binding; context=default_iocontext)
    try
        ("""
        <div class="pluto-docs-binding">
        <span>$(binding.var)</span>
        $(repr(MIME"text/html"(), Base.Docs.doc(binding)))
        </div>
        """, MIME"text/html"()) 
    catch e
        @warn "Failed to pretty-print binding" exception=(e, catch_backtrace())
        repr(binding, MIME"text/plain"())
    end
end

# from the Julia source code:
function pretty_stackcall(frame::Base.StackFrame, linfo::Nothing)::String
    if frame.func isa Symbol
        if occursin("function_wrapped_cell", String(frame.func))
            "top-level scope"
        else
            String(frame.func)
        end
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
    buffer = IOBuffer(sizehint=sizehint)
    val = f(IOContext(buffer, context), args...)
    resize!(buffer.data, buffer.size), val
end

"Super important thing don't change."
struct 🥔 end
const struct_showmethod = which(show, (IO, 🥔))
const struct_showmethod_mime = which(show, (IO, MIME"text/plain", 🥔))

function use_tree_viewer_for_struct(@nospecialize(x::T))::Bool where T
    # types that have no specialized show methods (their fallback is text/plain) are displayed using Pluto's interactive tree viewer.
    # this is how we check whether this display method is appropriate:
    isstruct = try
        T isa DataType &&
        # there are two ways to override the plaintext show method:
        which(show, (IO, MIME"text/plain", T)) === struct_showmethod_mime &&
        which(show, (IO, T)) === struct_showmethod
    catch
        false
    end

    isstruct && let
        # from julia source code, dont know why
        nf = nfields(x)
        nb = sizeof(x)
        nf != 0 || nb == 0
    end
end

"""
Like two-argument `Base.show`, except:
1. the richest MIME type available to Pluto will be used
2. the used MIME type is returned as second element
3. if the first returned element is `nothing`, then we wrote our data to `io`. If it is something else (a Dict), then that object will be the cell's output, instead of the buffered io stream. This allows us to output rich objects to the frontend that are not necessarily strings or byte streams
"""
function show_richest(io::IO, @nospecialize(x))::Tuple{<:Any,MIME}
    # ugly code to fix an ugly performance problem
    local mime = nothing
    for m in allmimes
        if pluto_showable(m, x)
            mime = m
            break
        end
    end

    if mime isa MIME"text/plain" && use_tree_viewer_for_struct(x)
        tree_data(x, io), MIME"application/vnd.pluto.tree+object"()
    elseif mime isa MIME"application/vnd.pluto.tree+object"
        tree_data(x, IOContext(io, :compact => true)), mime
    elseif mime isa MIME"application/vnd.pluto.table+object"
        table_data(x, IOContext(io, :compact => true)), mime
    elseif mime isa MIME"application/vnd.pluto.divelement+object"
        tree_data(x, io), mime
    elseif mime ∈ imagemimes
        show(io, mime, x)
        nothing, mime
    elseif mime isa MIME"text/latex"
        # Some reprs include $ at the start and end.
        # We strip those, since Markdown.LaTeX should contain the math content.
        # (It will be rendered by MathJax, which is math-first, not text-first.)
        texed = repr(mime, x)
        Markdown.html(io, Markdown.LaTeX(strip(texed, ('$', '\n', ' '))))
        nothing, MIME"text/html"()
    else
        # the classic:
        show(io, mime, x)
        nothing, mime
    end
end

# we write our own function instead of extending Base.showable with our new MIME because:
# we need the method Base.showable(::MIME"asdfasdf", ::Any) = Tables.rowaccess(x)
# but overload ::MIME{"asdf"}, ::Any will cause ambiguity errors in other packages that write a method like:
# Base.showable(m::MIME, x::Plots.Plot)
# because MIME is less specific than MIME"asdff", but Plots.PLot is more specific than Any.
pluto_showable(m::MIME, @nospecialize(x))::Bool = Base.invokelatest(showable, m, x)

###
# TREE VIEWER
###


# We invent our own MIME _because we can_ but don't use it somewhere else because it might change :)
pluto_showable(::MIME"application/vnd.pluto.tree+object", x::AbstractArray{<:Any,1}) = eltype(eachindex(x)) === Int
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::AbstractSet{<:Any}) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::AbstractDict{<:Any,<:Any}) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Tuple) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::NamedTuple) = true
pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Pair) = true

pluto_showable(::MIME"application/vnd.pluto.tree+object", ::AbstractRange) = false

pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Any) = false


# in the next functions you see a `context` argument
# this is really only used for the circular reference tracking

function tree_data_array_elements(@nospecialize(x::AbstractArray{<:Any,1}), indices::AbstractVector{I}, context::IOContext)::Vector{Tuple{I,Any}} where {I<:Integer}
    Tuple{I,Any}[
        if isassigned(x, i)
            i, format_output_default(x[i], context)
        else
            i, format_output_default(Text(Base.undef_ref_str), context)
        end
        for i in indices
    ] |> collect
end

function array_prefix(@nospecialize(x::Array{<:Any,1}))::String
    string(eltype(x))
end

function array_prefix(@nospecialize(x))::String
    original = sprint(Base.showarg, x, false)
    lstrip(original, ':') * ": "
end

function get_my_display_limit(@nospecialize(x), dim::Integer, depth::Integer, context::IOContext, a::Integer, b::Integer)::Int # needs to be system-dependent Int because it is used as array index
    let
        if depth < 3
            a ÷ (1 + 2 * depth)
        else
            0
        end
    end + let
        d = get(context, :extra_items, nothing)
        if d === nothing
            0
        else
            b * get(d, (objectid(x), dim), 0)
        end
    end
end

function tree_data(@nospecialize(x::AbstractSet{<:Any}), context::IOContext)
    if Base.show_circular(context, x)
        Dict{Symbol,Any}(
            :objectid => string(objectid(x), base=16),
            :type => :circular,
        )
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, Pair{Symbol,Any}(:SHOWN_SET, x), Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

        my_limit = get_my_display_limit(x, 1, depth, context, tree_display_limit, tree_display_limit_increase)

        L = min(my_limit+1, length(x))
        elements = Vector{Any}(undef, L)
        index = 1
        for value in x
            if index <= my_limit
                elements[index] = (index, format_output_default(value, recur_io))
            else
                elements[index] = "more"
                break
            end
            index += 1
        end

        Dict{Symbol,Any}(
            :prefix => string(typeof(x)),
            :prefix_short => string(typeof(x) |> trynameof),
            :objectid => string(objectid(x), base=16),
            :type => :Set,
            :elements => elements
        )
    end
end

function tree_data(@nospecialize(x::AbstractArray{<:Any,1}), context::IOContext)
    if Base.show_circular(context, x)
        Dict{Symbol,Any}(
            :objectid => string(objectid(x), base=16),
            :type => :circular,
        )
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, Pair{Symbol,Any}(:SHOWN_SET, x), Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

        indices = eachindex(x)
        my_limit = get_my_display_limit(x, 1, depth, context, tree_display_limit, tree_display_limit_increase)

        # additional couple of elements so that we don't cut off 1 or 2 itmes - that's silly
        elements = if length(x) <= ((my_limit * 6) ÷ 5)
            tree_data_array_elements(x, indices, recur_io)
        else
            firsti = firstindex(x)
            from_end = my_limit > 20 ? 10 : my_limit > 1 ? 1 : 0
            Any[
                tree_data_array_elements(x, indices[firsti:firsti-1+my_limit-from_end], recur_io)...,
                "more",
                tree_data_array_elements(x, indices[end+1-from_end:end], recur_io)...,
            ]
        end

        prefix = array_prefix(x)
        Dict{Symbol,Any}(
            :prefix => prefix,
            :prefix_short => x isa Vector ? "" : prefix, # if not abstract
            :objectid => string(objectid(x), base=16),
            :type => :Array,
            :elements => elements
        )
    end
end

function tree_data(@nospecialize(x::Tuple), context::IOContext)
    depth = get(context, :tree_viewer_depth, 0)
    recur_io = IOContext(context, Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

    Dict{Symbol,Any}(
        :objectid => string(objectid(x), base=16),
        :type => :Tuple,
        :elements => collect(enumerate(format_output_default.(x, [recur_io]))),
    )
end

function tree_data(@nospecialize(x::AbstractDict{<:Any,<:Any}), context::IOContext)
    if Base.show_circular(context, x)
        Dict{Symbol,Any}(
            :objectid => string(objectid(x), base=16),
            :type => :circular,
        )
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, Pair{Symbol,Any}(:SHOWN_SET, x), Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

        elements = []

        my_limit = get_my_display_limit(x, 1, depth, context, tree_display_limit, tree_display_limit_increase)
        row_index = 1
        for pair in x
            k, v = pair
            if row_index <= my_limit
                push!(elements, (format_output_default(k, recur_io), format_output_default(v, recur_io)))
            else
                push!(elements, "more")
                break
            end
            row_index += 1
        end

        Dict{Symbol,Any}(
            :prefix => string(typeof(x)),
            :prefix_short => string(typeof(x) |> trynameof),
            :objectid => string(objectid(x), base=16),
            :type => :Dict,
            :elements => elements
        )
    end
end

function tree_data_nt_row(pair::Tuple, context::IOContext)
    # this is an entry of a NamedTuple, the first element of the Tuple is a Symbol, which we want to print as `x` instead of `:x`
    k, element = pair
    string(k), format_output_default(element, context)
end


function tree_data(@nospecialize(x::NamedTuple), context::IOContext)
    depth = get(context, :tree_viewer_depth, 0)
    recur_io = IOContext(context, Pair{Symbol,Any}(:tree_viewer_depth, depth + 1))

    Dict{Symbol,Any}(
        :objectid => string(objectid(x), base=16),
        :type => :NamedTuple,
        :elements => tree_data_nt_row.(zip(eachindex(x), x), (recur_io,))
    )
end

function tree_data(@nospecialize(x::Pair), context::IOContext)
    k, v = x
    Dict{Symbol,Any}(
        :objectid => string(objectid(x), base=16),
        :type => :Pair,
        :key_value => (format_output_default(k, context), format_output_default(v, context)),
    )
end

# Based on Julia source code but without writing to IO
function tree_data(@nospecialize(x::Any), context::IOContext)
    if Base.show_circular(context, x)
        Dict{Symbol,Any}(
            :objectid => string(objectid(x), base=16),
            :type => :circular,
        )
    else
        depth = get(context, :tree_viewer_depth, 0)
        recur_io = IOContext(context, 
            Pair{Symbol,Any}(:SHOWN_SET, x),
            Pair{Symbol,Any}(:typeinfo, Any),
            Pair{Symbol,Any}(:tree_viewer_depth, depth + 1),
            )

        t = typeof(x)
        nf = nfields(x)
        nb = sizeof(x)
        
        elements = Any[
            let
                f = fieldname(t, i)
                if !isdefined(x, f)
                    Base.undef_ref_str
                    f, format_output_default(Text(Base.undef_ref_str), recur_io)
                else
                    f, format_output_default(getfield(x, i), recur_io)
                end
            end
            for i in 1:nf
        ]

        Dict{Symbol,Any}(
            :prefix => repr(t; context=context),
            :prefix_short => string(t |> trynameof),
            :objectid => string(objectid(x), base=16),
            :type => :struct,
            :elements => elements,
        )
    end

end

function trynameof(::Type{Union{T,Missing}}) where T
    name = trynameof(T)
    return name === Symbol() ? name : Symbol(name, "?")
end
trynameof(x::DataType) = nameof(x)
trynameof(x::Any) = Symbol()









###
# TABLE VIEWER
##

Base.@kwdef struct Integration
    id::Base.PkgId
    code::Expr
    loaded::Ref{Bool}=Ref(false)
end

# We have a super cool viewer for objects that are a Tables.jl table. To avoid version conflicts, we only load this code after the user (indirectly) loaded the package Tables.jl.
# This is similar to how Requires.jl works, except we don't use a callback, we just check every time.
const integrations = Integration[
    Integration(
        id = Base.PkgId(Base.UUID(reinterpret(UInt128, codeunits("Paul Berg Berlin")) |> first), "AbstractPlutoDingetjes"),
        code = quote
            @assert v"1.0.0" <= AbstractPlutoDingetjes.MY_VERSION < v"2.0.0"
            initial_value_getter_ref[] = AbstractPlutoDingetjes.Bonds.initial_value
            transform_value_ref[] = AbstractPlutoDingetjes.Bonds.transform_value
            possible_bond_values_ref[] = AbstractPlutoDingetjes.Bonds.possible_values

            push!(supported_integration_features,
                AbstractPlutoDingetjes,
                AbstractPlutoDingetjes.Bonds,
                AbstractPlutoDingetjes.Bonds.initial_value,
                AbstractPlutoDingetjes.Bonds.transform_value,
                AbstractPlutoDingetjes.Bonds.possible_values,
            )
        end,
    ),
    Integration(
        id = Base.PkgId(UUID("0c5d862f-8b57-4792-8d23-62f2024744c7"), "Symbolics"),
        code = quote
            pluto_showable(::MIME"application/vnd.pluto.tree+object", ::Symbolics.Arr) = false
        end,
    ),
    Integration(
        id = Base.PkgId(UUID("bd369af6-aec1-5ad0-b16a-f7cc5008161c"), "Tables"),
        code = quote
            function maptruncated(f::Function, xs, filler, limit; truncate=true)
                if truncate
                    result = Any[
                        # not xs[1:limit] because of https://github.com/JuliaLang/julia/issues/38364
                        f(xs[i]) for i in Iterators.take(eachindex(xs), limit)
                    ]
                    push!(result, filler)
                    result
                else
                    Any[f(x) for x in xs]
                end
            end

            function table_data(x::Any, io::IOContext)
                rows = Tables.rows(x)

                my_row_limit = get_my_display_limit(x, 1, 0, io, table_row_display_limit, table_row_display_limit_increase)

                # TODO: the commented line adds support for lazy loading columns, but it uses the same extra_items counter as the rows. So clicking More Rows will also give more columns, and vice versa, which isn't ideal. To fix, maybe use (objectid,dimension) as index instead of (objectid)?

                my_column_limit = get_my_display_limit(x, 2, 0, io, table_column_display_limit, table_column_display_limit_increase)
                # my_column_limit = table_column_display_limit

                # additional 5 so that we don't cut off 1 or 2 itmes - that's silly
                truncate_rows = my_row_limit + 5 < length(rows)
                truncate_columns = if isempty(rows)
                    false
                else
                    my_column_limit + 5 < length(first(rows))
                end

                row_data_for(row) = maptruncated(row, "more", my_column_limit; truncate=truncate_columns) do el
                    format_output_default(el, io)
                end

                # ugliest code in Pluto:

                # not a map(row) because it needs to be a Vector
                # not enumerate(rows) because of some silliness
                # not rows[i] because `getindex` is not guaranteed to exist
                L = truncate_rows ? my_row_limit : length(rows)
                row_data = Array{Any,1}(undef, L)
                for (i, row) in zip(1:L,rows)
                    row_data[i] = (i, row_data_for(row))
                end

                if truncate_rows
                    push!(row_data, "more")
                    if applicable(lastindex, rows)
                        push!(row_data, (length(rows), row_data_for(last(rows))))
                    end
                end
                
                # TODO: render entire schema by default?

                schema = Tables.schema(rows)
                schema_data = schema === nothing ? nothing : Dict{Symbol,Any}(
                    :names => maptruncated(string, schema.names, "more", my_column_limit; truncate=truncate_columns),
                    :types => String.(maptruncated(trynameof, schema.types, "more", my_column_limit; truncate=truncate_columns)),
                )

                Dict{Symbol,Any}(
                    :objectid => string(objectid(x), base=16),
                    :schema => schema_data,
                    :rows => row_data,
                )
            end


            pluto_showable(::MIME"application/vnd.pluto.table+object", x::Any) = try Tables.rowaccess(x)::Bool catch; false end
            pluto_showable(::MIME"application/vnd.pluto.table+object", t::Type) = false
            pluto_showable(::MIME"application/vnd.pluto.table+object", t::AbstractVector{<:NamedTuple}) = false
            pluto_showable(::MIME"application/vnd.pluto.table+object", t::AbstractVector{<:Dict{Symbol,<:Any}}) = false
            pluto_showable(::MIME"application/vnd.pluto.table+object", t::AbstractArray{Union{}, 1}) = false

        end,
    ),
    Integration(
        id = Base.PkgId(UUID("91a5bcdd-55d7-5caf-9e0b-520d859cae80"), "Plots"),
        code = quote
            approx_size(p::Plots.Plot) = try
                sum(p.series_list; init=0) do series
                    length(series[:y])
                end
            catch e
                @warn "Failed to guesstimate plot size" exception=(e,catch_backtrace())
                0
            end
            const max_plot_size = 8000
            pluto_showable(::MIME"image/svg+xml", p::Plots.Plot{Plots.GRBackend}) = approx_size(p) <= max_plot_size
            pluto_showable(::MIME"text/html", p::Plots.Plot{Plots.GRBackend}) = false
        end,
    )
]

function load_integration_if_needed(integration::Integration)
    if !integration.loaded[] && haskey(Base.loaded_modules, integration.id)
        load_integration(integration)
    end
end

load_integrations_if_needed() = load_integration_if_needed.(integrations)

function load_integration(integration::Integration)
    integration.loaded[] = true
    try
        eval(quote
            const $(Symbol(integration.id.name)) = Base.loaded_modules[$(integration.id)]
            $(integration.code)
        end)
        true
    catch e
        @error "Failed to load integration with $(integration.id.name).jl" exception=(e, catch_backtrace())
        false
    end
end


###
# REPL THINGS
###

function basic_completion_priority((s, description, exported, from_notebook))
	c = first(s)
	if islowercase(c)
		1 - 10exported
	elseif isuppercase(c)
		2 - 10exported
	else
		3 - 10exported
	end
end

completed_object_description(x::Function) = "Function"
completed_object_description(x::Number) = "Number"
completed_object_description(x::AbstractString) = "String"
completed_object_description(x::Module) = "Module"
completed_object_description(x::AbstractArray) = "Array"
completed_object_description(x::Any) = "Any"

completion_description(c::ModuleCompletion) = try
    completed_object_description(getfield(c.parent, Symbol(c.mod)))
catch
    nothing
end
completion_description(::Completion) = nothing

function is_pluto_workspace(m::Module)
    mod_name = nameof(m) |> string
    startswith(mod_name, "workspace#")
end

function completions_exported(cs::Vector{<:Completion})
    completed_modules = (c.parent for c in cs if c isa ModuleCompletion)
    completed_modules_exports = Dict(m => string.(names(m, all=is_pluto_workspace(m), imported=true)) for m in completed_modules)

    map(cs) do c
        if c isa ModuleCompletion
            c.mod ∈ completed_modules_exports[c.parent]
        else
            true
        end
    end
end

completion_from_notebook(c::ModuleCompletion) = is_pluto_workspace(c.parent) && c.mod != "include" && c.mod != "eval"
completion_from_notebook(c::Completion) = false

only_special_completion_types(c::PathCompletion) = :path
only_special_completion_types(c::DictCompletion) = :dict
only_special_completion_types(c::Completion) = nothing

"You say Linear, I say Algebra!"
function completion_fetcher(query, pos, workspace::Module)
    results, loc, found = completions(query, pos, workspace)
    if endswith(query, '.')
        filter!(is_dot_completion, results)
        # we are autocompleting a module, and we want to see its fields alphabetically
        sort!(results; by=(r -> completion_text(r)))
    elseif endswith(query, '/')
        filter!(is_path_completion, results)
        sort!(results; by=(r -> completion_text(r)))
    elseif endswith(query, '[')
        filter!(is_dict_completion, results)
        sort!(results; by=(r -> completion_text(r)))
    else
        isenough(x) = x ≥ 0
        filter!(isenough ∘ score, results) # too many candiates otherwise
    end

    texts = completion_text.(results)
    descriptions = completion_description.(results)
    exported = completions_exported(results)
    from_notebook = completion_from_notebook.(results)
    completion_type = only_special_completion_types.(results)

    smooshed_together = collect(zip(texts, descriptions, exported, from_notebook, completion_type))

    p = if endswith(query, '.')
        sortperm(smooshed_together; alg=MergeSort, by=basic_completion_priority)
    else
        # we give 3 extra score points to exported fields
        scores = score.(results)
        sortperm(scores .+ 3.0 * exported; alg=MergeSort, rev=true)
    end

    final = smooshed_together[p]
    (final, loc, found)
end

is_dot_completion(::Union{ModuleCompletion,PropertyCompletion,FieldCompletion}) = true
is_dot_completion(::Completion)                                                 = false

is_path_completion(::Union{PathCompletion}) = true
is_path_completion(::Completion)            = false

is_dict_completion(::Union{DictCompletion}) = true
is_dict_completion(::Completion)            = false


"""
    is_pure_expression(expression::ReturnValue{Meta.parse})
Checks if an expression is approximately pure.
Not sure if the type signature conveys it, but this take anything that is returned from `Meta.parse`.
It obviously does not actually check if something is strictly pure, as `getproperty()` could be extended,
and suddenly there can be side effects everywhere. This is just an approximation.
"""
function is_pure_expression(expr::Expr)
    if expr.head == :. || expr.head === :curly || expr.head === :ref
        all((is_pure_expression(x) for x in expr.args))
    else
        false
    end
end
is_pure_expression(s::Symbol) = true
is_pure_expression(q::QuoteNode) = true
is_pure_expression(q::Number) = true
is_pure_expression(q::String) = true
is_pure_expression(x) = false # Better safe than sorry I guess

# Based on /base/docs/bindings.jl from Julia source code
function binding_from(x::Expr, workspace::Module)
    if x.head == :macrocall
        macro_name = x.args[1]
        if is_pure_expression(macro_name)
            Core.eval(workspace, macro_name)
        else
            error("Couldn't infer `$x` for Live Docs.")
        end
    elseif is_pure_expression(x)
        if x.head == :.
            # Simply calling Core.eval on `a.b` will retrieve the value instead of the binding
            m = Core.eval(workspace, x.args[1])
            isa(m, Module) && return Docs.Binding(m, x.args[2].value)
        end
        Core.eval(workspace, x)
    else
        error("Couldn't infer `$x` for Live Docs.")
    end
end
binding_from(s::Symbol, workspace::Module) = Docs.Binding(workspace, s)
binding_from(r::GlobalRef, workspace::Module) = Docs.Binding(r.mod, r.name)
binding_from(other, workspace::Module) = error("Invalid @var syntax `$other`.")

"You say doc_fetcher, I say You say doc_fetcher, I say You say doc_fetcher, I say You say doc_fetcher, I say ...!!!!"
function doc_fetcher(query, workspace::Module)
    try
        value = binding_from(Meta.parse(query), workspace)
        doc_md = Docs.doc(value)

        if !showable(MIME("text/html"), doc_md)
            # PyPlot returns `Text{String}` objects from their docs...
            # which is a bit silly, but turns out it actuall is markdown if you look hard enough.
            doc_md = Markdown.parse(repr(doc_md))
        end
        
        (repr(MIME("text/html"), doc_md), :👍)
    catch ex
        (nothing, :👎)
    end
end


















###
# BONDS
###

const registered_bond_elements = Dict{Symbol, Any}()

function transform_bond_value(s::Symbol, value_from_js)
    element = get(registered_bond_elements, s, nothing)
    return try
        transform_value_ref[](element, value_from_js)
    catch e
        @error "AbstractPlutoDingetjes: Bond value transformation errored." exception=(e, catch_backtrace())
        (Text("❌ AbstractPlutoDingetjes: Bond value transformation errored."), e, stacktrace(catch_backtrace()), value_from_js)
    end
end

function possible_bond_values(s::Symbol; get_length::Bool=false)
    element = registered_bond_elements[s]
    possible_values = possible_bond_values_ref[](element)

    if possible_values === :NotGiven
        # Short-circuit to avoid the checks below, which only work if AbstractPlutoDingetjes is loaded.
        :NotGiven
    elseif possible_values isa AbstractPlutoDingetjes.Bonds.InfinitePossibilities
        # error("Bond \"$s\" has an unlimited number of possible values, try changing the `@bind` to something with a finite number of possible values like `PlutoUI.CheckBox(...)` or `PlutoUI.Slider(...)` instead.")
        :InfinitePossibilities
    elseif (possible_values isa AbstractPlutoDingetjes.Bonds.NotGiven)
        # error("Bond \"$s\" did not specify its possible values with `AbstractPlutoDingetjes.Bond.possible_values()`. Try using PlutoUI for the `@bind` values.")
        
        # If you change this, change it everywhere in this file.
        :NotGiven
    else
        get_length ? 
            try
                length(possible_values)
            catch
                length(make_distributed_serializable(possible_values))
            end : 
            make_distributed_serializable(possible_values)
    end
end

make_distributed_serializable(x::Any) = x
make_distributed_serializable(x::Union{AbstractVector,AbstractSet,Base.Generator}) = collect(x)
make_distributed_serializable(x::Union{Vector,Set,OrdinalRange}) = x


"""
_“The name is Bond, James Bond.”_

Wraps around an `element` and not much else. When you `show` a `Bond` with the `text/html` MIME type, you will get:

```html
<bond def="\$(bond.defines)">
\$(repr(MIME"text/html"(), bond.element))
</bond>
```

For example, `Bond(html"<input type=range>", :x)` becomes:

```html
<bond def="x">
<input type=range>
</bond>
```

The actual reactive-interactive functionality is not done in Julia - it is handled by the Pluto front-end (JavaScript), which searches cell output for `<bond>` elements, and attaches event listeners to them. Put on your slippers and have a look at the JS code to learn more.
"""
struct Bond
    element::Any
    defines::Symbol
    unique_id::String
    Bond(element, defines::Symbol) = showable(MIME"text/html"(), element) ? new(element, defines, Base64.base64encode(rand(UInt8,9))) : error("""Can only bind to html-showable objects, ie types T for which show(io, ::MIME"text/html", x::T) is defined.""")
end

function create_bond(element, defines::Symbol)
    push!(cell_registered_bond_names[currently_running_cell_id[]], defines)
    registered_bond_elements[defines] = element
    Bond(element, defines)
end

function Base.show(io::IO, m::MIME"text/html", bond::Bond)
    withtag(io, :bond, :def => bond.defines, :unique_id => bond.unique_id) do
        show(io, m, bond.element)
    end
end

const initial_value_getter_ref = Ref{Function}(element -> missing)
const transform_value_ref = Ref{Function}((element, x) -> x)
const possible_bond_values_ref = Ref{Function}((_args...; _kwargs...) -> :NotGiven)

"""
```julia
@bind symbol element
```

Return the HTML `element`, and use its latest JavaScript value as the definition of `symbol`.

# Example

```julia
@bind x html"<input type=range>"
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
            $(load_integrations_if_needed)()
			local el = $(esc(element))
            global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : $(initial_value_getter_ref)[](el)
			PlutoRunner.create_bond(el, $(Meta.quot(def)))
		end
	else
		:(throw(ArgumentError("""\nMacro example usage: \n\n\t@bind my_number html"<input type='range'>"\n\n""")))
	end
end

"""
Will be inserted in saved notebooks that use the @bind macro, make sure that they still contain legal syntax when executed as a vanilla Julia script. Overloading `Base.get` for custom UI objects gives bound variables a sensible value.
"""
const fake_bind = """macro bind(def, element)
    quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = \$(esc(element))
        global \$(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
end"""














###
# PUBLISHED OBJECTS
###

"""
**(Internal API.)** A `Ref` containing the id of the cell that is currently **running** or **displaying**.
"""
const currently_running_cell_id = Ref{UUID}(uuid4())

function _publish(x, id_start)::String
    assertpackable(x)
    
    id = string(notebook_id[], "/", currently_running_cell_id[], "/", id_start)
    d = get!(Dict{String,Any}, cell_published_objects, currently_running_cell_id[])
    d[id] = x
    return id
end

_publish(x) = _publish(x, string(objectid(x), base=16))

# TODO? Possibly move this to it's own package, with fallback that actually msgpack?
# ..... Ideally we'd make this require `await` on the javascript side too...
Base.@kwdef struct PublishedToJavascript
    published_id
    cell_id
end
function Base.show(io::IO, ::MIME"text/javascript", published::PublishedToJavascript)
    if published.cell_id != currently_running_cell_id[]
        error("Showing result from PlutoRunner.publish_to_js() in a cell different from where it was created, not (yet?) supported.")
    end
    write(io, "/* See the documentation for PlutoRunner.publish_to_js */ getPublishedObject(\"$(published.published_id)\")")
end
Base.show(io::IO, ::MIME"text/plain", published::PublishedToJavascript) = show(io, MIME("text/javascript"), published)    
Base.show(io::IO, published::PublishedToJavascript) = show(io, MIME("text/javascript"), published)    

"""
    publish_to_js(x)

Make the object `x` available to the JS runtime of this cell. The returned string is a JS command that, when executed in this cell's output, gives the object.

!!! warning

    This function is not yet public API, it will become public in the next weeks. Only use for experiments.

# Example
```julia
let
    x = Dict(
        "data" => rand(Float64, 20),
        "name" => "juliette",
    )

    HTML("\""
    <script>
    // we interpolate into JavaScript:
    const x = \$(PlutoRunner.publish_to_js(x))

    console.log(x.name, x.data)
    </script>
    "\"")
end
```
"""
function publish_to_js(args...)
    PublishedToJavascript(
        published_id=_publish(args...),
        cell_id=currently_running_cell_id[],
    )
end

const Packable = Union{Nothing,Missing,String,Symbol,Int64,Int32,Int16,Int8,UInt64,UInt32,UInt16,UInt8,Float32,Float64,Bool,MIME,UUID,DateTime}
assertpackable(::Packable) = true
assertpackable(t::Any) = throw(ArgumentError("Only simple objects can be shared with JS, like vectors and dictionaries. $(string(typeof(t))) is not compatible."))
assertpackable(::Vector{<:Packable}) = true
assertpackable(::Dict{<:Packable,<:Packable}) = true
assertpackable(x::Vector) = foreach(assertpackable, x)
assertpackable(d::Dict) = let
    foreach(assertpackable, keys(d))
    foreach(assertpackable, values(d))
end
assertpackable(t::Tuple) = foreach(assertpackable, t)
assertpackable(t::NamedTuple) = foreach(assertpackable, t)

const _EmbeddableDisplay_enable_html_shortcut = Ref{Bool}(true)

struct EmbeddableDisplay
    x
    script_id::String
end

function Base.show(io::IO, m::MIME"text/html", e::EmbeddableDisplay)
    body, mime = format_output_default(e.x, io)
	
    to_write = if mime === m && _EmbeddableDisplay_enable_html_shortcut[]
        # In this case, we can just embed the HTML content directly.
        body
    else
        s = """<pluto-display></pluto-display><script id=$(e.script_id)>

        // see https://plutocon2021-demos.netlify.app/fonsp%20%E2%80%94%20javascript%20inside%20pluto to learn about the techniques used in this script
        
        const body = $(publish_to_js(body, e.script_id));
        const mime = "$(string(mime))";
        
        const create_new = this == null || this._mime !== mime;
        
        const display = create_new ? currentScript.previousElementSibling : this;
        
        display.persist_js_state = true;
        display.body = body;
        if(create_new) {
            // only set the mime if necessary, it triggers a second preact update
            display.mime = mime;
            // add it also as unwatched property to prevent interference from Preact
            display._mime = mime;
        }
        return display;

        </script>"""
        
        replace(replace(s, r"//.+" => ""), "\n" => "")
    end
    write(io, to_write)
end

export embed_display

"""
    embed_display(x)

A wrapper around any object that will display it using Pluto's interactive multimedia viewer (images, arrays, tables, etc.), the same system used to display cell output. The returned object can be **embedded in HTML output** (we recommend [HypertextLiteral.jl](https://github.com/MechanicalRabbit/HypertextLiteral.jl) or [HyperScript.jl](https://github.com/yurivish/Hyperscript.jl)), which means that you can use it to create things like _"table viewer left, plot right"_. 

# Example

Markdown can interpolate HTML-showable objects, including the embedded display:

```julia
md"\""
# Cool data

\$(embed_display(rand(10)))

Wow!
"\""
```

You can use HTML templating packages to create cool layouts, like two arrays side-by-side:

```julia
using HypertextLiteral
```

```julia
@htl("\""

<div style="display: flex;">
\$(embed_display(rand(4)))
\$(embed_display(rand(4)))
</div>

"\"")
```

"""
embed_display(x) = EmbeddableDisplay(x, rand('a':'z',16) |> join)

# if an embedded display is being rendered _directly by Pluto's viewer_, then rendered the embedded object directly. When interpolating an embedded display into HTML, the user code will render the embedded display to HTML using the HTML show method above, and this shortcut is not called.
# We add this short-circuit to increase performance for UI that uses an embedded display when it is not necessary.
format_output_default(@nospecialize(val::EmbeddableDisplay), @nospecialize(context=default_iocontext)) = format_output_default(val.x, context)

###
# EMBEDDED CELL OUTPUT
###

Base.@kwdef struct DivElement
    children::Vector
    style::String=""
    class::Union{String,Nothing}=nothing
end

tree_data(@nospecialize(e::DivElement), context::IOContext) = Dict{Symbol, Any}(
    :style => e.style, 
    :classname => e.class, 
    :children => Any[
        format_output_default(value, context) for value in e.children
    ],
)
pluto_showable(::MIME"application/vnd.pluto.divelement+object", ::DivElement) = true

function Base.show(io::IO, m::MIME"text/html", e::DivElement)
    Base.show(io, m, embed_display(e))
end

###
# LOGGING
###

const original_stdout = stdout
const original_stderr = stderr


const log_channel = Channel{Any}(10)
const old_logger = Ref{Any}(nothing)

struct PlutoLogger <: Logging.AbstractLogger
    stream
end

function Logging.shouldlog(::PlutoLogger, level, _module, _...)
    # Accept logs
    # - From the user's workspace module
    # - Info level and above for other modules
    # - LogLevel(-1) because that's what ProgressLogging.jl uses for its messages
    level = convert(Logging.LogLevel, level)
    (_module isa Module && is_pluto_workspace(_module)) ||
        level >= Logging.Info ||
        level == Logging.LogLevel(-1) ||
        level == stdout_log_level
end

Logging.min_enabled_level(::PlutoLogger) = min(Logging.Debug, stdout_log_level)
Logging.catch_exceptions(::PlutoLogger) = false
function Logging.handle_message(::PlutoLogger, level, msg, _module, group, id, file, line; kwargs...)
    # println("receiving msg from ", _module, " ", group, " ", id, " ", msg, " ", level, " ", line, " ", file)
    # println("with types: ", "_module: ", typeof(_module), ", ", "msg: ", typeof(msg), ", ", "group: ", typeof(group), ", ", "id: ", typeof(id), ", ", "file: ", typeof(file), ", ", "line: ", typeof(line), ", ", "kwargs: ", typeof(kwargs)) # thanks Copilot

    try
        
        yield()
        
        put!(log_channel, Dict{String,Any}(
            "level" => string(level),
            "msg" => format_output_default(msg isa String ? Text(msg) : msg),
            "group" => string(group),
            "id" => string(id),
            "file" => string(file),
            "cell_id" => currently_running_cell_id[],
            "line" => line isa Union{Int32,Int64} ? line : nothing,
            "kwargs" => Tuple{String,Any}[(string(k), format_log_value(v)) for (k, v) in kwargs],
            )
        )
        
        yield()
        
        # Also print to console (disabled)
        # Logging.handle_message(old_logger[], level, msg, _module, group, id, file, line; kwargs...)
    catch e
        println(original_stderr, "Failed to relay log from PlutoRunner")
        showerror(original_stderr, e, stacktrace(catch_backtrace()))
    end
end

format_log_value(v) = format_output_default(v)
format_log_value(v::Tuple{<:Exception,Vector{<:Any}}) = format_output(CapturedException(v...))

const stdout_log_level = Logging.LogLevel(-555) # https://en.wikipedia.org/wiki/555_timer_IC
function with_io_to_logs(f::Function; enabled::Bool=true, loglevel::Logging.LogLevel=Logging.LogLevel(1))
    if !enabled
        return f()
    end
    # Taken from https://github.com/JuliaDocs/IOCapture.jl/blob/master/src/IOCapture.jl with some modifications to make it log.
    
    # Original implementation from Documenter.jl (MIT license)
    # Save the default output streams.
    default_stdout = stdout
    default_stderr = stderr

    # Redirect both the `stdout` and `stderr` streams to a single `Pipe` object.
    pipe = Pipe()
    Base.link_pipe!(pipe; reader_supports_async = true, writer_supports_async = true)
    pe_stdout = IOContext(pipe.in, default_stdout_iocontext)
    pe_stderr = IOContext(pipe.in, default_stdout_iocontext)
    redirect_stdout(pe_stdout)
    redirect_stderr(pe_stderr)

    # Bytes written to the `pipe` are captured in `output` and eventually converted to a
    # `String`. We need to use an asynchronous task to continously tranfer bytes from the
    # pipe to `output` in order to avoid the buffer filling up and stalling write() calls in
    # user code.
    output = IOBuffer()
    buffer_redirect_task = @async write(output, pipe)

    # To make the `display` function work.
    redirect_display = TextDisplay(pe_stdout)
    pushdisplay(redirect_display)

    # Run the function `f`, capturing all output that it might have generated.
    # Success signals whether the function `f` did or did not throw an exception.
    result = try
        f()
    finally
        # Restore display
        try
            popdisplay(redirect_display)
        catch e
            # This happens when the user calls `popdisplay()`, fine.
            # @warn "Pluto's display was already removed?" e
        end
        # Restore the original output streams.
        redirect_stdout(default_stdout)
        redirect_stderr(default_stderr)
        close(pe_stdout)
        close(pe_stderr)
        wait(buffer_redirect_task)
    end


    output = String(take!(output))
    if !isempty(output)
        Logging.@logmsg loglevel output
    end

    result
end

# we put this in __init__ to fix a world age problem
function __init__()
    if !isdefined(Main, Symbol("##Pluto_logger_switched")) && Distributed.myid() != 1
        old_logger[] = Logging.global_logger()
        Logging.global_logger(PlutoLogger(nothing))
        Core.eval(Main, Expr(:(=), Symbol("##Pluto_logger_switched"), true)) # if Pluto is loaded again on the same process, prevent it from also setting the logger
    end
end

end
