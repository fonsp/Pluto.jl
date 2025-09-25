<script>
    export let progress = null
</script>

{#if progress != null && progress !== 1}
    <progress 
        class="statefile-fetch-progress" 
        max="100" 
        value={progress === "indeterminate" ? undefined : Math.round(progress * 100)}
    >
        {progress === "indeterminate" ? "" : `${Math.round(progress * 100)}%`}
    </progress>
{/if}