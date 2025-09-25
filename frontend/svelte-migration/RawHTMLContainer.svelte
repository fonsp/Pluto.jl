<script>
    import { onMount, onDestroy, getContext } from 'svelte'
    import DOMPurify from "../imports/DOMPurify.js"
    import { SafePreviewSanitizeMessage } from "../components/SafePreviewUI.js"
    import { observablehq_for_cells } from "../common/SetupCellEnvironment.js"
    import lodashLibrary from "../imports/lodash.js"
    import { set_bound_elements_to_their_value } from "../common/Bond.js"
    import { open_pluto_popup } from "../common/open_pluto_popup.js"
    
    // Props
    export let body
    export let className = ""
    export let persist_js_state = false
    export let last_run_timestamp
    export let sanitize_html = true
    export let sanitize_html_message = true
    export let cell_id = null
    
    // Context
    const pluto_actions = getContext("PlutoActionsContext")
    const pluto_bonds = getContext("PlutoBondsContext")
    const js_init_set = getContext("PlutoJSInitializingContext")
    
    // State
    let container
    let previous_results_map = new Map()
    let invalidate_scripts = () => {}
    let nested_script_execution_level = 0
    
    // Helper functions
    const is_displayable = (result) => result instanceof Element && result.nodeType === Node.ELEMENT_NODE
    
    const execute_inside_script_tag_that_replaces = async (script_element, fn) => {
        let new_script_tag = document.createElement("script")
        for (let attr of script_element.attributes) {
            new_script_tag.attributes.setNamedItem(attr.cloneNode(true))
        }
        const container_name = `____FUNCTION_TO_RUN_INSIDE_SCRIPT_${nested_script_execution_level}`
        new_script_tag.textContent = `{
            window.${container_name}.result = window.${container_name}.function_to_run(window.${container_name}.currentScript)
        }`

        window[container_name] = { function_to_run: fn, currentScript: new_script_tag, result: null }
        const parent = script_element.parentNode
        if (parent == null) {
            throw "Failed to execute script it has no parent in DOM."
        }
        parent.replaceChild(new_script_tag, script_element)
        let result = await window[container_name].result
        window[container_name] = { function_to_run: fn, result: null }

        return { node: new_script_tag, result: result }
    }
    
    const execute_dynamic_function = async ({ environment, code }) => {
        const wrapped_code = `"use strict"; return (async () => {${code}})()`
        let { ["this"]: this_value, ...args } = environment
        let arg_names = Object.keys(args)
        let arg_values = Object.values(args)
        const result = Function(...arg_names, wrapped_code).bind(this_value)(...arg_values)
        return result
    }
    
    const declarative_shadow_dom_polyfill = (template) => {
        try {
            const mode = template.getAttribute("shadowroot")
            const shadowRoot = template.parentElement.attachShadow({ mode })
            shadowRoot.appendChild(template.content)
            template.remove()

            const scripts_or_shadowroots = Array.from(shadowRoot.querySelectorAll("script, template[shadowroot]"))
            return scripts_or_shadowroots.flatMap((script_or_shadowroot) => {
                if (script_or_shadowroot.nodeName === "SCRIPT") {
                    return [script_or_shadowroot]
                } else if (script_or_shadowroot.nodeName === "TEMPLATE") {
                    return declarative_shadow_dom_polyfill(script_or_shadowroot)
                }
            })
        } catch (error) {
            console.error(`Couldn't attach declarative shadow dom to`, template, `because of`, error)
            return []
        }
    }
    
    const execute_scripttags = async ({ root_node, script_nodes, previous_results_map, invalidation, pluto_actions }) => {
        let results_map = new Map()

        // Reattach DOM results from old scripts
        for (let node of script_nodes) {
            if (node.src != null && node.src !== "") {
            } else {
                let script_id = node.id
                let old_result = script_id ? previous_results_map.get(script_id) : null
                if (is_displayable(old_result)) {
                    node.parentElement?.insertBefore(old_result, node)
                }
            }
        }

        // Run scripts sequentially
        for (let node of script_nodes) {
            nested_script_execution_level += 1
            if (node.src != null && node.src !== "") {
                // If it has a remote src="", de-dupe and copy the script to head
                let script_el = Array.from(document.head.querySelectorAll("script")).find((s) => s.src === node.src)

                if (script_el == undefined) {
                    script_el = document.createElement("script")
                    script_el.referrerPolicy = node.referrerPolicy
                    script_el.crossOrigin = node.crossOrigin
                    script_el.integrity = node.integrity
                    script_el.noModule = node.noModule
                    script_el.nonce = node.nonce
                    script_el.type = node.type
                    script_el.src = node.src
                    script_el.pluto_is_loading_me = true
                }
                let script_el_really = script_el

                const need_to_await = script_el_really.pluto_is_loading_me != null
                if (need_to_await) {
                    await new Promise((resolve) => {
                        script_el_really.addEventListener("load", resolve)
                        script_el_really.addEventListener("error", resolve)
                        document.head.appendChild(script_el_really)
                    })
                    script_el_really.pluto_is_loading_me = undefined
                }
            } else {
                // If there is no src="", we take the content and run it in an observablehq-like environment
                try {
                    let code = node.textContent
                    let script_id = node.id
                    let old_result = script_id ? previous_results_map.get(script_id) : null

                    if (node.type === "module") {
                        console.warn("We don't (yet) fully support <script type=module> (loading modules with <script type=module src=...> is fine).")
                    }

                    if (node.type === "" || node.type === "text/javascript" || node.type === "module") {
                        if (is_displayable(old_result)) {
                            node.parentElement?.insertBefore(old_result, node)
                        }

                        const cell = root_node.closest("pluto-cell")
                        let { node: new_node, result } = await execute_inside_script_tag_that_replaces(node, async (currentScript) => {
                            return await execute_dynamic_function({
                                environment: {
                                    this: script_id ? old_result : window,
                                    currentScript: currentScript,
                                    invalidation: invalidation,
                                    getPublishedObject: (id) => cell?.getPublishedObject?.(id),
                                    
                                    _internal_getJSLinkResponse: (cell_id, link_id) => (input) =>
                                        pluto_actions?.request_js_link_response?.(cell_id, link_id, input)?.then(([success, result]) => {
                                            if (success) return result
                                            throw result
                                        }),
                                    
                                    getBoundElementValueLikePluto: (element) => element?.value,
                                    setBoundElementValueLikePluto: (element, value) => { element.value = value },
                                    getBoundElementEventNameLikePluto: (element) => element?.getAttribute("onchange") ? "change" : "input",
                                    
                                    getNotebookMetadataExperimental: (key) => pluto_actions?.get_notebook?.()?.metadata?.[key],
                                    setNotebookMetadataExperimental: (key, value) =>
                                        pluto_actions?.update_notebook?.((notebook) => {
                                            notebook.metadata[key] = value
                                        }),
                                    deleteNotebookMetadataExperimental: (key) =>
                                        pluto_actions?.update_notebook?.((notebook) => {
                                            delete notebook.metadata[key]
                                        }),
                                    
                                    ...(cell == null ? {} : {
                                        getCellMetadataExperimental: (key, { cell_id = null } = {}) =>
                                            pluto_actions?.get_notebook?.()?.cell_inputs?.[cell_id ?? cell.id]?.metadata?.[key],
                                        setCellMetadataExperimental: (key, value, { cell_id = null } = {}) =>
                                            pluto_actions?.update_notebook?.((notebook) => {
                                                notebook.cell_inputs[cell_id ?? cell.id].metadata[key] = value
                                            }),
                                        deleteCellMetadataExperimental: (key, { cell_id = null } = {}) =>
                                            pluto_actions?.update_notebook?.((notebook) => {
                                                delete notebook.cell_inputs[cell_id ?? cell.id].metadata[key]
                                            }),
                                    }),
                                    
                                    ...observablehq_for_cells,
                                    _: lodashLibrary,
                                },
                                code,
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
                                new_node.parentElement?.insertBefore(result, new_node)
                            }
                        }
                    }
                } catch (err) {
                    console.error("Couldn't execute script:", node)
                    console.error(err)
                }
            }
            nested_script_execution_level -= 1
        }
        return results_map
    }
    
    const process_html_content = async () => {
        if (!container) return
        
        // Invalidate current scripts and create a new invalidation token
        let invalidation = new Promise((resolve) => {
            invalidate_scripts = () => {
                resolve(null)
            }
        })
        invalidate_scripts()
        
        invalidation = new Promise((resolve) => {
            invalidate_scripts = () => {
                resolve(null)
            }
        })
        
        let html_content = body
        
        // Sanitize HTML if requested
        if (sanitize_html) {
            const dirty_html = html_content
            html_content = DOMPurify.sanitize(html_content, {
                ADD_TAGS: ["link", "script", "template"],
                ADD_ATTR: ["target", "href", "crosorigin", "integrity", "integrity", "nomodule", "async", "defer"],
            })
            
            if (sanitize_html_message && dirty_html !== html_content) {
                const sanitized_message = SafePreviewSanitizeMessage()
                html_content = sanitized_message + html_content
            }
        }
        
        // Set the HTML content
        container.innerHTML = html_content
        
        // Set bound elements to their values
        if (pluto_bonds) {
            set_bound_elements_to_their_value(container.querySelectorAll("bond"), pluto_bonds)
        }
        
        // Process declarative shadow DOM
        const templates = Array.from(container.querySelectorAll("template[shadowroot]"))
        const shadow_scripts = templates.flatMap((template) => declarative_shadow_dom_polyfill(template))
        
        // Get all scripts
        const scripts = Array.from(container.querySelectorAll("script"))
        const all_scripts = [...scripts, ...shadow_scripts]
        
        // Execute scripts
        if (all_scripts.length > 0) {
            previous_results_map = await execute_scripttags({
                root_node: container,
                script_nodes: all_scripts,
                previous_results_map: persist_js_state ? previous_results_map : new Map(),
                invalidation: invalidation,
                pluto_actions: pluto_actions,
            })
        }
        
        // Open links in new tab
        for (const unsafe_link of container.querySelectorAll('a[href^="http"]')) {
            try {
                const url = new URL(unsafe_link.href)
                if (url.origin !== window.location.origin) {
                    unsafe_link.target = "_blank"
                    unsafe_link.rel = "noopener noreferrer"
                }
            } catch {}
        }
        
        // Add click handlers for pluto-popup elements
        for (const popup of container.querySelectorAll("pluto-popup")) {
            popup.addEventListener("click", (e) => {
                open_pluto_popup({
                    type: "info",
                    source_element: popup,
                    body: popup.title,
                })
            })
        }
    }
    
    onMount(() => {
        process_html_content()
    })
    
    onDestroy(() => {
        invalidate_scripts()
    })
    
    // React to changes in body or last_run_timestamp
    $: if (container && (body || last_run_timestamp)) {
        process_html_content()
    }
</script>

<div class="raw-html-wrapper {className}" bind:this={container}></div>