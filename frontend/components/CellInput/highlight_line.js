import { Decoration, ViewPlugin, EditorView, Facet, ViewUpdate } from "../../imports/CodemirrorPlutoSetup.js"

const highlighted_line = Decoration.line({
    attributes: { class: "cm-highlighted-line" },
})

/**
 * @param {EditorView} view
 */
function create_line_decorations(view) {
    let line_number = view.state.facet(HighlightLineFacet)
    if (line_number == null || line_number == undefined || line_number > view.state.doc.lines) {
        return Decoration.set([])
    }

    let line = view.state.doc.line(line_number)
    return Decoration.set([highlighted_line.range(line.from, line.from)])
}

/**
 * @type Facet<number?, number?>
 */
export const HighlightLineFacet = Facet.define({
    combine: (values) => values[0],
    compare: (a, b) => a === b,
})

export const highlightLinePlugin = () =>
    ViewPlugin.fromClass(
        class {
            updateDecos(view) {
                this.decorations = create_line_decorations(view)
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.updateDecos(view)
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (update.docChanged || update.state.facet(HighlightLineFacet) !== update.startState.facet(HighlightLineFacet)) {
                    this.updateDecos(update.view)
                }
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    )
