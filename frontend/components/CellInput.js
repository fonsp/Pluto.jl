import { html, useState, useEffect, useLayoutEffect, useRef, useContext, useMemo } from "../imports/Preact.js"
import _ from "../imports/lodash.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { has_ctrl_or_cmd_pressed, map_cmd_to_ctrl_on_mac } from "../common/KeyboardShortcuts.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { nbpkg_fingerprint, PkgStatusMark, PkgActivateMark, pkg_disablers } from "./PkgStatusMark.js"
import { get_selected_doc_from_state } from "./CellInput/LiveDocsFromCursor.js"
import { go_to_definition_plugin, UsedVariablesFacet } from "./CellInput/go_to_definition_plugin.js"
import { block_matcher_plugin } from "./CellInput/block_matcher_plugin.js"

//@ts-ignore
import { mac, chromeOS } from "https://cdn.jsdelivr.net/gh/codemirror/CodeMirror@5.60.0/src/util/browser.js"
import {
    EditorState,
    EditorSelection,
    SelectionRange,
    Compartment,
    EditorView,
    placeholder,
    julia_legacy,
    julia_andrey,
    keymap,
    history,
    historyKeymap,
    defaultKeymap,
    StreamLanguage,
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
    bracketMatching,
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
} from "../imports/CodemirrorPlutoSetup.js"

class PkgStatusMarkWidget extends WidgetType {
    constructor(package_name, props) {
        super()
        this.package_name = package_name
        this.props = props
        this.on_nbpkg = console.error
    }

    eq(other) {
        return other.package_name == this.package_name
    }

    toDOM() {
        const b = PkgStatusMark({
            pluto_actions: this.props.pluto_actions,
            package_name: this.package_name,
            // refresh_cm: () => cm.refresh(),
            refresh_cm: () => {},
            notebook_id: this.props.notebook_id,
        })

        b.on_nbpkg(this.props.nbpkg_ref.current)
        this.on_nbpkg = b.on_nbpkg

        return b
    }

    ignoreEvent() {
        return false
    }
}

/**
 * @param {EditorView} view
 *
 */
function pkg_decorations(view, { pluto_actions, notebook_id, nbpkg_ref }) {
    let widgets = []
    for (let { from, to } of view.visibleRanges) {
        console.log(syntaxTree(view.state).topNode)
        let in_import = false
        let in_selected_import = false
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (type, from, to) => {
                // console.log("Enter", type.name)
                if (type.name === "ImportStatement") {
                    in_import = true
                }
                if (type.name === "SelectedImport") {
                    in_selected_import = true
                }
                if (in_import && type.name === "Identifier") {
                    let package_name = view.state.doc.sliceString(from, to)
                    // console.warn(type)
                    // console.warn("Found", package_name)
                    if (package_name !== "Base" && package_name !== "Core") {
                        let deco = Decoration.widget({
                            widget: new PkgStatusMarkWidget(package_name, { pluto_actions, notebook_id, nbpkg_ref }),
                            side: 1,
                        })
                        widgets.push(deco.range(to))
                    }

                    if (in_selected_import) {
                        in_import = false
                    }
                }
            },
            leave: (type, from, to) => {
                // console.log("Leave", type.name)
                if (type.name === "ImportStatement") {
                    in_import = false
                }
                if (type.name === "SelectedImport") {
                    in_selected_import = false
                }
            },
        })
    }
    return Decoration.set(widgets)
}

// https://codemirror.net/6/docs/ref/#rangeset.RangeCursor
const collect_RangeCursor = (rc) => {
    let output = []
    while (rc.value != null) {
        output.push(rc.value)
        rc.next()
    }
    return output
}

const pkgBubblePlugin = ({ pluto_actions, notebook_id, nbpkg_ref, decorations_ref }) =>
    ViewPlugin.fromClass(
        class {
            update_decos(view) {
                const ds = pkg_decorations(view, { pluto_actions, notebook_id, nbpkg_ref })

                decorations_ref.current = ds
                this.decorations = ds
            }

            /**
             * @param {EditorView} view
             */
            constructor(view) {
                this.update_decos(view)
            }

            /**
             * @param {ViewUpdate} update
             */
            update(update) {
                if (update.docChanged || update.viewportChanged) this.update_decos(update.view)
            }
        },
        {
            decorations: (v) => v.decorations,

            eventHandlers: {
                mousedown: (e, view) => {
                    let target = e.target
                },
            },
        }
    )

// Compartments: https://codemirror.net/6/examples/config/
let editable = new Compartment()

const getValue6 = (cm) => cm.state.doc.toString()
const setValue6 = (cm, value) =>
    cm.dispatch({
        changes: { from: 0, to: cm.state.doc.length, insert: value },
    })
const replaceRange6 = (cm, text, from, to) =>
    cm.dispatch({
        changes: { from, to, insert: text },
    })
const setSelection6 = (cm, anchor, head) => cm.dispatch({ selection: { anchor, head } })
const setSelections6 = (cm, ranges) => cm.dispatch({ selection: EditorSelection.create(ranges) })
const getSelections6 = (cm) => cm.state.selection.ranges.map((r) => cm.state.sliceDoc(r.from, r.to))
const listSelections6 = (cm) => cm.state.selection.ranges
const getCursor6 = (cm) => cm.state.selection.main.head
import { detect_deserializer } from "../common/Serialization.js"

// @ts-ignore
const CodeMirror = window.CodeMirror

const clear_selection = (cm) => {
    const c = cm.getCursor()
    cm.setSelection(c, c, { scroll: false })
}

const last = (x) => x[x.length - 1]
const all_equal = (x) => x.every((y) => y === x[0])
const swap = (a, i, j) => {
    ;[a[i], a[j]] = [a[j], a[i]]
}
const range = (a, b) => {
    const x = Math.min(a, b)
    const y = Math.max(a, b)
    return [...Array(y + 1 - x).keys()].map((i) => i + x)
}

const get = (map, key, creator) => {
    if (map.has(key)) {
        return map.get(key)
    } else {
        const val = creator()
        map.set(key, val)
        return val
    }
}

// Adapted from https://gomakethings.com/how-to-test-if-an-element-is-in-the-viewport-with-vanilla-javascript/
var offsetFromViewport = function (elem) {
    let bounding = elem.getBoundingClientRect()
    let is_in_viewport = bounding.top >= 0 && bounding.bottom <= window.innerHeight
    if (is_in_viewport) {
        return null
    } else {
        return {
            top: bounding.top < 0 ? -bounding.top : window.innerHeight - bounding.bottom,
        }
    }
}

