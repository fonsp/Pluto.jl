import { html, useState, useEffect, useLayoutEffect, useRef, useContext, useMemo } from "../imports/Preact.js"
import observablehq_for_myself from "../common/SetupCellEnvironment.js"
import _ from "../imports/lodash.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { PlutoActionsContext } from "../common/PlutoContext.js"
import { get_selected_doc_from_state } from "./CellInput/LiveDocsFromCursor.js"
import { go_to_definition_plugin, GlobalDefinitionsFacet } from "./CellInput/go_to_definition_plugin.js"
// import { debug_syntax_plugin } from "./CellInput/debug_syntax_plugin.js"

import {
    EditorState,
    EditorSelection,
    Compartment,
    EditorView,
    placeholder,
    keymap,
    history,
    historyKeymap,
    defaultKeymap,
    indentMore,
    indentLess,
    tags,
    HighlightStyle,
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
    syntaxTree,
    Decoration,
    ViewUpdate,
    ViewPlugin,
    WidgetType,
    indentUnit,
    StateField,
    StateEffect,
    autocomplete,
    htmlLanguage,
    markdownLanguage,
    javascriptLanguage,
    pythonLanguage,
    syntaxHighlighting,
    cssLanguage,
    setDiagnostics,
} from "../imports/CodemirrorPlutoSetup.js"

import { markdown, html as htmlLang, javascript, sqlLang, python, julia_mixed } from "./CellInput/mixedParsers.js"
import { julia_andrey } from "../imports/CodemirrorPlutoSetup.js"
import { pluto_autocomplete } from "./CellInput/pluto_autocomplete.js"
import { NotebookpackagesFacet, pkgBubblePlugin } from "./CellInput/pkg_bubble_plugin.js"
import { awesome_line_wrapping } from "./CellInput/awesome_line_wrapping.js"
import { cell_movement_plugin, prevent_holding_a_key_from_doing_things_across_cells } from "./CellInput/cell_movement_plugin.js"
import { pluto_paste_plugin } from "./CellInput/pluto_paste_plugin.js"
import { bracketMatching } from "./CellInput/block_matcher_plugin.js"
import { cl } from "../common/ClassTable.js"
import { HighlightLineFacet, HighlightRangeFacet, highlightLinePlugin, highlightRangePlugin } from "./CellInput/highlight_line.js"
import { commentKeymap } from "./CellInput/comment_mixed_parsers.js"
import { ScopeStateField } from "./CellInput/scopestate_statefield.js"
import { mod_d_command } from "./CellInput/mod_d_command.js"
import { open_bottom_right_panel } from "./BottomRightPanel.js"
import { timeout_promise } from "../common/PlutoConnection.js"

export const ENABLE_CM_MIXED_PARSER = window.localStorage.getItem("ENABLE_CM_MIXED_PARSER") === "true"

if (ENABLE_CM_MIXED_PARSER) {
    console.log(`YOU ENABLED THE CODEMIRROR MIXED LANGUAGE PARSER
Thanks! Awesome!
Please let us know if you find any bugs...
If enough people do this, we can make it the default parser.
`)
}

// Added this so we can have people test the mixed parser, because I LIKE IT SO MUCH - DRAL
// @ts-ignore
window.PLUTO_TOGGLE_CM_MIXED_PARSER = () => {
    window.localStorage.setItem("ENABLE_CM_MIXED_PARSER", String(!ENABLE_CM_MIXED_PARSER))
    window.location.reload()
}

