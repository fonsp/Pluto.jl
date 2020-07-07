import { html, useState, useEffect, useRef } from "../common/Preact.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"

const clear_selection = (cm) => {
    const c = cm.getCursor()
    cm.setSelection(c, c, { sroll: false })
}

export const CellInput = ({
    remote_code,
    disable_input,
    focus_after_creation,
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
    const change_handler_ref = useRef(null)
    change_handler_ref.current = on_change

    useEffect(() => {
        const cm = (cm_ref.current = window.CodeMirror(
            (el) => {
                dom_node_ref.current.appendChild(el)
            },
            {
                value: remote_code.body,
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
                },
                matchBrackets: true,
            }
        ))

        cm.setOption("extraKeys", {
            "Shift-Enter": () => on_submit(cm.getValue()),
            "Ctrl-Enter": () => {
                on_add_after()
                on_fold(true)
                on_submit(cm.getValue())
            },
            "Shift-Delete": () => {
                if (confirm("Delete cell?")) {
                    on_delete()
                }
            },
            // these should be fn+Up and fn+Down on recent apple keyboards
            // please confirm and change this comment <3
            "PageUp": () => {
                on_focus_neighbor(cell_id, -1)
            },
            "PageDown": () => {
                on_focus_neighbor(cell_id, +1)
            },
            "Shift-Tab": "indentLess",
            "Tab": on_tab_key,
        })

        cm.on("cursorActivity", () => {
            if (cm.somethingSelected()) {
                const sel = cm.getSelection()
                if (!/[\s]/.test(sel)) {
                    // no whitespace
                    on_update_doc_query(sel)
                }
            } else {
                const token = cm.getTokenAt(cm.getCursor())
                if (token.type != null && token.type != "string") {
                    on_update_doc_query(token.string)
                }
            }
        })

        cm.on("change", () => {
            change_handler_ref.current(cm.getValue())
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
            // clear selection
            clear_selection(cm_ref.current)
        } else {
            cm_ref.current.focus()
            cm_ref.current.setSelection(...cm_forced_focus)
        }
    }, [cm_forced_focus])

    // TODO effect hook for disable_input?

    return html`
        <cellinput ref=${dom_node_ref}>
            <button onClick=${on_delete} class="deletecell" title="Delete cell"><span></span></button>
        </cellinput>
    `
    // TODO: confirm delete
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
        .then((update) => {
            const completions = {
                list: update.message.results,
                from: window.CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, update.message.start)),
                to: window.CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, update.message.stop)),
            }
            window.CodeMirror.on(completions, "select", options.on_update_doc_query)
            return completions
        })
}
