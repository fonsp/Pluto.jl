import { html, useState, useEffect, useLayoutEffect, useRef } from "../imports/Preact.js"
import observablehq_for_myself from "../common/SetupCellEnvironment.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { map_cmd_to_ctrl_on_mac } from "../common/KeyboardShortcuts.js"

// @ts-ignore
const CodeMirror = window.CodeMirror

const clear_selection = (cm) => {
    const c = cm.getCursor()
    cm.setSelection(c, c, { scroll: false })
}

const last = (x) => x[x.length - 1]
const all_equal = (x) => x.every((y) => y === x[0])

export const CellInput = ({
    local_code,
    remote_code,
    disable_input,
    focus_after_creation,
    scroll_into_view_after_creation,
    cm_forced_focus,
    set_cm_forced_focus,
    on_submit,
    on_delete,
    on_add_after,
    on_fold,
    on_change,
    on_update_doc_query,
    on_focus_neighbor,
    client,
    cell_id,
    notebook_id,
}) => {
    const cm_ref = useRef(null)
    const dom_node_ref = useRef(null)
    const remote_code_ref = useRef(null)
    const change_handler_ref = useRef(null)
    change_handler_ref.current = on_change

    const time_last_being_force_focussed_ref = useRef(0)
    const time_last_genuine_backspace = useRef(0)

    useEffect(() => {
        remote_code_ref.current = remote_code
    }, [remote_code])

    useEffect(() => {
        const cm = (cm_ref.current = CodeMirror(
            (el) => {
                dom_node_ref.current.appendChild(el)
            },
            {
                value: local_code.body,
                lineNumbers: true,
                mode: "julia",
                lineWrapping: true,
                viewportMargin: Infinity,
                placeholder: "Enter cell code...",
                indentWithTabs: true,
                indentUnit: 4,
                hintOptions: {
                    hint: juliahints,
                    client: client,
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
                matchBrackets: true,
            }
        ))

        const keys = {}

        keys["Shift-Enter"] = () => on_submit(cm.getValue())
        keys["Ctrl-Enter"] = () => {
            on_add_after()

            const new_value = cm.getValue()
            if (new_value !== remote_code_ref.current.body) {
                on_submit(new_value)
            }
        }
        // Page up and page down are fn+Up and fn+Down on recent apple keyboards
        keys["PageUp"] = () => {
            on_focus_neighbor(cell_id, -1, 0, 0)
        }
        keys["PageDown"] = () => {
            on_focus_neighbor(cell_id, +1, 0, 0)
        }
        keys["Shift-Tab"] = "indentLess"
        keys["Tab"] = on_tab_key
        keys["Ctrl-Space"] = () => cm.showHint()
        keys["Ctrl-D"] = () => {
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
        const swap = (a, i, j) => {
            ;[a[i], a[j]] = [a[j], a[i]]
        }
        const range = (a, b) => {
            const x = Math.min(a, b)
            const y = Math.max(a, b)
            return [...Array(y + 1 - x).keys()].map((i) => i + x)
        }
        const alt_move = (delta) => {
            const selections = cm.listSelections()
            const selected_lines = new Set([].concat(...selections.map((sel) => range(sel.anchor.line, sel.head.line))))
            const final_line_number = delta === 1 ? cm.lineCount() - 1 : 0
            if (!selected_lines.has(final_line_number)) {
                Array.from(selected_lines)
                    .sort((a, b) => delta * a < delta * b)
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
        keys["Alt-Up"] = () => alt_move(-1)
        keys["Alt-Down"] = () => alt_move(+1)

        keys["Backspace"] = keys["Ctrl-Backspace"] = () => {
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
        keys["Delete"] = keys["Ctrl-Delete"] = () => {
            if (cm.lineCount() === 1 && cm.getValue() === "") {
                on_focus_neighbor(cell_id, +1)
                on_delete()
            }
            return CodeMirror.Pass
        }

        /** Basically any variable inside an useEffect is already a ref
         * so I'll just roll with this abstraction
         * @param {(time_since: Number) => any} fn
         */
        let with_time_since_last = (fn) => {
            let last_invoke_time = -Infinity // This infinity is for you, Fons
            return () => {
                let result = fn(Date.now() - last_invoke_time)
                last_invoke_time = Date.now()
                return result
            }
        }
        keys["Up"] = with_time_since_last((elapsed) => {
            if (cm.getCursor().line == 0 && elapsed > 300) {
                on_focus_neighbor(cell_id, -1, Infinity, cm.getCursor().ch)
            } else {
                return CodeMirror.Pass
            }
        })
        keys["Down"] = with_time_since_last((elapsed) => {
            if (cm.getCursor().line == cm.lastLine() && elapsed > 300) {
                on_focus_neighbor(cell_id, 1, 0, cm.getCursor().ch)
            } else {
                return CodeMirror.Pass
            }
        })

        cm.setOption("extraKeys", map_cmd_to_ctrl_on_mac(keys))
        cm.setOption("autoCloseBrackets", true)

        cm.on("cursorActivity", () => {
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
                } else if (token.type != null && token.type !== "string") {
                    on_update_doc_query(module_expanded_selection(cm, token.string, cursor.line, token.start))
                }
            }
        })

        cm.on("change", (_, e) => {
            const new_value = cm.getValue()
            if (new_value.length > 1 && new_value[0] === "?") {
                window.dispatchEvent(new CustomEvent("open_live_docs"))
            }
            change_handler_ref.current(new_value)
        })

        cm.on("blur", () => {
            // NOT a debounce:
            setTimeout(() => {
                if (document.hasFocus()) {
                    clear_selection(cm)
                    set_cm_forced_focus(null)
                }
            }, 100)
        })

        if (focus_after_creation) {
            cm.focus()
        }
        if (scroll_into_view_after_creation) {
            dom_node_ref.current.scrollIntoView()
        }

        document.fonts.ready.then(() => {
            cm.refresh()
        })
    }, [])

    useEffect(() => {
        if (!remote_code.submitted_by_me) {
            cm_ref.current.setValue(remote_code.body)
        }
        cm_ref.current.options.disableInput = disable_input
    }, [remote_code.timestamp])

    useEffect(() => {
        if (cm_forced_focus == null) {
            clear_selection(cm_ref.current)
        } else {
            time_last_being_force_focussed_ref.current = Date.now()
            let cm_forced_focus_mapped = cm_forced_focus.map((x) => (x.line == Infinity ? { ...x, line: cm_ref.current.lastLine() } : x))
            cm_ref.current.focus()
            cm_ref.current.setSelection(...cm_forced_focus_mapped)
        }
    }, [cm_forced_focus])

    // TODO effect hook for disable_input?

    return html`
        <pluto-input ref=${dom_node_ref}>
            <button onClick=${on_delete} class="delete_cell" title="Delete cell"><span></span></button>
        </pluto-input>
    `
}

const no_autocomplete = " \t\r\n([])+-=/,;'\"!#$%^&*~`<>|"

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

const juliahints = (cm, options) => {
    const cursor = cm.getCursor()
    const old_line = cm.getLine(cursor.line)
    const old_line_sliced = old_line.slice(0, cursor.ch)

    return options.client
        .send(
            "complete",
            {
                query: old_line_sliced,
            },
            {
                notebook_id: options.notebook_id,
            }
        )
        .then(({ message }) => {
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
                options.on_update_doc_query(module_expanded_selection(cm, val.text, cursor.line, completions.from.ch))
            })
            return completions
        })
}

// https://github.com/fonsp/Pluto.jl/issues/239
const module_expanded_selection = (cm, current, line, ch) => {
    const next1 = cm.getTokenAt({ line: line, ch: ch })
    if (next1.string === ".") {
        const next2 = cm.getTokenAt({ line: line, ch: ch - 1 })
        if (next2.type === "variable") {
            return module_expanded_selection(cm, next2.string + "." + current, line, next2.start)
        } else {
            return current
        }
    } else {
        return current
    }
}
