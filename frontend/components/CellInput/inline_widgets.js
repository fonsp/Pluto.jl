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

export const InlineWidget = ({ pluto_actions, notebook_id, identifier, set_julia_code, get_julia_code, on_submit, inline_widgets_state }) => {
    const [parameters, set_parameters] = useState(null)
    const [widget_state, set_widget_state] = useState(null)
    let container = useRef(/** @type {HTMLElement} */ (null))

    let [js_code, set_js_code] = useState(null)

    useEffect(() => {
        set_js_code(inline_widgets_state[identifier])
    }, [inline_widgets_state[identifier]])

    console.log(inline_widgets_state)
    // pluto_actions.send("get_widget_code", { query: identifier }, { notebook_id: notebook_id }).then(({ message }) => {
    //     const { code } = message
    //     set_js_code(code)
    // })

    const to_julia_code = async (js_value) => {
        const {
            message: { julia_code },
        } = await pluto_actions.send("to_julia_code", { query: js_value }, { notebook_id })
        return julia_code
    }

    const from_julia_code = async (julia_code) => {
        const { message } = await pluto_actions.send("from_julia_code", { query: julia_code }, { notebook_id })
        return message
    }

    useEffect(() => {
        from_julia_code(get_julia_code()).then(({ state, parameters }) => {
            console.log("INITIAL JS VALUE RECEIVED ", state)
            set_parameters(parameters)
            set_widget_state({ current: state })
        })
    }, [])

    useLayoutEffect(() => {
        if (js_code == null) {
            container.current.innerHTML = "🍄"
        } else if (widget_state != null) {
            ;(async () => {
                console.log("RENDERING ", js_code)

                let result = await execute_dynamic_function({
                    environment: {
                        this: null,
                        currentScript: null,
                        invalidation: new Promise(() => {}),
                        getPublishedObject: (id) => null,
                        props: parameters,
                        getState: () => {
                            // console.log(widget_state, widget_state.current)
                            return widget_state.current
                        },
                        setState: async (newstate) => {
                            console.error("newstate ", newstate)
                            widget_state.current = newstate
                            set_julia_code(await to_julia_code(newstate))
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
                container.current.innerHTML = ""
                container.current.appendChild(result)
            })()
        }
    }, [js_code, parameters != null, widget_state != null])

    return html` <span ref=${container}></span> `
}

/**
 * @param {EditorView} view
 * @param {Object} props
 */
function inline_decorations(view, { pluto_actions, notebook_id, on_submit_debounced, inline_widgets_state }) {
    let widgets = []
    for (let { from, to } of view.visibleRanges) {
        let is_inside_macro_expression = false
        let is_inside_coolbind_call = false
        let is_call_inside_coolbind = false
        let is_first_after_call = false

        let macro_call_range = null
        let call_range = null
        let first_argument_range = null
        // let changed_offset = 0

        let identifier = null
        let node = null
        let param_range = null
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (type) => {
                const {from, to} = type
                // console.log("enter", {
                //     name: type.name,
                //     content: view.state.doc.sliceString(from, to) })

                if (is_first_after_call) {
                    first_argument_range = { from, to }
                    is_first_after_call = false
                }

                if (type.name === "ArgumentList" && is_call_inside_coolbind && is_inside_coolbind_call) {
                    // const args = view.state.doc.sliceString(from, to)
                    // console.log("args = ", args)
                    is_first_after_call = true
                }

                if (type.name === "MacroExpression") {
                    is_inside_macro_expression = true
                    macro_call_range = { from, to }
                }

                if (type.name == "MacroIdentifier" && is_inside_macro_expression) {
                    let macro_name = view.state.doc.sliceString(from, to)

                    if (macro_name === "@coolbind") {
                        is_inside_coolbind_call = true
                        console.log({ is_inside_coolbind_call })
                    }
                }

                if (type.name === "CallExpression" && is_inside_coolbind_call) {
                    is_call_inside_coolbind = true
                    call_range = { from, to }
                }

                if (type.name === "Identifier" && is_call_inside_coolbind && identifier == null) {
                    identifier = view.state.doc.sliceString(from, to)
                }
            },
            leave: (type, from, to) => {
                // if (type.name === "MacroExpression") {
                //     is_inside_macro_expression = false
                //     is_call_inside_coolbind = false
                //     is_inside_coolbind_call = false
                // }

                console.log("Leaving ", type.name)
                if (type.name === "MacroExpression") {
                    // is_inside_coolbind_call = false
                    is_call_inside_coolbind = false
                    is_inside_macro_expression = false
                    // call_range = null
                }

                if (type.name == "MacroIdentifier" && is_inside_macro_expression) {
                    // is_inside_coolbind_call = false
                }

                // Slider(...)
                if (type.name === "CallExpression" && is_inside_coolbind_call) {
                    // Create the widget
                    // console.log("identiefniinef", identifier)
                    // console.log("node", node)

                    // This identifier is not registered inside PlutoRunner
                    // Don't create a decoration
                    if (!(identifier in inline_widgets_state)) {
                        return;
                    }

                    let current_call_range = {...call_range};
                    let widget = new ReactWidget(
                        html`<${InlineWidget}
                            key=${identifier}
                            identifier=${identifier}
                            notebook_id=${notebook_id}
                            pluto_actions=${pluto_actions}
                            inline_widgets_state=${inline_widgets_state}
                            set_julia_code=${(new_state) => {
                                // const newcode = `${identifier}(${new_state}${""})`
                                replaceRange6(view, new_state, first_argument_range.from, first_argument_range.to)

                                let old_length = first_argument_range.to - first_argument_range.from
                                let new_length = new_state.length

                                call_range.to += new_length - old_length
                                first_argument_range.to += new_length - old_length

                                on_submit_debounced()
                            }}
                            get_julia_code=${() => {
                                return getRange6(view, current_call_range.from, current_call_range.to)
                            }}
                        />`,
                        [inline_widgets_state[identifier], identifier]
                    )
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

                    widgets.push(therange)

                    is_inside_coolbind_call = false
                }
            },
        })
    }

    // console.error(widgets)
    return Decoration.set(widgets)
}

export const InlineWidgetsFacet = Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => {
        return _.isEqual(a, b)
    },
})

export const inlineWidgetsPlugin = ({ pluto_actions, notebook_id, on_submit_debounced }) =>
    ViewPlugin.fromClass(
        class {
            update_decos(view) {
                const ds = inline_decorations(view, {
                    pluto_actions,
                    notebook_id,
                    on_submit_debounced,
                    inline_widgets_state: view.state.facet(InlineWidgetsFacet),
                })
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
                const will_update =
                    update.docChanged || update.viewportChanged || update.state.facet(InlineWidgetsFacet) !== update.startState.facet(InlineWidgetsFacet)
                console.log("updating plugin ", update.state.facet(InlineWidgetsFacet), update.startState.facet(InlineWidgetsFacet), will_update)
                if (will_update) {
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
