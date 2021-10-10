import _ from "../../imports/lodash.js"
import { EditorView, syntaxTree, Decoration, ViewUpdate, ViewPlugin, Facet } from "../../imports/CodemirrorPlutoSetup.js"
import { html, useEffect, useLayoutEffect, useRef, useState } from "../../imports/Preact.js"
import { ReactWidget } from "./ReactWidget.js"
import { execute_dynamic_function } from "../CellOutput.js"
import { observablehq_for_cells } from "../../common/SetupCellEnvironment.js"

const widgetRenderers = {
    Slider: function (state, setState, params) {
        return document.createElement("input")
    },
}

export const InlineWidget = ({ pluto_actions, notebook_id, identifier }) => {
    const [widget_state, set_widget_state] = useState(null)
    let container = useRef(/** @type {HTMLElement} */ (null))

    let [code, set_code] = useState(null)

    pluto_actions.send("get_widget_code", { query: identifier }, { notebook_id: notebook_id }).then(({ message }) => {
        const { code } = message
        set_code(code)
    })

    useLayoutEffect(() => {
        if (code != null) {
            ;(async () => {
                console.log("RENDERING ", code)

                let result = await execute_dynamic_function({
                    environment: {
                        this: null,
                        currentScript: null,
                        invalidation: new Promise(() => {}),
                        getPublishedObject: (id) => null,
                        state: widget_state,
                        setState: (newstate) => {
                            console.error("newstate ", newstate)
                            set_widget_state(newstate)
                        },
                        ...observablehq_for_cells,
                    },
                    code: code,
                })

                // const dom_result = renderer({
                //     state: widget_sate,
                //     setState: set_widget_state,
                //     props: {},
                // })
                container.current.appendChild(result)
            })()
        }
    }, [code])

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

        let call_range = null
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (type, from, to, getNode) => {
                // console.log("enter", type.name)

                if (type.name === "MacroExpression") {
                    is_inside_macro_expression = true
                    call_range = { from, to }
                }

                if (type.name == "MacroIdentifier" && is_inside_macro_expression) {
                    let macro_name = view.state.doc.sliceString(from, to)

                    if (macro_name === "@coolbind") {
                        is_inside_coolbind_call = true
                    }
                }

                if (type.name === "CallExpression" && is_inside_coolbind_call) {
                    is_call_inside_coolbind = true
                }

                if (type.name === "Identifier" && is_call_inside_coolbind) {
                    let identifier = view.state.doc.sliceString(from, to)
                    console.log("identiefniinef", identifier)
                    let widget = new ReactWidget(html`<${InlineWidget}
                        key=${identifier}
                        identifier=${identifier}
                        notebook_id=${notebook_id}
                        pluto_actions=${pluto_actions}
                    />`)
                    let deco = Decoration.replace({
                        widget: widget,
                        // inclusive: true,
                        // inclusiveStart: true,
                        // inclusiveEnd: true,
                        // point: true,
                    })
                    deco.point = true
                    let therange = deco.range(call_range.from, call_range.to)
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