export const pluto_syntax_colors = HighlightStyle.define(
    [
        /* The following three need a specific version of the julia parser, will add that later (still messing with it 😈) */
        // Symbol
        // { tag: tags.controlKeyword, color: "var(--cm-keyword-color)", fontWeight: 700 },

        { tag: tags.propertyName, color: "var(--cm-property-color)" },
        { tag: tags.unit, color: "var(--cm-tag-color)" },
        { tag: tags.literal, color: "var(--cm-builtin-color)", fontWeight: 700 },
        { tag: tags.macroName, color: "var(--cm-macro-color)", fontWeight: 700 },

        // I (ab)use `special(brace)` for interpolations.
        // lang-javascript does the same so I figure it is "best practice" 😅
        { tag: tags.special(tags.brace), color: "var(--cm-macro-color)", fontWeight: 700 },

        // `nothing` I guess... Any others?
        {
            tag: tags.standard(tags.variableName),
            color: "var(--cm-builtin-color)",
            fontWeight: 700,
        },

        { tag: tags.bool, color: "var(--cm-builtin-color)", fontWeight: 700 },

        { tag: tags.keyword, color: "var(--cm-keyword-color)" },
        { tag: tags.comment, color: "var(--cm-comment-color)", fontStyle: "italic" },
        { tag: tags.atom, color: "var(--cm-atom-color)" },
        { tag: tags.number, color: "var(--cm-number-color)" },
        // { tag: tags.property, color: "#48b685" },
        // { tag: tags.attribute, color: "#48b685" },
        { tag: tags.keyword, color: "var(--cm-keyword-color)" },
        { tag: tags.string, color: "var(--cm-string-color)" },
        { tag: tags.variableName, color: "var(--cm-var-color)", fontWeight: 700 },
        // { tag: tags.variable2, color: "#06b6ef" },
        { tag: tags.typeName, color: "var(--cm-type-color)", fontStyle: "italic" },
        { tag: tags.typeOperator, color: "var(--cm-type-color)", fontStyle: "italic" },
        { tag: tags.bracket, color: "var(--cm-bracket-color)" },
        { tag: tags.brace, color: "var(--cm-bracket-color)" },
        { tag: tags.tagName, color: "var(--cm-tag-color)" },
        { tag: tags.link, color: "var(--cm-link-color)" },
        {
            tag: tags.invalid,
            color: "var(--cm-error-color)",
            background: "var(--cm-error-bg-color)",
        },
    ],
    {
        all: { color: `var(--cm-editor-text-color)` },
        scope: julia_andrey().language,
    }
)

export const pluto_syntax_colors_javascript = HighlightStyle.define(
    [
        // SAME AS JULIA:
        { tag: tags.propertyName, color: "var(--cm-property-color)" },
        { tag: tags.unit, color: "var(--cm-tag-color)" },
        { tag: tags.literal, color: "var(--cm-builtin-color)", fontWeight: 700 },
        { tag: tags.macroName, color: "var(--cm-macro-color)", fontWeight: 700 },

        // `nothing` I guess... Any others?
        {
            tag: tags.standard(tags.variableName),
            color: "var(--cm-builtin-color)",
            fontWeight: 700,
        },

        { tag: tags.bool, color: "var(--cm-builtin-color)", fontWeight: 700 },

        { tag: tags.keyword, color: "var(--cm-keyword-color)" },
        { tag: tags.atom, color: "var(--cm-atom-color)" },
        { tag: tags.number, color: "var(--cm-number-color)" },
        // { tag: tags.property, color: "#48b685" },
        // { tag: tags.attribute, color: "#48b685" },
        { tag: tags.keyword, color: "var(--cm-keyword-color)" },
        { tag: tags.string, color: "var(--cm-string-color)" },
        { tag: tags.variableName, color: "var(--cm-var-color)", fontWeight: 700 },
        // { tag: tags.variable2, color: "#06b6ef" },
        { tag: tags.typeName, color: "var(--cm-type-color)", fontStyle: "italic" },
        { tag: tags.typeOperator, color: "var(--cm-type-color)", fontStyle: "italic" },
        { tag: tags.bracket, color: "var(--cm-bracket-color)" },
        { tag: tags.brace, color: "var(--cm-bracket-color)" },
        { tag: tags.tagName, color: "var(--cm-tag-color)" },
        { tag: tags.link, color: "var(--cm-link-color)" },
        {
            tag: tags.invalid,
            color: "var(--cm-error-color)",
            background: "var(--cm-error-bg-color)",
        },

        // JAVASCRIPT SPECIFIC
        { tag: tags.comment, color: "var(--cm-comment-color)", fontStyle: "italic", filter: "none" },
    ],
    {
        scope: javascriptLanguage,
        all: {
            color: `var(--cm-editor-text-color)`,
            filter: `contrast(0.5)`,
        },
    }
)

