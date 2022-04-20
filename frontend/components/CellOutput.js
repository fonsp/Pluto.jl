import { html, Component, useRef, useLayoutEffect, useContext, useEffect, useMemo } from "../imports/Preact.js"

import { ErrorMessage } from "./ErrorMessage.js"
import { TreeView, TableView, DivElement } from "./TreeView.js"

import { add_bonds_listener, set_bound_elements_to_their_value } from "../common/Bond.js"
import { cl } from "../common/ClassTable.js"

import { observablehq_for_cells } from "../common/SetupCellEnvironment.js"
import { PlutoBondsContext, PlutoContext, PlutoJSInitializingContext } from "../common/PlutoContext.js"
import register from "../imports/PreactCustomElement.js"

import { EditorState, EditorView, defaultHighlightStyle } from "../imports/CodemirrorPlutoSetup.js"

import { pluto_syntax_colors, ENABLE_CM_MIXED_PARSER } from "./CellInput.js"
import { useState } from "../imports/Preact.js"

import hljs from "../imports/highlightjs.js"
import { julia_mixed } from "./CellInput/mixedParsers.js"
import { julia_andrey } from "../imports/CodemirrorPlutoSetup.js"

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
                if (
                    !(document.activeElement.tagName == "SUMMARY") &&
                    (cell_outputs_after_focused.length == 0 || !Array.from(cell_outputs_after_focused).includes(this.base))
                ) {
                    window.scrollBy(0, new_height - this.old_height)
                }
            }

            this.old_height = new_height
        })
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
        const rich_output =
            this.props.errored ||
            !this.props.body ||
            (this.props.mime !== "application/vnd.pluto.tree+object" &&
                this.props.mime !== "application/vnd.pluto.table+object" &&
                this.props.mime !== "text/plain")
        const allow_translate = !this.props.errored && rich_output
        return html`
            <pluto-output
                class=${cl({
                    rich_output,
                    scroll_y: this.props.mime === "application/vnd.pluto.table+object" || this.props.mime === "text/plain",
                })}
                translate=${allow_translate}
                mime=${this.props.mime}
            >
                <assignee translate=${false}>${this.props.rootassignee}</assignee>
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
            if (imgref.current) {
                imgref.current.style.display = null
            }
        }
        if (imgref.current.src === "") {
            // an <img> that is loading takes up 21 vertical pixels, which causes a 1-frame scroll flicker
            // the solution is to make the <img> invisible until the image is loaded
            imgref.current.style.display = "none"
        }
        imgref.current.type = mime
        imgref.current.src = url

        return () => URL.revokeObjectURL(url)
    }, [body, mime])

    return html`<img ref=${imgref} type=${mime} src=${""} />`
}

export const OutputBody = ({ mime, body, cell_id, persist_js_state = false, last_run_timestamp }) => {
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
                return html`<${RawHTMLContainer}
                    cell_id=${cell_id}
                    body=${body}
                    persist_js_state=${persist_js_state}
                    last_run_timestamp=${last_run_timestamp}
                />`
            }
            break
        case "application/vnd.pluto.tree+object":
            return html`<div>
                <${TreeView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />
            </div>`
            break
        case "application/vnd.pluto.table+object":
            return html`<${TableView} cell_id=${cell_id} body=${body} persist_js_state=${persist_js_state} />`
            break
        case "application/vnd.pluto.stacktrace+object":
            return html`<div><${ErrorMessage} cell_id=${cell_id} ...${body} /></div>`
            break
        case "application/vnd.pluto.divelement+object":
            return DivElement({ cell_id, ...body })
            break
        case "text/plain":
            if (body) {
                return html`<div>
                    <pre class="no-block"><code>${body}</code></pre>
                </div>`
            } else {
                return html`<div></div>`
            }
            break
        case null:
        case undefined:
        case "":
            return html``
            break
        default:
            return html`<pre title="Something went wrong displaying this object">🛑</pre>`
            break
    }
}

register(OutputBody, "pluto-display", ["mime", "body", "cell_id", "persist_js_state", "last_run_timestamp"])

let IframeContainer = ({ body }) => {
    let iframeref = useRef()
    useLayoutEffect(() => {
        let url = URL.createObjectURL(new Blob([body], { type: "text/html" }))
        iframeref.current.src = url

        run(async () => {
            await new Promise((resolve) => iframeref.current.addEventListener("load", () => resolve()))

            /** @type {Document} */
            let iframeDocument = iframeref.current.contentWindow.document
            /** Grab the <script> tag for the iframe content window resizer
             * @type {HTMLScriptElement} */
            let original_script_element = document.querySelector("#iframe-resizer-content-window-script")

            // Insert iframe resizer inside the iframe
            let iframe_resizer_content_script = iframeDocument.createElement("script")
            iframe_resizer_content_script.src = original_script_element.src
            iframe_resizer_content_script.crossOrigin = "anonymous"
            iframeDocument.head.appendChild(iframe_resizer_content_script)

            // Apply iframe resizer from the host side
            new Promise((resolve) => iframe_resizer_content_script.addEventListener("load", () => resolve()))
            // @ts-ignore
            window.iFrameResize({ checkOrigin: false }, iframeref.current)
        })

        return () => URL.revokeObjectURL(url)
    }, [body])

    return html`<iframe
        style=${{ width: "100%", border: "none" }}
        src=""
        ref=${iframeref}
        frameborder="0"
        allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; geolocation; gyroscope; layout-animations; legacy-image-formats; magnetometer; microphone; midi; navigation-override; oversized-images; payment; picture-in-picture; publickey-credentials-get; sync-xhr; usb; wake-lock; screen-wake-lock; vr; web-share; xr-spatial-tracking"
        allowfullscreen
    ></iframe>`
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
 * Runs the code `fn` with `document.currentScript` being set to a new script_element thats
 * is placed on the page where `script_element` was.
 *
 * Why? So we can run the javascript code with extra cool Pluto variables and return value,
 * but still have a script at the same position as `document.currentScript`.
 * This way you can do `document.currentScript.insertBefore()` and have it work!
 *
 * This will remove the passed in `script_element` from the DOM!
 *
 * @param {HTMLOrSVGScriptElement} script_element
 * @param {() => any} fn
 */
let execute_inside_script_tag_that_replaces = async (script_element, fn) => {
    // Mimick as much as possible from the original script (only attributes but sure)
    let new_script_tag = document.createElement("script")
    for (let attr of script_element.attributes) {
        //@ts-ignore because of https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1260
        new_script_tag.attributes.setNamedItem(attr.cloneNode(true))
    }
    new_script_tag.textContent = `{
        window.____FUNCTION_TO_RUN_INSIDE_SCRIPT.result = window.____FUNCTION_TO_RUN_INSIDE_SCRIPT.function_to_run(window.____FUNCTION_TO_RUN_INSIDE_SCRIPT.currentScript)
    }`

    // @ts-ignore
    // I use this long variable name to pass the function and result to and from the script we created
    window.____FUNCTION_TO_RUN_INSIDE_SCRIPT = { function_to_run: fn, currentScript: new_script_tag, result: null }
    // Put the script in the DOM, this will run the script
    script_element.parentNode.replaceChild(new_script_tag, script_element)
    // @ts-ignore - Get the result back
    let result = await window.____FUNCTION_TO_RUN_INSIDE_SCRIPT.result
    // @ts-ignore - Reset the global variable "just in case"
    window.____FUNCTION_TO_RUN_INSIDE_SCRIPT = { function_to_run: fn, result: null }

    return { node: new_script_tag, result: result }
}

const is_displayable = (result) => result instanceof Element && result.nodeType === Node.ELEMENT_NODE

/**
 * @typedef PlutoScript
 * @type {HTMLScriptElement | { pluto_is_loading_me?: boolean }}
 */
const execute_scripttags = async ({ root_node, script_nodes, previous_results_map, invalidation }) => {
    let results_map = new Map()

    // Reattach DOM results from old scripts, you might want to skip reading this
    for (let node of script_nodes) {
        if (node.src != null && node.src !== "") {
        } else {
            let script_id = node.id
            let old_result = script_id ? previous_results_map.get(script_id) : null
            if (is_displayable(old_result)) {
                node.parentElement.insertBefore(old_result, node)
            }
        }
    }

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
                let old_result = script_id ? previous_results_map.get(script_id) : null

                if (node.type === "module") {
                    console.warn("We don't (yet) fully support <script type=module> (loading modules with <script type=module src=...> is fine).")
                }

                if (node.type === "" || node.type === "text/javascript" || node.type === "module") {
                    if (is_displayable(old_result)) {
                        node.parentElement.insertBefore(old_result, node)
                    }

                    const cell = root_node.closest("pluto-cell")
                    let { node: new_node, result } = await execute_inside_script_tag_that_replaces(node, async (currentScript) => {
                        return await execute_dynamic_function({
                            environment: {
                                this: script_id ? old_result : window,
                                currentScript: currentScript,
                                invalidation: invalidation,
                                getPublishedObject: (id) => cell.getPublishedObject(id),
                                ...observablehq_for_cells,
                            },
                            code: node.innerText,
                        })
                    })

                    // Save result for next run
                    if (script_id != null) {
                        results_map.set(script_id, result)
                    }
                    // Insert returned element
                    if (result !== old_result) {
                        if (is_displayable(old_result)) {
                            old_result.remove()
                        }
                        if (is_displayable(result)) {
                            new_node.parentElement.insertBefore(result, new_node)
                        }
                    }
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

/**
 * Support declarative shadowroot 😼
 * https://web.dev/declarative-shadow-dom/
 * The polyfill they mention on the page is nice and all, but we need more.
 * For one, we need the polyfill anyway as we're adding html using innerHTML (just like we need to run the scripts ourselves)
 * Also, we want to run the scripts inside the shadow roots, ideally in the same order that a browser would.
 * And we want nested shadowroots, which their polyfill doesn't provide (and I hope the spec does)
 *
 * @param {HTMLTemplateElement} template
 */
let declarative_shadow_dom_polyfill = (template) => {
    try {
        const mode = template.getAttribute("shadowroot")
        // @ts-ignore
        const shadowRoot = template.parentElement.attachShadow({ mode })
        // @ts-ignore
        shadowRoot.appendChild(template.content)
        template.remove()

        // To mimick as much as possible the browser behavior, I
        const scripts_or_shadowroots = Array.from(shadowRoot.querySelectorAll("script, template[shadowroot]"))
        return scripts_or_shadowroots.flatMap((script_or_shadowroot) => {
            if (script_or_shadowroot.nodeName === "SCRIPT") {
                return [script_or_shadowroot]
            } else if (script_or_shadowroot.nodeName === "TEMPLATE") {
                // @ts-ignore
                return declarative_shadow_dom_polyfill(script_or_shadowroot)
            }
        })
    } catch (error) {
        console.error(`Couldn't attach declarative shadow dom to`, template, `because of`, error)
        return []
    }
}

