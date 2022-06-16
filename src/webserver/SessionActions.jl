module SessionActions

import ..Pluto: ServerSession, Notebook, Cell, emptynotebook, tamepath, new_notebooks_directory, without_pluto_file_extension, numbered_until_new, cutename, readwrite, update_save_run!, update_from_file, wait_until_file_unchanged, putnotebookupdates!, putplutoupdates!, load_notebook, clientupdate_notebook_list, WorkspaceManager, try_event_call, NewNotebookEvent, OpenNotebookEvent, ShutdownNotebookEvent, @asynclog, ProcessStatus, maybe_convert_path_to_wsl
using FileWatching
import ..Pluto.DownloadCool: download_cool
import HTTP

import UUIDs: UUID, uuid1

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
    name_from_url = startswith(url, r"https?://") ? strip(HTTP.unescapeuri(splitext(basename(HTTP.URI(url).path))[1])) : ""
    new_name = isempty(name_from_url) ? cutename() : name_from_url
    
    random_notebook = emptynotebook()
    random_notebook.path = numbered_until_new(
        joinpath(
            new_notebooks_directory(), 
            new_name
        ); suffix=".jl")
    
    path = download_cool(url, random_notebook.path)
    result = try_event_call(session, NewNotebookEvent())
    nb = if result isa UUID
        open(session, path; notebook_id=result, kwargs...)
    else
        open(session, path; kwargs...)
    end
    return nb
end

"Open the notebook at `path` into `session::ServerSession` and run it. Returns the `Notebook`."
function open(session::ServerSession, path::AbstractString; 
    run_async::Bool=true, 
    compiler_options=nothing, 
    as_sample::Bool=false, 
    clear_frontmatter::Bool=false,
    notebook_id::UUID=uuid1()
)
    path = maybe_convert_path_to_wsl(path)
    if as_sample
        new_filename = "sample " * without_pluto_file_extension(basename(path))
        new_path = numbered_until_new(joinpath(new_notebooks_directory(), new_filename); suffix=".jl")
        
        readwrite(path, new_path)
        path = new_path
    end

    for nb in values(session.notebooks)
        if isfile(nb.path) && realpath(nb.path) == realpath(tamepath(path))
            throw(NotebookIsRunningException(nb))
        end
    end
    
    nb = load_notebook(tamepath(path); disable_writing_notebook_files=session.options.server.disable_writing_notebook_files)
    nb.notebook_id = notebook_id

    # overwrites the notebook environment if specified
    if compiler_options !== nothing
        nb.compiler_options = compiler_options
    end
    if clear_frontmatter
        set_frontmatter!(nb, nothing)
    end

    session.notebooks[nb.notebook_id] = nb
    for c in nb.cells
        c.queued = session.options.evaluation.run_notebook_on_load
    end

    update_save_run!(session, nb, nb.cells; run_async, prerender_text=true)
    
    add(session, nb; run_async)
    try_event_call(session, OpenNotebookEvent(nb))
    nb
end

