import REPL.REPLCompletions: completions, complete_path, completion_text
import Distributed

responses[:completepath] = (body, notebook=nothing; initiator::Union{Initiator, Missing}=missing) -> begin
    path = body["query"]
    pos = lastindex(path)

    results, loc, found = complete_path(path, pos)

    start_utf8 = let
        # REPLCompletions takes into account that spaces need to be prefixed with `\` in the shell, so it subtracts the number of spaces in the filename from `start`:
        # https://github.com/JuliaLang/julia/blob/c54f80c785a3107ae411267427bbca05f5362b0b/stdlib/REPL/src/REPLCompletions.jl#L270

        # we don't use prefixes, so we need to reverse this.

        # this is from the Julia source code:
        # https://github.com/JuliaLang/julia/blob/c54f80c785a3107ae411267427bbca05f5362b0b/stdlib/REPL/src/REPLCompletions.jl#L195-L204
        if Base.Sys.isunix() && occursin(r"^~(?:/|$)", path)
            # if the path is just "~", don't consider the expanded username as a prefix
            if path == "~"
                dir, prefix = homedir(), ""
            else
                dir, prefix = splitdir(homedir() * path[2:end])
            end
        else
            dir, prefix = splitdir(path)
        end

        loc.start + count(isequal(' '), prefix)
    end
    stop_utf8 = nextind(path, pos) # advance one unicode char, js uses exclusive upper bound

    msg = UpdateMessage(:completion_result, 
        Dict(
            :start => start_utf8 - 1, # 1-based index (julia) to 0-based index (js)
            :stop => stop_utf8 - 1, # idem
            :results => map(r -> replace(completion_text(r), "\\ " => " "), results)
            ), notebook, nothing, initiator)

    putclientupdates!(initiator, msg)
end

function completion_fetcher(query, pos, module_name)
    quote
        let
            mod = Core.eval(Main, $(module_name |> QuoteNode))
            results, loc, found = completions($query, $pos, mod)
            (completion_text.(results), loc, found)
        end
    end
end

responses[:complete] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    query = body["query"]
    pos = lastindex(query) # the query is cut at the cursor position by the front-end, so the cursor position is just the last legal index

    workspace = WorkspaceManager.get_workspace(notebook)

    results_text, loc, found = if isready(workspace.dowork_token)
        # we don't use eval_fetch_in_workspace because we don't want the output to be string-formatted.
        # This works in this particular case, because the return object, a `Completion`, exists in this scope too.
        Distributed.remotecall_eval(Main, workspace.workspace_pid, completion_fetcher(query, pos, workspace.module_name))
    else
        # We can at least autocomplete general julia things:
        eval(completion_fetcher(query, pos, :Main))
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