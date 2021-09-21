import { html, useState, useEffect, useLayoutEffect, useRef, useContext, useMemo } from "../imports/Preact.js"
import _ from "../imports/lodash.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { PlutoContext } from "../common/PlutoContext.js"
import { nbpkg_fingerprint, PkgStatusMark, PkgActivateMark, pkg_disablers } from "./PkgStatusMark.js"
import { get_selected_doc_from_state } from "./CellInput/LiveDocsFromCursor.js"
import { go_to_definition_plugin, UsedVariablesFacet } from "./CellInput/go_to_definition_plugin.js"
import { block_matcher_plugin } from "./CellInput/block_matcher_plugin.js"
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
    bracketMatching,
    closeBrackets,
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

export const pluto_syntax_colors = HighlightStyle.define([
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

// TODO Make useStateField intead? Feels like Facets are supposed to be more static
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

let line_and_ch_to_cm6_position = (doc, { line, ch }) => {
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

    const newcm_ref = useRef(/** @type {EditorView} */ (null))
    const dom_node_ref = useRef(/** @type {HTMLElement} */ (null))
    const remote_code_ref = useRef(null)
    const on_change_ref = useRef(null)
    on_change_ref.current = on_change
    const disable_input_ref = useRef(disable_input)

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
        const keyMapSubmit = () => {
            on_submit()
            return true
        }
        let run = async (fn) => await fn()
        const keyMapRun = (cm) => {
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
        const keyMapPageUp = () => {
            on_focus_neighbor(cell_id, -1, 0, 0)
            return true
        }
        const keyMapPageDown = () => {
            on_focus_neighbor(cell_id, +1, 0, 0)
            return true
        }
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
                let prefix = `md"""\n`
                let suffix = `\n"""`
                // TODO Multicursor?
                let selection = cm.state.selection.main
                cm.dispatch({
                    changes: [
                        { from: 0, to: 0, insert: prefix },
                        { from: cm.state.doc.length, to: cm.state.doc.length, insert: suffix },
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
        const keyMapDelete = (cm) => {
            if (cm.state.facet(EditorState.readOnly)) {
                return false
            }
            if (cm.state.doc.length === 0) {
                on_focus_neighbor(cell_id, +1)
                on_delete()
                return true
            }
        }

        const keyMapBackspace = (cm) => {
            if (cm.state.facet(EditorState.readOnly)) {
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

        const plutoKeyMaps = [
            { key: "Shift-Enter", run: keyMapSubmit },
            { key: "Ctrl-Enter", mac: "Cmd-Enter", run: keyMapRun },
            { key: "PageUp", run: keyMapPageUp },
            { key: "PageDown", run: keyMapPageDown },
            { key: "Tab", run: keyMapTab, shift: keyMapTabShift },
            { key: "Ctrl-m", mac: "Cmd-m", run: keyMapMD },
            // Codemirror6 doesn't like capslock
            { key: "Ctrl-M", run: keyMapMD },
            { key: "Delete", run: keyMapDelete },
            { key: "Ctrl-Delete", run: keyMapDelete },
            { key: "Backspace", run: keyMapBackspace },
            { key: "Ctrl-Backspace", run: keyMapBackspace },
            { key: "ArrowLeft", run: keyMapLeft },
            { key: "ArrowUp", run: keyMapLeft },
            { key: "ArrowRight", run: keyMapRight },
            { key: "ArrowDown", run: keyMapRight },
        ]
        const onCM6Update = (update) => {
            if (update.docChanged) {
                const cm = newcm_ref.current
                const new_value = getValue6(cm)

                // TODO Move to own plugin
                if (new_value.length > 1 && new_value[0] === "?") {
                    window.dispatchEvent(new CustomEvent("open_live_docs"))
                }
                on_change_ref.current(new_value)
            }
        }

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
                    pluto_syntax_colors,
                    lineNumbers(),
                    highlightSpecialChars(),
                    history(),
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
                    editable.of(EditorState.readOnly.of(disable_input_ref.current)),
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
                        defaultKeymap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        // @ts-ignore
                        optionClass: (c) => (c.is_exported ? "" : "c_notexported"),
                    }),
                    // Putting the keymap here explicitly, so it's clear this keymap is in front
                    // of Pluto's keymap...
                    keymap.of(completionKeymap),
                    // I put plutoKeyMaps separately because I want make sure we have
                    // higher priority 😈
                    keymap.of(plutoKeyMaps),
                    keymap.of([
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        // ...searchKeymap,
                        ...historyKeymap,
                        ...foldKeymap,
                        ...commentKeymap,
                        // ...lint.lintKeymap,
                    ]),
                    placeholder("Enter cell code..."),
                    // julia,
                ],
            }),
            parent: dom_node_ref.current,
        }))

        // For use from useDropHandler
        // @ts-ignore
        newcm.dom.CodeMirror = {
            getValue: () => newcm.state.doc.toString(),
        }

        if (focus_after_creation) {
            // MIGRATED (and commented because it blocks the "smooth" scroll into view)
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
    }, [])

    useLayoutEffect(() => {
        disable_input_ref.current = disable_input
        newcm_ref.current.dispatch({
            effects: editable.reconfigure(EditorState.readOnly.of(disable_input)),
        })
    }, [disable_input])

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

    // TODO effect hook for disable_input?
    return html`
        <pluto-input ref=${dom_node_ref}>
            <${InputContextMenu} on_delete=${on_delete} cell_id=${cell_id} run_cell=${on_submit} running_disabled=${running_disabled} />
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

// TODO Maybe use this again later?
// const no_autocomplete = " \t\r\n([])+-=/,;'\"!#$%^&*~`<>|"