let useCompartment = (codemirror_ref, value) => {
    let compartment = useRef(new Compartment())
    let initial_value = useRef(compartment.current.of(value))

    compartment.current.of,
        useLayoutEffect(() => {
            codemirror_ref.current?.dispatch?.({
                effects: compartment.current.reconfigure(value),
            })
        }, [value])

    return initial_value.current
}

/**
 * @param {{
 *  local_code: string,
 *  remote_code: string,
 *  scroll_into_view_after_creation: boolean,
 *  cell_dependencies: import("./Editor.js").CellDependencyData,
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
    on_drag_drop_events,
    nbpkg,
    cell_id,
    notebook_id,
    running_disabled,
    cell_dependencies,
}) => {
    let pluto_actions = useContext(PlutoContext)

    const cm_ref = useRef(null)
    const newcm_ref = useRef(null)
    const text_area_ref = useRef(null)
    const dom_node_ref = useRef(/** @type {HTMLElement} */ (null))
    const remote_code_ref = useRef(null)
    const on_change_ref = useRef(null)
    on_change_ref.current = on_change
    const disable_input_ref = useRef(disable_input)

    // MIGRATED and no longer necessary in new setup, so remove with cm5
    const time_last_being_force_focussed_ref = useRef(0)
    const time_last_genuine_backspace = useRef(0)

    const pkg_bubbles = useRef(new Map())

    const nbpkg_ref = useRef(nbpkg)
    const decorations_ref = useRef(null)
    useEffect(() => {
        nbpkg_ref.current = nbpkg
        // console.log("Decorations", collect_RangeCursor(decorations_ref.current.iter()))

        collect_RangeCursor(decorations_ref.current.iter()).forEach((pd) => {
            pd.widget.on_nbpkg(nbpkg)
        })
        pkg_bubbles.current.forEach((b) => {
            b.on_nbpkg(nbpkg)
        })
        // console.log("nbpkg effect!", nbpkg, nbpkg_fingerprint(nbpkg))
    }, nbpkg_fingerprint(nbpkg))

    const update_line_bubbles = (line_i) => {
        const cm = cm_ref.current
        /** @type {string} */
        const line = cm.getLine(line_i)
        if (line != undefined) {
            // search for the "import Example, Plots" expression using regex

            // dunno
            // const re = /(using|import)\s*(\w+(?:\,\s*\w+)*)/g

            // import A: b. c
            // const re = /(using|import)(\s*\w+(\.\w+)*(\s*\:(\s*\w+\,)*(\s*\w+)?))/g

            // import A, B, C
            const re = /(using|import)(\s*\w+(\.\w+)*)(\s*\,\s*\w+(\.\w+)*)*/g
            // const re = /(using|import)\s*(\w+)/g
            for (const import_match of line.matchAll(re)) {
                const start = import_match.index + import_match[1].length

                // ask codemirror what its parser found for the "import" or "using" word. If it is not a "keyword", then this is part of a comment or a string.
                const import_token = cm.getTokenAt({ line: line_i, ch: start }, true)

                if (import_token.type === "keyword") {
                    const inner = import_match[0].substr(import_match[1].length)

                    // find the package name, e.g. `Plot` for `Plot.Extras.coolplot`
                    const inner_re = /(\w+)(\.\w+)*/g
                    for (const package_match of inner.matchAll(inner_re)) {
                        const package_name = package_match[1]

                        if (package_name !== "Base" && package_name !== "Core") {
                            // if the widget already exists, keep it, if not, create a new one
                            const widget = get(pkg_bubbles.current, package_name, () => {
                                const b = PkgStatusMark({
                                    pluto_actions: pluto_actions,
                                    package_name: package_name,
                                    refresh_cm: () => cm.refresh(),
                                    notebook_id: notebook_id,
                                })
                                b.on_nbpkg(nbpkg_ref.current)
                                return b
                            })

                            cm.setBookmark(
                                { line: line_i, ch: start + package_match.index + package_match[0].length },
                                {
                                    widget: widget,
                                }
                            )
                        }
                    }
                }
            }

            const match = _.find(pkg_disablers, (f_name) => line.includes(f_name))
            if (match != null) {
                // if the widget already exists, keep it, if not, create a new one
                const widget = get(pkg_bubbles.current, `disable-pkg-${match}-${line_i}`, () =>
                    PkgActivateMark({
                        package_name: match,
                        refresh_cm: () => cm.refresh(),
                    })
                )

                cm.setBookmark(
                    { line: line_i, ch: 999 },
                    {
                        widget: widget,
                    }
                )
            }
        }
    }
    const update_all_line_bubbles = () => range(0, cm_ref.current.lineCount() - 1).forEach(update_line_bubbles)

    useEffect(() => {
        /** Migration #1: Old */
        const first_time = remote_code_ref.current == null
        const current_value = cm_ref.current?.getValue() ?? ""
        if (first_time && remote_code === "" && current_value !== "") {
            // this cell is being initialized with empty code, but it already has local code set.
            // this happens when pasting or dropping cells
            return
        }
        remote_code_ref.current = remote_code
        if (current_value !== remote_code) {
            cm_ref.current?.setValue(remote_code)
            if (first_time) {
                cm_ref.current.clearHistory()
                update_all_line_bubbles()
            }
        }
    }, [remote_code])

    useEffect(() => {
        /** Migration #1: New */
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

    let used_variables_compartment = useCompartment(newcm_ref, UsedVariablesFacet.of(cell_dependencies.upstream_cells_map))

    useLayoutEffect(() => {
        /** Migration #0: OLD */
        const cm = (cm_ref.current = CodeMirror.fromTextArea(text_area_ref.current, {
            value: local_code, // Migrated
            lineNumbers: true, // TODO: Styles
            mode: "julia", // Migrated
            lineWrapping: true, // TODO
            viewportMargin: Infinity, // TODO
            dragDrop: false /* Performance is too bad. 
            - Before: https://user-images.githubusercontent.com/6933510/116729854-fcdfd880-a9e7-11eb-9c88-f88f31ac352e.mov 
            - After: https://user-images.githubusercontent.com/6933510/116729764-d91c9280-a9e7-11eb-82df-d2f804630394.mov */,
            placeholder: "Enter cell code...", // Migrated
            indentWithTabs: true, // TODO
            indentUnit: 4, // TODO
            hintOptions: {
                // TODO
                hint: juliahints,
                pluto_actions: pluto_actions,
                notebook_id: notebook_id,
                on_update_doc_query: on_update_doc_query,
                extraKeys: {
                    ".": (cm, { pick }) => {
                        pick()
                        cm.replaceSelection(".")
                        cm.showHint()
                    },
                    // "(": (cm, { pick }) => pick(),
                },
            },
            matchBrackets: true, // Migrated
            configureMouse: (cm, repeat, event) => {
                // modified version of https://github.com/codemirror/CodeMirror/blob/bd1b7d2976d768ae4e3b8cf209ec59ad73c0305a/src/edit/mouse_events.js#L116-L127
                // because we want to change keys to match vs code
                let alt = chromeOS ? event.metaKey : event.altKey
                let rect = event.shiftKey && alt
                return {
                    unit: rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line",
                    addNew: rect ? false : alt,
                }
            },
        }))

        setTimeout(update_all_line_bubbles, 300)

        const keyMapSubmit = () => on_submit()
        const keyMapRun = async (cm) => {
            // we await to prevent an out-of-sync issue
            await on_add_after()

            const new_value = cm.state.doc.toString()
            if (new_value !== remote_code_ref.current) {
                on_submit()
            }
        }

        let select_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Enter")
        let start_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Ctrl-Space")
        let keyMapTab = (cm) => {
            // This will return true if the autocomplete select popup is open
            if (select_autocomplete_command.run(cm)) {
                return true
            }

            // TODO Multicursor?
            let selection = cm.state.selection.main
            let last_char = cm.state.sliceDoc(selection.from - 1, selection.from)
            if (selection.from != selection.to) {
                return indentMore(cm)
            } else {
                if (/^(\t| |\n|)$/.test(last_char)) {
                    cm.dispatch({
                        changes: { from: selection.from, to: selection.to, insert: "\t" },
                        selection: EditorSelection.cursor(selection.from + 1),
                    })
                    return true
                } else {
                    return start_autocomplete_command.run(cm)
                }
            }
        }
        const keyMapTabShift = (cm) => {
            // TODO Multicursor?
            let selection = cm.state.selection.main
            if (selection.from != selection.to) {
                return indentLess(cm)
            } else {
                const last_char = cm.state.sliceDoc(selection.from - 1, selection.from)
                if (last_char === "\t") {
                    cm.dispatch({
                        changes: { from: selection.from - 1, to: selection.to, insert: "" },
                    })
                }
                return true
            }
        }
        const keyMapPageUp = () => on_focus_neighbor(cell_id, -1, 0, 0)
        const keyMapPageDown = () => on_focus_neighbor(cell_id, +1, 0, 0)
        const keyMapMD = () => {
            // Migrated
            const cm = newcm_ref.current
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
                replaceRange6(cm, `md"""\n`, 0, 0)
                replaceRange6(cm, `\n"""`, cm.state.doc.length, cm.state.doc.length)
            }
        }
        const keyMapD = () => {
            const cm = newcm_ref.current
            // This is the default already
        }
        const keyMapDelete = (cm) => {
            if (!cm.state.facet(EditorView.editable)) {
                return
            }
            if (cm.state.doc.length === 0) {
                on_focus_neighbor(cell_id, +1)
                on_delete()
                return true
            }
        }

        const keyMapBackspace = (cm) => {
            if (!cm.state.facet(EditorView.editable)) {
                return
            }

            // Previously this was a very elaborate timed implementation......
            // But I found out that keyboard events have a `.repeated` property which is perfect for what we want...
            // So now this is just the cell deleting logic (and the repeated stuff is in a separate plugin)
            if (cm.state.doc.length === 0) {
                on_focus_neighbor(cell_id, -1)
                on_delete()
                return true
            }
        }

        const with_time_since_last = (fn) => {
            let last_invoke_time = -Infinity // This infinity is for you, Fons
            return () => {
                let result = fn(Date.now() - last_invoke_time)
                last_invoke_time = Date.now()
                return result
            }
        }

        const keyMapLeft = (view) => {
            let selection = view.state.selection.main
            // We only do this on cursors, not when we have multiple characters selected
            if (selection.from !== selection.to) return false

            // Is the cursor at the start of the cell?
            if (selection.from === 0) {
                on_focus_neighbor(cell_id, -1, Infinity, Infinity)
                return true
            }
        }

        const keyMapRight = (view) => {
            let selection = view.state.selection.main
            // We only do this on cursors, not when we have multiple characters selected
            if (selection.from !== selection.to) return false

            // Is the cursor at the end of the cell?
            if (selection.to === view.state.doc.length) {
                on_focus_neighbor(cell_id, 1, 0, 0)
                return true
            }
        }

        // HERE
        const plutoKeyMaps = [
            // What are all these preventDefault's for? - DRAL
            /** Migration #3: New code */ { key: "Shift-Enter", run: keyMapSubmit, preventDefault: true },
            { key: "Ctrl-Enter", mac: "Cmd-Enter", run: keyMapRun, preventDefault: true },
            { key: "PageUp", run: keyMapPageUp, preventDefault: true },
            { key: "PageDown", run: keyMapPageDown, preventDefault: true },
            { key: "Tab", run: keyMapTab, shift: keyMapTabShift, preventDefault: true },
            { key: "Ctrl-m", mac: "Cmd-m", run: keyMapMD, preventDefault: true },
            // Codemirror6 doesn't like capslock
            { key: "Ctrl-M", run: keyMapMD, preventDefault: true },
            { key: "Ctrl-d", run: keyMapD, preventDefault: true },
            { key: "Ctrl-D", run: keyMapD, preventDefault: true },
            { key: "Ctrl-D", run: keyMapD, preventDefault: true },
            { key: "Delete", run: keyMapDelete, preventDefault: true },
            { key: "Ctrl-Delete", run: keyMapDelete, preventDefault: true },
            { key: "Backspace", run: keyMapBackspace, preventDefault: false },
            { key: "Ctrl-Backspace", run: keyMapBackspace, preventDefault: false },
            { key: "ArrowLeft", run: keyMapLeft, preventDefault: false },
            { key: "ArrowUp", run: keyMapLeft, preventDefault: false },
            { key: "ArrowRight", run: keyMapRight, preventDefault: false },
            { key: "ArrowDown", run: keyMapRight, preventDefault: false },
        ]
        const onCM6Update = (update) => {
            if (update.docChanged) {
                const cm = newcm_ref.current
                const new_value = getValue6(cm)
                console.log(new_value)
                if (new_value.length > 1 && new_value[0] === "?") {
                    console.log("yeap")
                    window.dispatchEvent(new CustomEvent("open_live_docs"))
                }
                on_change_ref.current(new_value)
            }
        }

        const myHighlightStyle = HighlightStyle.define([
            /* The following three need a specific version of the julia parser, will add that later (still messing with it 😈) */
            // Symbol
            { tag: tags.literal, color: "#5e7ad3", fontWeight: 700 },
            { tag: tags.macroName, color: "#5668a4", fontWeight: 700 },
            // `nothing` I guess... Any others?
            { tag: tags.standard(tags.variableName), color: "#5e7ad3", fontWeight: 700 },

            { tag: tags.bool, color: "#5e7ad3", fontWeight: 700 },

            { tag: tags.keyword, color: "#fc6" },
            { tag: tags.comment, color: "#e96ba8", fontStyle: "italic" },
            { tag: tags.atom, color: "#815ba4" },
            { tag: tags.number, color: "#815ba4" },
            // { tag: tags.property, color: "#48b685" },
            // { tag: tags.attribute, color: "#48b685" },
            { tag: tags.keyword, color: "#ef6155" },
            { tag: tags.string, color: "#da5616" },
            { tag: tags.variableName, color: "#5668a4", fontWeight: 700 },
            // { tag: tags.variable2, color: "#06b6ef" },
            { tag: tags.definition(tags.variableName), color: "#f99b15" },
            { tag: tags.bracket, color: "#41323f" },
            { tag: tags.brace, color: "#41323f" },
            { tag: tags.tagName, color: "#ef6155" },
            { tag: tags.link, color: "#815ba4" },
            { tag: tags.invalid, color: "#000", background: "#ef6155" },
            // ...Object.keys(tags).map((x) => ({ tag: x, color: x })),
        ])

        const pbk = pkgBubblePlugin({ pluto_actions, notebook_id, nbpkg_ref, decorations_ref })

        let DOCS_UPDATER_VERBOSE = true
        const docs_updater = EditorView.updateListener.of((update) => {
            if (!update.view.hasFocus) {
                return
            }

            if (update.docChanged || update.selectionSet) {
                let state = update.state
                DOCS_UPDATER_VERBOSE && console.groupCollapsed("Selection")
                let result = get_selected_doc_from_state(state, DOCS_UPDATER_VERBOSE)
                DOCS_UPDATER_VERBOSE && console.log("Result:", result)
                DOCS_UPDATER_VERBOSE && console.groupEnd()

                if (result != null) {
                    on_update_doc_query(result)
                }
            }
        })

        // Why am I like this?
        let completionState = autocompletion()[0]

        // TODO remove me
        //@ts-ignore
        window.tags = tags
        const newcm = (newcm_ref.current = new EditorView({
            /** Migration #0: New */
            state: EditorState.create({
                doc: local_code,

                extensions: [
                    pbk,
                    myHighlightStyle,
                    lineNumbers(),
                    highlightSpecialChars(),
                    history(),
                    foldGutter(),
                    drawSelection(),
                    EditorState.allowMultipleSelections.of(true),
                    // Multiple cursors with `alt` instead of the default `ctrl` (which we use for go to definition)
                    EditorView.clickAddsSelectionRange.of((event) => event.altKey),
                    indentOnInput(),
                    defaultHighlightStyle.fallback,
                    bracketMatching(),
                    closeBrackets(),
                    // rectangularSelection(),
                    // highlightActiveLine(),
                    highlightSelectionMatches(),
                    block_matcher_plugin,

                    // Don't-accidentally-remove-cells-plugin
                    // Because we need some extra info about the key, namely if it is on repeat or not,
                    // we can't use a keymap (keymaps don't give us the event)
                    EditorView.domEventHandlers({
                        keydown: (event, view) => {
                            // TODO We could also require a re-press after a force focus, because
                            // .... currently if you delete another cell, but keep holding down the backspace (or delete),
                            // .... you'll still be deleting characters (because view.state.doc.length will be > 0)

                            if (event.key === "Backspace" && event.repeat) {
                                if (view.state.doc.length === 0) {
                                    // Only if this would be a cell-deleting backspace, we jump in
                                    return true
                                }
                            }
                            if (event.key === "Delete" && event.repeat) {
                                if (view.state.doc.length === 0) {
                                    // Only if this would be a cell-deleting backspace, we jump in
                                    return true
                                }
                            }

                            // Because of the "hacky" way this works, we need to check if autocompletion is open...
                            // else we'll block the ability to press ArrowDown for autocomplete....
                            // Adopted from https://github.com/codemirror/autocomplete/blob/a53f7ff19dc3a0412f3ce6e2751b08b610e1d762/src/view.ts#L15
                            let autocompletion_open = view.state.field(completionState, false)?.open ?? false

                            // If we have a cursor instead of a multicharacter selection:
                            let selection = view.state.selection.main
                            if (selection.to === selection.from) {
                                if (event.key === "ArrowLeft" && event.repeat) {
                                    if (selection.from === 0) {
                                        return true
                                    }
                                }
                                if (event.key === "ArrowUp" && event.repeat && !autocompletion_open) {
                                    if (selection.from === 0) {
                                        return true
                                    }
                                }
                                if (event.key === "ArrowRight" && event.repeat) {
                                    if (selection.to === view.state.doc.length) {
                                        return true
                                    }
                                }
                                if (event.key === "ArrowDown" && event.repeat && !autocompletion_open) {
                                    if (selection.to === view.state.doc.length) {
                                        return true
                                    }
                                }
                            }
                        },
                    }),
                    // Remove selection on blur
                    EditorView.domEventHandlers({
                        blur: (event, view) => {
                            view.dispatch({
                                selection: {
                                    anchor: view.state.selection.main.head,
                                    head: view.state.selection.main.head,
                                },
                            })
                            set_cm_forced_focus(null)
                        },
                    }),
                    // Paste plugin
                    EditorView.domEventHandlers({
                        paste: (event, view) => {
                            if (!view.hasFocus) {
                                // Tell codemirror it doesn't have to handle this when it doesn't have focus
                                return true
                            }

                            // Prevent this event from reaching the Editor-level paste handler
                            event.stopPropagation()

                            const topaste = event.clipboardData.getData("text/plain")
                            const deserializer = detect_deserializer(topaste, false)
                            if (deserializer != null) {
                                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer)
                                return true // Prevents codemirror from pasting
                            }
                        },
                    }),
                    // Drag 'n drop plugin
                    EditorView.domEventHandlers({
                        dragover: (event, view) => {
                            if (event.dataTransfer.types[0] !== "text/plain") {
                                on_drag_drop_events(event)
                                return true
                            }
                        },
                        drop: (event, view) => {
                            if (event.dataTransfer.types[0] !== "text/plain") {
                                on_drag_drop_events(event)
                                event.preventDefault()
                                return true
                            }
                        },
                        dragenter: (event, view) => {
                            if (event.dataTransfer.types[0] !== "text/plain") {
                                on_drag_drop_events(event)
                                return true
                            }
                        },
                        dragleave: (event, view) => {
                            if (event.dataTransfer.types[0] !== "text/plain") {
                                on_drag_drop_events(event)
                                return true
                            }
                        },
                    }),
                    EditorState.tabSize.of(4),
                    indentUnit.of("\t"),
                    julia_andrey(),
                    EditorView.updateListener.of(onCM6Update),
                    used_variables_compartment,
                    go_to_definition_plugin,
                    docs_updater,
                    EditorView.lineWrapping,
                    editable.of(EditorView.editable.of(!disable_input_ref.current)),
                    history(),
                    autocompletion({
                        activateOnTyping: false,
                        override: [
                            juliahints_cool_generator({
                                pluto_actions: pluto_actions,
                                notebook_id: notebook_id,
                                on_update_doc_query: on_update_doc_query,
                            }),
                            // TODO completion for local variables
                        ],
                        defaultKeyMap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        optionClass: (c) => (c.is_exported ? "" : "c_notexported"),
                    }),
                    // I put plutoKeyMaps separately because I want make sure we have
                    // higher priority 😈
                    keymap.of(plutoKeyMaps),
                    keymap.of([
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        ...searchKeymap,
                        ...historyKeymap,
                        ...foldKeymap,
                        ...commentKeymap,
                        ...completionKeymap,
                        // ...lint.lintKeymap,
                    ]),
                    placeholder("Enter cell code..."),
                    // julia,
                ],
            }),
            parent: dom_node_ref.current,
        }))
        /** Migration #3: Old code */
        const keys = {}
        // Migrated
        keys["Shift-Enter"] = () => on_submit()
        // Migrated
        keys["Ctrl-Enter"] = async () => {
            // we await to prevent an out-of-sync issue
            await on_add_after()

            const new_value = cm.getValue()
            if (new_value !== remote_code_ref.current) {
                on_submit()
            }
        }
        // Page up and page down are fn+Up and fn+Down on recent apple keyboards
        //Migrated
        keys["PageUp"] = () => {
            on_focus_neighbor(cell_id, -1, 0, 0)
        }
        //Migrated
        keys["PageDown"] = () => {
            on_focus_neighbor(cell_id, +1, 0, 0)
        }
        keys["Shift-Tab"] = "indentLess" // TODO
        keys["Tab"] = on_tab_key // TODO
        keys["Ctrl-Space"] = () => cm.showHint() //TODO
        keys["Ctrl-D"] = () => {
            // TODO
            if (cm.somethingSelected()) {
                const sels = cm.getSelections()
                if (all_equal(sels)) {
                    // TODO
                }
            } else {
                const cursor = cm.getCursor()
                const token = cm.getTokenAt(cursor)
                cm.setSelection({ line: cursor.line, ch: token.start }, { line: cursor.line, ch: token.end })
            }
        }

        // Default config
        keys["Ctrl-/"] = () => {
            const old_value = cm.getValue()
            cm.toggleComment({ indent: true })
            const new_value = cm.getValue()
            if (old_value === new_value) {
                // the commenter failed for some reason
                // this happens when lines start with `md"`, with no indent
                cm.setValue(cm.lineCount() === 1 ? `# ${new_value}` : `#= ${new_value} =#`)
                cm.execCommand("selectAll")
            }
        }

        // Migrated
        keys["Ctrl-M"] = () => {
            const value = cm.getValue()
            const trimmed = value.trim()
            const offset = value.length - value.trimStart().length
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
                    cm.setValue("")
                } else {
                    while (/\s/.test(trimmed[start])) {
                        ++start
                    }
                    while (/\s/.test(trimmed[end - 1])) {
                        --end
                    }
                    // Keep the selection from [start, end) while maintaining cursor position
                    cm.replaceRange("", cm.posFromIndex(end + offset), { line: cm.lineCount() })
                    cm.replaceRange("", { line: 0, ch: 0 }, cm.posFromIndex(start + offset))
                }
            } else {
                // Code cell, change to markdown
                const old_selections = cm.listSelections()
                cm.setValue(`md"""\n${value}\n"""`)
                // Move all selections down a line
                const new_selections = old_selections.map(({ anchor, head }) => {
                    return {
                        anchor: { ...anchor, line: anchor.line + 1 },
                        head: { ...head, line: head.line + 1 },
                    }
                })
                cm.setSelections(new_selections)
            }
        }

        const alt_move = (delta) => {
            const selections = cm.listSelections()
            const selected_lines = new Set([].concat(...selections.map((sel) => range(sel.anchor.line, sel.head.line))))
            const final_line_number = delta === 1 ? cm.lineCount() - 1 : 0
            if (!selected_lines.has(final_line_number)) {
                Array.from(selected_lines)
                    .sort((a, b) => (delta * a < delta * b ? 1 : -1))
                    .forEach((line_number) => {
                        const lines = cm.getValue().split("\n")
                        swap(lines, line_number, line_number + delta)
                        cm.setValue(lines.join("\n"))
                        cm.indentLine(line_number + delta, "smart")
                        cm.indentLine(line_number, "smart")
                    })
                cm.setSelections(
                    selections.map((sel) => {
                        return {
                            head: {
                                line: sel.head.line + delta,
                                ch: sel.head.ch,
                            },
                            anchor: {
                                line: sel.anchor.line + delta,
                                ch: sel.anchor.ch,
                            },
                        }
                    })
                )
            }
        }
        //Default
        keys["Alt-Up"] = () => alt_move(-1)
        // Default
        keys["Alt-Down"] = () => alt_move(+1)

        // Migrated
        keys["Backspace"] = keys["Ctrl-Backspace"] = () => {
            if (disable_input_ref.current) {
                return
            }
            const BACKSPACE_CELL_DELETE_COOLDOWN = 300
            const BACKSPACE_AFTER_FORCE_FOCUS_COOLDOWN = 300

            if (cm.lineCount() === 1 && cm.getValue() === "") {
                // I wanted to write comments, but I think my variable names are documentation enough
                let enough_time_passed_since_last_backspace = Date.now() - time_last_genuine_backspace.current > BACKSPACE_CELL_DELETE_COOLDOWN
                let enough_time_passed_since_force_focus = Date.now() - time_last_being_force_focussed_ref.current > BACKSPACE_AFTER_FORCE_FOCUS_COOLDOWN
                if (enough_time_passed_since_last_backspace && enough_time_passed_since_force_focus) {
                    on_focus_neighbor(cell_id, -1)
                    on_delete()
                }
            }

            let enough_time_passed_since_force_focus = Date.now() - time_last_being_force_focussed_ref.current > BACKSPACE_AFTER_FORCE_FOCUS_COOLDOWN
            if (enough_time_passed_since_force_focus) {
                time_last_genuine_backspace.current = Date.now()
                return CodeMirror.Pass
            } else {
                // Reset the force focus timer, as I want it to act like a debounce, not just a delay
                time_last_being_force_focussed_ref.current = Date.now()
            }
        }
        // Mirgated
        keys["Delete"] = keys["Ctrl-Delete"] = () => {
            if (disable_input_ref.current) {
                return
            }
            if (cm.lineCount() === 1 && cm.getValue() === "") {
                on_focus_neighbor(cell_id, +1)
                on_delete()
            }
            return CodeMirror.Pass
        }

        const isapprox = (a, b) => Math.abs(a - b) < 3.0
        const at_first_line_visually = () => isapprox(cm.cursorCoords(null, "div").top, 0.0)
        // Migrated
        keys["Up"] = with_time_since_last((elapsed) => {
            // TODO
            if (elapsed > 300 && at_first_line_visually()) {
                on_focus_neighbor(cell_id, -1, Infinity, Infinity)
                // todo:
                // on_focus_neighbor(cell_id, -1, Infinity, cm.getCursor().ch)
                // but this does not work if the last line in the previous cell wraps
                // and i can't figure out how to fix it in a simple way
            } else {
                return CodeMirror.Pass
            }
        })
        const at_first_position = () => cm.findPosH(cm.getCursor(), -1, "char")?.hitSide === true

        // Doing
        keys["Left"] = with_time_since_last((elapsed) => {
            // Migrated
            if (elapsed > 300 && at_first_position()) {
                on_focus_neighbor(cell_id, -1, Infinity, Infinity)
            } else {
                return CodeMirror.Pass
            }
        })
        const at_last_line_visually = () => isapprox(cm.cursorCoords(null, "div").top, cm.cursorCoords({ line: Infinity, ch: Infinity }, "div").top)
        keys["Down"] = with_time_since_last((elapsed) => {
            // Migrated
            if (elapsed > 300 && at_last_line_visually()) {
                on_focus_neighbor(cell_id, 1, 0, 0)
                // todo:
                // on_focus_neighbor(cell_id, 1, 0, cm.getCursor().ch)
                // same here
            } else {
                return CodeMirror.Pass
            }
        })
        const at_last_position = () => cm.findPosH(cm.getCursor(), 1, "char")?.hitSide === true
        keys["Right"] = with_time_since_last((elapsed) => {
            // Migrated
            if (elapsed > 300 && at_last_position()) {
                on_focus_neighbor(cell_id, 1, 0, 0)
            } else {
                return CodeMirror.Pass
            }
        })

        // Default
        const open_close_selection = (opening_char, closing_char) => () => {
            // Default
            if (cm.somethingSelected()) {
                for (const selection of cm.getSelections()) {
                    cm.replaceSelection(`${opening_char}${selection}${closing_char}`, "around")
                }
            } else {
                return CodeMirror.Pass
            }
        }
        // Default + works with all '', "", ``, [], {}, ()!
        ;["()", "{}", "[]"].forEach((pair) => {
            const [opening_char, closing_char] = pair.split("")
            keys[`'${opening_char}'`] = open_close_selection(opening_char, closing_char)
        })

        cm.setOption("extraKeys", map_cmd_to_ctrl_on_mac(keys))

        let is_good_token = (token) => {
            if (token.type == null && token.string === "]") {
                return true
            }

            // Symbol, and symbols don't have autocomplete 🤷‍♀️
            if (token.type === "builtin" && token.string.startsWith(":") && !token.string.startsWith("::")) {
                return false
            }
            let bad_token_types = ["number", "string", null]
            if (bad_token_types.includes(token.type)) {
                return false
            }
            return true
        }
        // MIGRATED
        cm.on("dragover", (cm_, e) => {
            if (e.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e)
                return true
            }
        })

        // MIGRATED
        cm.on("drop", (cm_, e) => {
            if (e.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e)
                e.preventDefault()
                return true
            }
        })

        // MIGRATED
        cm.on("dragenter", (cm_, e) => {
            if (e.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e)
                return true
            }
        })

        // MIGRATED
        cm.on("dragleave", (cm_, e) => {
            if (e.dataTransfer.types[0] !== "text/plain") {
                on_drag_drop_events(e)
                return true
            }
        })

        // MIGRATED
        cm.on("cursorActivity", () => {
            setTimeout(() => {
                if (!cm.hasFocus()) return
                if (cm.somethingSelected()) {
                    const sel = cm.getSelection()
                    if (!/[\s]/.test(sel)) {
                        // no whitespace
                        on_update_doc_query(sel)
                    }
                } else {
                    const cursor = cm.getCursor()
                    const token = cm.getTokenAt(cursor)
                    if (token.start === 0 && token.type === "operator" && token.string === "?") {
                        // https://github.com/fonsp/Pluto.jl/issues/321
                        const second_token = cm.getTokenAt({ ...cursor, ch: 2 })
                        on_update_doc_query(second_token.string)
                    } else {
                        const token_before_cursor = cm.getTokenAt(cursor)
                        const token_after_cursor = cm.getTokenAt({ ...cursor, ch: cursor.ch + 1 })

                        let before_and_after_token = [token_before_cursor, token_after_cursor]

                        // Fix for string macros
                        for (let possibly_string_macro of before_and_after_token) {
                            let match = possibly_string_macro.string.match(/([a-zA-Z]+)"/)
                            if (possibly_string_macro.type === "string" && match != null) {
                                return on_update_doc_query(`@${match[1]}_str`)
                            }
                        }

                        let good_token = before_and_after_token.find((x) => is_good_token(x))
                        if (good_token) {
                            let tokens = cm.getLineTokens(cursor.line)
                            let current_token = tokens.findIndex((x) => x.start === good_token.start && x.end === good_token.end)
                            on_update_doc_query(
                                module_expanded_selection({
                                    tokens_before_cursor: tokens.slice(0, current_token + 1),
                                    tokens_after_cursor: tokens.slice(current_token + 1),
                                })
                            )
                        }
                    }
                }
            }, 0)
        })

        // Migrated (cm6 uses an observer)
        cm.on("change", (cm, e) => {
            // console.log("cm changed event ", e)
            const new_value = cm.getValue()
            if (new_value.length > 1 && new_value[0] === "?") {
                window.dispatchEvent(new CustomEvent("open_live_docs"))
            }
            on_change_ref.current(new_value)

            // remove the currently attached widgets from the codemirror DOM. Widgets corresponding to package imports that did not changed will be re-attached later.
            cm.getAllMarks().forEach((m) => {
                const m_position = m.find()
                if (e.from.line <= m_position.line && m_position.line <= e.to.line) {
                    m.clear()
                }
            })

            // TODO: split this function into a search that returns the list of mathces and an updater
            // we can use that when you submit the cell to definitively find the list of import
            // and then purge the map?

            // TODO: debounce _any_ edit to update all imports for this cell
            // because adding #= to the start of a cell will remove imports later

            // iterate through changed lines
            range(e.from.line, e.to.line).forEach(update_line_bubbles)
        })

        // MIGRATED
        cm.on("blur", () => {
            // NOT a debounce:
            setTimeout(() => {
                if (document.hasFocus()) {
                    clear_selection(cm)
                    set_cm_forced_focus(null)
                }
            }, 100)
        })

        // MIGRATED
        cm.on("paste", (cm, e) => {
            const topaste = e.clipboardData.getData("text/plain")
            const deserializer = detect_deserializer(topaste, false)
            if (deserializer != null) {
                pluto_actions.add_deserialized_cells(topaste, cell_id, deserializer)
                e.stopImmediatePropagation()
                e.preventDefault()
                e.codemirrorIgnore = true
            }
            e.stopPropagation()
        })

        // MIGRATED
        cm.on("mousedown", (cm, e) => {
            const notebook = pluto_actions.get_notebook()
            const mycell = notebook?.cell_dependencies?.[cell_id]
            const used_variables = Object.keys(mycell?.upstream_cells_map || {})
            const { which } = e
            const path = e.path || e.composedPath()
            const isVariable = path[0]?.classList.contains("cm-variable")
            const varName = path[0]?.textContent
            if (has_ctrl_or_cmd_pressed(e) && which === 1 && isVariable && used_variables.includes(varName)) {
                e.preventDefault()
                document.querySelector(`[id='${encodeURI(varName)}']`).scrollIntoView()

                window.dispatchEvent(
                    new CustomEvent("cell_focus", {
                        detail: {
                            cell_id: mycell.upstream_cells_map[varName][0],
                            line: 0, // 1-based to 0-based index
                        },
                    })
                )
            }
        })
        if (focus_after_creation) {
            // MIGRATED (and commented because it blocks the "smooth" scroll into view)
            // cm.focus()
            setTimeout(() => {
                let view = newcm_ref.current
                view.dom.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
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
        document.fonts.ready.then(() => {
            cm.refresh()
        })

        // we initialize with "" and then call setValue to trigger the "change" event
        cm.setValue(local_code)
    }, [])

    // useEffect(() => {
    //     if (!remote_code.submitted_by_me) {
    //         cm_ref.current.setValue(remote_code.body)
    //     }
    // }, [remote_code.timestamp])

    useLayoutEffect(() => {
        disable_input_ref.current = disable_input
        cm_ref.current.options.disableInput = disable_input
        newcm_ref.current.dispatch({
            effects: editable.reconfigure(EditorView.editable.of(!disable_input)),
        })
    }, [disable_input])

    // Migrated
    /*useEffect(() => {
        if (cm_forced_focus == null) {
            let view = newcm_ref.current
            newcm_ref.current.dispatch({
                selection: {
                    anchor: view.state.selection.main.head,
                    head: view.state.selection.main.head,
                },
            })
        } else {
            time_last_being_force_focussed_ref.current = Date.now()
            let doc = newcm_ref.current.state.doc

            let new_selection = {
                anchor:
                    cm_forced_focus[0].line === Infinity || cm_forced_focus[0].ch === Infinity
                        ? doc.length
                        : doc.line(cm_forced_focus[0].line + 1).from + cm_forced_focus[0].ch,
                head:
                    cm_forced_focus[1].line === Infinity || cm_forced_focus[1].ch === Infinity
                        ? doc.length
                        : doc.line(cm_forced_focus[1].line + 1).from + cm_forced_focus[1].ch,
            }

            newcm_ref.current.focus()
            newcm_ref.current.dispatch({
                selection: new_selection,
            })
        }
    }, [cm_forced_focus]) */

    let line_and_ch_to_cm6_position = (doc, { line, ch }) => {
        let line_object = doc.line(_.clamp(line + 1, 1, doc.lines))
        let ch_clamped = _.clamp(ch, 0, line_object.length)
        return line_object.from + ch_clamped
    }

    useEffect(() => {
        const cm = newcm_ref.current
        if (cm_forced_focus == null) {
            cm.dispatch({
                selection: {
                    anchor: cm.state.selection.main.head,
                    head: cm.state.selection.main.head,
                },
            })
        } else {
            // MIGRATED I think this no longer necessary with the .repeat keyboard stuff
            time_last_being_force_focussed_ref.current = Date.now()

            let new_selection = {
                anchor: line_and_ch_to_cm6_position(cm.state.doc, cm_forced_focus[0]),
                head: line_and_ch_to_cm6_position(cm.state.doc, cm_forced_focus[1]),
            }

            let dom = /** @type {HTMLElement} */ (cm.dom)
            dom.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                // UNCOMMENT THIS AND SEE, this feels amazing but I feel like people will not like it
                // block: "center",
            })

            newcm_ref.current.focus()
            newcm_ref.current.dispatch({
                selection: new_selection,
            })
        }
    }, [cm_forced_focus])

    // fix a visual glitch where the input is only 5px high after unfolding the cell
    // Mirgration: Not needed?
    useEffect(() => {
        if (show_input) {
            cm_ref.current.refresh()
        }
    }, [show_input])

    // TODO effect hook for disable_input?
    return html`
        <pluto-input ref=${dom_node_ref}>
            <${InputContextMenu} on_delete=${on_delete} cell_id=${cell_id} run_cell=${on_submit} running_disabled=${running_disabled} />
            <textarea ref=${text_area_ref}></textarea>
        </pluto-input>
    `
}