export let RawHTMLContainer = ({ body, className = "", persist_js_state = false, last_run_timestamp }) => {
    let pluto_actions = useContext(PlutoContext)
    let pluto_bonds = useContext(PlutoBondsContext)
    let js_init_set = useContext(PlutoJSInitializingContext)
    let previous_results_map = useRef(new Map())

    let invalidate_scripts = useRef(() => {})

    let container = useRef(/** @type {HTMLElement} */ (null))

    useLayoutEffect(() => {
        set_bound_elements_to_their_value(container.current, pluto_bonds)
    }, [body, persist_js_state, pluto_actions, pluto_bonds])

    useLayoutEffect(() => {
        // Invalidate current scripts and create a new invalidation token immediately
        let invalidation = new Promise((resolve) => {
            invalidate_scripts.current = () => {
                resolve()
            }
        })

        const dump = document.createElement("p-dumpster")
        // @ts-ignore
        dump.append(...container.current.childNodes)

        // Actually "load" the html
        container.current.innerHTML = body

        let scripts_in_shadowroots = Array.from(container.current.querySelectorAll("template[shadowroot]")).flatMap((template) => {
            // @ts-ignore
            return declarative_shadow_dom_polyfill(template)
        })

        // do this synchronously after loading HTML
        const new_scripts = [...scripts_in_shadowroots, ...Array.from(container.current.querySelectorAll("script"))]

        run(async () => {
            try {
                js_init_set?.add(container.current)
                previous_results_map.current = await execute_scripttags({
                    root_node: container.current,
                    script_nodes: new_scripts,
                    invalidation: invalidation,
                    previous_results_map: persist_js_state ? previous_results_map.current : new Map(),
                })

                if (pluto_actions != null) {
                    set_bound_elements_to_their_value(container.current, pluto_bonds)
                    let remove_bonds_listener = add_bonds_listener(container.current, pluto_actions.set_bond, pluto_bonds)
                    invalidation.then(remove_bonds_listener)
                }

                // Convert LaTeX to svg
                // @ts-ignore
                if (window.MathJax?.typeset != undefined) {
                    try {
                        // @ts-ignore
                        window.MathJax.typeset(container.current.querySelectorAll(".tex"))
                    } catch (err) {
                        console.info("Failed to typeset TeX:")
                        console.info(err)
                    }
                }

                // Apply syntax highlighting
                try {
                    container.current.querySelectorAll("code").forEach((code_element) => {
                        code_element.classList.forEach((className) => {
                            if (className.startsWith("language-")) {
                                // Remove "language-"
                                let language = className.substring(9)
                                highlight(code_element, language)
                            }
                        })
                    })
                } catch (err) {
                    console.warn("Highlighting failed", err)
                }
            } finally {
                js_init_set?.delete(container.current)
            }
        })

        return () => {
            js_init_set?.delete(container.current)
            invalidate_scripts.current?.()
        }
    }, [body, persist_js_state, last_run_timestamp, pluto_actions])

    return html`<div class="raw-html-wrapper ${className}" ref=${container}></div>`
}

