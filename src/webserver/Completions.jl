import REPL.REPLCompletions: completions, complete_path

responses[:completepath] = (initiator::Client, body, notebook=nothing) -> begin
    query = body["query"]
    # pos = body["cursorpos"]
    pos = lastindex(query)

    completions, loc, found = complete_path(query, pos)

    start_utf8 = loc.start
    stop_utf8 = nextind(query, loc.stop) # advance one unicode char, js uses exclusive upper bound

    msg = UpdateMessage(:completion_result, 
        Dict(
            :start => start_utf8 - 1, # 1-based index (julia) to 0-based index (js)
            :stop => stop_utf8 - 1, # idem
            :results => [c.path for c in completions]
            ))

    putclientupdates!(initiator, msg)
end