const InputContextMenu = ({ on_delete, cell_id, run_cell, running_disabled }) => {
    const timeout = useRef(null)
    let pluto_actions = useContext(PlutoContext)
    const [open, setOpen] = useState(false)
    const mouseenter = () => {
        clearTimeout(timeout.current)
    }
    const mouseleave = () => {
        timeout.current = setTimeout(() => setOpen(false), 250)
    }
    const toggle_running_disabled = async (e) => {
        const new_val = !running_disabled
        e.preventDefault()
        e.stopPropagation()
        await pluto_actions.update_notebook((notebook) => {
            notebook.cell_inputs[cell_id].running_disabled = new_val
        })
        // we also 'run' the cell if it is disabled, this will make the backend propage the disabled state to dependent cells
        await run_cell()
    }

    return html` <button onMouseleave=${mouseleave} onClick=${() => setOpen(!open)} onBlur=${() => setOpen(false)} class="delete_cell" title="Actions">
        <span class="icon"></span>
        ${open
            ? html`<ul onMouseenter=${mouseenter} class="input_context_menu">
                  <li onClick=${on_delete} title="Delete"><span class="delete_icon" />Delete cell</li>
                  <li
                      onClick=${toggle_running_disabled}
                      title=${running_disabled ? "Enable and run the cell" : "Disable this cell, and all cells that depend on it"}
                  >
                      ${running_disabled ? html`<span class="enable_cell_icon" />` : html`<span class="disable_cell_icon" />`}
                      ${running_disabled ? html`<b>Enable cell</b>` : html`Disable cell`}
                  </li>
                  <li class="coming_soon" title=""><span class="bandage_icon" /><em>Coming soon…</em></li>
              </ul>`
            : html``}
    </button>`
}

