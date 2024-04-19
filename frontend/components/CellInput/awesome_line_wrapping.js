import _ from "../../imports/lodash.js"
import { StateField, EditorView, Decoration } from "../../imports/CodemirrorPlutoSetup.js"
import { ReactWidget } from "./ReactWidget.js"
import { html } from "../../imports/Preact.js"

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */

let ARBITRARY_INDENT_LINE_WRAP_LIMIT = 12
let line_wrapping_decorations = StateField.define({
    create() {
        return Decoration.none
    },
    update(deco, tr) {
        // let tabSize = tr.state.tabSize
        let tabSize = 4

        if (!tr.docChanged && deco !== Decoration.none) return deco

        let decorations = []

        // TODO? Only apply to visible lines? Wouldn't that screw stuff up??
        // TODO? Don't create new decorations when a line hasn't changed?
        for (let i of _.range(0, tr.state.doc.lines)) {
            let line = tr.state.doc.line(i + 1)
            if (line.length === 0) continue

            let indented_tabs = 0
            for (let ch of line.text) {
                if (ch === "\t") {
                    indented_tabs++
                    // For now I ignore spaces... because they are weird... and stupid!
                    // } else if (ch === " ") {
                    //     indented_chars = indented_chars + 1
                    //     indented_text_characters++
                } else {
                    break
                }
            }

            const characters_to_count = Math.min(indented_tabs, ARBITRARY_INDENT_LINE_WRAP_LIMIT)
            const offset = characters_to_count * tabSize

            const linerwapper = Decoration.line({
                attributes: {
                    // style: rules.cssText,
                    style: `--indented: ${offset}ch;`,
                    class: "awesome-wrapping-plugin-the-line",
                },
            })
            // Need to push before the tabs one else codemirror gets madddd
            decorations.push(linerwapper.range(line.from, line.from))

            if (characters_to_count !== 0) {
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

            // let tabs_in_front = Math.min(line.text.match(/^\t*/)[0].length) * tabSize

            // TODO? Cache the CSSStyleDeclaration?
            // This is used when we don't use a css class, but we do need a css class because
            // text-indent normally cascades, and we have to prevent that.
            // const rules = document.createElement("span").style
            // rules.setProperty("--idented", `${offset}px`)
            // rules.setProperty("text-indent", "calc(-1 * var(--idented) - 1px)") // I have no idea why, but without the - 1px it behaves weirdly periodically
            // rules.setProperty("padding-left", "calc(var(--idented) + var(--cm-left-padding, 4px))")
        }
        return Decoration.set(decorations)
    },
    provide: (f) => EditorView.decorations.from(f),
})

export let awesome_line_wrapping = [line_wrapping_decorations]
