<script>
    import { ansi_to_html } from "../imports/AnsiUp.js"
    import { onMount, onDestroy } from 'svelte'

    export let value = ""

    let node_ref = null
    let start_time = Date.now()

    const make_spinner_spin = (original_html) => original_html.replaceAll("◐", `<span class="make-me-spin">◐</span>`)

    $: {
        if (node_ref) {
            node_ref.style.cssText = `--animation-delay: -${(Date.now() - start_time) % 1000}ms`
            node_ref.innerHTML = make_spinner_spin(ansi_to_html(value))
            const parent = node_ref.parentElement
            if (parent) parent.scrollTop = 1e5
        }
    }
</script>

{#if value}
    <pkg-terminal>
        <div class="scroller">
            <pre bind:this={node_ref} class="pkg-terminal"></pre>
        </div>
    </pkg-terminal>
{/if}