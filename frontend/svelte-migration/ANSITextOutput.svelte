<script>
    import { onMount } from 'svelte'
    import { ansi_to_html } from "../imports/AnsiUp.js"
    
    export let body
    
    let code_element
    
    // Check if body contains ANSI escape codes
    $: has_ansi = /\x1b\[\d+m/.test(body)
    
    onMount(() => {
        if (has_ansi && code_element) {
            code_element.innerHTML = ansi_to_html(body)
        }
    })
    
    $: {
        if (has_ansi && code_element) {
            code_element.innerHTML = ansi_to_html(body)
        }
    }
</script>

{#if has_ansi}
    <pre class="no-block"><code bind:this={code_element}></code></pre>
{:else}
    <pre class="no-block"><code>{body}</code></pre>
{/if}