
"These expressions get evaluated inside every newly create module inside a `Workspace`."
const workspace_preamble = [
    :(using Main.PlutoRunner, Main.PlutoRunner.Markdown, Main.PlutoRunner.InteractiveUtils),
    :(show, showable, showerror, repr, string, print, println), # https://github.com/JuliaLang/julia/issues/18181
]

const PLUTO_INNER_MODULE_NAME = Symbol("#___this_pluto_module_name")

const moduleworkspace_count = Ref(0)
function increment_current_module()::Symbol
    id = (moduleworkspace_count[] += 1)
    new_workspace_name = Symbol("workspace#", id)

    Core.eval(Main, :(
        module $(new_workspace_name)
            $(workspace_preamble...)
            const $(PLUTO_INNER_MODULE_NAME) = $(new_workspace_name)
        end
    ))

    new_workspace_name
end
