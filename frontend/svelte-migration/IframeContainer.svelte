<script>
    import { onMount, onDestroy } from 'svelte'
    
    export let body
    
    let iframe_element
    let object_url = ""
    
    onMount(() => {
        if (body && iframe_element) {
            try {
                const blob = new Blob([body], { type: "text/html" })
                object_url = URL.createObjectURL(blob)
                iframe_element.src = object_url
            } catch (error) {
                console.error("Failed to create iframe:", error)
            }
        }
    })
    
    onDestroy(() => {
        if (object_url) {
            URL.revokeObjectURL(object_url)
        }
    })
</script>

<iframe
    style="width: 100%; border: none;"
    src=""
    bind:this={iframe_element}
    frameborder="0"
    allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; geolocation; gyroscope; layout-animations; legacy-image-formats; magnetometer; microphone; midi; navigation-override; oversized-images; payment; picture-in-picture; publickey-credentials-get; sync-xhr; usb; wake-lock; screen-wake-lock; vr; web-share; xr-spatial-tracking"
    allowfullscreen
></iframe>