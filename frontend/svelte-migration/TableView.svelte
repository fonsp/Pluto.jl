<script>
    import SimpleOutputBody from "./SimpleOutputBody.svelte"
    import { t } from "../common/lang.js"
    import { is_noop_action } from "../common/SliderServerClient.js"
    
    export let body
    export let cell_id
    export let persist_js_state = false
    export let sanitize_html = true
    
    let more_loading = false
    
    // Check if reshow_cell action is a noop
    $: more_is_noop_action = is_noop_action(null) // In a real implementation, this would check the actual pluto_actions.reshow_cell
    
    function handleMoreClick(e) {
        e.preventDefault()
        if (!more_loading) {
            more_loading = true
            // In a real implementation, this would trigger an action to load more data
            // For now, we'll just reset the loading state after a short delay
            setTimeout(() => {
                more_loading = false
            }, 1000)
        }
    }
    
    // 添加键盘事件处理程序以满足可访问性要求
    function handleMoreKeydown(e) {
        // 空格键或回车键触发点击事件
        if (e.key === ' ' || e.key === 'Enter') {
            handleMoreClick(e)
        }
    }
    
    // Compute max colspan
    $: maxcolspan = 3 + (body?.schema?.names?.length ?? 1)
</script>

<table class="pluto-table" bind:this={node_element}>
    {#if (body?.schema?.names?.length ?? 0) === 0}
        <thead>
            <tr class="empty">
                <td colspan={maxcolspan}>
                    <div>⌀ <small>{t("t_table_no_columns")}</small></div>
                </td>
            </tr>
        </thead>
    {:else}
        <thead>
            <tr class="schema-names">
                <th></th>
                {#each ["", ...body.schema.names] as x, i}
                    <th>
                        {#if x === "more"}
                            <pluto-tree-more
                                tabindex="0"
                                role="button"
                                aria-disabled={more_is_noop_action || cell_id === "cell_id_not_known" ? "true" : "false"}
                                class={more_loading ? "loading" : (more_is_noop_action || cell_id === "cell_id_not_known" ? "disabled" : "")}
                                on:click={handleMoreClick}
                                on:keydown={handleMoreKeydown}  
                            >
                                {t("t_tree_show_more_items")}
                            </pluto-tree-more>
                        {:else}
                            {x}
                        {/if}
                    </th>
                {/each}
            </tr>
            <tr class="schema-types">
                <th></th>
                {#each ["", ...body.schema.types] as x, i}
                    <th>{x === "more" ? "" : x}</th>
                {/each}
            </tr>
        </thead>
    {/if}
    
    <tbody>
        {#if (body.rows?.length ?? 0) !== 0}
            {#each body.rows as row, i}
                <tr>
                    {#if row === "more"}
                        <td class="pluto-tree-more-td" colspan={maxcolspan}>
                            <pluto-tree-more
                                tabindex="0"
                                role="button"
                                aria-disabled={more_is_noop_action || cell_id === "cell_id_not_known" ? "true" : "false"}
                                class={more_loading ? "loading" : (more_is_noop_action || cell_id === "cell_id_not_known" ? "disabled" : "")}
                                on:click={handleMoreClick}
                                on:keydown={handleMoreKeydown}  
                            >
                                {t("t_tree_show_more_items")}
                            </pluto-tree-more>
                        </td>
                    {:else}
                        <th>{row[0]}</th>
                        {#each row[1] as x, j}
                            <td>
                                <div>
                                    {#if x === "more"}
                                        <!-- More placeholder -->
                                    {:else}
                                        <SimpleOutputBody 
                                            cell_id={cell_id} 
                                            mime={x[1]} 
                                            body={x[0]} 
                                            persist_js_state={persist_js_state} 
                                            sanitize_html={sanitize_html} 
                                        />
                                    {/if}
                                </div>
                            </td>
                        {/each}
                    {/if}
                </tr>
                {/each}
        {:else}
            <tr class="empty">
                <td colspan={maxcolspan}>
                    <div>
                        <div>⌀</div>
                        <small>{t("t_table_no_rows")}</small>
                    </div>
                </td>
            </tr>
        {/if}
    </tbody>
</table>