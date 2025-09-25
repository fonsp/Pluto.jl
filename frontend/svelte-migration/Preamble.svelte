<script>
  import { onMount, onDestroy, getContext } from 'svelte'
  import { cl } from '../common/ClassTable.js'
  import { is_mac_keyboard } from '../common/KeyboardShortcuts.js'
  import { t, th } from '../common/lang.js'

  export let any_code_differs = false
  export let last_update_time = 0
  export let last_hot_reload_time = 0
  export let connected = false

  const nbsp = "\u00A0"
  
  // 获取 PlutoActionsContext
  const pluto_actions = getContext('PlutoActions')
  
  let state = ""
  let reload_state = ""
  let timeout_ref = null
  let reload_timeout_ref = null
  let old_enough = false
  
  const clear_timeout = (x) => x && clearTimeout(x)
  
  const await_focus = () =>
      document.visibilityState === "visible"
          ? Promise.resolve()
          : new Promise((res) => {
                const h = () => {
                    await_focus().then(res)
                    document.removeEventListener("visibilitychange", h)
                }
                document.addEventListener("visibilitychange", h)
            })
  
  // 处理保存状态逻辑
  $: {
      clear_timeout(timeout_ref)
      if (any_code_differs) {
          state = "ask_to_save"
      } else {
          if (Date.now() - last_update_time < 1000) {
              state = "saved"
              timeout_ref = setTimeout(() => {
                  state = ""
              }, 1000)
          } else {
              state = ""
          }
      }
  }
  
  // 处理连接状态变化
  $: {
      if (connected) {
          setTimeout(() => old_enough = true, 1000)
      }
  }
  
  // 处理热重载状态
  $: {
      console.log("Hottt", last_hot_reload_time, old_enough)
      if (old_enough) {
          reload_state = "reloaded_from_file"
          console.log("set state")

          await_focus().then(() => {
              reload_timeout_ref = setTimeout(() => {
                  reload_state = ""
                  console.log("reset state")
              }, 8000)
          })
      }
  }
  
  onDestroy(() => {
      clear_timeout(timeout_ref)
      clear_timeout(reload_timeout_ref)
  })
  
  function handleSaveClick() {
      state = "saving"
      pluto_actions.set_and_run_all_changed_remote_cells()
  }
</script>

<preamble>
  {#if state === "ask_to_save"}
    <div id="saveall-container" class="overlay-button {state}">
      <button
        on:click={handleSaveClick}
        class={cl({ runallchanged: true })}
        title={t("t_save_all_changes_description")}
      >
        <span class="only-on-hover"><strong>{t("t_save_all_changes")}</strong>{nbsp}</span>
        {#if is_mac_keyboard}
          <kbd>⌘ S</kbd>
        {:else}
          <kbd>Ctrl</kbd>+<kbd>S</kbd>
        {/if}
      </button>
    </div>
  {:else if state === "saved" || state === "saving"}
    <div id="saveall-container" class="overlay-button {state}">
      <span>
        <span class="only-on-hover">{t("t_file_saved")}{nbsp}</span>
        <span class="saved-icon pluto-icon"></span>
      </span>
    </div>
  {:else if reload_state === "reloaded_from_file"}
    <div id="saveall-container" class="overlay-button {state}">
      <span>{th("t_file_change_detected")}{nbsp}<span class="saved-icon pluto-icon"></span></span>
    </div>
  {/if}
</preamble>

<style>
  preamble {
    display: block;
  }
  
  #saveall-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 100;
  }
  
  .overlay-button {
    background: var(--overlay-button-bg, #333);
    color: var(--overlay-button-color, white);
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: opacity 0.2s ease;
  }
  
  .overlay-button:hover {
    opacity: 0.9;
  }
  
  .overlay-button.saving {
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .only-on-hover {
    display: inline;
  }
  
  .saved-icon {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    background: currentColor;
    mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>') no-repeat center;
    mask-size: contain;
  }
  
  kbd {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.8rem;
    font-family: monospace;
  }
</style>