import { html, Component, useState, useRef, useEffect, useLayoutEffect } from "../imports/Preact.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { map_cmd_to_ctrl_on_mac } from "../common/KeyboardShortcuts.js"

import {
    EditorState,
    EditorSelection,
    EditorView,
    placeholder as Placeholder,
    keymap,
    history,
    autocomplete,
    drawSelection,
    Compartment,
    StateEffect,
} from "../imports/CodemirrorPlutoSetup.js"
import { guess_notebook_location } from "../common/NotebookLocationFromURL.js"
import { tab_help_plugin } from "./CellInput/tab_help_plugin.js"

let { autocompletion, completionKeymap } = autocomplete

let start_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Ctrl-Space")
let accept_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Enter")
let close_autocomplete_command = completionKeymap.find((keybinding) => keybinding.key === "Escape")

const assert_not_null = (x) => {
    if (x == null) {
        throw new Error("Unexpected null value")
    } else {
        return x
    }
}

const set_cm_value = (/** @type{EditorView} */ cm, /** @type {string} */ value, scroll = true) => {
    cm.dispatch({
        changes: { from: 0, to: cm.state.doc.length, insert: value },
        selection: EditorSelection.cursor(value.length),
        // a long path like /Users/fons/Documents/article-test-1/asdfasdfasdfsadf.jl does not fit in the little box, so we scroll it to the left so that you can see the filename easily.
        scrollIntoView: scroll,
    })
}

const is_desktop = !!window.plutoDesktop

if (is_desktop) {
    console.log("Running in Desktop Environment! Found following properties/methods:", window.plutoDesktop)
}

/**
 * @param {{
 *  value: String,
 *  suggest_new_file: {base: String},
 *  button_label: String,
 *  placeholder: String,
 *  on_submit: (new_path: String) => Promise<void>,
 *  on_desktop_submit?: (loc?: string) => Promise<void>,
 *  client: import("../common/PlutoConnection.js").PlutoConnection,
 *  clear_on_blur: Boolean,
 * }} props
 */
