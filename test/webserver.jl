using HTTP
using Test
using Pluto
using Pluto: ServerSession, ClientSession, SessionActions
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
    options = Pluto.Configuration.from_flat_kwargs(; port=port, launch_browser=false, workspace_use_distributed=false, require_secret_for_access=false, require_secret_for_open_links=false)
    🍭 = Pluto.ServerSession(; options=options)
    server_task = @async Pluto.run(🍭)
    @test poll(5) do
        server_running()
    end
    
    @test isempty(🍭.notebooks)
    
    download(local_url("sample/JavaScript.jl"))
    
    @test poll(5) do
        length(🍭.notebooks) == 1
    end
    
    notebook = only(values(🍭.notebooks))
    
    file_contents = read(download(local_url("notebookfile?id=$(notebook.notebook_id)")), String)
    
    @assert file_contents == sprint(Pluto.save_notebook, notebook)
    
    export_contents = read(download(local_url("notebookexport?id=$(notebook.notebook_id)")), String)
    
    @assert occursin(string(Pluto.PLUTO_VERSION), export_contents)
    @assert occursin("</html>", export_contents)
    
    WorkspaceManager.unmake_workspace((🍭, notebook))
    
    @async schedule(server_task, InterruptException(); error=true)
end

end # testset