export const pluto_syntax_colors_python = HighlightStyle.define(
    [
        // SAME AS JULIA:
        { tag: tags.propertyName, color: "var(--cm-property-color)" },
        { tag: tags.unit, color: "var(--cm-tag-color)" },
        { tag: tags.literal, color: "var(--cm-builtin-color)", fontWeight: 700 },
        { tag: tags.macroName, color: "var(--cm-macro-color)", fontWeight: 700 },

        // `nothing` I guess... Any others?
        {
            tag: tags.standard(tags.variableName),
            color: "var(--cm-builtin-color)",
            fontWeight: 700,
        },

        { tag: tags.bool, color: "var(--cm-builtin-color)", fontWeight: 700 },

        { tag: tags.keyword, color: "var(--cm-keyword-color)" },
        { tag: tags.comment, color: "var(--cm-comment-color)", fontStyle: "italic" },
        { tag: tags.atom, color: "var(--cm-atom-color)" },
        { tag: tags.number, color: "var(--cm-number-color)" },
        // { tag: tags.property, color: "#48b685" },
        // { tag: tags.attribute, color: "#48b685" },
        { tag: tags.keyword, color: "var(--cm-keyword-color)" },
        { tag: tags.string, color: "var(--cm-string-color)" },
        { tag: tags.variableName, color: "var(--cm-var-color)", fontWeight: 700 },
        // { tag: tags.variable2, color: "#06b6ef" },
        { tag: tags.typeName, color: "var(--cm-type-color)", fontStyle: "italic" },
        { tag: tags.typeOperator, color: "var(--cm-type-color)", fontStyle: "italic" },
        { tag: tags.bracket, color: "var(--cm-bracket-color)" },
        { tag: tags.brace, color: "var(--cm-bracket-color)" },
        { tag: tags.tagName, color: "var(--cm-tag-color)" },
        { tag: tags.link, color: "var(--cm-link-color)" },
        {
            tag: tags.invalid,
            color: "var(--cm-error-color)",
            background: "var(--cm-error-bg-color)",
        },

        // PYTHON SPECIFIC
    ],
    {
        scope: pythonLanguage,
        all: {
            color: "var(--cm-editor-text-color)",
            filter: `contrast(0.5)`,
        },
    }
)

export const pluto_syntax_colors_css = HighlightStyle.define(
    [
        { tag: tags.propertyName, color: "var(--cm-css-accent-color)", fontWeight: 700 },
        { tag: tags.variableName, color: "var(--cm-css-accent-color)", fontWeight: 700 },
        { tag: tags.definitionOperator, color: "var(--cm-css-color)" },
        { tag: tags.keyword, color: "var(--cm-css-color)" },
        { tag: tags.modifier, color: "var(--cm-css-accent-color)" },
        { tag: tags.punctuation, opacity: 0.5 },
        { tag: tags.literal, color: "var(--cm-css-color)" },
        // { tag: tags.unit, color: "var(--cm-css-accent-color)" },
        { tag: tags.tagName, color: "var(--cm-css-color)", fontWeight: 700 },
        { tag: tags.className, color: "var(--cm-css-why-doesnt-codemirror-highlight-all-the-text-aaa)" },
        { tag: tags.constant(tags.className), color: "var(--cm-css-why-doesnt-codemirror-highlight-all-the-text-aaa)" },

        // Comment from julia
        { tag: tags.comment, color: "var(--cm-comment-color)", fontStyle: "italic" },
    ],
    {
        scope: cssLanguage,
        all: { color: "var(--cm-css-color)" },
    }
)

export const pluto_syntax_colors_html = HighlightStyle.define(
    [
        { tag: tags.tagName, color: "var(--cm-html-accent-color)", fontWeight: 600 },
        { tag: tags.attributeName, color: "var(--cm-html-accent-color)", fontWeight: 600 },
        { tag: tags.attributeValue, color: "var(--cm-html-accent-color)" },
        { tag: tags.angleBracket, color: "var(--cm-html-accent-color)", fontWeight: 600, opacity: 0.7 },
        { tag: tags.content, color: "var(--cm-html-color)", fontWeight: 400 },
        { tag: tags.documentMeta, color: "var(--cm-html-accent-color)" },
        { tag: tags.comment, color: "var(--cm-comment-color)", fontStyle: "italic" },
    ],
    {
        scope: htmlLanguage,
        all: {
            color: "var(--cm-html-color)",
        },
    }
)

// https://github.com/codemirror/lang-markdown/blob/main/src/markdown.ts
export const pluto_syntax_colors_markdown = HighlightStyle.define(
    [
        { tag: tags.content, color: "var(--cm-md-color)" },
        { tag: tags.quote, color: "var(--cm-md-color)" },
        { tag: tags.link, textDecoration: "underline" },
        { tag: tags.url, color: "var(--cm-md-color)", textDecoration: "none" },
        { tag: tags.emphasis, fontStyle: "italic" },
        { tag: tags.strong, fontWeight: "bolder" },

        { tag: tags.heading, color: "var(--cm-md-color)", fontWeight: 700 },
        {
            tag: tags.comment,
            color: "var(--cm-comment-color)",
            fontStyle: "italic",
        },
        {
            // These are all the things you won't see in the result:
            // `-` bullet points, the `#` for headers, the `>` with quoteblocks.
            tag: tags.processingInstruction,
            color: "var(--cm-md-accent-color) !important",
            opacity: "0.5",
        },
        { tag: tags.monospace, color: "var(--cm-md-accent-color)" },
    ],
    {
        scope: markdownLanguage,
        all: {
            color: "var(--cm-md-color)",
        },
    }
)

