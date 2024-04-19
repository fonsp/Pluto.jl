import _ from "../../imports/lodash.js"
import { StateField, EditorView, Decoration } from "../../imports/CodemirrorPlutoSetup.js"
import { ReactWidget } from "./ReactWidget.js"
import { html } from "../../imports/Preact.js"

const ARBITRARY_INDENT_LINE_WRAP_LIMIT = 12

export const get_start_tabs = (line) => /^\t*/.exec(line)?.[0] ?? ""

const get_decorations = (/** @type {import("../../imports/CodemirrorPlutoSetup.js").EditorState} */ state) => {
    let decorations = []

    // TODO? Don't create new decorations when a line hasn't changed?
    for (let i of _.range(0, state.doc.lines)) {
        let line = state.doc.line(i + 1)
        const num_tabs = get_start_tabs(line.text).length
        if (num_tabs === 0) continue

        const how_much_to_indent = Math.min(num_tabs, ARBITRARY_INDENT_LINE_WRAP_LIMIT)
        const offset = how_much_to_indent * state.tabSize

        const linerwapper = Decoration.line({
            attributes: {
                style: `--indented: ${offset}ch;`,
                class: "awesome-wrapping-plugin-the-line",
            },
        })
        // Need to push before the tabs one else codemirror gets madddd
        decorations.push(linerwapper.range(line.from, line.from))

        if (how_much_to_indent > 0) {
            decorations.push(
                Decoration.mark({
                    class: "awesome-wrapping-plugin-the-tabs",
                }).range(line.from, line.from + how_much_to_indent)
            )
        }
        if (num_tabs > how_much_to_indent) {
            for (let i of _.range(how_much_to_indent, num_tabs)) {
                decorations.push(
                    Decoration.replace({
                        widget: new ReactWidget(html`<span style=${{ opacity: 0.2 }}>⇥ </span>`),
                        block: false,
                    }).range(line.from + i, line.from + i + 1)
                )
            }
        }
    }
    return Decoration.set(decorations)
}

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
export const awesome_line_wrapping = StateField.define({
    create(state) {
        return get_decorations(state)
    },
    update(deco, tr) {
        if (!tr.docChanged) return deco
        return get_decorations(tr.state)
    },
    provide: (f) => EditorView.decorations.from(f),
})
