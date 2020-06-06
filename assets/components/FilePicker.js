import { utf8index_to_ut16index } from "../common/UnicodeTools.js"
import { html, Component, render } from "https://unpkg.com/htm/preact/standalone.module.js"

export class FilePicker extends Component {
    constructor() {
        super()
        this.state = {}
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
                    suggestNewFile: this.props.suggestNewFile,
                },
                scrollbarStyle: "null",
            }
		)
		
		// YAY (dit kan weg als Editor ook een react component is)
		window.filePickerCodeMirror = this.cm

        this.cm.setOption("extraKeys", {
            "Ctrl-Enter": this.props.onEnter,
            "Ctrl-Shift-Enter": this.props.onEnter,
            Enter: this.props.onEnter,
            Esc: (cm) => {
                cm.closeHint()
                this.props.onReset()
                document.activeElement.blur()
            },
            Tab: (cm) => this.requestPathCompletions.bind(this),
        })

        this.cm.on("change", this.requestPathCompletions.bind(this))

        this.cm.on("blur", (cm, e) => {
			// if the user clicks on an autocomplete option, this event is called, even though focus was not actually lost.
			// debounce:
			setTimeout(() => {
				if (!cm.hasFocus()) {
					this.props.onBlur()
				}
			}, 250)
		})
    }
    render() {
        return html`
            <filepicker>
                <button onClick=${this.props.onEnter}>Rename</button>
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

            if (option.suggestNewFile) {
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