const getValue6 = (/** @type {EditorView} */ cm) => cm.state.doc.toString()
const setValue6 = (/** @type {EditorView} */ cm, value) =>
    cm.dispatch({
        changes: { from: 0, to: cm.state.doc.length, insert: value },
    })
const replaceRange6 = (/** @type {EditorView} */ cm, text, from, to) =>
    cm.dispatch({
        changes: { from, to, insert: text },
    })

// Compartments: https://codemirror.net/6/examples/config/
let useCompartment = (/** @type {import("../imports/Preact.js").Ref<EditorView?>} */ codemirror_ref, value) => {
    let compartment = useRef(new Compartment())
    let initial_value = useRef(compartment.current.of(value))

    useLayoutEffect(() => {
        codemirror_ref.current?.dispatch?.({
            effects: compartment.current.reconfigure(value),
        })
    }, [value])

    return initial_value.current
}

let line_and_ch_to_cm6_position = (/** @type {import("../imports/CodemirrorPlutoSetup.js").Text} */ doc, { line, ch }) => {
    let line_object = doc.line(_.clamp(line + 1, 1, doc.lines))
    let ch_clamped = _.clamp(ch, 0, line_object.length)
    return line_object.from + ch_clamped
}

/**
 * @param {{
 *  local_code: string,
 *  remote_code: string,
 *  scroll_into_view_after_creation: boolean,
 *  cell_dependencies: import("./Editor.js").CellDependencyData,
 *  nbpkg: import("./Editor.js").NotebookPkgData?,
 *  global_definition_locations: { [variable_name: string]: string },
 *  [key: string]: any,
 * }} props
 */
