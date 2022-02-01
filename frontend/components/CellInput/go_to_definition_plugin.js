import { Facet, ViewPlugin, Decoration, EditorView } from "../../imports/CodemirrorPlutoSetup.js"
import { ctrl_or_cmd_name, has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"
import _ from "../../imports/lodash.js"
import { ScopeStateField } from "./scopestate_statefield.js"

/**
 * @param {any} state
 * @param {{
 *  scopestate: import("./scopestate_statefield.js").ScopeState,
 *  global_definitions: { [key: string]: string }
 * }} context
 */
let get_variable_marks = (state, { scopestate, global_definitions }) => {
    return Decoration.set(
        scopestate.usages
            .map(({ definition, usage, name }) => {
                if (definition == null) {
                    // TODO variables_with_origin_cell should be notebook wide, not just in the current cell
                    // .... Because now it will only show variables after it has run once
                    if (global_definitions[name]) {
                        return Decoration.mark({
                            // TODO This used to be tagName: "a", but codemirror doesn't like that...
                            // .... https://github.com/fonsp/Pluto.jl/issues/1790
                            // .... Ideally we'd change it back to `a` (feels better), but functionally there is no difference..
                            // .... When I ever happen to find a lot of time I can spend on this, I'll debug and change it back to `a`
                            tagName: "pluto-variable-link",
                            attributes: {
                                "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${name}.`,
                                "data-pluto-variable": name,
                                "href": `#${name}`,
                            },
                        }).range(usage.from, usage.to)
                    } else {
                        // This could be used to trigger @edit when clicked, to open
                        // in whatever editor the person wants to use.
                        // return Decoration.mark({
                        //     tagName: "a",
                        //     attributes: {
                        //         "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${text}.`,
                        //         "data-external-variable": text,
                        //         "href": `#`,
                        //     },
                        // }).range(usage.from, usage.to)
                        return null
                    }
                } else {
                    // Could be used to select the definition of a variable inside the current cell
                    return Decoration.mark({
                        tagName: "pluto-variable-link",
                        attributes: {
                            "title": `${ctrl_or_cmd_name}-Click to jump to the definition of ${name}.`,
                            "data-cell-variable": name,
                            "data-cell-variable-from": `${definition.from}`,
                            "data-cell-variable-to": `${definition.to}`,
                            "href": `#`,
                        },
                    }).range(usage.from, usage.to)
                    return null
                }
            })
            .filter((x) => x != null),
        true
    )
}

/**
 * @type {Facet<{ [variable_name: string]: string }, { [variable_name: string]: string }>}
 */
export const GlobalDefinitionsFacet = Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
})

export const go_to_definition_plugin = ViewPlugin.fromClass(
    class {
        /**
         * @param {EditorView} view
         */
        constructor(view) {
            let global_definitions = view.state.facet(GlobalDefinitionsFacet)
            this.decorations = get_variable_marks(view.state, {
                scopestate: view.state.field(ScopeStateField),
                global_definitions,
            })
        }

        update(update) {
            // My best take on getting this to update when GlobalDefinitionsFacet does 🤷‍♀️
            let global_definitions = update.state.facet(GlobalDefinitionsFacet)
            if (update.docChanged || update.viewportChanged || global_definitions !== update.startState.facet(GlobalDefinitionsFacet)) {
                this.decorations = get_variable_marks(update.state, {
                    scopestate: update.state.field(ScopeStateField),
                    global_definitions,
                })
            }
        }
    },
    {
        decorations: (v) => v.decorations,

        eventHandlers: {
            pointerdown: (event, view) => {
                if (has_ctrl_or_cmd_pressed(event) && event.button === 0 && event.target instanceof Element) {
                    let pluto_variable = event.target.closest("[data-pluto-variable]")
                    if (pluto_variable) {
                        let variable = pluto_variable.getAttribute("data-pluto-variable")

                        event.preventDefault()
                        let scrollto_selector = `[id='${encodeURI(variable)}']`
                        document.querySelector(scrollto_selector).scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        })

                        // TODO Something fancy where it counts going to definition as a page in history,
                        // .... so pressing/swiping back will go back to where you clicked on the definition.
                        // window.history.replaceState({ scrollTop: document.documentElement.scrollTop }, null)
                        // window.history.pushState({ scrollTo: scrollto_selector }, null)

                        let global_definitions = view.state.facet(GlobalDefinitionsFacet)

                        // TODO Something fancy where we actually emit the identifier we are looking for,
                        // .... and the cell then selects exactly that definition (using lezer and cool stuff)
                        if (global_definitions[variable]) {
                            window.dispatchEvent(
                                new CustomEvent("cell_focus", {
                                    detail: {
                                        cell_id: global_definitions[variable],
                                        line: 0, // 1-based to 0-based index
                                        definition_of: variable,
                                    },
                                })
                            )
                            return true
                        }
                    }

                    let cell_variable = event.target.closest("[data-cell-variable]")
                    if (cell_variable) {
                        let variable_name = cell_variable.getAttribute("data-cell-variable")
                        let variable_from = Number(cell_variable.getAttribute("data-cell-variable-from"))
                        let variable_to = Number(cell_variable.getAttribute("data-cell-variable-to"))

                        view.dispatch({
                            scrollIntoView: true,
                            selection: { anchor: variable_from, head: variable_to },
                        })
                        view.focus()
                        return true
                    }
                }
            },
        },
    }
)
