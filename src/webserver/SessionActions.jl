module SessionActions

import ..Pluto: ServerSession, Notebook, emptynotebook, tamepath, move_notebook!, update_save_run!, putnotebookupdates!, putplutoupdates!, load_notebook, clientupdate_notebook_list, WorkspaceManager, @asynclog

struct NotebookIsRunningException <: Exception
    notebook::Notebook
end

function open_url(session::ServerSession, url::AbstractString; kwargs...)
    path = download(url, emptynotebook().path)
    open(session, path; kwargs...)
end

function open(session::ServerSession, path::AbstractString; run_async=true, compiler_options=nothing)
    for nb in values(session.notebooks)
        if realpath(nb.path) == realpath(tamepath(path))
            throw(NotebookIsRunningException(nb))
        end
    end
    
    nb = load_notebook(tamepath(path), session.options.evaluation.run_notebook_on_load)

    # overwrites the notebook environment if specified
    if compiler_options !== nothing
        nb.compiler_options = compiler_options
    end

    session.notebooks[nb.notebook_id] = nb
    if session.options.evaluation.run_notebook_on_load
        update_save_run!(session, nb, nb.cells; run_async=run_async, prerender_text=true)
        # TODO: send message when initial run completed
    end

    if run_async
        @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    else
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    end

    nb
end

function new(session::ServerSession; run_async=true)
    nb = emptynotebook()
    update_save_run!(session, nb, nb.cells; run_async=run_async, prerender_text=true)
    session.notebooks[nb.notebook_id] = nb

    if run_async
        @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    else
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    end

    nb
end

function shutdown(session::ServerSession, notebook::Notebook; keep_in_session=false)
    if !keep_in_session
        listeners = putnotebookupdates!(session, notebook) # TODO: shutdown message
        delete!(session.notebooks, notebook.notebook_id)
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
        for client in listeners
            @async close(client.stream)
        end
    end
    success = WorkspaceManager.unmake_workspace((session, notebook))
end

function move(session::ServerSession, notebook::Notebook, newpath::AbstractString)
    result = try
        if isfile(newpath)
            (success = false, reason = "File exists already - you need to delete the old file manually.")
        else
            move_notebook!(notebook, newpath)
            putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
            WorkspaceManager.cd_workspace((session, notebook), newpath)
            (success = true, reason = "")
        end
    catch ex
        showerror(stderr, stacktrace(catch_backtrace()))
        (success = false, reason = sprint(showerror, ex))
    end
    result
end
end