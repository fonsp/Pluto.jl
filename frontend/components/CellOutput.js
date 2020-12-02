import { html, Component, useRef, useLayoutEffect, useContext } from "../imports/Preact.js"

import { ErrorMessage } from "./ErrorMessage.js"
import { TreeView, TableView } from "./TreeView.js"

import { add_bonds_listener, set_bonds_values } from "../common/Bond.js"
import { cl } from "../common/ClassTable.js"

import { observablehq_for_cells } from "../common/SetupCellEnvironment.js"
import { PlutoBondsContext, PlutoContext } from "../common/PlutoContext.js"

export class CellOutput extends Component {
    constructor() {
        super()
        this.state = {
            error: null,
        }

        this.old_height = 0
        // @ts-ignore Is there a way to use the latest DOM spec?
        this.resize_observer = new ResizeObserver((entries) => {
            const new_height = this.base.offsetHeight

            // Scroll the page to compensate for change in page height:
            if (document.body.querySelector("pluto-cell:focus-within")) {
                const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output") // CSS wizardry ✨
                if (cell_outputs_after_focused.length == 0 || !Array.from(cell_outputs_after_focused).includes(this.base)) {
                    window.scrollBy(0, new_height - this.old_height)
                }
            }

            this.old_height = new_height
        })
    }

    componentDidCatch(error) {
        console.log(`error:`, error)
        this.setState({ error })
    }

    shouldComponentUpdate({ last_run_timestamp }) {
        return last_run_timestamp !== this.props.last_run_timestamp
    }

    componentDidMount() {
        this.resize_observer.observe(this.base)
    }

    componentWillUnmount() {
        this.resize_observer.unobserve(this.base)
    }

    render() {
        return html`
            <pluto-output
                class=${cl({
                    rich_output:
                        this.props.errored ||
                        !this.props.body ||
                        (this.props.mime !== "application/vnd.pluto.tree+object" &&
                            this.props.mime !== "application/vnd.pluto.table+object" &&
                            this.props.mime !== "text/plain"),
                    scroll_y: this.props.mime === "application/vnd.pluto.table+object" || this.props.mime === "text/plain",
                })}
                mime=${this.props.mime}
            >
                <assignee>${this.props.rootassignee}</assignee>
                ${this.state.error ? html`<div>${this.state.error.message}</div>` : html`<${OutputBody} ...${this.props} />`}
            </pluto-output>
        `
    }
}

export let PlutoImage = ({ body, mime }) => {
    // I know I know, this looks stupid.
    // BUT it is necessary to make sure the object url is only created when we are actually attaching to the DOM,
    // and is removed when we are detatching from the DOM
    let imgref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: mime }))

        imgref.current.onload = imgref.current.onerror = () => {
            imgref.current.style.display = null
        }
        if (imgref.current.src === "") {
            // an <img> that is loading takes up 21 vertical pixels, which causes a 1-frame scroll flicker
            // the solution is to make the <img> invisible until the image is loaded
            imgref.current.style.display = "none"
        }
        imgref.current.src = url

        return () => URL.revokeObjectURL(url)
    }, [body])

    return html`<img ref=${imgref} type=${mime} src=${""} />`
}

export const OutputBody = ({ mime, body, cell_id, persist_js_state }) => {
    switch (mime) {
        case "image/png":
        case "image/jpg":
        case "image/jpeg":
        case "image/gif":
        case "image/bmp":
        case "image/svg+xml":
            return html`<div><${PlutoImage} mime=${mime} body=${body} /></div>`
            break
        case "text/html":
            // Snippets starting with <!DOCTYPE or <html are considered "full pages" that get their own iframe.
            // Not entirely sure if this works the best, or if this slows down notebooks with many plots.
            // AFAIK JSServe and Plotly both trigger this code.
            // NOTE: Jupyter doesn't do this, jupyter renders everything directly in pages DOM.
            //                                                                   -DRAL
            if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
                return html`<${IframeContainer} body=${body} />`
            } else {
                return html`<${RawHTMLContainer} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />`
            }
            break
        case "application/vnd.pluto.tree+object":
            return html`<div>
                <${TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />
            </div>`
            break
        case "application/vnd.pluto.table+object":
            return html` <${TableView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />`
            break
        case "application/vnd.pluto.stacktrace+object":
            return html`<div><${ErrorMessage} cell_id=${cell_id} ...${body} /></div>`
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
    let iframeref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: "text/html" }))
        iframeref.current.src = url

        run(async () => {
            await new Promise((resolve) => iframeref.current.addEventListener("load", () => resolve()))
            let iframeDocument = iframeref.current.contentWindow.document

            // Insert iframe resizer inside the iframe
            let x = iframeDocument.createElement("script")
            x.src = "https://cdn.jsdelivr.net/npm/iframe-resizer@4.2.11/js/iframeResizer.contentWindow.min.js"
            x.integrity = "sha256-EH+7IdRixWtW5tdBwMkTXL+HvW5tAqV4of/HbAZ7nEc="
            x.crossOrigin = "anonymous"
            iframeDocument.head.appendChild(x)

            // Apply iframe resizer from the host side
            new Promise((resolve) => x.addEventListener("load", () => resolve()))
            // @ts-ignore
            window.iFrameResize({ checkOrigin: false }, iframeref.current)
        })

        return () => URL.revokeObjectURL(url)
    }, [body])

    return html`<iframe style=${{ width: "100%", border: "none" }} src="" ref=${iframeref}></div>`
}