/**
 * @param {EditorState} state
 * @param {number} pos
 */
let expand_expression_to_completion_stuff = (state, pos) => {
    let selection = state.selection.main
    let tree = syntaxTree(state)
    let node = tree.resolve(selection.from, -1)

    let to_complete_onto = null
    let to_complete = null
    if (state.sliceDoc(selection.from - 1, selection.from) === ".") {
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
        // Make sure that `import XX` and `using XX` are handled awesomely
        if (node.parent?.name === "Import") {
            node = node.parent.parent
        }

        while (node.parent?.name === "FieldExpression") {
            node = node.parent
        }
        if (node.name === "FieldExpression") {
            // Not exactly sure why, but this makes `aaa.bbb.ccc` into `aaa.bbb.`
            to_complete_onto = state.sliceDoc(node.firstChild.from, node.lastChild.from)
        }

        if (node.parent?.name === "MacroIdentifier") {
            while (node.name !== "MacroExpression") {
                node = node.parent
            }
        }
    }

    to_complete = to_complete ?? state.sliceDoc(node.from, selection.to)
    to_complete_onto = to_complete_onto ?? state.sliceDoc(node.from, node.to)
    return { to_complete, to_complete_onto, from: node.from }
}

let match_unicode_complete = (ctx) => {
    let match = ctx.matchBefore(/\\[^\s"'`]*/)

    if (match) {
        return { to_complete: match.text, to_complete_onto: match.text, from: match.from }
    } else {
        return null
    }
}

const juliahints_cool_generator = (options) => (ctx) => {
    let unicode_match = match_unicode_complete(ctx)
    console.log(`unicode_match:`, unicode_match)
    let { to_complete, to_complete_onto, from } = unicode_match ?? expand_expression_to_completion_stuff(ctx.state, ctx.pos)

    console.log(`to_complete:`, to_complete)
    return options.pluto_actions.send("complete", { query: to_complete }, { notebook_id: options.notebook_id }).then(({ message }) => {
        console.log(`message:`, message)
        console.log(`from:`, from)
        console.log(`utf8index_to_ut16index(to_complete, message.start):`, utf8index_to_ut16index(to_complete, message.start))
        console.log(`utf8index_to_ut16index(to_complete, message.stop):`, utf8index_to_ut16index(to_complete, message.stop))
        return {
            from: from + utf8index_to_ut16index(to_complete, message.start),
            to: from + utf8index_to_ut16index(to_complete, message.stop),
            // from: 1,
            // to: 2,
            options: [
                ...message.results.map(([text, type_description, is_exported], i) => ({
                    label: text,
                    // apply: () => {},
                    is_exported,
                    // apply: "hi",
                    // detail: type_description,
                    type: (is_exported ? "" : "c_notexported ") + (type_description == null ? "" : "c_" + type_description),
                    boost: 99 - i / message.results.length,
                    info: () => {
                        options.on_update_doc_query(to_complete_onto + text)

                        return new Promise(() => {})
                    },
                })),
            ],
        }
    })
}
