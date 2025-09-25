<script>
    import { onMount, onDestroy } from 'svelte'
    
    export let body
    export let mime
    
    let img_element
    let object_url = ""
    
    onMount(() => {
        if (body && mime && img_element) {
            // Create object URL for the image
            try {
                const blob = new Blob([body], { type: mime })
                object_url = URL.createObjectURL(blob)
                
                const handleLoad = () => {
                    if (img_element) {
                        img_element.style.display = null
                        // Clean up event listeners
                        img_element.onload = null
                        img_element.onerror = null
                    }
                }
                
                img_element.onload = handleLoad
                img_element.onerror = handleLoad
                
                if (img_element.src === "") {
                    // an <img> that is loading takes up 21 vertical pixels, which causes a 1-frame scroll flicker
                    // the solution is to make the <img> invisible until the image is loaded
                    img_element.style.display = "none"
                }
                
                // Set the MIME type as a data attribute instead of an invalid type attribute
                img_element.setAttribute('data-mime', mime)
                img_element.src = object_url
            } catch (error) {
                console.error("Failed to create image:", error)
            }
        }
    })
    
    onDestroy(() => {
        if (object_url) {
            URL.revokeObjectURL(object_url)
        }
        // Clean up references
        img_element = null
    })
</script>

<img bind:this={img_element} src={object_url} alt="Pluto output" />