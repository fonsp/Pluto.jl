import { html, useState, useEffect, useLayoutEffect, useRef, useContext, useMemo } from "../imports/Preact.js"
import _ from "../imports/lodash.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { get_selected_doc_from_state } from "./CellInput/LiveDocsFromCursor.js"
import { go_to_definition_plugin, ScopeStateField, UsedVariablesFacet } from "./CellInput/go_to_definition_plugin.js"
import { detect_deserializer } from "../common/Serialization.js"

import {
    EditorState,
    EditorSelection,
    Compartment,
    EditorView,
    placeholder,
    julia_andrey,
    keymap,
    history,
    historyKeymap,
    defaultKeymap,
    indentMore,
    indentLess,
    tags,
    HighlightStyle,
    autocompletion,
    lineNumbers,
    highlightSpecialChars,
    foldGutter,
    drawSelection,
    indentOnInput,
    defaultHighlightStyle,
    closeBrackets,
    rectangularSelection,
    highlightSelectionMatches,
    closeBracketsKeymap,
    searchKeymap,
    foldKeymap,
    commentKeymap,
    completionKeymap,
    syntaxTree,
    Decoration,
    ViewUpdate,
    ViewPlugin,
    WidgetType,
    indentUnit,
    StateField,
    StateEffect,
} from "../imports/CodemirrorPlutoSetup.js"
import { pluto_autocomplete } from "./CellInput/pluto_autocomplete.js"
import { NotebookpackagesFacet, pkgBubblePlugin } from "./CellInput/pkg_bubble_plugin.js"
import { awesome_line_wrapping } from "./CellInput/awesome_line_wrapping.js"
import { drag_n_drop_plugin } from "./useDropHandler.js"
import { cell_movement_plugin } from "./CellInput/cell_movement_plugin.js"
import { pluto_paste_plugin } from "./CellInput/pluto_paste_plugin.js"
import { bracketMatching } from "./CellInput/block_matcher_plugin.js"
import { cl } from "../common/ClassTable.js"
import { useCompartment } from "./CellInput.js"

/**
 * @param {{
 *  remote_code: string,
 * }} props
 */
export const CellInputView = ({ remote_code }) => {
    const newcm_ref = useRef(/** @type {EditorView} */ (null))
    const dom_node_ref = useRef(/** @type {HTMLElement} */ (null))
    const remote_code_ref = useRef(null)

    let editable_compartment = useCompartment(newcm_ref, EditorView.editable.of(false))

    useLayoutEffect(() => {
        const newcm = (newcm_ref.current = new EditorView({
            /** Migration #0: New */
            state: EditorState.create({
                doc: remote_code,

                extensions: [
                    // Compartments coming from react state/props
                    editable_compartment,
                    pluto_syntax_colors,
                    lineNumbers(),
                    highlightSpecialChars(),
                    drawSelection(),
                    EditorState.allowMultipleSelections.of(true),
                    // Multiple cursors with `alt` instead of the default `ctrl` (which we use for go to definition)
                    EditorView.clickAddsSelectionRange.of((event) => event.altKey && !event.shiftKey),
                    defaultHighlightStyle.fallback,
                    // Experimental: Also add closing brackets for tripple string
                    // TODO also add closing string when typing a string macro
                    EditorState.languageData.of((state, pos, side) => {
                        return [{ closeBrackets: { brackets: ["(", "[", "{"] } }]
                    }),
                    closeBrackets(),
                    rectangularSelection({
                        eventFilter: (e) => e.altKey && e.shiftKey && e.button == 0,
                    }),
                    highlightSelectionMatches(),
                    bracketMatching(),
                    // Remove selection on blur
                    EditorState.tabSize.of(4),
                    indentUnit.of("\t"),
                    julia_andrey(),

                    EditorView.lineWrapping,
                    // Disabled awesome_line_wrapping because it still fails in a lot of cases
                    // awesome_line_wrapping,
                ],
            }),
            parent: dom_node_ref.current,
        }))
    }, [])

    // Effect to apply "remote_code" to the cell when it changes...
    // ideally this won't be necessary as we'll have actual multiplayer,
    // or something to tell the user that the cell is out of sync.
    useEffect(() => {
        if (newcm_ref.current == null) return // Not sure when and why this gave an error, but now it doesn't

        const current_value = getValue6(newcm_ref.current) ?? ""
        if (remote_code_ref.current == null && remote_code === "" && current_value !== "") {
            // this cell is being initialized with empty code, but it already has local code set.
            // this happens when pasting or dropping cells
            return
        }
        remote_code_ref.current = remote_code
        if (current_value !== remote_code) {
            setValue6(newcm_ref.current, remote_code)
        }
    }, [remote_code])

    return html` <pluto-input ref=${dom_node_ref} translate=${false}> </pluto-input> `
}
