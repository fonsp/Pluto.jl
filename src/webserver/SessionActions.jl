module SessionActions

import ..Pluto: ServerSession, Notebook, Cell, emptynotebook, tamepath, new_notebooks_directory, without_pluto_file_extension, numbered_until_new, readwrite, update_save_run!, putnotebookupdates!, putplutoupdates!, load_notebook, clientupdate_notebook_list, WorkspaceManager, @asynclog, UpdateMessage, update_from_file
import FileWatching: watch_file
import Dates: now, datetime2unix, UTC, Millisecond

struct NotebookIsRunningException <: Exception
    notebook::Notebook
end

abstract type AbstractUserError <: Exception end
struct UserError <: AbstractUserError
    msg::String
end
function Base.showerror(io::IO, e::UserError)
    print(io, e.msg)
end

function open_url(session::ServerSession, url::AbstractString; kwargs...)
    path = download(url, emptynotebook().path)
    open(session, path; kwargs...)
end

function notebook_file_watch(session::ServerSession,nb::Notebook;ask_before_reload = false)
    min_time_between_changes = Millisecond(1000)
    @asynclog begin
        watch_file(nb.path)
        last_timestamp = now(UTC)
        # The first file change is skipped as that happens when the notebook is created/opened
        while true
            watch_file(nb.path)
            if nb.notebook_id ∉ keys(session.notebooks)
                # The notebook has been closed, so stop this infinite loop 
                println("Notebook $(nb.notebook_id) has been closed, exiting the filechange_watch loop")
                break
            end
            # When the file changes, send the timestamp to the editor which assess if the file was modified later than the frontend
            timestamp = now(UTC)
            if (timestamp - last_timestamp) > min_time_between_changes
                println("Valid timing: $(timestamp - last_timestamp)")
                if ask_before_reload
                    unix_timestamp = round(Int,datetime2unix(timestamp)*1000) # Keep it in milliseconds as in js
                    putplutoupdates!(session, UpdateMessage(:update_notebook_filetime, Dict(:timestamp => unix_timestamp), nb, nothing, nothing))
                else
                    update_from_file(session,nb)
                end
                last_timestamp = timestamp
            else
                println("last update was too close to the previous one")
            end
        end
    end
end

function open(session::ServerSession, path::AbstractString; run_async=true, compiler_options=nothing, as_sample=false)
    if as_sample
        new_filename = "sample " * without_pluto_file_extension(basename(path))
        new_path = numbered_until_new(joinpath(new_notebooks_directory(), new_filename); suffix=".jl")
        
        readwrite(path, new_path)
        path = new_path
    end

    for nb in values(session.notebooks)
        if realpath(nb.path) == realpath(tamepath(path))
            throw(NotebookIsRunningException(nb))
        end
    end
    
    nb = load_notebook(tamepath(path); disable_writing_notebook_files=session.options.server.disable_writing_notebook_files)

    # overwrites the notebook environment if specified
    if compiler_options !== nothing
        nb.compiler_options = compiler_options
    end

    session.notebooks[nb.notebook_id] = nb
    if session.options.evaluation.run_notebook_on_load
        for c in nb.cells
            c.queued = true
        end
        update_save_run!(session, nb, nb.cells; run_async=run_async, prerender_text=true)
    end

    if run_async
        @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    else
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    end

    notebook_file_watch(session,nb)

    nb
end

function save_upload(content::Vector{UInt8})
    save_path = emptynotebook().path
    Base.open(save_path, "w") do io
        write(io, content)
    end

    save_path
end

function new(session::ServerSession; run_async=true)
    nb = if session.options.server.init_with_file_viewer
        
        file_viewer_code = """html\"\"\"

        <script>

        const nbfile_url = window.location.href.replace("edit", "notebookfile")


        const pre = html`<pre style="font-size: .6rem;">Loading...</pre>`

        const handle = setInterval(async () => {

        pre.innerText = await (await fetch(nbfile_url)).text()
        }, 500)

        invalidation.then(() => {
        clearInterval(handle)
        })

        return pre

        </script>

        \"\"\"
        """
        Notebook([Cell(), Cell(code=file_viewer_code, code_folded=true)])

    else
        emptynotebook()
    end
    update_save_run!(session, nb, nb.cells; run_async=run_async, prerender_text=true)
    session.notebooks[nb.notebook_id] = nb

    if run_async
        @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    else
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    end

    notebook_file_watch(session,nb)

    nb
end

function shutdown(session::ServerSession, notebook::Notebook; keep_in_session=false, async=false)
    notebook.nbpkg_restart_recommended_msg = nothing
    notebook.nbpkg_restart_required_msg = nothing

    if !keep_in_session
        listeners = putnotebookupdates!(session, notebook) # TODO: shutdown message
        delete!(session.notebooks, notebook.notebook_id)
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
        for client in listeners
            @async close(client.stream)
        end
    end
    WorkspaceManager.unmake_workspace((session, notebook); async=async)
end

end