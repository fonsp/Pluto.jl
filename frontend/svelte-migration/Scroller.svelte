<script>
  import { onMount, onDestroy } from "svelte"

  export let active = { up: false, down: false }

  let pointer = { x: 0, y: 0 }
  let animation_frame_id = null
  let is_active = false

  function onmove(e) {
    pointer = { x: e.clientX, y: e.clientY }
  }

  function scroll_update(timestamp) {
    if (!is_active) return

    let prev_time = null
    let current = true

    const update = (timestamp) => {
      if (!current || !is_active) return

      if (prev_time == null) {
        prev_time = timestamp
      }
      const dt = timestamp - prev_time
      prev_time = timestamp

      if (pointer) {
        const y_ratio = pointer.y / window.innerHeight
        if (active.up && y_ratio < 0.3) {
          window.scrollBy(0, (((-1200 * (0.3 - y_ratio)) / 0.3) * dt) / 1000)
        } else if (active.down && y_ratio > 0.7) {
          window.scrollBy(0, (((1200 * (y_ratio - 0.7)) / 0.3) * dt) / 1000)
        }
      }

      animation_frame_id = window.requestAnimationFrame(update)
    }

    animation_frame_id = window.requestAnimationFrame(update)
    
    return () => {
      current = false
      if (animation_frame_id) {
        window.cancelAnimationFrame(animation_frame_id)
        animation_frame_id = null
      }
    }
  }

  // Reactive statement to handle active state changes
  $: if (active.up || active.down) {
    if (!is_active) {
      is_active = true
      const cleanup = scroll_update()
      
      // Store cleanup function for later use
      if (cleanup) {
        scroll_cleanup = cleanup
      }
    }
  } else {
    is_active = false
    if (scroll_cleanup) {
      scroll_cleanup()
      scroll_cleanup = null
    }
  }

  let scroll_cleanup = null

  onMount(() => {
    window.addEventListener("pointermove", onmove)
    window.addEventListener("dragover", onmove)

    return () => {
      window.removeEventListener("pointermove", onmove)
      window.removeEventListener("dragover", onmove)
      is_active = false
      if (scroll_cleanup) {
        scroll_cleanup()
        scroll_cleanup = null
      }
      if (animation_frame_id) {
        window.cancelAnimationFrame(animation_frame_id)
      }
    }
  })
</script>

<!-- This component doesn't render anything visible -->