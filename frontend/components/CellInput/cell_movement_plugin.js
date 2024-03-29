import { EditorView, autocomplete, EditorState, keymap } from "../../imports/CodemirrorPlutoSetup.js"

/**
 * Cell movement plugin!
 *
 * Two goals:
 * - Make movement and operations on the edges of cells work with their neighbors
 * - Prevent holding a button down to continue operations on neighboring cells
 *
 * I lean a lot on `view.moveByChar` and `view.moveVertically` from codemirror.
 * They will give you the position of the cursor after moving, and comparing that
 * to the current selection will tell you if the cursor would have moved normally.
 * If it would have moved normally, we don't do anything. Else, it's our time
 *
 * We use that in the keysmaps and the prevention of holding a button down.
 *
 * TODO Move the cursor to the same column in the new cell when moving vertically
 * TODO Put delete and backspace and such here too, but is harder because they
 * .... need to also modify this/the neighbor cell.
 */

/**
 * @typedef FocusOnNeighborFunction
 * @type {(options: { cell_delta: number, line: number, character: number }) => void}
 */

/**
 * @param {object} options
 * @param {FocusOnNeighborFunction} options.focus_on_neighbor
 */
let cell_movement_keys = ({ focus_on_neighbor }) => {
    // All arrows do basically the same now:
    // - Check if the cursor would have moved normally
    // - If it would have moved normally, don't do anything so codemirror can move the cursor
    // - Else move the cursor to the neighbor cell
    // TODO for verticals:

    const CellArrowLeft = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main
        if (!selection.empty) return false
        if (!view.moveByChar(selection, false).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: -1,
            line: Infinity,
            character: Infinity,
        })
        return true
    }
    const CellArrowRight = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main
        if (!selection.empty) return false
        if (!view.moveByChar(selection, true).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: 1,
            line: 0,
            character: 0,
        })
        return true
    }
    const CellArrowUp = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main
        if (!selection.empty) return false
        if (!view.moveVertically(selection, false).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: -1,
            line: Infinity,
            character: Infinity,
        })
        return true
    }
    const CellArrowDown = (/** @type {EditorView} */ view) => {
        let selection = view.state.selection.main
        if (!selection.empty) return false
        if (!view.moveVertically(selection, true).eq(selection)) return false

        focus_on_neighbor({
            cell_delta: 1,
            line: 0,
            character: 0,
        })
        return true
    }

    const CellPageUp = () => {
        focus_on_neighbor({
            cell_delta: -1,
            line: 0,
            character: 0,
        })

        return true
    }

    const CellPageDown = () => {
        focus_on_neighbor({
            cell_delta: +1,
            line: 0,
            character: 0,
        })
        return true
    }

    return keymap.of([
        { key: "PageUp", run: CellPageUp },
        { key: "PageDown", run: CellPageDown },
        { key: "ArrowLeft", run: CellArrowLeft },
        { key: "ArrowUp", run: CellArrowUp },
        { key: "ArrowRight", run: CellArrowRight },
        { key: "ArrowDown", run: CellArrowDown },
    ])
}

// Don't-accidentally-remove-cells-plugin
// Because we need some extra info about the key, namely if it is on repeat or not,
// we can't use a keymap (keymaps don't give us the event with `repeat` property),
// so we use a custom keydown event handler.
export let prevent_holding_a_key_from_doing_things_across_cells = EditorView.domEventHandlers({
    keydown: (event, view) => {
        // TODO We could also require a re-press after a force focus, because
        // .... currently if you delete another cell, but keep holding down the backspace (or delete),
        // .... you'll still be deleting characters (because view.state.doc.length will be > 0)

        // Screw multicursor support on these things
        let selection = view.state.selection.main
        // Also only cursors and not selections
        if (!selection.empty) return false
        // Kinda the whole thing of this plugin, no?
        if (!event.repeat) return false

        if (event.key === "Backspace") {
            if (view.state.doc.length === 0) {
                // Only if this would be a cell-deleting backspace, we jump in
                return true
            }
        }
        if (event.key === "Delete") {
            if (view.state.doc.length === 0) {
                // Only if this would be a cell-deleting backspace, we jump in
                return true
            }
        }

        // Because of the "hacky" way this works, we need to check if autocompletion is open...
        // else we'll block the ability to press ArrowDown for autocomplete....

        let autocompletion_open = autocomplete.completionStatus(view.state) === "active"

        // If we have a cursor instead of a multicharacter selection:
        if (event.key === "ArrowUp" && !autocompletion_open) {
            if (!view.moveVertically(view.state.selection.main, false).eq(selection)) return false
            return true
        }
        if (event.key === "ArrowDown" && !autocompletion_open) {
            if (!view.moveVertically(view.state.selection.main, true).eq(selection)) return false
            return true
        }
        if (event.key === "ArrowLeft" && event.repeat) {
            if (!view.moveByChar(selection, false).eq(selection)) return false
            return true
        }
        if (event.key === "ArrowRight") {
            if (!view.moveByChar(selection, true).eq(selection)) return false
            return true
        }
    },
})

/**
 * @param {object} options
 * @param {FocusOnNeighborFunction} options.focus_on_neighbor
 */
export let cell_movement_plugin = ({ focus_on_neighbor }) => cell_movement_keys({ focus_on_neighbor })