const no_autocomplete = " \t\r\n([])+-=/,;'\"!#$%^&*~`<>|"

// TODO
const on_tab_key = (cm) => {
    const cursor = cm.getCursor()
    const old_line = cm.getLine(cursor.line)

    if (cm.somethingSelected()) {
        cm.indentSelection()
    } else {
        if (cursor.ch > 0 && no_autocomplete.indexOf(old_line[cursor.ch - 1]) == -1) {
            cm.showHint()
        } else {
            cm.replaceSelection("\t")
        }
    }
}

// MIGRATED
const juliahints = (cm, options) => {
    const cursor = cm.getCursor()
    const old_line = cm.getLine(cursor.line)
    const old_line_sliced = old_line.slice(0, cursor.ch)

    return options.pluto_actions.send("complete", { query: old_line_sliced }, { notebook_id: options.notebook_id }).then(({ message }) => {
        const completions = {
            list: message.results.map(([text, type_description, is_exported]) => ({
                text: text,
                className: (is_exported ? "" : "c_notexported ") + (type_description == null ? "" : "c_" + type_description),
                // render: (el) => el.appendChild(observablehq_for_myself.html`<div></div>`),
            })),
            from: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, message.start)),
            to: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, message.stop)),
        }
        CodeMirror.on(completions, "select", (val) => {
            let text = typeof val === "string" ? val : val.text
            let doc_query = module_expanded_selection({
                tokens_before_cursor: [
                    { type: "variable", string: old_line_sliced.slice(0, completions.from.ch) },
                    { type: "variable", string: text },
                ],
                tokens_after_cursor: [],
            })
            options.on_update_doc_query(doc_query)
        })
        return completions
    })
}

