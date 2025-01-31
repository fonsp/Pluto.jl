import { render } from "../../imports/Preact.js"
import { EditorView, WidgetType, ViewUpdate, ViewPlugin, syntaxTree, Decoration } from "../../imports/CodemirrorPlutoSetup.js"
import { has_ctrl_or_cmd_pressed } from "../../common/KeyboardShortcuts.js"

class CheckboxWidget extends WidgetType {
    checked

    constructor(checked) {
        super()
        this.checked = checked
    }

    eq(other) {
        return other.checked == this.checked
    }

    toDOM() {
        let wrap = document.createElement("span")
        wrap.setAttribute("aria-hidden", "true")
        wrap.className = "cm-boolean-toggle"
        let box = wrap.appendChild(document.createElement("input"))
        box.type = "checkbox"
        box.checked = this.checked
        return wrap
    }

    ignoreEvent() {
        return false
    }
}

const magic_number_class = "magic-number-yay"

/**
 * @param {EditorView} view
 */
function checkboxes(view) {
    let widgets = []
    for (let { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "BooleanLiteral") {
                    let isTrue = view.state.doc.sliceString(node.from, node.to) === "true"
                    let deco = Decoration.replace({
                        widget: new CheckboxWidget(isTrue),
                        // side: 1,
                    })
                    widgets.push(deco.range(node.from, node.to))
                }
            },
        })
    }

    for (let { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "Number") {
                    let str = view.state.doc.sliceString(node.from, node.to)
                    if (!julia_number_supported(str)) return
                    let deco = Decoration.mark({
                        class: magic_number_class,
                        attributes: { "data-magic-number": "yes" },
                    })
                    widgets.push(deco.range(node.from, node.to))
                }
            },
        })
    }

    return Decoration.set(widgets)
}

const julia_number_supported = (str) => {
    return str.match(/^\d+(\.\d+)?$/) != null
}

const julia_string_to_number = (str) => {
    return parseFloat(str)
}

const dragged_value = (start_string, delta) => {
    const is_float = start_string.includes(".")

    return Math.round(julia_string_to_number(start_string) + delta * 0.3).toString()
}

export const checkboxPlugin = ({ run_cell }) => {
    let dragging = false
    /** @type {any} */
    let node = null
    /** @type {PointerEvent?} */
    let drag_start_event = null

    let start_str = "3.14"

    return ViewPlugin.fromClass(
        class {
            decorations

            constructor(view) {
                this.decorations = checkboxes(view)
            }

            update(update) {
                if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) != syntaxTree(update.state))
                    this.decorations = checkboxes(update.view)
            }
        },
        {
            decorations: (v) => v.decorations,

            eventHandlers: {
                mousedown: (e, view) => {
                    let target = e.target
                    if (target instanceof HTMLElement && target.nodeName == "INPUT" && target.parentElement?.classList?.contains?.("cm-boolean-toggle"))
                        return toggleBoolean(view, view.posAtDOM(target))
                },

                pointerdown: (e, view) => {
                    console.log(e)
                    if (!has_ctrl_or_cmd_pressed(e)) return
                    const target = e.target
                    if (!(target instanceof HTMLElement)) return
                    const mn = target.closest(`.${magic_number_class}`)
                    if (mn == null) return

                    const pos = view.posAtDOM(mn)
                    node = syntaxTree(view.state).resolve(pos, 1)
                    drag_start_event = e

                    start_str = view.state.doc.sliceString(node.from, node.to)

                    if (!julia_number_supported(start_str)) return

                    console.log({ pos, node, start_str })

                    dragging = true
                    return true
                },

                pointerup: (e, view) => {
                    dragging = false
                },

                pointerleave: (e, view) => {
                    dragging = false
                },

                pointermove: (e, view) => {
                    if (!dragging || drag_start_event == null) return

                    const delta = drag_start_event.clientY - e.clientY

                    const new_str = dragged_value(start_str, delta)
                    const current_str = view.state.doc.sliceString(node.from, node.to)
                    if (new_str === current_str) return

                    view.dispatch({
                        changes: { from: node.from, to: node.to, insert: new_str },
                    })
                    // the string length might have changed, so we need to re-resolve the node
                    node = syntaxTree(view.state).resolve(node.from, 1)

                    // run the cell with this new code
                    run_cell()
                },
            },
        }
    )
}

/**
 * @param {EditorView} view
 * @param {number} pos
 */
function toggleBoolean(view, pos) {
    let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
    let change
    if (before == "false") change = { from: pos - 5, to: pos, insert: "true" }
    else if (before.endsWith("true")) change = { from: pos - 4, to: pos, insert: "false" }
    else return false
    view.dispatch({ changes: change })
    return true
}
