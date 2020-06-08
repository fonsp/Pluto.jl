import { html } from "../common/Html.js"
import { Component } from "https://unpkg.com/preact@10.4.4?module"

import { utf8index_to_ut16index } from "../common/UnicodeTools.js"

export class FilePicker extends Component {
    constructor() {
        super()
        this.forced_value = ""
        this.cm = null

        this.on_submit = () => {
            this.props.on_submit(this.cm.getValue(), () => this.cm.setValue(this.props.value))
        }
    }
    componentDidUpdate() {
        if (this.forced_value != this.props.value) {
            this.cm.setValue(this.props.value)
            this.forced_value = this.props.value
        }
    }
    componentDidMount() {
        this.cm = CodeMirror(
            (el) => {
                this.base.insertBefore(el, this.base.firstElementChild)
            },
            {
                value: "",
                lineNumbers: false,
                lineWrapping: false,
                theme: "plutoheader",
                viewportMargin: Infinity,
                placeholder: "Enter path...",
                indentWithTabs: true,
                indentUnit: 4,
                hintOptions: {
                    hint: this.pathhints.bind(this),
                    completeSingle: false,
                    suggest_new_file: this.props.suggest_new_file,
                },
                scrollbarStyle: "null",
            }
        )

        // YAY (dit kan weg als Editor ook een react component is)
        window.filePickerCodeMirror = this.cm

        this.cm.setOption("extraKeys", {
            "Ctrl-Enter": this.on_submit,
            "Ctrl-Shift-Enter": this.on_submit,
            Enter: this.on_submit,
            Esc: (cm) => {
                cm.closeHint()
                cm.setValue(this.props.value)
                document.activeElement.blur()
            },
            Tab: (cm) => this.requestPathCompletions.bind(this),
        })

        this.cm.on("change", this.requestPathCompletions.bind(this))

        this.cm.on("blur", (cm, e) => {
            // if the user clicks on an autocomplete option, this event is called, even though focus was not actually lost.
            // NOT a debounce:
            setTimeout(() => {
                if (!cm.hasFocus()) {
                    cm.setValue(this.props.value)
                }
            }, 250)
        })
    }
    render() {
        return html`
            <filepicker>
                <button onClick=${this.on_submit}>${this.props.button_label}</button>
            </filepicker>
        `
    }

    requestPathCompletions() {
        const cursor = this.cm.getCursor()
        const oldLine = this.cm.getLine(cursor.line)

        if (!this.cm.somethingSelected()) {
            if (cursor.ch == oldLine.length) {
                this.cm.showHint()
            }
        }
    }

    pathhints(cm, option) {
        const cursor = cm.getCursor()
        const oldLine = cm.getLine(cursor.line)

        return this.props.client
            .sendreceive("completepath", {
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

                if (option.suggest_new_file) {
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
}
