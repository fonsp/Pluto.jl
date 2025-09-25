<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { plutoActions } from '../stores/plutoStores.js';
  
  export let notebook;
  export let disable_input = false;
  
  let recent_event = null;
  let recent_source_element = null;
  let pos_style = '';
  let element_focused_before_popup = null;
  let element_ref = null;
  
  const dispatch = createEventDispatcher();
  
  function open(event) {
    const el = event.detail.source_element;
    recent_source_element = el;
    
    if (el == null) {
      pos_style = 'top: 20%; left: 50%; transform: translate(-50%, -50%); position: fixed;';
    } else {
      const elb = el.getBoundingClientRect();
      const bodyb = document.body.getBoundingClientRect();
      pos_style = `top: ${0.5 * (elb.top + elb.bottom) - bodyb.top}px; left: min(max(0px,100vw - 251px - 30px), ${elb.right - bodyb.left}px);`;
    }
    
    recent_event = event.detail;
  }
  
  function close() {
    recent_event = null;
    recent_source_element = null;
    if (element_focused_before_popup) {
      element_focused_before_popup.focus();
      element_focused_before_popup = null;
    }
  }
  
  function handleFocusOut(event) {
    if (recent_event && recent_event.should_focus === true) {
      if (element_ref?.matches(":focus-within")) return;
      if (element_ref?.contains(event.relatedTarget)) return;
      
      if (recent_source_element && 
          (recent_source_element.contains(event.relatedTarget) || 
           recent_source_element.matches(":focus-within"))) return;
      
      close();
      event.preventDefault();
    }
  }
  
  function handleKeyDown(event) {
    if (event.key === "Escape") {
      close();
    }
  }
  
  function handlePointerDown(event) {
    if (!recent_event) return;
    if (!event.target) return;
    if (event.target.closest("pluto-popup") != null) return;
    if (recent_source_element && recent_source_element.contains(event.target)) return;
    
    close();
  }
  
  onMount(() => {
    window.addEventListener("open pluto popup", open);
    window.addEventListener("close pluto popup", close);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("open pluto popup", open);
      window.removeEventListener("close pluto popup", close);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
  
  $: if (recent_event && recent_event.should_focus === true) {
    requestAnimationFrame(() => {
      element_focused_before_popup = document.activeElement;
      const focusEl = element_ref?.querySelector("a, input, button") ?? element_ref;
      focusEl?.focus?.();
    });
  }
  
  $: popupClasses = [
    recent_event ? 'visible' : '',
    recent_event?.type ?? '',
    recent_event?.big === true ? 'big' : '',
    recent_event?.css_class ?? ''
  ].filter(Boolean).join(' ');
</script>

<svelte:window />

<pluto-popup 
  class={popupClasses}
  style={pos_style}
  bind:this={element_ref}
  tabindex="0"
  on:focusout={handleFocusOut}
>
  {#if recent_event?.type === 'nbpkg'}
    <div class="pkg-popup">
      <h3>Package Management</h3>
      <p>Package: {recent_event.package_name}</p>
      <button on:click={close}>Close</button>
    </div>
  {:else if recent_event?.type === 'info' || recent_event?.type === 'warn'}
    <div class="info-popup">
      {@html recent_event?.body}
      <button on:click={close}>Close</button>
    </div>
  {/if}
</pluto-popup>

<div tabindex="0"></div>

<style>
  pluto-popup {
    display: none;
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-width: 300px;
    padding: 16px;
  }
  
  pluto-popup.visible {
    display: block;
  }
  
  pluto-popup.big {
    max-width: 500px;
  }
  
  .pkg-popup, .info-popup {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: #333;
  }
  
  p {
    margin: 0;
    color: #666;
  }
  
  button {
    align-self: flex-end;
    background: #007acc;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background: #005a9e;
  }
</style>