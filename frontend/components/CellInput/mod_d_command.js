import { EditorView, EditorSelection, selectNextOccurrence, syntaxTree } from "../../imports/CodemirrorPlutoSetup.js"

let array_at = (array, pos) => {
    return array.slice(pos, pos + 1)[0]
}

export let mod_d_command = {
    key: "Mod-d",
    /** @param {EditorView} view */
    run: ({ state, dispatch }) => {
        if (state.selection.main.empty) {
            let nodes_that_i_like = ["Identifier", "FieldName"]

            // Expand to closest Identifier
            let cursor_left = syntaxTree(state).cursorAt(state.selection.main.from, -1)
            let cursor_right = syntaxTree(state).cursorAt(state.selection.main.from, 1)

            for (let node_i_like of nodes_that_i_like) {
                let matching_node = cursor_left.name === node_i_like ? cursor_left : cursor_right.name === node_i_like ? cursor_right : null
                if (matching_node) {
                    dispatch({
                        selection: { anchor: matching_node.from, head: matching_node.to },
                    })
                    return true
                }
            }

            // If there is no cool syntax thing (say we are in a string), then just select the word.
            let line = state.doc.lineAt(state.selection.main.from)
            let position_relative_to_line = state.selection.main.from - line.from
            let before_cursor = line.text.slice(0, position_relative_to_line)
            let after_cursor = line.text.slice(position_relative_to_line)

            let word_before_cursor = before_cursor.match(/(\w+)$/)?.[0] ?? ""
            let word_after_cursor = after_cursor.match(/^(\w+)/)?.[0] ?? ""

            dispatch({
                selection: { anchor: state.selection.main.from - word_before_cursor.length, head: state.selection.main.from + word_after_cursor.length },
            })
        } else {
            selectNextOccurrence({ state, dispatch })
        }
        return false
    },
    /** @param {EditorView} view */
    shift: ({ state, dispatch }) => {
        if (state.selection.ranges.length === 1) return false

        // So funny thing, the index "before" (might wrap around) the mainIndex is the one you just selected
        // @ts-ignore
        let just_selected = state.selection.ranges.at(state.selection.mainIndex - 1)

        let new_ranges = state.selection.ranges.filter((x) => x !== just_selected)
        let new_main_index = new_ranges.indexOf(state.selection.main)

        let previous_selected = array_at(new_ranges, state.selection.mainIndex - 1)

        dispatch({
            selection: EditorSelection.create(new_ranges, new_main_index),
            effects: previous_selected == null ? [] : EditorView.scrollIntoView(previous_selected.from),
        })
        return true
    },
    preventDefault: true,
}
