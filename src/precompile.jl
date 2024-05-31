using PrecompileTools: PrecompileTools

PrecompileTools.@compile_workload begin
    nb = Eris.Notebook([
        Eris.Cell("""md"Hello *world*" """)
        Eris.Cell("""[f(x)]""")
        Eris.Cell("""x = 1""")
        Eris.Cell(
            """
            function f(z::Integer)
                z / 123
            end
            """)
        Eris.Cell(
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
        topology = Eris.updated_topology(nb.topology, nb, nb.cells)
        # Our reactive sorting algorithm.
        Eris.topological_order(topology, topology.cell_order)
    end

    # let
    #     io = IOBuffer()
    #     # Notebook file format.
    #     Eris.save_notebook(io, nb)
    #     seekstart(io)
    #     Eris.load_notebook_nobackup(io, "whatever.jl")
    # end

    let
        state1 = Eris.notebook_to_js(nb)
        state2 = Eris.notebook_to_js(nb)
        # MsgPack
        Eris.unpack(Eris.pack(state1))
        # State diffing
        Eris.Firebasey.diff(state1, state2)
    end

    s = Eris.ServerSession(;
        options=Eris.Configuration.from_flat_kwargs(
            disable_writing_notebook_files=true,
            workspace_use_distributed=false,
            auto_reload_from_file=false,
            run_notebook_on_load=false,
            lazy_workspace_creation=true,
            capture_stdout=false,
        )
    )
end

using PrecompileSignatures: @precompile_signatures
@precompile_signatures(Pluto)
