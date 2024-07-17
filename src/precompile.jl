using PrecompileTools: PrecompileTools

PrecompileTools.@compile_workload begin
    nb = JIVEbook.Notebook([
        JIVEbook.Cell("""md"Hello *world*" """)
        JIVEbook.Cell("""[f(x)]""")
        JIVEbook.Cell("""x = 1""")
        JIVEbook.Cell(
            """
            function f(z::Integer)
                z / 123
            end
            """)
        JIVEbook.Cell(
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
        topology = JIVEbook.updated_topology(nb.topology, nb, nb.cells)
        # Our reactive sorting algorithm.
        JIVEbook.topological_order(topology, topology.cell_order)
    end

    # let
    #     io = IOBuffer()
    #     # Notebook file format.
    #     JIVEbook.save_notebook(io, nb)
    #     seekstart(io)
    #     JIVEbook.load_notebook_nobackup(io, "whatever.jl")
    # end

    let
        state1 = JIVEbook.notebook_to_js(nb)
        state2 = JIVEbook.notebook_to_js(nb)
        # MsgPack
        JIVEbook.unpack(JIVEbook.pack(state1))
        # State diffing
        JIVEbook.Firebasey.diff(state1, state2)
    end

    s = JIVEbook.ServerSession(;
        options=JIVEbook.Configuration.from_flat_kwargs(
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
