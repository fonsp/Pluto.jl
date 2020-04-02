import JSON

# JSON.jl doesn't define a serialization method for MIME objects, so we add one ourselves:
import JSON: lower
JSON.lower(m::MIME) = string(m)

function serialize_message_to_stream(io::IO, message::UpdateMessage)
    to_send = Dict(:type => message.type, :message => message.message)
    if message.notebook !== nothing
        to_send[:notebookID] = string(message.notebook.uuid)
    end
    if message.cell !== nothing
        to_send[:cellID] = string(message.cell.uuid)
    end
    if message.initiator !== nothing
        to_send[:initiatorID] = string(message.initiator.id)
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

function clientupdate_notebook_list(initiator::Client, notebook_list)
    short_paths = Dict()

    notebookpaths = map(notebook_list) do notebook
        pathsep = Sys.iswindows() ? '\\' : '/'
        path_split = split(notebook.path, pathsep)
        if path_split[1] == ""
            path_split = path_split[2:end]
        end
        NotebookPath(notebook.uuid, path_split, "", -1)
    end

    make_paths_distinct!(Set(notebookpaths))

    short_paths = Dict(map(notebookpaths) do np
        np.uuid => np.current_path
    end...)

    return UpdateMessage(:notebook_list,
        Dict(:notebooks => [Dict(
                :uuid => string(notebook.uuid),
                :path => notebook.path,
                :shortpath => short_paths[notebook.uuid]
                ) for notebook in notebook_list]), nothing, nothing, initiator)
end


function handle_changecell(initiator::Client, notebook, cell, newcode)::Task
    # i.e. Ctrl+Enter was pressed on this cell
    # we update our `Notebook` and start execution

    # don't reparse when code is identical (?)
    if cell.code != newcode
        cell.code = newcode
        cell.parsedcode = nothing
    end

    # TODO: feedback to user about File IO
    save_notebook(notebook)
    
    putnotebookupdates!(notebook, clientupdate_cell_input(initiator, notebook, cell))

    run_reactive_async!(initiator, notebook, cell)
end



# TODO: actions on the notebook are not thread safe
responses[:addcell] = (initiator::Client, body, notebook::Notebook) -> begin
    new_index = body["index"] + 1 # 0-based index (js) to 1-based index (julia)

    new_cell = Cell("")

    insert!(notebook.cells, new_index, new_cell)

    putnotebookupdates!(notebook, clientupdate_cell_added(initiator, notebook, new_cell, new_index))
end

responses[:deletecell] = (initiator::Client, body, notebook::Notebook, cell::Cell) -> begin
    to_delete = cell

    # replace the cell's code with "" and do a reactive run
    runtask = handle_changecell(initiator, notebook, to_delete, "")
    
    # wait for the reactive run to finish, then delete the cells
    # we wait async, to make sure that the web server remains responsive
    @async begin
        wait(runtask)

        filter!(c->c.uuid ≠ to_delete.uuid, notebook.cells)
        putnotebookupdates!(notebook, clientupdate_cell_deleted(initiator, notebook, to_delete))
    end
end

responses[:movecell] = (initiator::Client, body, notebook::Notebook, cell::Cell) -> begin
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

    putnotebookupdates!(notebook, clientupdate_cell_moved(initiator, notebook, to_move, new_index))
end

responses[:changecell] = (initiator::Client, body, notebook::Notebook, cell::Cell) -> begin
    newcode = body["code"]

    handle_changecell(initiator, notebook, cell, newcode)
end

responses[:runall] = (initiator::Client, body, notebook::Notebook) -> begin
    to_update = run_reactive_async!(initiator, notebook, notebook.cells)
end

# TODO:
# responses[:getcell] = (initiator, body, notebook::Notebook, cell::Cell) -> begin
    
# end

responses[:getallcells] = (initiator::Client, body, notebook::Notebook) -> begin
    # TODO: the client's update channel might get full
    updates = []
    for (i, cell) in enumerate(notebook.cells)
        push!(updates, clientupdate_cell_added(initiator, notebook, cell, i))
        push!(updates, clientupdate_cell_input(initiator, notebook, cell))
        push!(updates, clientupdate_cell_output(initiator, notebook, cell))
    end
    putclientupdates!(initiator, updates...)
end

responses[:getallnotebooks] = (initiator::Client, body, notebook=nothing) -> begin
    putplutoupdates!(clientupdate_notebook_list(initiator, values(notebooks)))
end

responses[:interruptall] = (initiator::Client, body, notebook::Notebook) -> begin
    success = WorkspaceManager.kill_workspace(initiator, notebook)
    # TODO: notify user whether interrupt was successful (i.e. whether they are using a `ProcessWorkspace`)
end