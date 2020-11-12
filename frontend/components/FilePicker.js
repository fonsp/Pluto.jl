import { html, Component } from "../imports/Preact.js"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { map_cmd_to_ctrl_on_mac } from "../common/KeyboardShortcuts.js"

const deselect = (cm) => {
    cm.setSelection({ line: 0, ch: Infinity }, { line: 0, ch: Infinity }, { scroll: false })
}

export class FilePicker extends Component {
    constructor() {
        super()
        this.forced_value = ""
        this.cm = null

        this.suggest_not_tmp = () => {
            const suggest = this.props.suggest_new_file
            if (suggest != null && this.cm.getValue() === "") {
                this.cm.setValue(suggest.base)
                this.cm.setSelection({ line: 0, ch: Infinity }, { line: 0, ch: Infinity })
                this.cm.focus()
                this.request_path_completions.bind(this)()

                // this.cm.setValue(suggest.base + suggest.name)
                // this.cm.setSelection({ line: 0, ch: suggest.base.length }, { line: 0, ch: Infinity })
                // this.cm.focus()
            }
            window.dispatchEvent(new CustomEvent("collapse_cell_selection", {}))
        }

        this.on_submit = () => {
            const my_val = this.cm.getValue()
            if (my_val === this.forced_value) {
                this.suggest_not_tmp()
                return
            }
            this.props.on_submit(this.cm.getValue(), () => {
                this.cm.setValue(this.props.value)
                deselect(this.cm)
            })
        }
    }
    componentDidUpdate() {
        if (this.forced_value != this.props.value) {
            this.cm.setValue(this.props.value)
            deselect(this.cm)
            this.forced_value = this.props.value
        }
    }
    componentDidMount() {
        this.cm = window.CodeMirror(
            (el) => {
                this.base.insertBefore(el, this.base.firstElementChild)
            },
            {
                value: "",
                lineNumbers: false,
                lineWrapping: false,
                theme: "plutoheader",
                viewportMargin: Infinity,
                placeholder: this.props.placeholder,
                indentWithTabs: true,
                indentUnit: 4,
                hintOptions: {
                    hint: pathhints,
                    completeSingle: false,
                    suggest_new_file: this.props.suggest_new_file,
                    client: this.props.client,
                },
                scrollbarStyle: "null",
            }
        )

        this.cm.setOption(
            "extraKeys",
            map_cmd_to_ctrl_on_mac({
                "Ctrl-Enter": this.on_submit,
                "Ctrl-Shift-Enter": this.on_submit,
                "Enter": this.on_submit,
                "Esc": (cm) => {
                    cm.closeHint()
                    cm.setValue(this.props.value)
                    deselect(cm)
                    document.activeElement.blur()
                },
                "Tab": this.request_path_completions.bind(this),
            })
        )

        this.cm.on("change", (cm, e) => {
            if (e.origin !== "setValue") {
                this.request_path_completions.bind(this)()
            }
        })

        this.cm.on("blur", (cm, e) => {
            // if the user clicks on an autocomplete option, this event is called, even though focus was not actually lost.
            // NOT a debounce:
            setTimeout(() => {
                if (!cm.hasFocus()) {
                    cm.setValue(this.props.value)
                    deselect(cm)
                }
            }, 250)
        })
        this.cm.on("focus", (cm, e) => {
            this.suggest_not_tmp()
        })

        window.addEventListener("resize", () => {
            if (!this.cm.hasFocus()) {
                deselect(this.cm)
            }
        })
    }
    render() {
        return html`
            <pluto-filepicker>
                <button onClick=${this.on_submit}>${this.props.button_label}</button>
            </pluto-filepicker>
        `
    }

    request_path_completions() {
        const cursor = this.cm.getCursor()
        const oldLine = this.cm.getLine(cursor.line)

        if (!this.cm.somethingSelected()) {
            if (cursor.ch == oldLine.length) {
                this.cm.showHint()
            }
        }
    }
}

const pathhints = (cm, options) => {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)

    return options.client
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

            var styledResults = results.map((r) => ({
                text: r,
                className: r.endsWith("/") || r.endsWith("\\") ? "dir" : "file",
            }))

            if (options.suggest_new_file != null) {
                for (var initLength = 3; initLength >= 0; initLength--) {
                    const init = ".jl".substring(0, initLength)
                    if (queryFileName.endsWith(init)) {
                        var suggestedFileName = queryFileName + ".jl".substring(initLength)

                        if (suggestedFileName == ".jl") {
                            suggestedFileName = "notebook.jl"
                        }

                        if (initLength == 3) {
                            return null
                        }
                        if (!results.includes(suggestedFileName)) {
                            styledResults.push({
                                text: suggestedFileName,
                                displayText: suggestedFileName + " (new)",
                                className: "file new",
                            })
                        }
                        break
                    }
                }
            }

            return {
                list: styledResults,
                from: CodeMirror.Pos(cursor.line, from),
                to: CodeMirror.Pos(cursor.line, to),
            }
        })
}
