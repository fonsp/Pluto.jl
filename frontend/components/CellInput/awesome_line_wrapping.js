import _ from "../../imports/lodash.js"
import { StateEffect, StateField, EditorView, Decoration } from "../../imports/CodemirrorPlutoSetup.js"

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds padding-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 *
 * The identation decorations have to happen in a StateField (without access to the editor),
 * because they change the layout of the text :( The character width I need however, is in the editor...
 * So I do this ugly hack where I, in `character_width_listener`, I fire an effect that gets picked up
 * by another StateField (`extra_cycle_character_width`) that saves the character width into state,
 * so THEN I can add the markers in the decorations statefield.
 */

/** @type {any} */
const CharacterWidthEffect = StateEffect.define({})
const extra_cycle_character_width = StateField.define({
    create() {
        return null
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(CharacterWidthEffect)) return effect.value
        }
        return value
    },
})

let character_width_listener = EditorView.updateListener.of((viewupdate) => {
    let width = viewupdate.view.defaultCharacterWidth
    let current_width = viewupdate.view.state.field(extra_cycle_character_width, false)

    if (current_width !== width) {
        current_width = width
        viewupdate.view.dispatch({
            effects: [CharacterWidthEffect.of(current_width)],
        })
    }
})

let ARBITRARY_INDENT_LINE_WRAP_LIMIT = 48
let line_wrapping_decorations = StateField.define({
    create() {
        return Decoration.none
    },
    update(deco, tr) {
        let tabSize = tr.state.tabSize
        let previous_charWidth = tr.startState.field(extra_cycle_character_width, false)
        let charWidth = tr.state.field(extra_cycle_character_width, false)
        if (charWidth == null) return Decoration.none

        if (!tr.docChanged && deco !== Decoration.none && previous_charWidth === charWidth) return deco

        let decorations = []

        // TODO? Only apply to visible lines? Wouldn't that screw stuff up??
        // TODO? Don't create new decorations when a line hasn't changed?
        for (let i of _.range(0, tr.state.doc.lines)) {
            let line = tr.state.doc.line(i + 1)
            if (line.length === 0) continue

            let indented_chars = 0
            for (let ch of line.text) {
                if (ch === "\t") {
                    indented_chars = indented_chars + tabSize
                } else if (ch === " ") {
                    indented_chars = indented_chars + 1
                } else {
                    break
                }
            }

            // let tabs_in_front = Math.min(line.text.match(/^\t*/)[0].length) * tabSize
            const offset = Math.min(indented_chars, ARBITRARY_INDENT_LINE_WRAP_LIMIT) * charWidth

            // TODO? Cache the CSSStyleDeclaration?
            // This is used when we don't use a css class, but we do need a css class because
            // text-indent normally cascades, and we have to prevent that.
            // const rules = document.createElement("span").style
            // rules.setProperty("--idented", `${offset}px`)
            // rules.setProperty("text-indent", "calc(-1 * var(--idented) - 1px)") // I have no idea why, but without the - 1px it behaves weirdly periodically
            // rules.setProperty("padding-left", "calc(var(--idented) + var(--cm-left-padding, 4px))")

            const linerwapper = Decoration.line({
                attributes: {
                    // style: rules.cssText,
                    style: `--indented: ${offset}px;`,
                    class: "awesome-wrapping-plugin-indent",
                },
            })

            decorations.push(linerwapper.range(line.from, line.from))
        }
        return Decoration.set(decorations, true)
    },
    provide: (f) => EditorView.decorations.from(f),
})

export let awesome_line_wrapping = [extra_cycle_character_width, character_width_listener, line_wrapping_decorations]