const juliahints_cool_generator = (options) => (ctx) => {
    // BETTER MODULE_EXPANDED_SELECTION
    let selection = ctx.state.selection.main
    let tree = syntaxTree(ctx.state)
    let node = tree.resolve(selection.from, -1)

    let to_complete_onto = null
    if (ctx.state.sliceDoc(selection.from - 1, selection.from) === ".") {
        if (node.name === "BinaryExpression") {
            // This is the parser not getting that we're going for a FieldExpression
            // But it's cool, because this is as expanded as it gets
        }

        // This is what julia-lezer thinks the `.` is in `@Base.`
        if (node.parent?.name === "MacroArgumentList") {
            do {
                node = node.parent
            } while (node.name !== "MacroExpression")
        }
    } else {
        while (node.parent?.name === "FieldExpression") {
            node = node.parent
        }
        if (node.name === "FieldExpression") {
            to_complete_onto = ctx.state.sliceDoc(node.firstChild.from, node.lastChild.from)
        }

        if (node.parent?.name === "MacroIdentifier") {
            while (node.name !== "MacroExpression") {
                node = node.parent
            }
        }
    }

    let to_complete = ctx.state.sliceDoc(node.from, selection.to)
    to_complete_onto = to_complete_onto ?? ctx.state.sliceDoc(node.from, node.to)
    // END - BETTER MODULE_EXPANDED_SELECTION

    return options.pluto_actions.send("complete", { query: to_complete }, { notebook_id: options.notebook_id }).then(({ message }) => {
        return {
            from: node.from + utf8index_to_ut16index(to_complete, message.start),
            to: node.from + utf8index_to_ut16index(to_complete, message.stop),
            options: message.results.map(([text, type_description, is_exported], i) => ({
                label: text,
                is_exported,
                // detail: type_description,
                type: (is_exported ? "" : "c_notexported ") + (type_description == null ? "" : "c_" + type_description),
                boost: 99 - i / message.results.length,
                info: () => {
                    console.log(`line + text:`, to_complete_onto + text)
                    options.on_update_doc_query(to_complete_onto + text)

                    return new Promise(() => {})
                },
            })),
        }
    })
}

