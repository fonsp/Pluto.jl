<script>
    import { onMount, onDestroy, getContext } from 'svelte'
    import TreeViewer from "./TreeViewer.svelte"
    import PlutoImage from "./PlutoImage.svelte"
    import ANSITextOutput from "./ANSITextOutput.svelte"
    import TableView from "./TableView.svelte"
    import ParseError from "./ParseError.svelte"
    import ErrorMessage from "./ErrorMessage.svelte"
    import RawHTMLContainer from "./RawHTMLContainer.svelte"
    import IframeContainer from "./IframeContainer.svelte"
    
    // Props
    export let mime
    export let body
    export let cell_id
    export let persist_js_state = false
    export let last_run_timestamp
    export let sanitize_html = true
    
    // State
    let script_results_map = new Map()
    let invalidate_scripts = () => {}
    
    // Lifecycle
    onMount(() => {
        // Initialize
    })
    
    onDestroy(() => {
        // Cleanup
    })
    
    // Helper functions
    function execute_dynamic_function({ environment, code }) {
        // single line so that we don't affect line numbers in the stack trace
        const wrapped_code = `"use strict"; return (async () => {${code}})()`

        let { ["this"]: this_value, ...args } = environment
        let arg_names = Object.keys(args)
        let arg_values = Object.values(args)
        const result = Function(...arg_names, wrapped_code).bind(this_value)(...arg_values)
        return result
    }
    
    // Convert sanitize_html and persist_js_state to boolean if they are strings
    $: sanitized_html = sanitize_html !== "false" && sanitize_html !== false
    $: persisted_state = persist_js_state === "true" || persist_js_state === true
</script>

{#if !mime || mime === "" || mime === undefined || mime === null}
    <!-- Empty output -->
{:else if mime.startsWith("image/")}
    <!-- Image output -->
    <div>
        <PlutoImage {mime} {body} />
    </div>
{:else if mime === "text/html"}
    <!-- HTML output -->
    {#if body.startsWith("<!DOCTYPE") || body.startsWith("<html")}
        {#if sanitized_html}
            <!-- Sanitized HTML - no output -->
        {:else}
            <IframeContainer {body} />
        {/if}
    {:else}
        <RawHTMLContainer
            {cell_id}
            {body}
            persist_js_state={persisted_state}
            {last_run_timestamp}
            sanitize_html={sanitized_html}
        />
    {/if}
{:else if mime === "application/vnd.pluto.tree+object"}
    <!-- TreeView output -->
    <div>
        <TreeViewer {mime} {body} {cell_id} {persist_js_state} {sanitize_html} />
    </div>
{:else if mime === "application/vnd.pluto.table+object"}
    <!-- TableView output -->
    <TableView {body} {cell_id} {persist_js_state} {sanitize_html} />
{:else if mime === "application/vnd.pluto.parseerror+object"}
    <!-- ParseError output -->
    <div>
        <ParseError {body} {cell_id} {last_run_timestamp} />
    </div>
{:else if mime === "application/vnd.pluto.stacktrace+object"}
    <!-- ErrorMessage output -->
    <div>
        <ErrorMessage {body} {cell_id} {last_run_timestamp} />
    </div>
{:else if mime === "application/vnd.pluto.divelement+object"}
    <!-- DivElement output -->
    <div>DivElement: {JSON.stringify(body)}</div>
{:else if mime === "text/plain"}
    <!-- Plain text output -->
    <div>
        {#if body}
            <ANSITextOutput {body} />
        {:else}
            <div></div>
        {/if}
    </div>
{:else}
    <!-- Unknown mime type -->
    <pre title="Something went wrong displaying this object">🛑</pre>
{/if}