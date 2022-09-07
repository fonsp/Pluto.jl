import { EditorView, Facet } from "../imports/CodemirrorPlutoSetup.js"
import { linter } from "../imports/CodemirrorPlutoSetup.js"
import { GlobalDefinitionsFacet } from "./CellInput/go_to_definition_plugin.js"
import { ScopeStateField } from "./CellInput/scopestate_statefield.js"

export const RunningDisabledFacet = Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b,
})

export const diagnostic_linter = ({ cell_id, pluto_actions }) =>
    linter((/** @type EditorView */ editorView) => {
        const state = editorView.state
        const running_disabled = state.facet(RunningDisabledFacet)

        if (running_disabled) {
            return []
        }

        let scopestate = state.field(ScopeStateField)
        let global_definitions = state.facet(GlobalDefinitionsFacet)
        const dangerous = Object.entries(global_definitions)
            .filter(([name, cell_ids]) => scopestate.definitions.has(name) && cell_ids.find((cell) => cell !== cell_id) !== undefined)
            .map(([name, _]) => name)

        return dangerous.map((variable) => {
            const range = scopestate.definitions.get(variable)
            let i = 2
            let new_name = variable + i
            // TODO: Should also check at the cursor insertion point that the name is not taken locally
            while (new_name in global_definitions) {
                i++
                new_name = variable + i
            }
            const diagnostic = {
                ...range,
                severity: "warning",
                source: "MultipleDefinitionWarnings",
                message: `${variable} is already defined in another cell`,
                actions: [
                    {
                        name: `Rename ${variable} in ${new_name}`,
                        apply: (view, from, to) => {
                            const transaction = view.state.update({ changes: { from, to, insert: new_name } })
                            view.dispatch(transaction)
                        },
                    },
                    {
                        name: `Disable the other definition of ${variable}`,
                        apply: async () => {
                            // Can we group update?
                            await pluto_actions.update_notebook((notebook) => {
                                for (let cell of global_definitions[variable]) {
                                    if (cell !== cell_id) {
                                        notebook.cell_inputs[cell].metadata.disabled = true
                                    }
                                }
                            })
                            await pluto_actions.set_and_run_multiple([cell_id])
                        },
                    },
                ],
            }
            return diagnostic
        })
    })