// https://github.com/fonsp/Pluto.jl/issues/239
const module_expanded_selection = ({ tokens_before_cursor, tokens_after_cursor }) => {
    // Fix for :: type definitions, more specifically :: type definitions with { ... } generics
    // e.g. ::AbstractArray{String} gets parsed by codemirror as [`::AbstractArray{`, `String}`] ??
    let i_guess_current_token = tokens_before_cursor[tokens_before_cursor.length - 1]
    if (i_guess_current_token?.type === "builtin" && i_guess_current_token.string.startsWith("::")) {
        let typedef_tokens = []
        typedef_tokens.push(i_guess_current_token.string.slice(2))
        for (let token of tokens_after_cursor) {
            if (token.type !== "builtin") break
            typedef_tokens.push(token.string)
        }
        return typedef_tokens.join("")
    }

    // Fix for multi-character operators (|>, &&, ||), codemirror splits these up, so we have to stitch them back together.
    if (i_guess_current_token?.type === "operator") {
        let operator_tokens = []
        for (let token of tokens_before_cursor.reverse()) {
            if (token.type !== "operator") {
                break
            }
            operator_tokens.unshift(token.string)
        }
        for (let token of tokens_after_cursor) {
            if (token.type !== "operator") {
                break
            }
            operator_tokens.push(token.string)
        }
        return operator_tokens.join("")
    }

    let found = []
    /** @type {"top" | "in-ref"} */
    let state = "top"
    for (let token of tokens_before_cursor.slice().reverse()) {
        if (state === "top") {
            if (token.type == null && token.string == "]") {
                state = "in-ref"
                found.push(token.string)
                continue
            }
            if (token.type == null) {
                break
            }
            if (token.type === "number") {
                break
            }
            if (token.type === "builtin" && token.string.startsWith("::")) {
                found.push(token.string.slice(2))
                break
            }
            found.push(token.string)
        } else if (state === "in-ref") {
            if (token.type == null && token.string == "[") {
                state = "top"
                found.push(token.string)
                continue
            }
            if (token.type === "number" || token.type === "string") {
                found.push(token.string)
                continue
            }
            break
        }
    }
    return found.reverse().join("").replace(/\.$/, "")
}
