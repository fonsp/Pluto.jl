<script>
  import { onMount, onDestroy } from 'svelte'
  import { t } from '../common/lang.js'
  import _ from '../imports/lodash.js'
  
  export let notebook
  export let backend_launch_phase
  export let status

  let recently_running = []
  let currently_running = []
  let timeout_handles = {}

  // useDelayedTruth hook implementation - fixed for Svelte reactivity
  let delayed_states = {}
  
  function useDelayedTruth(x, timeout) {
    // Create a unique key for this timeout
    const key = `${timeout}`
    
    if (delayed_states[key] !== x) {
      delayed_states[key] = x
      
      if (timeout_handles[key]) {
        clearTimeout(timeout_handles[key])
      }
      
      if (x) {
        timeout_handles[key] = setTimeout(() => {
          delayed_states[key] = true
        }, timeout)
      } else {
        delayed_states[key] = false
      }
    }
    
    return delayed_states[key] || false
  }

  // Reactive: update running cells
  $: {
    const currently = Object.values(notebook?.cell_results || {})
      .filter((c) => c.running || c.queued)
      .map((c) => c.cell_id)

    currently_running = currently

    if (currently.length === 0) {
      // all cells completed
      recently_running = []
    } else {
      // add any new running cells to our pile
      recently_running = _.union(currently, recently_running)
    }
  }

  $: cell_progress = recently_running.length === 0 ? 0 : 1 - Math.max(0, currently_running.length - 0.3) / recently_running.length
  $: binder_loading = status?.loading && status?.binder
  $: base_progress = binder_loading ? (backend_launch_phase ?? 0) : cell_progress
  $: anything = (binder_loading || recently_running.length !== 0) && base_progress !== 1
  
  // Double inversion with ! to short-circuit the true, not the false
  $: anything_for_a_short_while = !useDelayedTruth(!anything, 500)
  $: anything_for_a_long_while = !useDelayedTruth(!anything, 2000)
  $: should_render = anything || anything_for_a_short_while || anything_for_a_long_while

  // Final progress value - use 1 when completed but still showing
  $: progress = (anything_for_a_short_while && !(binder_loading || recently_running.length !== 0)) ? 1 : base_progress

  $: title = binder_loading
    ? t("t_process_status_loading_binder")
    : t("t_process_running_cells", {
        done: recently_running.length - currently_running.length,
        total: recently_running.length,
      })

  // Integrated scroll_cell_into_view function from Scroller.js
  function scroll_cell_into_view(cell_id) {
    document.getElementById(cell_id)?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    })
  }

  // Export scroll_to_busy_cell function for compatibility
  export function scroll_to_busy_cell(notebook) {
    const running_cell_id =
      notebook == null
        ? (document.querySelector("pluto-cell.running") ?? document.querySelector("pluto-cell.queued"))?.id
        : (Object.values(notebook.cell_results).find((c) => c.running) ?? Object.values(notebook.cell_results).find((c) => c.queued))?.cell_id
    if (running_cell_id) {
      scroll_cell_into_view(running_cell_id)
    }
  }

  onDestroy(() => {
    Object.values(timeout_handles).forEach(clearTimeout)
  })

  function handle_click(event) {
    if (!binder_loading) {
      scroll_to_busy_cell(notebook)
    }
  }


</script>

{#if should_render}
  <loading-bar
    class={binder_loading ? "slow" : "fast"}
    style="
      width: {100 * progress}vw; 
      opacity: {anything && anything_for_a_short_while ? 1 : 0};
      {anything || anything_for_a_short_while ? "" : "transition: none;"}
      pointer-events: {anything ? "auto" : "none"};
      cursor: {!binder_loading && anything ? "pointer" : "auto"};
    "
    on:click={(e) => {
      if (!binder_loading) {
        scroll_to_busy_cell(notebook)
      }
    }}
    aria-hidden="true"
    title={title}
  ></loading-bar>
{/if}

<style>
  loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--progress-bar-color, #007bff);
    z-index: 1000;
    transition: width 0.3s ease, opacity 0.3s ease;
  }

  loading-bar.fast {
    background: var(--progress-bar-fast-color, #28a745);
  }

  loading-bar.slow {
    background: var(--progress-bar-slow-color, #ffc107);
  }
</style>