/**
 * Call a block of code with with environment inserted as local bindings (even this)
 *
 * @param {{ code: string, environment: { [name: string]: any } }} options
 */
let execute_dynamic_function = async ({ environment, code }) => {
    // single line so that we don't affect line numbers in the stack trace
    const wrapped_code = `"use strict"; return (async () => {${code}})()`

    let { ["this"]: this_value, ...args } = environment
    let arg_names = Object.keys(args)
    let arg_values = Object.values(args)
    const result = await Function(...arg_names, wrapped_code).bind(this_value)(...arg_values)
    return result
}

/**
 * @typedef PlutoScript
 * @type {HTMLScriptElement | { pluto_is_loading_me?: boolean }}
 */

const execute_scripttags = async ({ root_node, script_nodes, previous_results_map, invalidation }) => {
    let results_map = new Map()

    // Run scripts sequentially
    for (let node of script_nodes) {
        if (node.src != null && node.src !== "") {
            // If it has a remote src="", de-dupe and copy the script to head
            var script_el = Array.from(document.head.querySelectorAll("script")).find((s) => s.src === node.src)

            if (script_el == null) {
                script_el = document.createElement("script")
                script_el.src = node.src
                script_el.type = node.type === "module" ? "module" : "text/javascript"
                // @ts-ignore
                script_el.pluto_is_loading_me = true
            }
            // @ts-ignore
            const need_to_await = script_el.pluto_is_loading_me != null
            if (need_to_await) {
                await new Promise((resolve) => {
                    script_el.addEventListener("load", resolve)
                    script_el.addEventListener("error", resolve)
                    document.head.appendChild(script_el)
                })
                // @ts-ignore
                script_el.pluto_is_loading_me = undefined
            }
        } else {
            // If there is no src="", we take the content and run it in an observablehq-like environment
            try {
                let script_id = node.id
                let result = await execute_dynamic_function({
                    environment: {
                        this: script_id ? previous_results_map.get(script_id) : window,
                        currentScript: node,
                        invalidation: invalidation,
                        ...observablehq_for_cells,
                    },
                    code: node.innerText,
                })
                // Save result for next run
                if (script_id != null) {
                    results_map.set(script_id, result)
                }
                // Insert returned element
                if (result instanceof Element && result.nodeType === Node.ELEMENT_NODE) {
                    node.parentElement.insertBefore(result, node)
                }
            } catch (err) {
                console.error("Couldn't execute script:", node)
                // needs to be in its own console.error so that the stack trace is printed
                console.error(err)
                // TODO: relay to user
            }
        }
    }
    return results_map
}

let run = (f) => f()

export let RawHTMLContainer = ({ body, persist_js_state = false }) => {
    let pluto_actions = useContext(PlutoContext)
    let pluto_bonds = useContext(PlutoBondsContext)
    let previous_results_map = useRef(new Map())

    let invalidate_scripts = useRef(() => {})

    let container = useRef()

    useLayoutEffect(() => {
        set_bonds_values(container.current, pluto_bonds)
    }, [body, persist_js_state, pluto_actions, pluto_bonds])

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
                previous_results_map: persist_js_state ? previous_results_map.current : new Map(),
            })

            if (pluto_actions != null) {
                set_bonds_values(container.current, pluto_bonds)
                let remove_bonds_listener = add_bonds_listener(container.current, (name, value, is_first_value) => {
                    pluto_actions.set_bond(name, value, is_first_value)
                })
                invalidation.then(() => {
                    remove_bonds_listener()
                })
            }

            // convert LaTeX to svg
            try {
                // @ts-ignore
                window.MathJax.typeset([container.current])
            } catch (err) {
                console.info("Failed to typeset TeX:")
                console.info(err)
            }

            // Apply julia syntax highlighting
            try {
                for (let code_element of container.current.querySelectorAll("code.language-julia")) {
                    highlight_julia(code_element)
                }
            } catch (err) {}
        })

        return () => {
            invalidate_scripts.current?.()
        }
    }, [body, persist_js_state, pluto_actions])

    return html`<div ref=${container}></div>`
}

/** @param {HTMLElement} code_element */
export let highlight_julia = (code_element) => {
    if (code_element.children.length === 0) {
        // @ts-ignore
        window.CodeMirror.runMode(code_element.innerText, "julia", code_element)
        code_element.classList.add("cm-s-default")
    }
}
