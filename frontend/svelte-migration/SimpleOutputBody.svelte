<script>
    import PlutoImage from "./PlutoImage.svelte"
    import ANSITextOutput from "./ANSITextOutput.svelte"
    import TreeView from "./TreeView.svelte"
    
    export let mime
    export let body
    export let cell_id
    export let persist_js_state = false
    export let sanitize_html = true
</script>

{#if mime && (mime.startsWith("image/") || mime.includes("png") || mime.includes("jpg") || mime.includes("jpeg") || mime.includes("gif") || mime.includes("bmp") || mime.includes("svg"))}
    <PlutoImage {mime} {body} />
{:else if mime === "text/plain"}
    <ANSITextOutput {body} />
{:else if mime === "application/vnd.pluto.tree+object"}
    <TreeView {body} {cell_id} {persist_js_state} {sanitize_html} />
{:else if mime === "application/vnd.pluto.table+object"}
    <!-- For table objects, we'll render a simple display -->
    <div>Table: {JSON.stringify(body)}</div>
{:else if mime === "application/vnd.pluto.parseerror+object"}
    <!-- For parse errors, we'll render a simple display -->
    <div>Parse Error: {JSON.stringify(body)}</div>
{:else if mime === "application/vnd.pluto.stacktrace+object"}
    <!-- For stack traces, we'll render a simple display -->
    <div>Error: {JSON.stringify(body)}</div>
{:else if mime === "application/vnd.pluto.divelement+object"}
    <!-- For div elements, we'll render a simple display -->
    <div>DivElement: {JSON.stringify(body)}</div>
{:else if mime === "text/html"}
    <!-- For HTML content, we'll render it as HTML -->
    <div>{@html body}</div>
{:else if !mime || mime === "" || mime === "text/plain"}
    <!-- For plain text or no mime type, render as plain text -->
    {#if body}
        <ANSITextOutput {body} />
    {:else}
        <div></div>
    {/if}
{:else}
    <!-- For other mime types, we'll render a simple display -->
    <div>{@html body}</div>
{/if}