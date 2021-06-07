# using LibGit2
import Pkg
using Test
using Pluto.Configuration: CompilerOptions
using Pluto.WorkspaceManager: _merge_notebook_compiler_options
import Pluto: update_save_run!, update_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell, project_relative_path, SessionActions
import Distributed

const pluto_test_registry_spec = Pkg.RegistrySpec(;
    url="https://github.com/JuliaPluto/PlutoPkgTestRegistry", 
    uuid=Base.UUID("96d04d5f-8721-475f-89c4-5ee455d3eda0"),
    name="PlutoPkgTestRegistry",
)

@testset "Built-in Pkg" begin
    
    # Pkg.Registry.rm("General")
    Pkg.Registry.add(pluto_test_registry_spec)


    @testset "Basic" begin
        fakeclient = ClientSession(:fake, nothing)
        🍭 = ServerSession()
        🍭.connected_clients[fakeclient.id] = fakeclient

        notebook = Notebook([
            Cell("import PlutoPkgTestA"), # cell 1
            Cell("PlutoPkgTestA.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestB"), # cell 3
            Cell("PlutoPkgTestB.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestC"), # cell 5
            Cell("PlutoPkgTestC.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestD"), # cell 7
            Cell("PlutoPkgTestD.MY_VERSION |> Text"),
            Cell("import PlutoPkgTestE"), # cell 9
            Cell("PlutoPkgTestE.MY_VERSION |> Text"),
            Cell("eval(:(import DataFrames))")
        ])
        fakeclient.connected_notebook = notebook

        update_save_run!(🍭, notebook, notebook.cells[[1, 2, 7, 8]])
        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false
        @test notebook.cells[7].errored == false
        @test notebook.cells[8].errored == false

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        terminals = notebook.nbpkg_terminal_outputs

        @test haskey(terminals, "PlutoPkgTestA")
        @test haskey(terminals, "PlutoPkgTestD")
        @test terminals["PlutoPkgTestA"] == terminals["PlutoPkgTestD"]


        @test notebook.cells[2].output.body == "0.3.1"
        @test notebook.cells[8].output.body == "0.1.0"


        old_A_terminal = terminals["PlutoPkgTestA"]

        update_save_run!(🍭, notebook, notebook.cells[[3, 4]])

        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing

        @test haskey(terminals, "PlutoPkgTestB")
        @test terminals["PlutoPkgTestA"] == terminals["PlutoPkgTestD"] == old_A_terminal

        @test terminals["PlutoPkgTestA"] != terminals["PlutoPkgTestB"]


        @test notebook.cells[4].output.body == "1.0.0"

        update_save_run!(🍭, notebook, notebook.cells[[5, 6]])

        @test notebook.cells[5].errored == false
        @test notebook.cells[6].errored == false
        
        @test notebook.nbpkg_ctx !== nothing
        @test (
            notebook.nbpkg_restart_recommended_msg !==  nothing || notebook.nbpkg_restart_required_msg !== nothing
        )
        @test notebook.nbpkg_restart_required_msg !== nothing

        # running cells again should persist the message

        update_save_run!(🍭, notebook, notebook.cells[1:8])
        @test notebook.nbpkg_restart_required_msg !== nothing


        # restart the process, this should match the function `response_restrart_process`
        @test_nowarn SessionActions.shutdown(🍭, notebook; keep_in_session=true, async=true)
        @test_nowarn update_save_run!(🍭, notebook, notebook.cells[1:8])

        @test notebook.cells[1].errored == false
        @test notebook.cells[2].errored == false
        @test notebook.cells[3].errored == false
        @test notebook.cells[4].errored == false
        @test notebook.cells[5].errored == false
        @test notebook.cells[6].errored == false
        @test notebook.cells[7].errored == false
        @test notebook.cells[8].errored == false

        @test notebook.nbpkg_ctx !== nothing
        @test notebook.nbpkg_restart_recommended_msg === nothing
        @test notebook.nbpkg_restart_required_msg === nothing


        @test notebook.cells[2].output.body == "0.2.2"
        @test notebook.cells[4].output.body == "1.0.0"
        @test notebook.cells[6].output.body == "1.0.0"
        @test notebook.cells[8].output.body == "0.1.0"




        # we should have an isolated environment, so importing DataFrames should not work, even though it is available in the parent process.
        update_save_run!(🍭, notebook, notebook.cells[11])
        @test notebook.cells[11].errored == true


        WorkspaceManager.unmake_workspace((🍭, notebook))
    end

    # @testset "File format" begin
    #     notebook = Notebook([
    #         Cell("import PlutoPkgTestA"), # cell 1
    #         Cell("PlutoPkgTestA.MY_VERSION |> Text"),
    #         Cell("import PlutoPkgTestB"), # cell 3
    #         Cell("PlutoPkgTestB.MY_VERSION |> Text"),
    #         Cell("import PlutoPkgTestC"), # cell 5
    #         Cell("PlutoPkgTestC.MY_VERSION |> Text"),
    #         Cell("import PlutoPkgTestD"), # cell 7
    #         Cell("PlutoPkgTestD.MY_VERSION |> Text"),
    #         Cell("import PlutoPkgTestE"), # cell 9
    #         Cell("PlutoPkgTestE.MY_VERSION |> Text"),
    #         Cell("eval(:(import DataFrames))")
    #     ])

    #     file1 = tempname()
    #     notebook.path = file1

    #     save_notebook()


    #     save_notebook
    # end


    Pkg.Registry.rm(pluto_test_registry_spec)
    # Pkg.Registry.add("General")
end

# reg_path = mktempdir()
# repo = LibGit2.clone("https://github.com/JuliaRegistries/General.git", reg_path)

# LibGit2.checkout!(repo, "aef26d37e1d0e8f8387c011ccb7c4a38398a18f6")


