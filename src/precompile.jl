using SnoopPrecompile: SnoopPrecompile

const __TEST_NOTEBOOK_ID = uuid1()

module __Foo end

SnoopPrecompile.@precompile_all_calls begin
    let
        channel = Channel{Any}(10)
        Pluto.PlutoRunner.setup_plutologger(
            __TEST_NOTEBOOK_ID,
            channel,
        )
    end
    expr = Expr(:toplevel, :(1 + 1))
    Pluto.PlutoRunner.run_expression(__Foo, expr, __TEST_NOTEBOOK_ID, uuid1(), nothing);

    function wait_for_ready(notebook::Pluto.Notebook)
        while notebook.process_status != Pluto.ProcessStatus.ready
            sleep(0.1)
        end
    end

    nb = Pluto.Notebook([
        Pluto.Cell("""md"Hello *world*" """)
        Pluto.Cell("""[f(x)]""")
        Pluto.Cell("""x = 1""")
        Pluto.Cell(
            """
            function f(z::Integer)
                z / 123
            end
            """)
        Pluto.Cell(
            """
            "asdf"
            begin
                while false
                    local p = 123
                    try
                        [(x,a...) for x in (a for a in b)]
                        A.B.hello() do z
                            @gensym z
                            (z) -> z/:(z / z)
                        end
                    catch
                    end
                end
            end
            """
        )
    ])
    let
        topology = Pluto.updated_topology(nb.topology, nb, nb.cells)
        # Our reactive sorting algorithm.
        Pluto.topological_order(topology, topology.cell_order)
    end

    let
        io = IOBuffer()
        # Notebook file format.
        Pluto.save_notebook(io, nb)
        seekstart(io)
        Pluto.load_notebook_nobackup(io, "whatever.jl")
    end

    let
        state1 = Pluto.notebook_to_js(nb)
        state2 = Pluto.notebook_to_js(nb)
        # MsgPack
        Pluto.unpack(Pluto.pack(state1))
        # State diffing
        Pluto.Firebasey.diff(state1, state2)
    end

    let
        show_richest = Pluto.PlutoRunner.show_richest
        io = IOBuffer()
        show_richest(io, (; n=1))
        show_richest(io, [1, 2])
        show_richest(io, [1, "2"])
        show_richest(io, Dict("A" => 1))
    end

    s = Pluto.ServerSession(;
        options=Pluto.Configuration.from_flat_kwargs(
            disable_writing_notebook_files=true,
            workspace_use_distributed=false,
            auto_reload_from_file=false,
            run_notebook_on_load=false,
            lazy_workspace_creation=true,
            capture_stdout=false,
        )
    )

    # This creates the HTTP router, which we can call directly with a fake `HTTP.Request`, and it will return a `HTTP.Response`.
    # This way, we can precompile a bit of HTTP, without touching anything that uses Sockets.
    router = Pluto.http_router_for(s)
    router(Pluto.HTTP.Request("GET", "/?secret=$(s.secret)"))

    PkgCompat.create_empty_ctx()
    PkgCompat.check_registry_age()
end

using PrecompileSignatures: @precompile_signatures
@precompile_signatures(Pluto)
