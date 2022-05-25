import { html, Component } from "../imports/Preact.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { map_cmd_to_ctrl_on_mac } from "../common/KeyboardShortcuts.js"

import {
    EditorState,
    EditorSelection,
    EditorView,
    placeholder,
    keymap,
    history,
    autocomplete,
    drawSelection,
    Compartment,
} from "../imports/CodemirrorPlutoSetup.js"

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

/**
 * @typedef FilePickerProps
 * @type {{
 *  value: String,
 *  suggest_new_file: {base: String},
 *  button_label: String,
 *  placeholder: String,
 *  on_submit: (new_path: String) => Promise<void>,
 *  client: import("../common/PlutoConnection.js").PlutoConnection,
 * }}
 * @augments Component<FilePickerProps,{}>
 */
export class FilePicker extends Component {
    constructor(/** @type {FilePickerProps} */ props) {
        super(props)
        this.state = {
            is_button_disabled: true,
        }
        this.forced_value = ""
        /** @type {EditorView?} */
        this.cm = null

        this.suggest_not_tmp = () => {
            if (!this.cm) return
            const suggest = this.props.suggest_new_file
            if (suggest != null && this.cm.state.doc.length === 0) {
                // this.cm.focus()
                this.cm.dispatch({
                    changes: { from: 0, to: this.cm.state.doc.length, insert: suggest.base },
                    selection: EditorSelection.cursor(suggest.base.length),
                })
                this.request_path_completions()
            }
            window.dispatchEvent(new CustomEvent("collapse_cell_selection", {}))
        }

        let run = async (fn) => await fn()
        this.on_submit = () => {
            if (!this.cm) return true
            const cm = this.cm

            const my_val = cm.state.doc.toString()
            if (my_val === this.forced_value) {
                this.suggest_not_tmp()
                return true
            }
            run(async () => {
                try {
                    await this.props.on_submit(cm.state.doc.toString())
                    cm.dom.blur()
                } catch (error) {
                    cm.dispatch({
                        changes: { from: 0, to: cm.state.doc.length, insert: this.props.value },
                        selection: EditorSelection.cursor(this.props.value.length),
                    })
                }
            })
            return true
        }
    }
    componentDidUpdate() {
        if (this.forced_value != this.props.value) {
            if (!this.cm) return
            const cm = this.cm
            cm.dispatch({
                changes: { from: 0, to: cm.state.doc.length, insert: this.props.value },
                selection: EditorSelection.cursor(this.props.value.length),
            })
            this.forced_value = this.props.value

            // a long path like /Users/fons/Documents/article-test-1/asdfasdfasdfsadf.jl does not fit in the little box, so we scroll it to the left so that you can see the filename easily.
            cm.scrollDOM.scrollLeft = 100000
            setTimeout(() => {
                // TODO: do we need this?
                cm.scrollDOM.scrollLeft = 100000
            }, 100)
        }
    }
    componentDidMount() {
        const usesDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        this.cm = new EditorView({
            state: EditorState.create({
                doc: "",
                extensions: [
                    drawSelection(),
                    EditorView.domEventHandlers({
                        focus: (event, cm) => {
                            setTimeout(() => {
                                if (this.props.suggest_new_file) {
                                    this.suggest_not_tmp()
                                } else if (cm.state.doc.length === 0) {
                                    this.request_path_completions()
                                }
                            }, 0)
                            return true
                        },
                        blur: (event, cm) => {
                            setTimeout(() => {
                                if (!cm.hasFocus) {
                                    cm.dispatch({
                                        changes: { from: 0, to: cm.state.doc.length, insert: this.props.value },
                                        selection: EditorSelection.cursor(this.props.value.length),
                                    })
                                    cm.scrollPosIntoView(this.props.value.length)

                                    setTimeout(() => {
                                        this.cm?.scrollPosIntoView(this.props.value.length)
                                    }, 100)
                                }
                            }, 200)
                        },
                    }),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            this.setState({ is_button_disabled: update.state.doc.length === 0 })
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
                                suggest_new_file: this.props.suggest_new_file,
                                client: this.props.client,
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
                                update.view.scrollPosIntoView(update.state.doc.length)

                                this.request_path_completions()
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
                        { key: "Enter", run: this.on_submit },
                        { key: "Ctrl-Enter", mac: "Cmd-Enter", run: this.on_submit },
                        { key: "Ctrl-Shift-Enter", mac: "Cmd-Shift-Enter", run: this.on_submit },
                        {
                            key: "Escape",
                            run: (cm) => {
                                assert_not_null(close_autocomplete_command).run(cm)
                                cm.dispatch({
                                    changes: { from: 0, to: cm.state.doc.length, insert: this.props.value },
                                    selection: EditorSelection.cursor(this.props.value.length),
                                })
                                // @ts-ignore
                                document.activeElement.blur()
                                return true
                            },
                            preventDefault: true,
                        },
                        {
                            key: "Tab",
                            run: (cm) => {
                                // If there is autocomplete open, accept that
                                if (assert_not_null(accept_autocomplete_command).run(cm)) {
                                    // and request the next ones
                                    this.request_path_completions()
                                    return true
                                }
                                // Else, activate it (possibly)
                                return this.request_path_completions()
                            },
                        },
                    ]),
                    keymap.of(completionKeymap),

                    placeholder(this.props.placeholder),
                ],
            }),
        })
        this.base.insertBefore(this.cm.dom, this.base.firstElementChild)

        // window.addEventListener("resize", () => {
        //     if (!this.cm.hasFocus()) {
        //         deselect(this.cm)
        //     }
        // })
    }
    render() {
        return html`
            <pluto-filepicker>
                <button onClick=${this.on_submit} disabled=${this.state.is_button_disabled}>${this.props.button_label}</button>
            </pluto-filepicker>
        `
    }

    request_path_completions() {
        if (!this.cm) return
        let selection = this.cm.state.selection.main
        if (selection.from !== selection.to) return
        if (this.cm.state.doc.length !== selection.to) return

        return assert_not_null(start_autocomplete_command).run(this.cm)
    }
}

const pathhints =
    ({ client, suggest_new_file }) =>
    (ctx) => {
        const cursor = ctx.state.selection.main.to
        const oldLine = ctx.state.doc.toString()

        return client
            .send("completepath", {
                query: oldLine,
            })
            .then((update) => {
                const queryFileName = oldLine.split("/").pop().split("\\").pop()

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
