<script>
    import { onMount, onDestroy, createEventDispatcher } from 'svelte'
    import OutputBody from "./OutputBody.svelte"
    
    // Props
    export let mime
    export let body
    export let cell_id
    export let persist_js_state = false
    export let last_run_timestamp
    export let sanitize_html = true
    export let rootassignee = null
    export let errored = false
    export let has_pluto_hook_features = false
    
    // State
    let output_element
    let output_changed_once = false
    let old_height = 0
    let resize_observer
    
    // Dispatch
    const dispatch = createEventDispatcher()
    
    // Helper functions
    const prettyAssignee = (assignee) => {
        if (assignee && assignee.startsWith("const ")) {
            return `const ${assignee.slice(6)}`
        }
        return assignee
    }
    
    // Lifecycle
    onMount(() => {
        // Set up resize observer
        // @ts-ignore Is there a way to use the latest DOM spec?
        resize_observer = new ResizeObserver((entries) => {
            const new_height = output_element.offsetHeight

            // Scroll the page to compensate for change in page height:
            if (document.body.querySelector("pluto-cell:focus-within")) {
                const cell_outputs_after_focused = document.body.querySelectorAll("pluto-cell:focus-within ~ pluto-cell > pluto-output") // CSS wizardry ✨
                if (
                    !(document.activeElement?.tagName === "SUMMARY") &&
                    (cell_outputs_after_focused.length === 0 || !Array.from(cell_outputs_after_focused).includes(output_element))
                ) {
                    window.scrollBy(0, new_height - old_height)
                }
            }

            old_height = new_height
        })
        
        resize_observer.observe(output_element)
    })
    
    onDestroy(() => {
        if (resize_observer && output_element) {
            resize_observer.unobserve(output_element)
        }
    })
    
    // Reactive statements
    $: {
        if (last_run_timestamp) {
            output_changed_once = true
        }
    }
    
    // Check if output should be rich
    $: rich_output = 
        errored ||
        !body ||
        (mime !== "application/vnd.pluto.tree+object" &&
            mime !== "application/vnd.pluto.table+object" &&
            mime !== "text/plain")
            
    $: allow_translate = !errored && rich_output
    
    // Class computation
    $: classes = {
        rich_output: rich_output,
        scroll_y: mime === "application/vnd.pluto.table+object" || mime === "text/plain"
    }
    
    // Convert classes object to string
    $: class_string = Object.entries(classes).filter(([key, value]) => value).map(([key, value]) => key).join(' ')
</script>

<pluto-output
    bind:this={output_element}
    class={class_string}
    translate={allow_translate}
    {mime}
    aria-live={output_changed_once ? "polite" : "off"}
    aria-atomic="true"
    aria-relevant="all"
    aria-label={rootassignee == null ? "Result of unlabeled cell:" : `Result of variable ${rootassignee}:`}
>
    <assignee aria-hidden="true" translate={false}>{prettyAssignee(rootassignee)}</assignee>
    <OutputBody 
        {mime} 
        {body} 
        {cell_id} 
        {persist_js_state} 
        {last_run_timestamp} 
        {sanitize_html} 
    />
</pluto-output>