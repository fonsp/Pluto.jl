import { html } from "./Editor.js"
import {render, Component } from "https://unpkg.com/preact@10.4.4?module"


export class CellInput extends Component {
    constructor() {
        super()
        this.remote_code = ""
        this.differsYesterday = false
    }

    componentDidUpdate() 
    {
        if(!this.props.remote_code.submitted_by_me && this.remote_code !== this.props.remote_code.body){
            this.cm.setValue(this.props.remote_code.body)
        }
        this.remote_code = this.props.remote_code.body
        this.cm.options.disableInput = this.props.disable_input
    }

    componentDidMount() {
        this.cm = CodeMirror(
            (el) => {
                this.base.appendChild(el)
            },
            {
                value: this.remote_code,
                lineNumbers: true,
                mode: "julia",
                lineWrapping: true,
                viewportMargin: Infinity,
                placeholder: "Enter cell code...",
                indentWithTabs: true,
                indentUnit: 4,
                hintOptions: { hint: juliahints },
                matchBrackets: true,
            }
        )

        this.cm.setOption("extraKeys", {
            "Ctrl-Enter": () => this.props.on_submit(this.cm.getValue()),
            "Shift-Enter": () => {
                this.props.onRequestNewCell()
                this.props.on_submit(this.cm.getValue())
            },
            "Ctrl-Shift-Delete": () => {
                this.props.on_delete()
                const nextCell = cellNode.nextSibling
                if (nextCell) {
                    // TODO
                    codeMirrors[nextCell.id].focus()
                }
            },
            "Shift-Tab": "indentLess",
            "Tab": onTabKey,
        })

        this.cm.on("change", () => {
            this.props.on_change(this.cm.getValue())
        })

        // this.cm.on("cursorActivity", () => {
        //     if (this.cm.somethingSelected()) {
        //         const sel = this.cm.getSelection()
        //         if (!/[\s]/.test(sel)) {
        //             // no whitespace
        //             this.props.on_update_doc_query(sel)
        //         }
        //     } else {
        //         const token = this.cm.getTokenAt(this.cm.getCursor())
        //         if (token.type != null && token.type != "string") {
        //             this.props.on_update_doc_query(token.string)
        //         }
        //     }
        // })

        this.cm.on("blur", () => {
            if (document.hasFocus()) {
                this.cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 0 }, { scroll: false })
            }
        })
    }
    render() {
        return html`
            <cellinput>
                <button onClick=${this.props.on_delete} class="deletecell" title="Delete cell"><span></span></button>
            </cellinput>
        `
    }
}

const noAutocomplete = " \t\r\n([])+-=/,;'\"!#$%^&*~`<>|"

function onTabKey(cm) {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)

    if (cm.somethingSelected()) {
        cm.indentSelection()
    } else {
        if (cursor.ch > 0 && noAutocomplete.indexOf(oldLine[cursor.ch - 1]) == -1) {
            cm.showHint()
        } else {
            cm.replaceSelection("\t")
        }
    }
}

function juliahints(cm, option) {
    const cursor = cm.getCursor()
    const oldLine = cm.getLine(cursor.line)
    const oldLineSliced = oldLine.slice(0, cursor.ch)

    return client
        .sendreceive("complete", {
            query: oldLineSliced,
        })
        .then((update) => {
            return {
                list: update.message.results,
                from: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(oldLine, update.message.start)),
                to: CodeMirror.Pos(cursor.line, utf8index_to_ut16index(oldLine, update.message.stop)),
            }
        })
}