function add(session::ServerSession, nb::Notebook; run_async::Bool=true)
    session.notebooks[nb.notebook_id] = nb
    
    if run_async
        @asynclog putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    else
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
    end
    
    
    running = Ref(false)
    function update_from_file_throttled()
        if !running[]
            running[] = true
            
            @info "Updating from file..."
            
            
            sleep(0.1) ## There seems to be a synchronization issue if your OS is VERYFAST
            wait_until_file_unchanged(nb.path, .3)
            
            # call update_from_file. If it returns false, that means that the notebook file was corrupt, so we try again, a maximum of 10 times.
            for i in 1:10
                if update_from_file(session, nb)
                    break
                end
            end
            
            
            @info "Updating from file done!"
            
            running[] = false
        end
    end

    in_session() = get(session.notebooks, nb.notebook_id, nothing) === nb
    session.options.server.auto_reload_from_file && @asynclog try
        while in_session()
            if !isfile(nb.path)
                # notebook file deleted... let's ignore this, changing the notebook will cause it to save again. Fine for now
                sleep(2)
            else
                e = watch_file(nb.path, 3)
                if e.timedout
                    continue
                end
                
                # the above call is blocking until the file changes
                
                local modified_time = mtime(nb.path)
                local _tries = 0
                
                # mtime might return zero if the file is temporarily removed
                while modified_time == 0.0 && _tries < 10
                    modified_time = mtime(nb.path)
                    _tries += 1
                    sleep(.05)
                end
                
                # current_time = time()
                # @info "File changed" (current_time - nb.last_save_time) (modified_time - nb.last_save_time) (current_time - modified_time)
                if !in_session()
                    break
                end
                
                # if current_time - nb.last_save_time < 2.0
                    # @info "Notebook was saved by me very recently, not reloading from file."
                if modified_time == 0.0
                    # @warn "Failed to hot reload: file no longer exists."
                elseif modified_time - nb.last_save_time < session.options.server.auto_reload_from_file_cooldown
                    # @info "Modified time is very close to my last save time, not reloading from file."
                else
                    update_from_file_throttled()
                end
            end
        end
    catch e
        if !(e isa InterruptException)
            rethrow(e)
        end
    end
    
    nb
end

"""
Generate a non-existing new notebook filename, and write `contents` to that file. Return the generated filename.

# Example
```julia
save_upload(some_notebook_data; filename_base="hello") == "~/.julia/pluto_notebooks/hello 5.jl"
```
"""
function save_upload(contents::Union{String,Vector{UInt8}}; filename_base::Union{Nothing,AbstractString}=nothing)
    save_path = numbered_until_new(
        joinpath(
            new_notebooks_directory(), 
            something(filename_base, cutename())
        ); suffix=".jl")
    write(save_path, contents)
    save_path
end

"Create a new empty notebook inside `session::ServerSession`. Returns the `Notebook`."
function new(session::ServerSession; run_async=true, notebook_id::UUID=uuid1())
    nb = if session.options.server.init_with_file_viewer
        
        @warn "DEPRECATED: init_with_file_viewer will be removed soon."
        
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
        if session.options.compiler.sysimage === nothing
            emptynotebook()
        else
            Notebook([Cell("import Pkg"), Cell("# This cell disables Pluto's package manager and activates the global environment. Click on ? inside the bubble next to Pkg.activate to learn more.\n# (added automatically because a sysimage is used)\nPkg.activate()"), Cell()])
        end
    end
    # Run NewNotebookEvent handler before assigning ID
    isid = try_event_call(session, NewNotebookEvent())
    nb.notebook_id = isnothing(isid) ? notebook_id : isid

    update_save_run!(session, nb, nb.cells; run_async=run_async, prerender_text=true)
    add(session, nb; run_async=run_async)

    try_event_call(session, OpenNotebookEvent(nb))
    nb
end

"Shut down `notebook` inside `session`. If `keep_in_session` is `false` (default), you will not be allowed to run a notebook with the same notebook_id again."
function shutdown(session::ServerSession, notebook::Notebook; keep_in_session::Bool=false, async::Bool=false, verbose::Bool=true)
    notebook.nbpkg_restart_recommended_msg = nothing
    notebook.nbpkg_restart_required_msg = nothing
    
    if notebook.process_status == ProcessStatus.ready || notebook.process_status == ProcessStatus.starting
        notebook.process_status = ProcessStatus.no_process
    end

    if !keep_in_session
        listeners = putnotebookupdates!(session, notebook) # TODO: shutdown message
        delete!(session.notebooks, notebook.notebook_id)
        putplutoupdates!(session, clientupdate_notebook_list(session.notebooks))
        for client in listeners
            @async close(client.stream)
        end
    end
    WorkspaceManager.unmake_workspace((session, notebook); async, verbose, allow_restart=keep_in_session)
    try_event_call(session, ShutdownNotebookEvent(notebook))
end

end