export const FilePicker = ({ value, suggest_new_file, button_label, placeholder, on_submit, on_desktop_submit, client, clear_on_blur }) => {
    const [is_button_disabled, set_is_button_disabled] = useState(true)
    const [url_value, set_url_value] = useState("")
    const forced_value = useRef("")
    /** @type {import("../imports/Preact.js").Ref<HTMLElement>} */
    const base = useRef(/** @type {any} */ (null))
    const cm = useRef(/** @type {EditorView?} */ (null))

    const suggest_not_tmp = () => {
        const current_cm = cm.current
        if (current_cm == null) return
        if (suggest_new_file != null && current_cm.state.doc.length === 0) {
            // current_cm.focus()
            set_cm_value(current_cm, suggest_new_file.base, false)
            request_path_completions()
        }
        window.dispatchEvent(new CustomEvent("collapse_cell_selection", {}))
    }

    let run = async (fn) => await fn()

    const onSubmit = () => {
        const current_cm = cm.current
        if (current_cm == null) return
        if (!is_desktop) {
            const my_val = current_cm.state.doc.toString()
            if (my_val === forced_value.current) {
                suggest_not_tmp()
                return true
            }
        }
        run(async () => {
            try {
                if (is_desktop && on_desktop_submit) {
                    await on_desktop_submit((await guess_notebook_location(url_value)).path_or_url)
                } else {
                    await on_submit(current_cm.state.doc.toString())
                }
                current_cm.dom.blur()
            } catch (error) {
                set_cm_value(current_cm, forced_value.current, true)
                current_cm.dom.blur()
            }
        })
        return true
    }

    const onBlur = (e) => {
        const still_in_focus = base.current?.matches(":focus-within") || base.current?.contains(e.relatedTarget)
        if (still_in_focus) return
        const current_cm = cm.current
        if (current_cm == null) return
        if (clear_on_blur)
            requestAnimationFrame(() => {
                if (!current_cm.hasFocus) {
                    set_cm_value(current_cm, forced_value.current, true)
                }
            })
    }

    const request_path_completions = () => {
        const current_cm = cm.current
        if (current_cm == null) return
        let selection = current_cm.state.selection.main
        if (selection.from !== selection.to) return
        if (current_cm.state.doc.length !== selection.to) return
        return assert_not_null(start_autocomplete_command).run(current_cm)
    }

    useLayoutEffect(() => {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        const keyMapSubmit = () => {
            onSubmit()
            return true
        }
        cm.current = new EditorView({
            state: EditorState.create({
                doc: "",
                extensions: [
                    drawSelection(),
                    EditorView.domEventHandlers({
                        focus: (event, cm) => {
                            setTimeout(() => {
                                if (suggest_new_file) {
                                    suggest_not_tmp()
                                } else {
                                    request_path_completions()
                                }
                            }, 0)
                            return true
                        },
                    }),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            set_is_button_disabled(update.state.doc.length === 0)
                        }
                    }),
                    EditorView.theme(
                        {
                            "&": {
                                fontSize: "inherit",
                            },
                            ".cm-scroller": {
                                fontFamily: "inherit",
                                overflowY: "hidden",
                                overflowX: "auto",
                            },
                        },
                        { dark: usesDarkTheme }
                    ),
                    // EditorView.updateListener.of(onCM6Update),
                    history(),
                    autocompletion({
                        activateOnTyping: true,
                        override: [
                            pathhints({
                                suggest_new_file: suggest_new_file,
                                client: client,
                            }),
                        ],
                        defaultKeymap: false, // We add these manually later, so we can override them if necessary
                        maxRenderedOptions: 512, // fons's magic number
                        optionClass: (c) => c.type ?? "",
                    }),
                    // When a completion is picked, immediately start autocompleting again
                    EditorView.updateListener.of((update) => {
                        update.transactions.forEach((transaction) => {
                            const completion = transaction.annotation(autocomplete.pickedCompletion)
                            if (completion != null) {
                                update.view.dispatch({
                                    effects: EditorView.scrollIntoView(update.state.doc.length),
                                    selection: EditorSelection.cursor(update.state.doc.length),
                                })

                                request_path_completions()
                            }
                        })
                    }),
                    keymap.of([
                        {
                            key: "Enter",
                            run: (cm) => {
                                // If there is autocomplete open, accept that. It will return `true`
                                return assert_not_null(accept_autocomplete_command).run(cm)
                            },
                        },
                        {
                            key: "Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Ctrl-Enter",
                            mac: "Cmd-Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Ctrl-Shift-Enter",
                            mac: "Cmd-Shift-Enter",
                            run: keyMapSubmit,
                        },
                        {
                            key: "Tab",
                            run: (cm) => {
                                // If there is autocomplete open, accept that
                                if (assert_not_null(accept_autocomplete_command).run(cm)) {
                                    // and request the next ones
                                    request_path_completions()
                                    return true
                                }
                                // Else, activate it (possibly)
                                return request_path_completions()
                            },
                        },
                    ]),
                    keymap.of(completionKeymap),

                    Placeholder(placeholder),
                    tab_help_plugin,
                ],
            }),
        })
        const current_cm = cm.current

        if (!is_desktop) base.current.insertBefore(current_cm.dom, base.current.firstElementChild)
        // window.addEventListener("resize", () => {
        //     if (!cm.current.hasFocus()) {
        //         deselect(cm.current)
        //     }
        // })
    }, [])

    useLayoutEffect(() => {
        if (forced_value.current != value) {
            if (cm.current == null) return
            set_cm_value(cm.current, value, true)
            forced_value.current = value
        }
    })

    return is_desktop
        ? html`<div class="desktop_picker_group" ref=${base}>
              <input
                  value=${url_value}
                  placeholder="Enter notebook URL..."
                  onChange=${(v) => {
                      set_url_value(v.target.value)
                  }}
              />
              <div onClick=${onSubmit} class="desktop_picker">
                  <button>${button_label}</button>
              </div>
          </div>`
        : html`
              <pluto-filepicker ref=${base} onfocusout=${onBlur}>
                  <button onClick=${onSubmit} disabled=${is_button_disabled}>${button_label}</button>
              </pluto-filepicker>
          `
}

const pathhints =
    ({ client, suggest_new_file }) =>
    (/** @type {autocomplete.CompletionContext} */ ctx) => {
        const cursor = ctx.state.selection.main.to
        const oldLine = ctx.state.doc.toString()

        return client
            .send("completepath", {
                query: oldLine,
            })
            .then((update) => {
                const queryFileName = (oldLine.split("/").pop() ?? "").split("\\").pop() ?? ""

                const results = update.message.results
                const from = utf8index_to_ut16index(oldLine, update.message.start)
                const to = utf8index_to_ut16index(oldLine, update.message.stop)

                if (results.length >= 1 && results[0] == queryFileName) {
                    return null
                }

                let styledResults = results.map((r) => {
                    let dir = r.endsWith("/") || r.endsWith("\\")
                    return {
                        label: r,
                        type: dir ? "dir" : "file",
                        boost: dir ? 1 : 0,
                    }
                })

                if (suggest_new_file != null) {
                    for (let initLength = 3; initLength >= 0; initLength--) {
                        const init = ".jl".substring(0, initLength)
                        if (queryFileName.endsWith(init)) {
                            let suggestedFileName = queryFileName + ".jl".substring(initLength)

                            if (suggestedFileName == ".jl") {
                                suggestedFileName = "notebook.jl"
                            }

                            if (initLength == 3) {
                                return null
                            }
                            if (!results.includes(suggestedFileName)) {
                                styledResults.push({
                                    label: suggestedFileName + " (new)",
                                    apply: suggestedFileName,
                                    type: "file new",
                                    boost: -99,
                                })
                            }
                            break
                        }
                    }
                }

                return {
                    options: styledResults,
                    from: from,
                    to: to,
                }
            })
    }
