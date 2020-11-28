# using Test
# import Pluto
# import Pluto: update_save_run!, WorkspaceManager, ClientSession, ServerSession, Notebook, Cell

# import UUIDs: UUID, uuid1

# function get_unique_short_id()
#     string(uuid1())[1:8]
# end

# function stringify_keys(d::Dict)
#     Dict(string(k) => stringify_keys(v) for (k, v) in d)
# end
# stringify_keys(x::Any) = x

# module Firebase include("../src/webserver/FirebaseSimple.jl") end

# @testset "Communication protocol" begin

#     @testset "Functionality sweep" begin
#         buffer = IOBuffer()
#         client = ClientSession(:buffery, buffer)

#         🍭 = ServerSession()
#         # 🍭.connected_clients[client.id] = client


#         notebook = Notebook([Cell(UUID("40bc3c5e-fd6c-4774-8f7a-5e3336e82d47"), "")])
#         🍭.notebooks[notebook.notebook_id] = notebook
#         update_save_run!(🍭, notebook, notebook.cells)

#         local_notebook = Pluto.notebook_to_js(notebook)

#         # client.connected_notebook = notebook
#         n = notebook.notebook_id |> string
#         c(cell) = cell.cell_id |> string



#         function send(type, body, metadata = Dict(:notebook_id => n))
#             request_id = get_unique_short_id()
#             Pluto.process_ws_message(🍭, Dict(
#                 "type" => string(type),
#                 "client_id" => string(client.id),
#                 "request_id" => request_id,
#                 "body" => body,
#                 metadata...
#             ) |> stringify_keys, client.stream)
#         end

#         function update_local_notebook(mutate_fn)
#             old_local_notebook = deepcopy(local_notebook)
#             mutate_fn(local_notebook)
#             patches::Array{Dict} = Firebase.diff(old_local_notebook, local_notebook)
#             @info "patches" patches
#             send(:update_notebook, Dict("updates" => patches))

#             # while (isready(IOBuffer))
#         end


#         @test_nowarn send(:connect, Dict())


#         @test update_local_notebook() do notebook
#             id = UUID("c2b7f6c9-2161-4d18-9e5b-0bad03e9ea59")
#             notebook["cell_dict"][id] = Dict(
#                 "cell_id" => id,
#                 "code_folded" => false,
#                 "code" => "10 + 20"
#             )
#             notebook["cell_order"] = [notebook["cell_order"]..., id]
#         end

#         # @test
#         @info "notebook" notebook

#         @test_nowarn send(:add_cell, Dict(:index => 0), Dict(:notebook_id => n))
#         send(:add_cell, Dict(:index => 0), Dict(:notebook_id => n))
#         send(:add_cell, Dict(:index => 0), Dict(:notebook_id => n))
#         @test length(notebook.cells) == 4
#         @test_nowarn send(:set_input, Dict(:code => "1 + 2"), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))
#         @test_nowarn send(:run_multiple_cells, Dict(:cells => [string(c.cell_id) for c in notebook.cells[1:2]]), Dict(:notebook_id => n))
#         @test_nowarn send(:set_bond, Dict(:sym => "x", :val => 9, :is_first_value => true), Dict(:notebook_id => n))
#         @test_nowarn send(:change_cell, Dict(:code => "1+1"), Dict(:notebook_id => n, :cell_id => c(notebook.cells[3])))
#         @test_nowarn send(:delete_cell, Dict(), Dict(:notebook_id => n, :cell_id => c(notebook.cells[4])))

#         @test_nowarn send(:move_multiple_cells, Dict(:cells => [c(notebook.cells[3])], :index => 1), Dict(:notebook_id => n))
#         @test_nowarn send(:fold_cell, Dict(:folded => true), Dict(:notebook_id => n, :cell_id => c(notebook.cells[1])))

#         @test_nowarn send(:move_notebook_file, Dict(:path => tempname()), Dict(:notebook_id => n))
        
#         # TODO: we need to wait for all above command to finish before we can do this:
#         # send(:shutdown_notebook, Dict(:keep_in_session => false), Dict(:notebook_id => n))
#     end

#     @testset "Docs" begin
#         @test occursin("square root", Pluto.PlutoRunner.doc_fetcher("sqrt")[1])
#         @test occursin("square root", Pluto.PlutoRunner.doc_fetcher("Base.sqrt")[1])
#         @test occursin("No documentation found", Pluto.PlutoRunner.doc_fetcher("Base.findmeta")[1])
#     end
# end

# # TODO: test returned data