export const CellInput = ({
    local_code,
    remote_code,
    disable_input,
    focus_after_creation,
    cm_forced_focus,
    set_cm_forced_focus,
    show_input,
    on_submit,
    on_delete,
    on_add_after,
    on_change,
    on_update_doc_query,
    on_focus_neighbor,
    on_line_heights,
    nbpkg,
    cell_id,
    notebook_id,
    any_logs,
    show_logs,
    set_show_logs,
    set_cell_disabled,
    cm_highlighted_line,
    cm_highlighted_range,
    metadata,
    global_definition_locations,
    cm_diagnostics,
}) => {
    let pluto_actions = useContext(PlutoActionsContext)
    const { disabled: running_disabled, skip_as_script } = metadata
    let [error, set_error] = useState(null)
    if (error) {
        const to_throw = error
        set_error(null)
        throw to_throw
    }

    const notebook_id_ref = useRef(notebook_id)
    notebook_id_ref.current = notebook_id

    const newcm_ref = useRef(/** @type {EditorView?} */ (null))
    const dom_node_ref = useRef(/** @type {HTMLElement?} */ (null))
    const remote_code_ref = useRef(/** @type {string?} */ (null))

    let nbpkg_compartment = useCompartment(newcm_ref, NotebookpackagesFacet.of(nbpkg))
    let global_definitions_compartment = useCompartment(newcm_ref, GlobalDefinitionsFacet.of(global_definition_locations))
    let highlighted_line_compartment = useCompartment(newcm_ref, HighlightLineFacet.of(cm_highlighted_line))
    let highlighted_range_compartment = useCompartment(newcm_ref, HighlightRangeFacet.of(cm_highlighted_range))
    let editable_compartment = useCompartment(newcm_ref, EditorState.readOnly.of(disable_input))

    let on_change_compartment = useCompartment(
        newcm_ref,
        // Functions are hard to compare, so I useMemo manually
        useMemo(() => {
            return EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    on_change(update.state.doc.toString())
                }
            })
        }, [on_change])
    )

    useLayoutEffect(() => {
        if (dom_node_ref.current == null) return

        const keyMapSubmit = () => {
            on_submit()
            return true
        }
        let run = async (fn) => await fn()
        const keyMapRun = (/** @type {EditorView} */ cm) => {
            run(async () => {
                // we await to prevent an out-of-sync issue
                await on_add_after()

                const new_value = cm.state.doc.toString()
                if (new_value !== remote_code_ref.current) {
                    on_submit()
                }
            })
            return true
        }

        let select_autocomplete_command = autocomplete.completionKeymap.find((keybinding) => keybinding.key === "Enter")
        let keyMapTab = (/** @type {EditorView} */ cm) => {
            if (cm.state.readOnly) {
                return false
            }
            // This will return true if the autocomplete select popup is open
            if (select_autocomplete_command?.run?.(cm)) {
                return true
            }

            // TODO Multicursor?
            let selection = cm.state.selection.main
            if (!selection.empty) {
                return indentMore(cm)
            } else {
                cm.dispatch({
                    changes: { from: selection.from, to: selection.to, insert: "\t" },
                    selection: EditorSelection.cursor(selection.from + 1),
                })
                return true
            }
        }
        const keyMapMD = () => {
            const cm = /** @type{EditorView} */ (newcm_ref.current)
            const value = getValue6(cm)
            const trimmed = value.trim()
            const offset = value.length - value.trimStart().length
            console.table({ value, trimmed, offset })
            if (trimmed.startsWith('md"') && trimmed.endsWith('"')) {
                // Markdown cell, change to code
                let start, end
                if (trimmed.startsWith('md"""') && trimmed.endsWith('"""')) {
                    // Block markdown
                    start = 5
                    end = trimmed.length - 3
                } else {
                    // Inline markdown
                    start = 3
                    end = trimmed.length - 1
                }
                if (start >= end || trimmed.substring(start, end).trim() == "") {
                    // Corner case: block is empty after removing markdown
                    setValue6(cm, "")
                } else {
                    while (/\s/.test(trimmed[start])) {
                        ++start
                    }
                    while (/\s/.test(trimmed[end - 1])) {
                        --end
                    }

                    // Keep the selection from [start, end) while maintaining cursor position
                    replaceRange6(cm, "", end + offset, cm.state.doc.length)
                    // cm.replaceRange("", cm.posFromIndex(end + offset), { line: cm.lineCount() })
                    replaceRange6(cm, "", 0, start + offset)
                    // cm.replaceRange("", { line: 0, ch: 0 }, cm.posFromIndex(start + offset))
                }
            } else {
                // Replacing ranges will maintain both the focus, the selections and the cursor
                let prefix = `md"""\n`
                let suffix = `\n"""`
                // TODO Multicursor?
                let selection = cm.state.selection.main
                cm.dispatch({
                    changes: [
                        { from: 0, to: 0, insert: prefix },
                        {
                            from: cm.state.doc.length,
                            to: cm.state.doc.length,
                            insert: suffix,
                        },
                    ],
                    selection:
                        selection.from === 0
                            ? {
                                  anchor: selection.from + prefix.length,
                                  head: selection.to + prefix.length,
                              }
                            : undefined,
                })
            }

            return true
        }
        const keyMapDelete = (/** @type {EditorView} */ cm) => {
            if (cm.state.facet(EditorState.readOnly)) {
                return false
            }
            if (cm.state.doc.length === 0) {
                on_focus_neighbor(cell_id, +1)
                on_delete()
                return true
            }
            return false
        }

        const keyMapBackspace = (/** @type {EditorView} */ cm) => {
            if (cm.state.facet(EditorState.readOnly)) {
                return false
            }

            // Previously this was a very elaborate timed implementation......
            // But I found out that keyboard events have a `.repeated` property which is perfect for what we want...
            // So now this is just the cell deleting logic (and the repeated stuff is in a separate plugin)
            if (cm.state.doc.length === 0) {
                // `Infinity, Infinity` means: last line, last character
                on_focus_neighbor(cell_id, -1, Infinity, Infinity)
                on_delete()
                return true
            }
            return false
        }

        const plutoKeyMaps = [
            { key: "Shift-Enter", run: keyMapSubmit },
            { key: "Ctrl-Enter", mac: "Cmd-Enter", run: keyMapRun },
            { key: "Ctrl-Enter", run: keyMapRun },
            { key: "Tab", run: keyMapTab, shift: indentLess },
            { key: "Ctrl-m", mac: "Cmd-m", run: keyMapMD },
            { key: "Ctrl-m", run: keyMapMD },
            // Codemirror6 doesn't like capslock
            { key: "Ctrl-M", run: keyMapMD },
            // TODO Move Delete and backspace to cell movement plugin
            { key: "Delete", run: keyMapDelete },
            { key: "Ctrl-Delete", run: keyMapDelete },
            { key: "Backspace", run: keyMapBackspace },
            { key: "Ctrl-Backspace", run: keyMapBackspace },

            mod_d_command,
        ]

        let DOCS_UPDATER_VERBOSE = false
        const docs_updater = EditorView.updateListener.of((update) => {
            if (!update.view.hasFocus) {
                return
            }

            if (update.docChanged || update.selectionSet) {
                let state = update.state
                DOCS_UPDATER_VERBOSE && console.groupCollapsed("Live docs updater")
                try {
                    let result = get_selected_doc_from_state(state, DOCS_UPDATER_VERBOSE)
                    if (result != null) {
                        on_update_doc_query(result)
                    }
                } finally {
                    DOCS_UPDATER_VERBOSE && console.groupEnd()
                }
            }
        })

        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        const newcm = (newcm_ref.current = new EditorView({
            state: EditorState.create({
                doc: local_code,
                extensions: [
                    EditorView.theme({}, { dark: usesDarkTheme }),
                    // Compartments coming from react state/props
                    nbpkg_compartment,
                    highlighted_line_compartment,
                    highlighted_range_compartment,
                    global_definitions_compartment,
                    editable_compartment,
                    highlightLinePlugin(),
                    highlightRangePlugin(),

                    // This is waaaay in front of the keys it is supposed to override,
                    // Which is necessary because it needs to run before *any* keymap,
                    // as the first keymap will activate the keymap extension which will attach the
                    // keymap handlers at that point, which is likely before this extension.
                    // TODO Use https://codemirror.net/6/docs/ref/#state.Prec when added to pluto-codemirror-setup
                    prevent_holding_a_key_from_doing_things_across_cells,

                    pkgBubblePlugin({ pluto_actions, notebook_id_ref }),
                    ScopeStateField,
                    syntaxHighlighting(pluto_syntax_colors),
                    syntaxHighlighting(pluto_syntax_colors_html),
                    syntaxHighlighting(pluto_syntax_colors_markdown),
                    syntaxHighlighting(pluto_syntax_colors_javascript),
                    syntaxHighlighting(pluto_syntax_colors_python),
                    syntaxHighlighting(pluto_syntax_colors_css),
                    lineNumbers(),
                    highlightSpecialChars(),
                    history(),
                    drawSelection(),
                    EditorState.allowMultipleSelections.of(true),
                    // Multiple cursors with `alt` instead of the default `ctrl` (which we use for go to definition)
                    EditorView.clickAddsSelectionRange.of((event) => event.altKey && !event.shiftKey),
                    indentOnInput(),
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
                    docs_updater,
                    // Remove selection on blur
                    EditorView.domEventHandlers({
                        blur: (event, view) => {
                            // it turns out that this condition is true *exactly* if and only if the blur event was triggered by blurring the window
                            let caused_by_window_blur = document.activeElement === view.contentDOM

                            if (!caused_by_window_blur) {
                                // then it's caused by focusing something other than this cell in the editor.
                                // in this case, we want to collapse the selection into a single point, for aesthetic reasons.
                                setTimeout(() => {
                                    view.dispatch({
                                        selection: {
                                            anchor: view.state.selection.main.head,
                                        },
                                        scrollIntoView: false,
                                    })
                                    // and blur the DOM again (because the previous transaction might have re-focused it)
                                    view.contentDOM.blur()
                                }, 0)

                                set_cm_forced_focus(null)
                            }
                        },
                    }),
                    pluto_paste_plugin({
                        pluto_actions,
                        cell_id,
                    }),
                    // Update live docs when in a cell that starts with `?`
                    EditorView.updateListener.of((update) => {
                        if (!update.docChanged) return
                        if (update.state.doc.length > 0 && update.state.sliceDoc(0, 1) === "?") {
                            open_bottom_right_panel("docs")
                        }
                    }),
                    EditorState.tabSize.of(4),
                    indentUnit.of("\t"),
                    ...(ENABLE_CM_MIXED_PARSER
                        ? [
                              julia_mixed(),
                              markdown({
                                  defaultCodeLanguage: julia_mixed(),
                              }),
                              htmlLang(), //Provides tag closing!,
                              javascript(),
                              python(),
                              sqlLang,
                          ]
                        : [
                              //
                              julia_andrey(),
                          ]),
                    go_to_definition_plugin,
                    pluto_autocomplete({
                        request_autocomplete: async ({ text }) => {
                            let response = await timeout_promise(
                                pluto_actions.send("complete", { query: text }, { notebook_id: notebook_id_ref.current }),
                                5000
                            ).catch(console.warn)
                            if (!response) return null

                            let { message } = response
                            return {
                                start: utf8index_to_ut16index(text, message.start),
                                stop: utf8index_to_ut16index(text, message.stop),
                                results: message.results,
                            }
                        },
                        on_update_doc_query: on_update_doc_query,
                    }),

                    // I put plutoKeyMaps separately because I want make sure we have
                    // higher priority 😈
                    keymap.of(plutoKeyMaps),
                    keymap.of(commentKeymap),
                    // Before default keymaps (because we override some of them)
                    // but after the autocomplete plugin, because we don't want to move cell when scrolling through autocomplete
                    cell_movement_plugin({
                        focus_on_neighbor: ({ cell_delta, line, character }) => on_focus_neighbor(cell_id, cell_delta, line, character),
                    }),
                    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap]),
                    placeholder("Enter cell code..."),

                    EditorView.lineWrapping,
                    // Wowww this has been enabled for some time now... wonder if there are issues about this yet ;) - DRAL
                    awesome_line_wrapping,

                    // Reset diagnostics on change
                    EditorView.updateListener.of((update) => {
                        if (!update.docChanged) return
                        update.view.dispatch(setDiagnostics(update.state, []))
                    }),

                    on_change_compartment,

                    // This is my weird-ass extension that checks the AST and shows you where
                    // there're missing nodes.. I'm not sure if it's a good idea to have it
                    // show_missing_syntax_plugin(),

                    // Enable this plugin if you want to see the lezer tree,
                    // and possible lezer errors and maybe more debug info in the console:
                    // debug_syntax_plugin,
                    // Handle errors hopefully?
                    EditorView.exceptionSink.of((exception) => {
                        set_error(exception)
                        console.error("EditorView exception!", exception)
                        // alert(
                        //     `We ran into an issue! We have lost your cursor 😞😓😿\n If this appears again, please press F12, then click the "Console" tab,  eport an issue at https://github.com/fonsp/Pluto.jl/issues`
                        // )
                    }),
                ],
            }),
            parent: dom_node_ref.current,
        }))

        // For use from useDropHandler
        // @ts-ignore
        newcm.dom.CodeMirror = {
            getValue: () => getValue6(newcm),
            setValue: (x) => setValue6(newcm, x),
        }

        if (focus_after_creation) {
            setTimeout(() => {
                let view = newcm_ref.current
                if (view == null) return
                view.dom.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                })
                view.dispatch({
                    selection: {
                        anchor: view.state.doc.length,
                        head: view.state.doc.length,
                    },
                })
                view.focus()
            })
        }

        // @ts-ignore
        const lines_wrapper_dom_node = dom_node_ref.current.querySelector("div.cm-content")
        if (lines_wrapper_dom_node) {
            const lines_wrapper_resize_observer = new ResizeObserver(() => {
                const line_nodes = lines_wrapper_dom_node.children
                const tops = _.map(line_nodes, (c) => /** @type{HTMLElement} */ (c).offsetTop)
                const diffs = tops.slice(1).map((y, i) => y - tops[i])
                const heights = [...diffs, 15]
                on_line_heights(heights)
            })

            lines_wrapper_resize_observer.observe(lines_wrapper_dom_node)
            return () => {
                lines_wrapper_resize_observer.unobserve(lines_wrapper_dom_node)
            }
        }
    }, [])

    useEffect(() => {
        if (newcm_ref.current == null) return
        const cm = newcm_ref.current
        const diagnostics = cm_diagnostics

        cm.dispatch(setDiagnostics(cm.state, diagnostics))
    }, [cm_diagnostics])

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

    useEffect(() => {
        const cm = newcm_ref.current
        if (cm == null) return
        if (cm_forced_focus == null) {
            cm.dispatch({
                selection: {
                    anchor: cm.state.selection.main.head,
                    head: cm.state.selection.main.head,
                },
            })
        } else {
            let new_selection = {
                anchor: line_and_ch_to_cm6_position(cm.state.doc, cm_forced_focus[0]),
                head: line_and_ch_to_cm6_position(cm.state.doc, cm_forced_focus[1]),
            }

            if (cm_forced_focus[2]?.definition_of) {
                let scopestate = cm.state.field(ScopeStateField)
                let definition = scopestate?.definitions.get(cm_forced_focus[2]?.definition_of)
                if (definition) {
                    new_selection = {
                        anchor: definition.from,
                        head: definition.to,
                    }
                }
            }

            let dom = /** @type {HTMLElement} */ (cm.dom)
            dom.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                // UNCOMMENT THIS AND SEE, this feels amazing but I feel like people will not like it
                // block: "center",
            })

            cm.focus()
            cm.dispatch({
                scrollIntoView: true,
                selection: new_selection,
                effects: [
                    EditorView.scrollIntoView(EditorSelection.range(new_selection.anchor, new_selection.head), {
                        yMargin: 80,
                    }),
                ],
            })
        }
    }, [cm_forced_focus])

    return html`
        <pluto-input ref=${dom_node_ref} class="CodeMirror" translate=${false}>
            <${InputContextMenu}
                on_delete=${on_delete}
                cell_id=${cell_id}
                run_cell=${on_submit}
                skip_as_script=${skip_as_script}
                running_disabled=${running_disabled}
                any_logs=${any_logs}
                show_logs=${show_logs}
                set_show_logs=${set_show_logs}
                set_cell_disabled=${set_cell_disabled}
            />
        </pluto-input>
    `
}

