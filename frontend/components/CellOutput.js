import { html, Component } from "../common/Preact.js"

import { resolvable_promise } from "../common/PlutoConnection.js"

import { ErrorMessage } from "./ErrorMessage.js"

import { connect_bonds } from "../common/Bond.js"
import { cl } from "../common/ClassTable.js"

import "../common/SetupCellEnvironment.js"
import "../treeview.js"

export class CellOutput extends Component {
    constructor() {
        super()
        this.displayed_timestamp = 0
    }

    shouldComponentUpdate({ timestamp }) {
        return timestamp > this.displayed_timestamp
    }

    componentWillUpdate() {
        this.old_height = this.base.scrollHeight
    }    

    render() {
        return html`
            <pluto-output
                class=${cl({
                    inline_output:
                        !this.props.errored && !!this.props.body && (this.props.mime == "application/vnd.pluto.tree+xml" || this.props.mime == "text/plain"),
                })}
                mime=${this.props.mime}
            >
                <assignee>${this.props.rootassignee}</assignee>
                <${OutputBody} ...${this.props} />
            </pluto-output>
        `
    }

    componentDidUpdate() {
        this.displayed_timestamp = this.props.timestamp

        // Scroll the page to compensate for change in page height:
        const new_height = this.base.scrollHeight

        if (document.body.querySelector("pluto-cell:focus-within")) {
            const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output") // CSS wizardry ✨
            if (cell_outputs_after_focused.length == 0 || !Array.from(cell_outputs_after_focused).includes(this.base)) {
                window.scrollBy(0, new_height - this.old_height)
            }
        }
    }
}

const OutputBody = ({ mime, body, cell_id, all_completed_promise, on_render, on_delete, requests }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            const src = URL.createObjectURL(new Blob([body], { type: mime }))
            return html`<div><img type=${mime} src=${src} /></div>`
            break
        case "text/html":
        case "application/vnd.pluto.tree+xml":
            return html`<${RawHTMLContainer}  \
                            body=${body} \
                            all_completed_promise=${all_completed_promise} \
                            on_render=${on_render} \
                            on_delete=${on_delete} \
                            requests=${requests} />`
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

const execute_scripttags = (root_node, [next_node, ...remaining_nodes]) => {
    const rp = resolvable_promise()

    if (next_node == null) {
        rp.resolve()
        return rp.current
    }
    const load_next = () => execute_scripttags(root_node, remaining_nodes).then(rp.resolve)

    root_node.currentScript = next_node
    if (next_node.src != "") {
        if (!Array.from(document.head.querySelectorAll("script")).some((s) => s.src === next_node.src)) {
            const new_el = document.createElement("script")
            new_el.src = next_node.src
            new_el.type = next_node.type === "module" ? "module" : "text/javascript"

            // new_el.async = false
            new_el.addEventListener("load", load_next)
            new_el.addEventListener("error", load_next)
            document.head.appendChild(new_el)
        } else {
            load_next()
        }
    } else {
        try {
            const result = Function(next_node.innerHTML).bind(root_node)()
            if (result != null) {
                // console.log(result)
                if (result.nodeType === Node.ELEMENT_NODE) {
                    next_node.parentElement.insertBefore(result, next_node.nextSibling)
                }
            }
        } catch (err) {
            console.log("Couldn't execute script:")
            console.error(err)
            // TODO: relay to user
        }
        load_next()
    }
    return rp.current
}

export class RawHTMLContainer extends Component {
    render_DOM() {
        this.base.innerHTML = this.props.body

        execute_scripttags(this.base, Array.from(this.base.querySelectorAll("script"))).then(() => {
            if (this.props.all_completed_promise != null && this.props.requests != null) {
                connect_bonds(this.base, this.props.all_completed_promise, this.props.requests)
            }

            // convert LaTeX to svg
            try {
                window.MathJax.typeset([this.base])
            } catch (err) {
                console.info("Failed to typeset TeX:")
                console.info(err)
            }

            if (this.props.on_render != null) {
                this.props.on_render(this.base)
            }           
        })
    }

    shouldComponentUpdate(new_props) {
        const pure = this.props.pure === true && new_props.pure === true
        if (pure) {
            return this.props.body !== new_props.body
        } else {
            return true
        }
    }

    componentDidUpdate() {
        this.render_DOM()
    }

    componentDidMount() {
        this.render_DOM()
    }

    componentWillUnmount() {
        this.base.innerHTML = ""
        if (this.props.on_delete != null) {
            this.props.on_delete(this.base)
        }  
    }

    render() {
        return html`<div></div>`
    }
}
