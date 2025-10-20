
using Pluto.WorkspaceManager: WorkspaceManager, poll
using Pluto: Pluto, ServerSession, Notebook, Cell, update_save_run!


without_pluto_version(s) = replace(s, r"# v.*" => "")





function request_as_client(session, notebook, name::Symbol, body, n_responses::Int; initiator::Bool=true, timeout::Real=30.0)
    
    req_id = Symbol(string(rand()))
    client_id = Symbol(string(rand()))
    
    client = Pluto.ClientSession(
        client_id,
        nothing,
    )
    session.connected_clients[client_id] = client
    
    init = Pluto.Initiator(client, req_id)
    
    request = Pluto.ClientRequest(;
        session, notebook, body,
        initiator=initiator ? init : nothing,
    )
    
    responses = []
    l = ReentrantLock()
    
    
    t = Timer(timeout) do _t
        @error "request_as_client: Waiting for too long." responses n_responses
    end
    
    r_task = @async begin
        @sync for _ in 1:n_responses
            @async begin
                r = take!(client.pendingupdates)
                lock(l) do
                    push!(responses, r)
                end
            end
        end
    end


    Pluto.responses[name](request)
    wait(r_task)
    
    close(t)
    delete!(session.connected_clients, client_id)
    responses
end



@testset "Project.toml editing" begin
    Pkg.Registry.add(pluto_test_registry_spec)
    🍭 = ServerSession()
    notebook = Notebook([
        Cell("1 + 1"),
        Cell("2 + 2"),
    ])
    update_save_run!(🍭, notebook, notebook.cells)
    
    
    
    
    rs = request_as_client(
        🍭,
        notebook,
        :nbpkg_get_project_toml,
        nothing,
        1,
    )
    
    
    @info "Found" rs
    
    
    cleanup(🍭, notebook)
    Pkg.Registry.rm(pluto_test_registry_spec)
end


