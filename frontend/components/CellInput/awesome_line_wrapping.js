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
        return { defaultCharacterWidth: null, measuredSpaceWidth: null, measuredTabWidth: null }
    },
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(CharacterWidthEffect)) return effect.value
        }
        return value
    },
})

// https://github.com/codemirror/view/blob/590690c71df9a3f25fd4d78edea5322f18114507/src/dom.ts#L223
/** @type {Range} */
let scratchRange
export function textRange(node, from, to = from) {
    let range = scratchRange || (scratchRange = document.createRange())
    range.setEnd(node, to)
    range.setStart(node, from)
    console.log(`range:`, range.cloneContents())
    console.log(`range:`, range.startOffset, range.endOffset)
    console.log(`range:`, range)
    return range
}
// https://github.com/codemirror/view/blob/590690c71df9a3f25fd4d78edea5322f18114507/src/dom.ts#L41
export function clientRectsFor(dom) {
    if (dom.nodeType == 3) return textRange(dom, 0, dom.nodeValue.length).getClientRects()
    else if (dom.nodeType == 1) return dom.getClientRects()
    else return []
}

let character_width_listener = EditorView.updateListener.of((viewupdate) => {
    let width = viewupdate.view.defaultCharacterWidth
    let { defaultCharacterWidth, measuredSpaceWidth } = viewupdate.view.state.field(extra_cycle_character_width, false)

    // I assume that codemirror will notice if text size changes,
    // so only then I'll also re-measure the space width.
    if (defaultCharacterWidth !== width) {
        // Tried to adapt so it would always use the dummy line (with just spaces), but it never seems to work
        // https://github.com/codemirror/view/blob/41eaf3e1435ec62ecb128f7e4b8d4df2a02140db/src/docview.ts#L324-L343
        // I guess best to first fix defaultCharacterWidth in CM6,
        // but eventually we'll need a way to actually measures the identation of the line.
        // Hopefully this person will respond:
        // https://discuss.codemirror.net/t/custom-dom-inline-styles/3563/10
        let space_width
        let tab_width
        // @ts-ignore

        viewupdate.view.dispatch({
            effects: [
                CharacterWidthEffect.of({
                    defaultCharacterWidth: width,
                    measuredSpaceWidth: space_width,
                    measuredTabWidth: tab_width,
                }),
            ],
        })
    }
})

let indent_decorations = StateField.define({
    create() {
        return Decoration.none
    },
    update(deco, tr) {
        if (!tr.docChanged && deco !== Decoration.none) return deco

        let decorations = []

        for (let i of _.range(0, tr.state.doc.lines)) {
            let line = tr.state.doc.line(i + 1)
            if (line.length === 0) continue

            let indented_chars = 0
            for (let ch of line.text) {
                if (ch === "\t") {
                    indented_chars = indented_chars + 1
                } else if (ch === " ") {
                    indented_chars = indented_chars + 1
                } else {
                    break
                }
            }

            const line_wrapping = Decoration.line({
                attributes: {
                    style: "display: flex",
                },
            })
            decorations.push(line_wrapping.range(line.from, line.from))

            if (indented_chars !== 0) {
                const wrap_indentation = Decoration.mark({
                    class: "indentation",
                    attributes: {
                        style: "flex-shrink: 0;",
                    },
                })
                decorations.push(wrap_indentation.range(line.from, line.from + indented_chars))
            }

            if (line.from + indented_chars - line.to !== 0) {
                const wrap_rest = Decoration.mark({
                    class: "indentation-rest",
                })
                decorations.push(wrap_rest.range(line.from + indented_chars, line.to))
            }
        }
        return Decoration.set(decorations, true)
    },
    provide: (f) => EditorView.decorations.from(f),
})

let ARBITRARY_INDENT_LINE_WRAP_LIMIT = 48
let line_wrapping_decorations = StateField.define({
    create() {
        return Decoration.none
    },
    update(deco, tr) {
        let tabSize = tr.state.tabSize
        let previous = tr.startState.field(extra_cycle_character_width, false)
        let previous_space_width = previous.measuredSpaceWidth ?? previous.defaultCharacterWidth
        let { measuredSpaceWidth, defaultCharacterWidth } = tr.state.field(extra_cycle_character_width, false)
        let space_width = measuredSpaceWidth ?? defaultCharacterWidth

        if (space_width == null) return Decoration.none
        if (!tr.docChanged && deco !== Decoration.none && previous_space_width === space_width) return deco

        let decorations = []

        console.log(`space_width:`, space_width)

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
            const offset = Math.min(indented_chars, ARBITRARY_INDENT_LINE_WRAP_LIMIT) * space_width

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

// export let awesome_line_wrapping = [extra_cycle_character_width, character_width_listener, line_wrapping_decorations]
export let awesome_line_wrapping = [indent_decorations]
