import { html } from "../common/Html.js"
import { Component } from "https://unpkg.com/preact@10.4.4?module"

import { ErrorMessage } from "./ErrorMessage.js"

import { connect_bonds } from "../common/Bond.js"

import "../common/SetupCellEnvironment.js"

export class CellOutput extends Component {
    constructor() {
        super()
        this.displayed_timestamp = 0
    }

    shouldComponentUpdate({ timestamp }) {
        return timestamp > this.displayed_timestamp
    }

    componentDidUpdate() {
        this.displayed_timestamp = this.props.timestamp
    }

    render() {
        return html`
            <celloutput>
                <assignee>${this.props.rootassignee}</assignee>
                <${OutputBody} ...${this.props} />
            </celloutput>
        `
    }
}

const OutputBody = ({ mime, body, cell_id, all_completed_promise, requests }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/gif":
            return html`<div><img src=${body} /></div>`
            break
        case "text/html":
        case "image/svg+xml": // TODO: don't run scripts here
        case "application/vnd.pluto.tree+xml":
            return html`<${RawHTMLContainer} body=${body} all_completed_promise=${all_completed_promise} requests=${requests} />`
            break
        case "application/vnd.pluto.stacktrace+json":
            return html`<div><${ErrorMessage} cell_id=${cell_id} requests=${requests} ...${JSON.parse(body)} /></div>`
            break

        case "text/plain":
        default:
            if (body) {
                return html`<div>
                    <pre><code>${body}</code></pre>
                </div>`
            } else {
                return html`<div></div>`
            }
            break
    }
}

export class RawHTMLContainer extends Component {
    render_DOM() {
        this.base.innerHTML = this.props.body

        // based on https://stackoverflow.com/a/26716182
        // to execute all scripts in the output html:
        try {
            Array.from(this.base.querySelectorAll("script")).map((script) => {
                this.base.currentScript = script // available inside user JS as `this.currentScript`
                if (script.src != "") {
                    if (
                        !Array.from(document.head.querySelectorAll("script"))
                            .map((s) => s.src)
                            .includes(script)
                    ) {
                        const tag = document.createElement("script")
                        tag.src = script.src
                        document.head.appendChild(tag)
                        // might be wise to wait after adding scripts to head
                        // maybe use a better method?
                    }
                } else {
                    const result = Function(script.innerHTML).bind(this.base)()
                    if (result && result.nodeType === Node.ELEMENT_NODE) {
                        script.parentElement.insertBefore(result, script)
                    }
                }
            })
        } catch (err) {
            console.error("Couldn't execute script:")
            console.error(err)
            // TODO: relay to user
        }

        connect_bonds(this.base, this.props.all_completed_promise, this.props.requests)

        // convert LaTeX to svg
        try {
            MathJax.typeset([this.base])
        } catch (err) {
            console.info("Failed to typeset TeX:")
            console.info(err)
        }
    }

    componentDidUpdate() {
        this.render_DOM()
    }

    componentDidMount() {
        this.render_DOM()
    }

    render() {
        return html`<div></div>`
    }
}

// export const RawHTMLContainer = ({ body, all_completed_promise, requests }) => {
//     const DOM_hook = (node) => {
//         node.innerHTML = body

//         // based on https://stackoverflow.com/a/26716182
//         // to execute all scripts in the output html:
//         try {
//             Array.from(node.querySelectorAll("script")).map((script) => {
//                 node.currentScript = script // available inside user JS as `this.currentScript`
//                 if (script.src != "") {
//                     if (
//                         !Array.from(document.head.querySelectorAll("script"))
//                             .map((s) => s.src)
//                             .includes(script)
//                     ) {
//                         const tag = document.createElement("script")
//                         tag.src = script.src
//                         document.head.appendChild(tag)
//                         // might be wise to wait after adding scripts to head
//                         // maybe use a better method?
//                     }
//                 } else {
//                     const result = Function(script.innerHTML).bind(node)()
//                     if (result && result.nodeType === Node.ELEMENT_NODE) {
//                         script.parentElement.insertBefore(result, script)
//                     }
//                 }
//             })
//         } catch (err) {
//             console.error("Couldn't execute script:")
//             console.error(err)
//             // TODO: relay to user
//         }

//         connect_bonds(node, all_completed_promise, requests)

//         // convert LaTeX to svg
//         try {
//             MathJax.typeset([node])
//         } catch (err) {
//             console.info("Failed to typeset TeX:")
//             console.info(err)
//         }
//     }

//     return html`<div ref=${DOM_hook}></div>`
// }

// TODO:
// const oldHeight = outputNode.scrollHeight
// const oldScroll = window.scrollY

// TODO
// // Scroll the page to compensate for changes in page height:
// const newHeight = outputNode.scrollHeight
// const newScroll = window.scrollY

// if (notebookNode.querySelector("cell:focus-within")) {
//     const cellsAfterFocused = notebookNode.querySelectorAll("cell:focus-within ~ cell")
//     if (cellsAfterFocused.length == 0 || !Array.from(cellsAfterFocused).includes(cellNode)) {
//         window.scrollTo(window.scrollX, oldScroll + (newHeight - oldHeight))
//     }
// }
