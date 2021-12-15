import HTTP

"""Pluto Events interface

Use this interface to hook up functionality into the Pluto world.
Events are guaranteed to be run at least every time something interesting happens,
but keep in mind that Pluto may be run the events multiple times "logically". For instance,
the FileSaveEvent may be triggered whenever pluto wants to make sure the file is saved, 
which may be more often than the file is actually changed. Deduplicate on your own if
you care about this.

To use that, we assume you are running Pluto through a julia script and
opening it as 

julia > pluto_server_session = Pluto.ServerSession(;
    secret = secret,
    options = pluto_server_options,
)

Define your function to handle the events using multiple dispatch:

First assign a handler for all the types you will not use, using the supertype:

julia >    function myfn(a::PlutoEvent)
        nothing
    end

And then create a special function for each event you want to handle specially

julia >    function myfn(a::FileSaveEvent)
        HTTP.post("https://my.service.com/count_saves")
    end

Finally, assign the listener to your session

julia > pluto_server_session.event_listener = yourfunction
"""
abstract type PlutoEvent end

function try_event_call(session, event::PlutoEvent)
    return try
        session.event_listener(event);
    catch e
        @warn "Couldn't run event listener" event exception=(e, catch_backtrace())
        nothing
    end
end

# Triggered when a notebook is saved
struct FileSaveEvent <: PlutoEvent
    notebook::Notebook
    fileContent::String
    path::String
end

FileSaveEvent(notebook::Notebook) = begin
    fileContent = sprint() do io
        save_notebook(io, notebook)
    end
    FileSaveEvent(notebook, fileContent, notebook.path)
end

# Triggered when the local code has changed (user typed something),
# but the code hasn't run yet. 
struct FileEditEvent <: PlutoEvent
    notebook::Notebook
    fileContent::String
    path::String
end

# Triggered when a user opens a notebook
struct OpenNotebookEvent <: PlutoEvent
    notebook::Notebook
end

# This will be fired ONLY if URL params don't match anything else.
# Useful if you want to create a file in a custom way,
# before opening the notebook
# Should return a redirect to /edit?id={notebook_id}
# Note: use Pluto.open - try_launch_notebook_response will return a fitting response.
struct CustomLaunchEvent <: PlutoEvent
    params::Dict{Any, Any}
    request::HTTP.Request
    try_launch_notebook_response::Function
end

# Triggered when a notebook has shut down.
struct ShutdownNotebookEvent <: PlutoEvent
    notebook::Notebook
end
