
let
    config = Configuration.from_flat_kwargs(; workspace_use_distributed=false)
    session = ServerSession(;options=config)
    http_router_for(session)

    fakeclient = ClientSession(:fake, nothing)
    session.connected_clients[fakeclient.id] = fakeclient

    notebook = Notebook([
                Cell("""y = begin
                    1 + x
                end"""),
                Cell("x = 2"),
                Cell("z = sqrt(y)"),
                Cell("a = 4x"),
                Cell("w = z^5"),
                Cell(""),
            ])
    fakeclient.connected_notebook = notebook

    # update_run!(session, notebook, notebook.cells) cannot be used here because it crashes
    # the following lines are extracted from this function.
    cells = notebook.cells
    old = notebook.topology
    new = notebook.topology = updated_topology(old, notebook, cells) # macros are not yet resolved
	update_dependency_cache!(notebook)
    save_notebook(notebook, tempname())

    notebook_to_js(notebook) # export to JS

    client_request = Pluto.ClientRequest(session=session, notebook=notebook)
    send_notebook_changes!(client_request)
end
