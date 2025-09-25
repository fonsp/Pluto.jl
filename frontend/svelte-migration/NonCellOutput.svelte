<script>
    import { onMount } from "svelte"

    export let environment_component
    export let notebook_id

    let component_set = {}
    let surely_the_latest_updated_set = {}

    onMount(() => {
        const handleExperimentalAddNode = (e) => {
            try {
                const { name, node, order } = e.detail
                surely_the_latest_updated_set = { ...surely_the_latest_updated_set, [name]: { node, order } }
                component_set = surely_the_latest_updated_set
            } catch (e) {}
        }

        document.addEventListener("eexperimental_add_node_non_cell_output", handleExperimentalAddNode)
        
        return () => {
            document.removeEventListener("eexperimental_add_node_non_cell_output", handleExperimentalAddNode)
        }
    })

    $: components = Object.values(component_set)
        .sort(({ order: o1 }, { order: o2 }) => o1 - o2)
        .map(({ node }) => node)
</script>

<div class="non-cell-output">
    {#if environment_component}
        <svelte:component this={environment_component} {notebook_id} />
    {/if}
    {#each components as component}
        <div class="injected-component">{@html component}</div>
    {/each}
</div>