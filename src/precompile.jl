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

    session = Pluto.ServerSession()
    session.options.evaluation.workspace_use_distributed = false
    basic = joinpath(pkgdir(Pluto), "sample", "Basic.jl")
    nb = Pluto.load_notebook_nobackup(basic)

    # Compiling PlutoRunner is very beneficial because it saves time in each notebook.
    let
        show_richest = Pluto.PlutoRunner.show_richest
        io = IOBuffer()
        show_richest(io, (; n=1))
        show_richest(io, [1, 2])
        show_richest(io, [1, "2"])
        show_richest(io, Dict("A" => 1))
    end

    # Would be really nice if HTTP.jl would add precompilation for HTTP.request.
    HTTP.stack()

    PkgCompat.create_empty_ctx()
    PkgCompat.check_registry_age()
end

using PrecompileSignatures: @precompile_signatures
@precompile_signatures(Pluto)
