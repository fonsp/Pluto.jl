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

    🍭 = Pluto.ServerSession()

    HTTP.stack()

    PkgCompat.create_empty_ctx()
    PkgCompat.check_registry_age()
end
