import _ from "../../imports/lodash.js"
import { StateField, EditorView, Decoration } from "../../imports/CodemirrorPlutoSetup.js"
import { ReactWidget } from "./ReactWidget.js"
import { html } from "../../imports/Preact.js"

const ARBITRARY_INDENT_LINE_WRAP_LIMIT = 12

export const get_start_tabs = (line) => /^\t*/.exec(line)?.[0] ?? ""

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
export const awesome_line_wrapping = StateField.define({
    create() {
        return Decoration.none
    },
    update(deco, tr) {
        const tabSize = tr.state.tabSize

        if (!tr.docChanged && deco !== Decoration.none) return deco

        let decorations = []

        // TODO? Don't create new decorations when a line hasn't changed?
        for (let i of _.range(0, tr.state.doc.lines)) {
            let line = tr.state.doc.line(i + 1)
            if (line.length === 0) continue

            const indented_tabs = get_start_tabs(line.text).length
            if (indented_tabs === 0) continue

            const characters_to_count = Math.min(indented_tabs, ARBITRARY_INDENT_LINE_WRAP_LIMIT)
            const offset = characters_to_count * tabSize

            const linerwapper = Decoration.line({
                attributes: {
                    style: `--indented: ${offset}ch;`,
                    class: "awesome-wrapping-plugin-the-line",
                },
            })
            // Need to push before the tabs one else codemirror gets madddd
            decorations.push(linerwapper.range(line.from, line.from))

            if (characters_to_count > 0) {
                decorations.push(
                    Decoration.mark({
                        class: "awesome-wrapping-plugin-the-tabs",
                    }).range(line.from, line.from + characters_to_count)
                )
            }
            if (indented_tabs > characters_to_count) {
                for (let i of _.range(characters_to_count, indented_tabs)) {
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
    },
    provide: (f) => EditorView.decorations.from(f),
})
