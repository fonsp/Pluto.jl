
function exported_names(mod::Module)
    @static if VERSION ≥ v"1.11.0-DEV.469"
        filter!(Base.Fix1(Base.isexported, mod), names(mod; all=true))
    else
        names(mod)
    end
end

function get_module_names(workspace_module, module_ex::Expr)
    try
        Core.eval(workspace_module, Expr(:call, exported_names, module_ex)) |> Set{Symbol}
    catch
        Set{Symbol}()
    end
end

function collect_soft_definitions(workspace_module, modules::Set{Expr})
    mapreduce(module_ex -> get_module_names(workspace_module, module_ex), union!, modules; init=Set{Symbol}())
end
