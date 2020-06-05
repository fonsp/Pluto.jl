import REPL.REPLCompletions: completions, complete_path, completion_text
import Distributed
using Markdown

function format_path_completion(completion)
    replace(replace(completion_text(completion), "\\ " => " "), "\\\\" => "\\")
end

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
            :results => sort(format_path_completion.(results), by=s -> (!isdirpath(s), s))
            ), notebook, nothing, initiator)

    putclientupdates!(initiator, msg)
end

responses[:complete] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    query = body["query"]
    pos = lastindex(query) # the query is cut at the cursor position by the front-end, so the cursor position is just the last legal index

    workspace = WorkspaceManager.get_workspace(notebook)

    results_text, loc, found = if isready(workspace.dowork_token)
        # we don't use eval_fetch_in_workspace because we don't want the output to be string-formatted.
        # This works in this particular case, because the return object, a `Completion`, exists in this scope too.
        Distributed.remotecall_eval(Main, workspace.pid, :(PlutoRunner.completion_fetcher($query, $pos)))
    else
        # We can at least autocomplete general julia things:
        PlutoRunner.completion_fetcher(query, pos, Main)
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

responses[:docs] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    query = body["query"]

    doc_html, status = if haskey(Docs.keywords, query |> Symbol)
        # available in Base, no need to ask worker
        doc_md = Docs.formatdoc(Docs.keywords[query |> Symbol])
        (repr(MIME("text/html"), doc_md), :👍)
    else
        workspace = WorkspaceManager.get_workspace(notebook)

        if isready(workspace.dowork_token)
            Distributed.remotecall_eval(Main, workspace.pid, :(PlutoRunner.doc_fetcher($query)))
        else
            (nothing, :⌛)
        end
    end

    msg = UpdateMessage(:doc_result, 
        Dict(
            :status => status,
            :doc => doc_html,
            ), notebook, nothing, initiator)

    putclientupdates!(initiator, msg)
end
