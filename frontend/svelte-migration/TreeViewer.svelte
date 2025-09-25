<script>
    import TreeView from "./TreeView.svelte"
    import TableView from "./TableView.svelte"
    import SimpleOutputBody from "./SimpleOutputBody.svelte"
    
    export let mime
    export let body
    export let cell_id
    export let persist_js_state = false
    export let sanitize_html = true
</script>

{#if mime === "application/vnd.pluto.tree+object"}
    <TreeView {body} {cell_id} {persist_js_state} {sanitize_html} />
{:else if mime === "application/vnd.pluto.table+object"}
    <TableView {body} {cell_id} {persist_js_state} {sanitize_html} />
{:else}
    <SimpleOutputBody {mime} {body} {cell_id} {persist_js_state} {sanitize_html} />
{/if}