import _ from "../../imports/lodash.js"
import { EditorView, syntaxTree, Decoration, ViewUpdate, ViewPlugin, Facet } from "../../imports/CodemirrorPlutoSetup.js"
import { html, useEffect, useLayoutEffect, useRef, useState } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"
import { execute_dynamic_function } from "../CellOutput.js"
import { observablehq_for_cells } from "../../common/SetupCellEnvironment.js"
import { getRange6, replaceRange6 } from "../CellInput.js"

const widgetRenderers = {
    Slider: function (state, setState, params) {
        return document.createElement("input")
    },
}

export const InlineWidget = ({ pluto_actions, notebook_id, identifier, set_julia_code, get_julia_code }) => {
    const [widget_state, set_widget_state] = useState(null)
    let container = useRef(/** @type {HTMLElement} */ (null))

    let [js_code, set_js_code] = useState(null)

    pluto_actions.send("get_widget_code", { query: identifier }, { notebook_id: notebook_id }).then(({ message }) => {
        const { code } = message
        set_js_code(code)
    })

    const to_julia_code = async (js_value) => {
        const {
            message: { julia_code },
        } = await pluto_actions.send("to_julia_code", { query: js_value }, { notebook_id })
        return julia_code
    }

    const from_julia_code = async (julia_code) => {
        const {
            message: { js_value },
        } = await pluto_actions.send("from_julia_code", { query: julia_code }, { notebook_id })
        return js_value
    }

    useEffect(() => {
        from_julia_code(get_julia_code()).then((r) => {
            console.log("INITIAL JS VALUE RECEIVED ", r)
            set_widget_state(r)
        })
    }, [])

    useLayoutEffect(() => {
        if (js_code != null && widget_state != null) {
            ;(async () => {
                console.log("RENDERING ", js_code)

                let result = await execute_dynamic_function({
                    environment: {
                        this: null,
                        currentScript: null,
                        invalidation: new Promise(() => {}),
                        getPublishedObject: (id) => null,
                        state: widget_state,
                        setState: async (newstate) => {
                            console.error("newstate ", newstate)
                            set_widget_state(newstate)
                            set_julia_code(`${identifier}(${await to_julia_code(newstate)})`)
                        },
                        ...observablehq_for_cells,
                    },
                    code: js_code,
                })

                // const dom_result = renderer({
                //     state: widget_sate,
                //     setState: set_widget_state,
                //     props: {},
                // })
                container.current.appendChild(result)
            })()
        }
    }, [js_code, widget_state != null])

    return html` <span ref=${container}></span> `
}

/**
 * @param {EditorView} view
 * @param {PkgstatusmarkWidgetProps} props
 */
function inline_decorations(view, { pluto_actions, notebook_id }) {
    let widgets = []
    for (let { from, to } of view.visibleRanges) {
        let is_inside_macro_expression = false
        let is_inside_coolbind_call = false
        let is_call_inside_coolbind = false

        let macro_call_range = null
        let call_range = null
        // let changed_offset = 0
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (type, from, to, getNode) => {
                // console.log("enter", type.name)

                if (type.name === "MacroExpression") {
                    is_inside_macro_expression = true
                    macro_call_range = { from, to }
                }

                if (type.name == "MacroIdentifier" && is_inside_macro_expression) {
                    let macro_name = view.state.doc.sliceString(from, to)

                    if (macro_name === "@coolbind") {
                        is_inside_coolbind_call = true
                    }
                }

                if (type.name === "CallExpression" && is_inside_coolbind_call) {
                    is_call_inside_coolbind = true
                    call_range = { from, to }
                }

                if (type.name === "Identifier" && is_call_inside_coolbind) {
                    let identifier = view.state.doc.sliceString(from, to)
                    console.log("identiefniinef", identifier)
                    let widget = new ReactWidget(html`<${InlineWidget}
                        key=${identifier}
                        identifier=${identifier}
                        notebook_id=${notebook_id}
                        pluto_actions=${pluto_actions}
                        set_julia_code=${(newcode) => {
                            replaceRange6(view, newcode, call_range.from, call_range.to)

                            let old_length = call_range.to - call_range.from
                            let new_length = newcode.length

                            call_range.to += new_length - old_length
                        }}
                        get_julia_code=${() => {
                            return getRange6(view, call_range.from, call_range.to)
                        }}
                    />`)
                    let deco = Decoration.replace({
                        widget: widget,
                        // inclusive: true,
                        // inclusiveStart: true,
                        // inclusiveEnd: true,
                        // point: true,
                    })
                    deco.point = true
                    let therange = deco.range(macro_call_range.from, macro_call_range.to)
                    // therange.point = true

                    is_call_inside_coolbind = false

                    widgets.push(therange)
                }
            },
            leave: (type, from, to) => {
                // if (type.name === "MacroExpression") {
                //     is_inside_macro_expression = false
                //     is_call_inside_coolbind = false
                //     is_inside_coolbind_call = false
                // }

                // console.log("Leaving ", type.name)
                if (type.name === "MacroExpression") {
                    // is_inside_coolbind_call = false
                    is_call_inside_coolbind = false
                    is_inside_macro_expression = false
                    // call_range = null
                }

                if (type.name == "MacroIdentifier" && is_inside_macro_expression) {
                    // is_inside_coolbind_call = false
                }

                if (type.name === "CallExpression" && is_inside_coolbind_call) {
                    is_inside_coolbind_call = false
                    // is_call_inside_coolbind = false
                }
            },
        })
    }

    console.error(widgets)
    return Decoration.set(widgets)
}

export const InlineWidgetsFacet = Facet.define({
    combine: (values) => values[0],
    compare: _.isEqual,
})

export const inlineWidgetsPlugin = ({ pluto_actions, notebook_id }) =>
    ViewPlugin.fromClass(
        class {
            update_decos(view) {
                const ds = inline_decorations(view, { pluto_actions, notebook_id, nbpkg: view.state.facet(InlineWidgetsFacet) })
                this.decorations = ds
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.update_decos(view)
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (update.docChanged || update.viewportChanged || update.state.facet(InlineWidgetsFacet) !== update.startState.facet(InlineWidgetsFacet)) {
                    this.update_decos(update.view)
                    return
                }
            }
        },
        {
            decorations: (v) => v.decorations,

            eventHandlers: {
                pointerdown: (e, view) => {
                    let target = e.target
                },
            },
        }
    )