const InputContextMenu = ({ on_delete, cell_id, run_cell, skip_as_script, running_disabled, any_logs, show_logs, set_show_logs, set_cell_disabled }) => {
    const timeout = useRef(null)
    let pluto_actions = useContext(PlutoActionsContext)
    const [open, setOpen] = useState(false)
    const mouseenter = () => {
        if (timeout.current) clearTimeout(timeout.current)
    }
    const toggle_skip_as_script = async (e) => {
        const new_val = !skip_as_script
        e.preventDefault()
        // e.stopPropagation()
        await pluto_actions.update_notebook((notebook) => {
            notebook.cell_inputs[cell_id].metadata["skip_as_script"] = new_val
        })
    }
    const toggle_running_disabled = async (e) => {
        const new_val = !running_disabled
        await set_cell_disabled(new_val)
    }
    const toggle_logs = () => set_show_logs(!show_logs)

    const is_copy_output_supported = () => {
        let notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook())
        let cell_result = notebook?.cell_results?.[cell_id]
        return !!cell_result && !cell_result.errored && !cell_result.queued && cell_result.output.mime === "text/plain" && cell_result.output.body
    }

    const copy_output = () => {
        let notebook = /** @type{import("./Editor.js").NotebookData?} */ (pluto_actions.get_notebook())
        let cell_output = notebook?.cell_results?.[cell_id]?.output.body ?? ""
        cell_output &&
            navigator.clipboard.writeText(cell_output).catch((err) => {
                alert(`Error copying cell output`)
            })
    }

    return html` <button
        onClick=${() => setOpen(!open)}
        onBlur=${() => setOpen(false)}
        class=${cl({
            input_context_menu: true,
            open,
        })}
        title="Actions"
    >
        <span class="icon"></span>
        ${open
            ? html`<ul onMouseenter=${mouseenter}>
                  <li onClick=${on_delete} title="Delete"><span class="delete ctx_icon" />Delete cell</li>
                  <li
                      onClick=${toggle_running_disabled}
                      title=${running_disabled ? "Enable and run the cell" : "Disable this cell, and all cells that depend on it"}
                  >
                      ${running_disabled ? html`<span class="enable_cell ctx_icon" />` : html`<span class="disable_cell ctx_icon" />`}
                      ${running_disabled ? html`<b>Enable cell</b>` : html`Disable cell`}
                  </li>
                  ${any_logs
                      ? html`<li title="" onClick=${toggle_logs}>
                            ${show_logs
                                ? html`<span class="hide_logs ctx_icon" /><span>Hide logs</span>`
                                : html`<span class="show_logs ctx_icon" /><span>Show logs</span>`}
                        </li>`
                      : null}
                  ${is_copy_output_supported()
                      ? html`<li title="Copy the output of this cell to the clipboard." onClick=${copy_output}>
                            <span class="copy_output ctx_icon" />Copy output
                        </li>`
                      : null}
                  <li
                      onClick=${toggle_skip_as_script}
                      title=${skip_as_script
                          ? "This cell is currently stored in the notebook file as a Julia comment. Click here to disable."
                          : "Store this code in the notebook file as a Julia comment. This way, it will not run when the notebook runs as a script outside of Pluto."}
                  >
                      ${skip_as_script ? html`<span class="skip_as_script ctx_icon" />` : html`<span class="run_as_script ctx_icon" />`}
                      ${skip_as_script ? html`<b>Enable in file</b>` : html`Disable in file`}
                  </li>
              </ul>`
            : html``}
    </button>`
}
