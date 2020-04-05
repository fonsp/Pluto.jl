import JSON

# JSON.jl doesn't define a serialization method for MIME objects, so we add one ourselves:
import JSON: lower
JSON.lower(m::MIME) = string(m)
JSON.lower(u::UUID) = string(u)

function serialize_message_to_stream(io::IO, message::UpdateMessage)
    to_send = Dict(:type => message.type, :message => message.message)
    if message.notebook !== nothing
        to_send[:notebookID] = message.notebook.uuid
    end
    if message.cell !== nothing
        to_send[:cellID] = message.cell.uuid
    end
    if message.initiator !== missing
        to_send[:initiatorID] = message.initiator.clientID
        to_send[:requestID] = message.initiator.requestID
    end

    JSON.print(io, to_send)
end

function serialize_message(message::UpdateMessage)
    sprint(serialize_message_to_stream, message)
end




"To be used in `make_paths_distinct!`"
mutable struct NotebookPath
    uuid
    path_split
    current_path
    current_depth
end

function count_occurances(vals)
    counts = Dict()
    for v in vals
        old = get(counts, v, 0)
        counts[v] = old + 1
    end
    counts
end

"""For internal use. Takes a Set of `NotebookPath`s and gives each a short path (e.g. `to/file.jl` from `/path/to/file.jl`), with the guarantee that all final short paths will be distinct.

For example, the set 

`/a/b/c.jl`, `/a/P/c.jl`, `/Q/b/c.jl`, '/a/b/R.jl'

will become

`/a/b/c.jl`, `P/c.jl`, `/Q/b/c.jl`, 'R.jl'"""
function make_paths_distinct!(notebookpaths::Set{NotebookPath})
    counts = count_occurances(np.current_path for np in notebookpaths)
    for (current_path, count) in counts
        if count == 1 && !isempty(current_path)
            # done!
        else
            # these need to be made distinct by extending their paths
            
            not_yet_distinct = filter(notebookpaths) do np
                np.current_path == current_path
            end
            
            for np in not_yet_distinct
                np.current_depth += 1
                np.current_path = joinpath(np.path_split[end-np.current_depth : end]...)
                if np.current_depth == length(np.path_split) - 1
                    delete!(not_yet_distinct, np)
                    if !Sys.iswindows()
                        np.current_path = '/' * np.current_path
                    end
                end
            end

            make_paths_distinct!(not_yet_distinct)
        end
    end
end


function handle_changecell(notebook, cell, newcode; initiator::Union{Initiator, Missing}=missing)::Task
    # i.e. Ctrl+Enter was pressed on this cell
    # we update our `Notebook` and start execution

    # don't reparse when code is identical (?)
    if cell.code != newcode
        cell.code = newcode
        cell.parsedcode = nothing
    end

    # TODO: feedback to user about File IO
    save_notebook(notebook)
    
    putnotebookupdates!(notebook, clientupdate_cell_input(notebook, cell, initiator=initiator))

    run_reactive_async!(notebook, cell)
end


responses[:connect] = (body, notebook=nothing; initiator::Union{Initiator, Missing}=missing) -> begin
    putclientupdates!(initiator, UpdateMessage(:👋, Dict(:notebookExists => (notebook != nothing)), nothing, nothing, initiator))
end

responses[:getversion] = (body, notebook=nothing; initiator::Union{Initiator, Missing}=missing) -> begin
    putclientupdates!(initiator, UpdateMessage(:versioninfo, Dict(
        :pluto => PLUTO_VERSION_STR,
        :julia => JULIA_VERSION_STR,
    ), nothing, nothing, initiator))
end


# TODO: actions on the notebook are not thread safe
responses[:addcell] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)

    new_cell = Cell("")

    insert!(notebook.cells, new_index, new_cell)

    putnotebookupdates!(notebook, clientupdate_cell_added(notebook, new_cell, new_index, initiator=initiator))
end

responses[:deletecell] = (body, notebook::Notebook, cell::Cell; initiator::Union{Initiator, Missing}=missing) -> begin
    to_delete = cell

    # replace the cell's code with "" and do a reactive run
    runtask = handle_changecell(notebook, to_delete, "", initiator=initiator)
    
    # wait for the reactive run to finish, then delete the cells
    # we wait async, to make sure that the web server remains responsive
    @async begin
        wait(runtask)

        filter!(c->c.uuid ≠ to_delete.uuid, notebook.cells)
        putnotebookupdates!(notebook, clientupdate_cell_deleted(notebook, to_delete, initiator=initiator))
        save_notebook(notebook) # this might be "too late", but it will save the latest version of `notebook` anyways
    end
end

responses[:movecell] = (body, notebook::Notebook, cell::Cell; initiator::Union{Initiator, Missing}=missing) -> begin
    to_move = cell

    # Indexing works as if a new cell is added.
    # e.g. if the third cell (at julia-index 3) of [0, 1, 2, 3, 4]
    # is moved to the end, that would be new julia-index 6

    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)
    old_index = findfirst(isequal(to_move), notebook.cells)

    # Because our cells run in _topological_ order, we don't need to reevaluate anything.
    if new_index < old_index
        deleteat!(notebook.cells, old_index)
        insert!(notebook.cells, new_index, to_move)
    elseif new_index > old_index + 1
        insert!(notebook.cells, new_index, to_move)
        deleteat!(notebook.cells, old_index)
    end

    putnotebookupdates!(notebook, clientupdate_cell_moved(notebook, to_move, new_index, initiator=initiator))
end

responses[:changecell] = (body, notebook::Notebook, cell::Cell; initiator::Union{Initiator, Missing}=missing) -> begin
    newcode = body["code"]

    handle_changecell(notebook, cell, newcode, initiator=initiator)
end

responses[:runall] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    to_update = run_reactive_async!(notebook, notebook.cells)
end

responses[:getinput] = (body, notebook::Notebook, cell::Cell; initiator::Union{Initiator, Missing}=missing) -> begin
    putclientupdates!(initiator, clientupdate_cell_input(notebook, cell, initiator=initiator))
end

responses[:getoutput] = (body, notebook::Notebook, cell::Cell; initiator::Union{Initiator, Missing}=missing) -> begin
    putclientupdates!(initiator, clientupdate_cell_output(notebook, cell, initiator=initiator))
end

responses[:getallcells] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    # TODO: the client's update channel might get full
    update = UpdateMessage(:cell_list,
        Dict(:cells => [Dict(
                :uuid => string(cell.uuid),
                ) for cell in notebook.cells]), nothing, nothing, initiator)
    
    putclientupdates!(initiator, update)
end

responses[:getallnotebooks] = (body, notebook=nothing; initiator::Union{Initiator, Missing}=missing) -> begin
    putplutoupdates!(clientupdate_notebook_list(notebooks, initiator=initiator))
end

responses[:movenotebookfile] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    newpath = body["path"]
    result = try
        if isfile(newpath)
            (success=false,message="File already exists")
        else
            move_notebook(notebook, newpath)
            putplutoupdates!(clientupdate_notebook_list(notebooks, initiator=initiator))
            (success=true, message="")
        end
    catch ex
        showerror(stderr, stacktrace(backtrace()))
        (success=false, message=sprint(showerror, ex))
    end

    update = UpdateMessage(:move_notebook_result, result)
    putclientupdates!(initiator, update)
end

responses[:interruptall] = (body, notebook::Notebook; initiator::Union{Initiator, Missing}=missing) -> begin
    success = WorkspaceManager.kill_workspace(notebook)
    # TODO: notify user whether interrupt was successful (i.e. whether they are using a `ProcessWorkspace`)
end