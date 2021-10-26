import FuzzyCompletions: complete_path, completion_text, score
import Distributed
import .PkgCompat: package_completions
using Markdown
import REPL

###
# RESPONSES FOR AUTOCOMPLETE & DOCS
###

function format_path_completion(completion)
    replace(replace(completion_text(completion), "\\ " => " "), "\\\\" => "\\")
end

responses[:completepath] = function response_completepath(🙋::ClientRequest)
    path = 🙋.body["query"]
    pos = lastindex(path)

    results, loc, found = complete_path(path, pos)
    isenough(x) = x ≥ -0.1
    filter!(isenough ∘ score, results) # too many candiates otherwise. -0.1 instead of 0 to enable autocompletions for paths: `/` or `/asdf/`

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

    scores = [max(0.0, score(r)) for r in results]
    formatted = format_path_completion.(results)

    # sort on score. If a tie (e.g. both score 0.0), sort on dir/file. If a tie, sort alphabetically.
    perm = sortperm(collect(zip(.-scores, (!isdirpath).(formatted), formatted)))

    msg = UpdateMessage(:completion_result, 
        Dict(
            :start => start_utf8 - 1, # 1-based index (julia) to 0-based index (js)
            :stop => stop_utf8 - 1, # idem
            :results => formatted[perm]
            ), 🙋.notebook, nothing, 🙋.initiator)

    putclientupdates!(🙋.session, 🙋.initiator, msg)
end

function package_name_to_complete(str)
	matches = match(r"(import|using) ([a-zA-Z0-9]+)$", str)
	matches === nothing ? nothing : matches[2]
end

responses[:complete] = function response_complete(🙋::ClientRequest)
    try require_notebook(🙋) catch; return; end
    query = 🙋.body["query"]
    pos = lastindex(query) # the query is cut at the cursor position by the front-end, so the cursor position is just the last legal index

    workspace = WorkspaceManager.get_workspace((🙋.session, 🙋.notebook))

    results, loc, found = if package_name_to_complete(query) !== nothing
        p = package_name_to_complete(query)
        cs = package_completions(p) |> sort
        [(c,"package",true) for c in cs], (nextind(query, pos-length(p)):pos), true
    else
        if will_run_code(🙋.notebook) && isready(workspace.dowork_token)
            # we don't use eval_format_fetch_in_workspace because we don't want the output to be string-formatted.
            # This works in this particular case, because the return object, a `Completion`, exists in this scope too.
            Distributed.remotecall_eval(Main, workspace.pid, :(PlutoRunner.completion_fetcher(
                $query, $pos,
                getfield(Main, $(QuoteNode(workspace.module_name))),
                )))
        else
            # We can at least autocomplete general julia things:
            PlutoRunner.completion_fetcher(query, pos, Main)
        end
    end

    start_utf8 = loc.start
    stop_utf8 = nextind(query, pos) # advance one unicode char, js uses exclusive upper bound

    msg = UpdateMessage(:completion_result, 
        Dict(
            :start => start_utf8 - 1, # 1-based index (julia) to 0-based index (js)
            :stop => stop_utf8 - 1, # idem
            :results => results
            ), 🙋.notebook, nothing, 🙋.initiator)

    putclientupdates!(🙋.session, 🙋.initiator, msg)
end

responses[:docs] = function response_docs(🙋::ClientRequest)
    require_notebook(🙋)
    query = 🙋.body["query"]

    # Expand string macro calls to their macro form:
    # `html"` should yield `@html_str` and
    # `Markdown.md"` should yield `@Markdown.md_str`. (Ideally `Markdown.@md_str` but the former is easier)
    if endswith(query, "\"") && query != "\""
        query = "@$(query[begin:end-1])_str"
    end

    doc_html, status = if REPL.lookup_doc(Symbol(query)) isa Markdown.MD
        # available in Base, no need to ask worker
        doc_md = REPL.lookup_doc(Symbol(query))
        (repr(MIME("text/html"), doc_md), :👍)
    else
        workspace = WorkspaceManager.get_workspace((🙋.session, 🙋.notebook))

        if will_run_code(🙋.notebook) && isready(workspace.dowork_token)
            Distributed.remotecall_eval(Main, workspace.pid, :(PlutoRunner.doc_fetcher(
                $query,
                getfield(Main, $(QuoteNode(workspace.module_name))),
            )))
        else
            (nothing, :⌛)
        end
    end

    msg = UpdateMessage(:doc_result, 
        Dict(
            :status => status,
            :doc => doc_html,
            ), 🙋.notebook, nothing, 🙋.initiator)

    putclientupdates!(🙋.session, 🙋.initiator, msg)
end
