function set_bond_values_reactive(; 
    session::ServerSession, notebook::Notebook, 
    bound_sym_names::AbstractVector{Symbol}, 
    is_first_values::AbstractVector{Bool}=[false for x in bound_sym_names], 
    initiator=nothing,
    kwargs...
)::Union{Task,TopologicalOrder}
    # filter out the bonds that don't need to be set
    to_set = filter(zip(bound_sym_names, is_first_values) |> collect) do (bound_sym, is_first_value)
        new_value = notebook.bonds[bound_sym].value

        variable_exists = is_assigned_anywhere(notebook, notebook.topology, bound_sym)
        if !variable_exists
            # a bond was set while the cell is in limbo state
            # we don't need to do anything
            return false
        end

        # TODO: Not checking for any dependents now
        # any_dependents = is_referenced_anywhere(notebook, notebook.topology, bound_sym)

        # fix for https://github.com/fonsp/Pluto.jl/issues/275
        # if `Base.get` was defined to give an initial value (read more about this in the Interactivity sample notebook), then we want to skip the first value sent back from the bond. (if `Base.get` was not defined, then the variable has value `missing`)
        # Check if the variable does not already have that value.
        # because if the initial value is already set, then we don't want to run dependent cells again.
        eq_tester = :(try !ismissing($bound_sym) && ($bound_sym == Main.PlutoRunner.transform_bond_value($(QuoteNode(bound_sym)), $(new_value))) === true catch; false end) # not just a === comparison because JS might send back the same value but with a different type (Float64 becomes Int64 in JS when it's an integer. The `=== true` check handles cases like `[missing] == [123]`, which returns `missing`, not `true` or `false`.)
        if is_first_value && will_run_code(notebook) && WorkspaceManager.eval_fetch_in_workspace((session, notebook), eq_tester)
            return false
        end
        return true
    end .|> first

    if isempty(to_set) || !will_run_code(notebook)
        send_notebook_changes!(ClientRequest(; session, notebook, initiator))
        return TopologicalOrder(notebook.topology, Cell[], Dict{Cell, ReactivityError}())
    end

    new_values = [notebook.bonds[bound_sym].value for bound_sym in to_set]
    externally_updated_variables = Dict{Symbol, Any}(zip(syms_to_set, new_values))
    
    function custom_deletion_hook((session, notebook)::Tuple{ServerSession,Notebook}, old_workspace_name, new_workspace_name, to_delete_vars::Set{Symbol}, methods_to_delete::Set{Tuple{UUID,FunctionName}}, to_reimport::Set{Expr}, invalidated_cell_uuids::Set{UUID}; to_run::AbstractVector{Cell})
        to_delete_vars = Set([to_delete_vars..., to_set...]) # also delete the bound symbols
        WorkspaceManager.move_vars((session, notebook), old_workspace_name, new_workspace_name, to_delete_vars, methods_to_delete, to_reimport, invalidated_cell_uuids)
        update_variables_in_notebook!(session, notebook, zip(to_set, new_values))
    end
    to_reeval = where_referenced(notebook, notebook.topology, Set{Symbol}(to_set))

    run_reactive_async!(session, notebook, to_reeval; deletion_hook=custom_deletion_hook, user_requested_run=false, run_async=false, externally_updated_variables, kwargs...)
end

"""
Returns the set of all possible values for the binded variable `n` as returned by the widget implementation using `AbstractPlutoDingetjes.possible_bond_values(element)`. This API is meant to be used by PlutoSliderServer.
"""
possible_bond_values(session::ServerSession, notebook::Notebook, name::Symbol) = WorkspaceManager.possible_bond_values((session,notebook), name)


"""
Optimized version of `length ∘ possible_bond_values`.
"""
possible_bond_values_length(session::ServerSession, notebook::Notebook, name::Symbol) = WorkspaceManager.possible_bond_values((session,notebook), name; get_length=true)