// https://github.com/fonsp/Pluto.jl/issues/1692
const ENABLE_CM_HIGHLIGHTING = false

/** @param {HTMLElement} code_element */
export let highlight = (code_element, language) => {
    language = language.toLowerCase()
    language = language === "jl" ? "julia" : language

    if (code_element.children.length === 0) {
        if (
            ENABLE_CM_HIGHLIGHTING &&
            language === "julia" &&
            // CodeMirror does not want to render inside a `<details>`...
            // I tried to debug this, it does not happen on a clean webpage with the same CM versions:
            // https://glitch.com/edit/#!/wobbly-sweet-fibre?path=script.js%3A51%3A76
            code_element.closest("details") == null
        ) {
            const editorview = new EditorView({
                state: EditorState.create({
                    // Remove references to `Main.workspace#xx.` in the docs since
                    // its shows up as a comment and can be confusing
                    doc: code_element.innerText
                        .trim()
                        .replace(/Main.workspace#\d+\./, "")
                        .replace(/Main.workspace#(\d+)/, 'Main.var"workspace#$1"'),

                    extensions: [
                        pluto_syntax_colors,
                        defaultHighlightStyle.fallback,
                        EditorState.tabSize.of(4),
                        // TODO Other languages possibly?
                        language === "julia" ? (ENABLE_CM_MIXED_PARSER ? julia_mixed() : julia_andrey()) : null,
                        EditorView.lineWrapping,
                        EditorView.editable.of(false),
                    ].filter((x) => x != null),
                }),
            })
            code_element.replaceChildren(editorview.dom)
            // Weird hack to make it work inline 🤷‍♀️
            // Probably should be using [HighlightTree](https://codemirror.net/6/docs/ref/#highlight.highlightTree)
            editorview.dom.style.setProperty("display", "inline-flex", "important")
            editorview.dom.style.setProperty("background-color", "transparent", "important")
        } else {
            if (language === "htmlmixed") {
                code_element.classList.remove("language-htmlmixed")
                code_element.classList.add("language-html")
            }
            hljs.highlightElement(code_element)
        }
    }
}
