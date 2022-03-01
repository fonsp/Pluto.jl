using HTTP
using Test
using Pluto
using Pluto: ServerSession, ClientSession, SessionActions, WorkspaceManager
using Pluto.Configuration
using Pluto.Configuration: notebook_path_suggestion, from_flat_kwargs, _convert_to_flags
using Pluto.WorkspaceManager: WorkspaceManager, poll

@testset "Web server" begin


@testset "Exports" begin
    port = 13432
    host = "localhost"
    local_url(suffix) = "http://$host:$port/$suffix"

    
    server_running() = HTTP.get(local_url("favicon.ico")).status == 200 && HTTP.get(local_url("edit")).status == 200
    

    # without notebook at startup
    options = Pluto.Configuration.from_flat_kwargs(; port, launch_browser=false, workspace_use_distributed=true, require_secret_for_access=false, require_secret_for_open_links=false)
    🍭 = Pluto.ServerSession(; options)
    server_task = @async Pluto.run(🍭)
    
    # FYI, you should normally use a PlutoEvent for things we do in this test instead of polling! Don't use this as an example.
    @test poll(10) do
        server_running()
    end
    
    @test isempty(🍭.notebooks)
    
    HTTP.get(local_url("sample/JavaScript.jl"); retry=false)
    
    # wait for the notebook to be added to the session
    @test poll(10) do
        length(🍭.notebooks) == 1
    end
    
    notebook = only(values(🍭.notebooks))
    
    # right now, the notebook was only added to the session and assigned an ID. Let's wait for it to get a process:
    @test poll(60) do
        haskey(WorkspaceManager.workspaces, notebook.notebook_id)
    end
    sleep(1)
    
    # Note that the notebook is running async right now! It's not finished yet. But we can already run these tests:
    
    fileA = download(local_url("notebookfile?id=$(notebook.notebook_id)"))
    fileB = tempname()
    write(fileB, sprint(Pluto.save_notebook, notebook))
    
    @test Pluto.only_versions_or_lineorder_differ(fileA, fileB)
    
    export_contents = read(download(local_url("notebookexport?id=$(notebook.notebook_id)")), String)
    
    @test occursin(string(Pluto.PLUTO_VERSION), export_contents)
    @test occursin("</html>", export_contents)
    
    SessionActions.shutdown(🍭, notebook; keep_in_session=false)
    
    schedule(server_task, InterruptException(); error=true)
    # wait for the server task to finish
    # normally this `wait` would rethrow the above InterruptException, but Pluto.run should catch for InterruptExceptions and not bubble them up.
    wait(server_task)
end

end # testset
