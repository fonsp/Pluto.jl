<script>
  import { cl } from '../common/ClassTable.js'
  
  export let onClick = null
  export let total = 0
  export let done = 0
  export let busy = 0
  export let failed_indices = []
  
  // 确保total至少为1
  $: safe_total = Math.max(1, total)
</script>

<div
  class={cl({
    "discrete-progress-bar": true,
    "small": safe_total < 8,
    "mid": safe_total >= 8 && safe_total < 48,
    "big": safe_total >= 48,
  })}
  data-total={safe_total}
  on:click={onClick}
  role="progressbar"
  aria-valuenow={done}
  aria-valuemin={0}
  aria-valuemax={safe_total}
>
  {#each Array(safe_total) as _, i}
    <div
      class={cl({
        done: i < done,
        failed: failed_indices.includes(i),
        busy: i >= done && i < done + busy,
      })}
    ></div>
  {/each}
</div>

<style>
  .discrete-progress-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    cursor: pointer;
    user-select: none;
  }
  
  .discrete-progress-bar.small {
    gap: 1px;
  }
  
  .discrete-progress-bar.small > div {
    width: 8px;
    height: 8px;
    border-radius: 1px;
  }
  
  .discrete-progress-bar.mid > div {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
  
  .discrete-progress-bar.big > div {
    width: 16px;
    height: 16px;
    border-radius: 3px;
  }
  
  .discrete-progress-bar > div {
    background: var(--progress-incomplete, #e0e0e0);
    transition: background-color 0.2s ease;
  }
  
  .discrete-progress-bar > div.done {
    background: var(--progress-done, #4caf50);
  }
  
  .discrete-progress-bar > div.busy {
    background: var(--progress-busy, #2196f3);
    animation: pulse 1.5s infinite;
  }
  
  .discrete-progress-bar > div.failed {
    background: var(--progress-failed, #f44336);
  }
  
  .discrete-progress-bar:hover > div {
    opacity: 0.8;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }
</style>