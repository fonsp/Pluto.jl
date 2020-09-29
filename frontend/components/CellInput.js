import { html, useState, useEffect, useLayoutEffect, useRef } from "../common/Preact.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { map_cmd_to_ctrl_on_mac } from "../common/KeyboardShortcuts.js"
import 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.44.0/addon/search/searchcursor.min.js'

const clear_selection = (cm) => {
    const c = cm.getCursor()
    cm.setSelection(c, c, { scroll: false })
}

const last = (x) => x[x.length - 1]
const all_equal = (x) => x.every((y) => y === x[0])

export const CellInput = ({
    is_hidden,
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
    const remote_code_ref = useRef(null)
    const change_handler_ref = useRef(null)
    change_handler_ref.current = on_change

    useEffect(() => {
        remote_code_ref.current = remote_code
    }, [remote_code])

    useEffect(() => {
      const selectSameWordsListener = (e) => {
        if(!is_hidden){
          var cursor = cm_ref.current.getSearchCursor(e.detail.word)
          var selections = []

          while(cursor.findNext()){
            selections.push(
              { anchor: cursor.from(), head: cursor.to() }
            )
          }

          cm_ref.current.setSelections(selections)


          // update with cm.getRange and replaceRange for cells that are not in focus
        }
      }

      window.addEventListener("select_same_words", selectSameWordsListener)

      return () => { window.removeEventListener("select_same_words", selectSameWordsListener) }
    }, [])

    useEffect(() => {
        if (!is_hidden) {
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
                on_focus_neighbor(cell_id, -1)
            }
            keys["PageDown"] = () => {
                on_focus_neighbor(cell_id, +1)
            }
            keys["Shift-Tab"] = "indentLess"
            keys["Tab"] = on_tab_key
            keys["Ctrl-D"] = () => {
                if (cm.somethingSelected()) {
                    const sels = cm.getSelections()
                    if (all_equal(sels)) {
                        window.dispatchEvent(
                          new CustomEvent("select_same_words", {
                            detail:{
                              word: sels[0]
                            }
                          })
                        )

                        cm.on("keydown", (cm, e) => { if(cm.somethingSelected()){
                          
                        } })
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
                if (cm.lineCount() === 1 && cm.getValue() === "") {
                    on_focus_neighbor(cell_id, -1)
                    on_delete()
                    console.log("backspace!")
                }
                return window.CodeMirror.Pass
            }
            keys["Delete"] = keys["Ctrl-Delete"] = () => {
                if (cm.lineCount() === 1 && cm.getValue() === "") {
                    on_focus_neighbor(cell_id, +1)
                    on_delete()
                    console.log("delete!")
                }
                return window.CodeMirror.Pass
            }

            cm.setOption("extraKeys", map_cmd_to_ctrl_on_mac(keys))

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

            cm.on("change", () => {
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

            document.fonts.ready.then(() => {
                cm.refresh()
            })
        } else {
            if (cm_ref.current != null) {
                const cm_wrapper = cm_ref.current.getWrapperElement()
                cm_wrapper.parentNode.removeChild(cm_wrapper)
                cm_ref.current = null
            }
        }
    }, [is_hidden])

    useEffect(() => {
        if (!is_hidden) {
            if (!remote_code.submitted_by_me) {
                cm_ref.current.setValue(remote_code.body)
            }
            cm_ref.current.options.disableInput = disable_input
        }
    }, [remote_code.timestamp])

    useEffect(() => {
        if (!is_hidden) {
            if (cm_forced_focus == null) {
                clear_selection(cm_ref.current)
            } else {
                cm_ref.current.focus()
                cm_ref.current.setSelection(...cm_forced_focus)
            }
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
        .then((update) => {
            const completions = {
                list: update.message.results,
                from: window.CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, update.message.start)),
                to: window.CodeMirror.Pos(cursor.line, utf8index_to_ut16index(old_line, update.message.stop)),
            }
            window.CodeMirror.on(completions, "select", (val) => {
                options.on_update_doc_query(module_expanded_selection(cm, val, cursor.line, completions.from.ch))
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
