<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte'
    import SimpleOutputBody from "./SimpleOutputBody.svelte"
    import { t } from "../common/lang.js"
    import { is_noop_action } from "../common/SliderServerClient.js"
    
    // Exported props
    export let body
    export let cell_id
    export let persist_js_state = false
    export let sanitize_html = true
    
    // Internal state
    let node_element
    let more_loading = false
    
    // Check if reshow_cell action is a noop
    $: more_is_noop_action = is_noop_action(null) // In a real implementation, this would check the actual pluto_actions.reshow_cell
    
    // TreeView specific logic
    function handleTreeClick(e) {
        if (!node_element) return
        let clicked = e.target.closest("pluto-tree-prefix") != null ? e.target.closest("pluto-tree-prefix").parentElement : e.target
        if (clicked !== node_element && !node_element.classList.contains("collapsed")) {
            return
        }
        const parent_tree = node_element.parentElement?.closest("pluto-tree")
        if (parent_tree != null && parent_tree.classList.contains("collapsed")) {
            return // and bubble upwards
        }

        node_element.classList.toggle("collapsed")
    }
    
    // 添加键盘事件处理程序以满足可访问性要求
    function handleTreeKeydown(e) {
        // 空格键或回车键触发点击事件
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            handleTreeClick(e)
        }
    }
    
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
</script>

<!-- TreeView -->
{#if body.type === "Pair"}
    {@const r = body.key_value}
    <pluto-tree-pair class={body.type}>
        <p-r>
            <p-k>
                <SimpleOutputBody 
                    cell_id={cell_id} 
                    mime={r[0][1]} 
                    body={r[0][0]} 
                    persist_js_state={persist_js_state} 
                    sanitize_html={sanitize_html} 
                />
            </p-k>
            <p-v>
                <SimpleOutputBody 
                    cell_id={cell_id} 
                    mime={r[1][1]} 
                    body={r[1][0]} 
                    persist_js_state={persist_js_state} 
                    sanitize_html={sanitize_html} 
                />
            </p-v>
        </p-r>
    </pluto-tree-pair>
{:else if body.type === "circular"}
    <em>circular reference</em>
{:else}
    <pluto-tree 
        class="collapsed {body.type}" 
        role="tree"  
        on:click={handleTreeClick}
        on:keydown={handleTreeKeydown} 
        bind:this={node_element}
        tabindex="0"  
    >
        {#if body.type === "Array" || body.type === "Set" || body.type === "Tuple"}
            <pluto-tree-prefix 
                role="button" 
                tabindex="0"
                on:keydown={handleTreeKeydown}
            >
                <span class="long">{body.prefix}</span>
                <span class="short">{body.prefix_short}</span>
            </pluto-tree-prefix>
            
            <pluto-tree-items class={body.type}>
                {#each body.elements as r, i}
                    {#if r === "more"}
                        <p-r>
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
                        </p-r>
                    {:else}
                        <p-r>
                            {#if body.type !== "Set"}
                                <p-k>{r[0]}</p-k>
                            {/if}
                            <p-v>
                                <SimpleOutputBody 
                                    cell_id={cell_id} 
                                    mime={r[1][1]} 
                                    body={r[1][0]} 
                                    persist_js_state={persist_js_state} 
                                    sanitize_html={sanitize_html} 
                                />
                            </p-v>
                        </p-r>
                    {/if}
                {/each}
            </pluto-tree-items>
        {:else if body.type === "Dict"}
            <pluto-tree-prefix 
                role="button" 
                tabindex="0"
                on:keydown={handleTreeKeydown}
            >
                <span class="long">{body.prefix}</span>
                <span class="short">{body.prefix_short}</span>
            </pluto-tree-prefix>
            
            <pluto-tree-items class={body.type}>
                {#each body.elements as r, i}
                    {#if r === "more"}
                        <p-r>
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
                        </p-r>
                    {:else}
                        <p-r>
                            <p-k>
                                <SimpleOutputBody 
                                    cell_id={cell_id} 
                                    mime={r[0][1]} 
                                    body={r[0][0]} 
                                    persist_js_state={persist_js_state} 
                                    sanitize_html={sanitize_html} 
                                />
                            </p-k>
                            <p-v>
                                <SimpleOutputBody 
                                    cell_id={cell_id} 
                                    mime={r[1][1]} 
                                    body={r[1][0]} 
                                    persist_js_state={persist_js_state} 
                                    sanitize_html={sanitize_html} 
                                />
                            </p-v>
                        </p-r>
                    {/if}
                {/each}
            </pluto-tree-items>
        {:else if body.type === "NamedTuple"}
            <pluto-tree-prefix 
                role="button" 
                tabindex="0"
                on:keydown={handleTreeKeydown}
            >
                <span class="long">{body.prefix}</span>
                <span class="short">{body.prefix_short}</span>
            </pluto-tree-prefix>
            
            <pluto-tree-items class={body.type}>
                {#each body.elements as r, i}
                    {#if r === "more"}
                        <p-r>
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
                        </p-r>
                    {:else}
                        <p-r>
                            <p-k>{r[0]}</p-k>
                            <p-v>
                                <SimpleOutputBody 
                                    cell_id={cell_id} 
                                    mime={r[1][1]} 
                                    body={r[1][0]} 
                                    persist_js_state={persist_js_state} 
                                    sanitize_html={sanitize_html} 
                                />
                            </p-v>
                        </p-r>
                    {/if}
                {/each}
            </pluto-tree-items>
        {:else if body.type === "struct"}
            <pluto-tree-prefix 
                role="button" 
                tabindex="0"
                on:keydown={handleTreeKeydown}
            >
                <span class="long">{body.prefix}</span>
                <span class="short">{body.prefix_short}</span>
            </pluto-tree-prefix>
            
            <pluto-tree-items class={body.type}>
                {#each body.elements as r, i}
                    <p-r>
                        <p-k>{r[0]}</p-k>
                        <p-v>
                            <SimpleOutputBody 
                                cell_id={cell_id} 
                                mime={r[1][1]} 
                                body={r[1][0]} 
                                persist_js_state={persist_js_state} 
                                sanitize_html={sanitize_html} 
                            />
                        </p-v>
                    </p-r>
                {/each}
            </pluto-tree-items>
        {/if}
    </pluto-tree>
{/if}