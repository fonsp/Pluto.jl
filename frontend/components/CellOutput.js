import { html, Component, useRef, useLayoutEffect, useEffect } from "../common/Preact.js"

import { resolvable_promise } from "../common/PlutoConnection.js"

import { ErrorMessage } from "./ErrorMessage.js"

import { connect_bonds } from "../common/Bond.js"
import { cl } from "../common/ClassTable.js"

import { observablehq_for_cells } from "../common/SetupCellEnvironment.js"
import "../treeview.js"

export class CellOutput extends Component {
    shouldComponentUpdate({ last_run_timestamp }) {
        return last_run_timestamp !== this.props.last_run_timestamp
    }

    getSnapshotBeforeUpdate() {
        return this.base.scrollHeight
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        // Scroll the page to compensate for change in page height:
        const new_height = this.base.scrollHeight

        if (document.body.querySelector("pluto-cell:focus-within")) {
            const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output") // CSS wizardry ✨
            if (cell_outputs_after_focused.length == 0 || !Array.from(cell_outputs_after_focused).includes(this.base)) {
                window.scrollBy(0, new_height - snapshot)
            }
        }
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
}

let PlutoImage = ({ body, mime }) => {
    // I know I know, this looks stupid.
    // BUT it is necessary to make sure the object url is only created when we are actually attaching to the DOM,
    // and is removed when we are detatching from the DOM
    let imgref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: mime }))
        imgref.current.src = url
        return () => URL.revokeObjectURL(url)
    }, [body])

    return html`<div><img ref=${imgref} type=${mime} src=${""} /></div>`
}

const OutputBody = ({ mime, body, cell_id, all_completed_promise, requests }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<${PlutoImage} mime=${mime} body=${body} />`
            break
        case "text/html":
            if (body.startsWith("<!DOCTYPE")) {
                return html`<${IframeContainer} body=${body} />`
            } else {
                return html`<${RawHTMLContainer} body=${body} all_completed_promise=${all_completed_promise} requests=${requests} />`
            }
            break
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

let IframeContainer = ({ body }) => {
    // I know I know, this looks stupid.
    // BUT it is necessary to make sure the object url is only created when we are actually attaching to the DOM,
    // and is removed when we are detatching from the DOM
    let imgref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: "text/html" }))
        imgref.current.src = url
        return () => URL.revokeObjectURL(url)
    }, [body])

    return html`<iframe style=${{ width: "100%" }} src="" ref=${imgref}></div>`
}

let execute_dynamic_function = async ({ environment, code }) => {
    const wrapped_code = `
        "use strict";
        let fn = async () => {
            ${code}
        }
        return fn()
    `

    let { ["this"]: this_value, ...args } = environment
    let arg_names = Object.keys(args)
    let arg_values = Object.values(args)
    const result = await Function(...arg_names, wrapped_code).bind(this_value)(...arg_values)
    return result
}

const execute_scripttags = async ({ root_node, script_nodes, previous_results_map, invalidation }) => {
    let results_map = new Map()

    for (let node of script_nodes) {
        root_node.currentScript = node
        if (node.src != "") {
            if (!Array.from(document.head.querySelectorAll("script")).some((s) => s.src === node.src)) {
                const new_el = document.createElement("script")
                new_el.src = node.src
                new_el.type = node.type === "module" ? "module" : "text/javascript"

                // new_el.async = false
                await new Promise((resolve) => {
                    new_el.addEventListener("load", resolve)
                    new_el.addEventListener("error", resolve)
                    document.head.appendChild(new_el)
                })
            } else {
                continue
            }
        } else {
            try {
                let script_id = node.id
                let result = await execute_dynamic_function({
                    environment: {
                        this: script_id ? previous_results_map.get(script_id) : undefined,
                        currentScript: node,
                        invalidation: invalidation,
                        ...observablehq_for_cells,
                    },
                    code: node.innerHTML,
                })
                if (script_id != null) {
                    results_map.set(script_id, result)
                }
                if (result instanceof HTMLElement && result.nodeType === Node.ELEMENT_NODE) {
                    node.parentElement.insertBefore(result, node)
                }
            } catch (err) {
                console.log("Couldn't execute script:", node)
                console.error(err)
                // TODO: relay to user
            }
        }
    }
    return results_map
}

let run = (f) => f()

export let RawHTMLContainer = ({ body, all_completed_promise, requests }) => {
    let previous_results_map = useRef(new Map())

    let invalidate_scripts = useRef(() => {})

    let container = useRef()

    useLayoutEffect(() => {
        // Invalidate current scripts and create a new invalidation token immediately
        let invalidation = new Promise((resolve) => {
            invalidate_scripts.current = () => {
                resolve()
            }
        })

        // Actually "load" the html
        container.current.innerHTML = body

        run(async () => {
            previous_results_map.current = await execute_scripttags({
                root_node: container.current,
                script_nodes: Array.from(container.current.querySelectorAll("script")),
                invalidation: invalidation,
                previous_results_map: previous_results_map.current,
            })

            if (all_completed_promise != null && requests != null) {
                connect_bonds(container.current, all_completed_promise, requests)
            }

            // convert LaTeX to svg
            try {
                window.MathJax.typeset([container.current])
            } catch (err) {
                console.info("Failed to typeset TeX:")
                console.info(err)
            }
        })

        return () => {
            invalidate_scripts.current?.()
        }
    })

    return html`<div ref=${container}></div>`
}
