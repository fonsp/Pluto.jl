import { html, useRef, useLayoutEffect, useContext } from "../../imports/Preact.js"

import { add_bonds_listener, set_bound_elements_to_their_value } from "../../common/Bond.js"

import { observablehq_for_cells } from "../../common/SetupCellEnvironment.js"
import { PlutoBondsContext, PlutoContext, PlutoJSInitializingContext } from "../../common/PlutoContext.js"

import { CellOutputContext } from "../CellOutput.js"
import { highlight } from "./highlight.js"

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
                    console.warn(`
    We don't (yet) support <script type=module>, please do not use this (yet)!
    Currently <script type=module> will run **exactly** like <script> without module.
    We'd like to eventually add specific support for module with importing, but that will take some time,
    and the web platform evolving a little bit more.
    (loading modules with <script type=module src=...> is fine)`)
                }

                if (node.type === "" || node.type === "text/javascript") {
                    if (is_displayable(old_result)) {
                        node.parentElement.insertBefore(old_result, node)
                    }

                    const cell = root_node.closest("pluto-cell")
                    let result = await execute_dynamic_function({
                        environment: {
                            this: script_id ? old_result : window,
                            currentScript: node,
                            invalidation: invalidation,
                            getPublishedObject: (id) => cell.getPublishedObject(id),
                            ...observablehq_for_cells,
                        },
                        code: node.innerText,
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
                            node.parentElement.insertBefore(result, node)
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

// Hihi
let async = async (async) => async()

/** @param {HTMLTemplateElement} template */
let declarative_shadow_dom_polyfill = (template) => {
    // Support declarative shadowroot 😼
    // https://web.dev/declarative-shadow-dom/
    // The polyfill they mention on the page is nice and all, but we need more.
    // For one, we need the polyfill anyway as we're adding html using innerHTML (just like we need to run the scripts ourselves)
    // Also, we want to run the scripts inside the shadow roots, ideally in the same order that a browser would.
    // And we want nested shadowroots, which their polyfill doesn't provide (and I hope the spec does)
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

/**
 * This is a lot of the frontend magic that makes Pluto work.
 * It "just" renders the html passed to it, but with a couple of catches:
 * - It supports declarative shadowdom (https://web.dev/declarative-shadow-dom/)
 * - It executes inline scripts observablehq-like
 * @param {{ body: string }} props
 */
export let PlutoHTML = ({ body }) => {
    let pluto_actions = useContext(PlutoContext)
    let pluto_bonds = useContext(PlutoBondsContext)
    let js_init_set = useContext(PlutoJSInitializingContext)
    let { persist_js_state, last_run_timestamp } = useContext(CellOutputContext)

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

        async(async () => {
            js_init_set?.add(container.current)
            previous_results_map.current = await execute_scripttags({
                root_node: container.current,
                script_nodes: new_scripts,
                invalidation: invalidation,
                previous_results_map: persist_js_state ? previous_results_map.current : new Map(),
            })

            if (pluto_actions != null) {
                set_bound_elements_to_their_value(container.current, pluto_bonds)
                let remove_bonds_listener = add_bonds_listener(container.current, pluto_actions.set_bond)
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
                // @ts-ignore
                for (let code_element of container.current.querySelectorAll("code")) {
                    for (let className of code_element.classList) {
                        if (className.startsWith("language-")) {
                            let language = className.substr(9)

                            // Remove "language-"
                            highlight(code_element, language)
                        }
                    }
                }
            } catch (err) {}
            js_init_set?.delete(container.current)
        })

        return () => {
            invalidate_scripts.current?.()
        }
    }, [body, persist_js_state, last_run_timestamp, pluto_actions])

    return html`<div class="raw-html-wrapper" ref=${container}></div>`
}
