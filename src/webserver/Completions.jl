import REPL.REPLCompletions: completions, complete_path, completion_text
import Distributed

responses[:completepath] = (body, notebook=nothing; initiator::Union{Initiator, Missing}=missing) -> begin
    query = body["query"]
    pos = lastindex(query)

    results, loc, found = complete_path(query, pos)

    start_utf8 = loc.start
    stop_utf8 = nextind(query, loc.stop) # advance one unicode char, js uses exclusive upper bound

    msg = UpdateMessage(:completion_result, 
        Dict(
            :start => start_utf8 - 1, # 1-based index (julia) to 0-based index (js)
            :stop => stop_utf8 - 1, # idem
            :results => completion_text.(results)
            ), notebook, nothing, initiator)

    putclientupdates!(initiator, msg)
end

function completion_fetcher(query, pos, mod)
    :(let 
        results, loc, found = completions($query, $pos, $mod)
        (completion_text.(results), loc, found)
    end)
end

responses[:complete] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    query = body["query"]
    pos = lastindex(query) # the query is cut at the cursor position by the front-end, so the cursor position is just the last legal index

    workspace = WorkspaceManager.get_workspace(notebook)

    results_text, loc, found = if workspace isa WorkspaceManager.ModuleWorkspace
        eval(completion_fetcher(query, pos, workspace.workspace_module))
    elseif workspace isa WorkspaceManager.ProcessWorkspace
        if isready(workspace.dowork_token)
            # we don't use eval_fetch_in_workspace because we don't want the output to be string-formatted.
            # This works in this particular case, because the return object, a `Completion`, exists in this scope too.
            Distributed.remotecall_eval(Main, workspace.workspace_pid, completion_fetcher(query, pos, Main))
        else
            # We can at least autocomplete general julia things:
            eval(completion_fetcher(query, pos, Main))
        end
    end

    start_utf8 = loc.start
    stop_utf8 = nextind(query, pos) # advance one unicode char, js uses exclusive upper bound

    msg = UpdateMessage(:completion_result, 
        Dict(
            :start => start_utf8 - 1, # 1-based index (julia) to 0-based index (js)
            :stop => stop_utf8 - 1, # idem
            :results => results_text
            ), notebook, nothing, initiator)

    putclientupdates!(initiator, msg)
end