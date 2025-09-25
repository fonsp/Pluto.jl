<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import { cl } from '../common/ClassTable.js'
  import { t, th } from '../common/lang.js'
  
  // Import child components
  import LiveDocsTab from './LiveDocsTab.svelte'
  import StatusTab from './StatusTab.svelte'
  import { BackendLaunchPhase } from '../common/Binder.js'
  import { useMyClockIsAheadBy } from '../common/clock sync.js'
  
  // Props
  export let notebook = {}
  export let desired_doc_query = null
  export let on_update_doc_query = (query) => {}
  export let connected = false
  export let backend_launch_phase = null
  export let backend_launch_logs = null
  export let sanitize_html = true
  
  // 状态管理
  let container_ref = null
  let focus_docs_on_open = false
  let open_tab = null // "docs" | "process" | null
  let hidden = true
  
  // 派生状态
  $: hidden = open_tab == null
  $: status = useWithBackendStatus(notebook, backend_launch_phase)
  $: [status_total, status_done] = calculateStatusProgress(status)
  $: busy = status_done < status_total
  $: show_business_outline = useDelayedTruth(busy, 700)
  $: show_business_counter = useDelayedTruth(busy, 3000)
  $: my_clock_is_ahead_by = useMyClockIsAheadBy({ connected })
  
  // 事件分发器
  const dispatch = createEventDispatcher()
  
  // 生命周期
  onMount(() => {
    // 监听打开面板事件
    const handleOpenPanel = (e) => {
      console.log(e.detail)
      focus_docs_on_open = false
      open_tab = e.detail
      
      if (container_ref && window.getComputedStyle(container_ref).display === "none") {
        alert("This browser window is too small to show docs.\n\nMake the window bigger, or try zooming out.")
      }
    }
    
    window.addEventListener('open_bottom_right_panel', handleOpenPanel)
    
    return () => {
      window.removeEventListener('open_bottom_right_panel', handleOpenPanel)
    }
  })
  
  // 辅助函数
  function calculateStatusProgress(status) {
    if (status == null) return [0, 0]
    
    // total_tasks minus 1, to exclude the notebook task itself
    const total = total_tasks(status) - 1
    // the notebook task should never be done, but lets be sure and subtract 1 if it is:
    const done = total_done(status) - (is_finished(status) ? 1 : 0)
    
    return [total, done]
  }
  
  function useWithBackendStatus(notebook, backend_launch_phase) {
    const backend_launch = useBackendStatus(backend_launch_phase)
    
    return backend_launch_phase == null
      ? notebook.status_tree
      : {
          name: "notebook",
          started_at: 0,
          finished_at: null,
          subtasks: {
            ...notebook.status_tree?.subtasks,
            backend_launch,
          },
        }
  }
  
  function useBackendStatus(backend_launch_phase) {
    const x = backend_launch_phase ?? -1
    
    const subtasks = Object.fromEntries(
      ["requesting", "created", "responded", "notebook_running"].map((key) => {
        const val = BackendLaunchPhase[key]
        const name = `backend_${key}`
        return [name, useStatusItem(name, x >= val, x > val)]
      })
    )
    
    return useStatusItem(
      "backend_launch",
      backend_launch_phase != null && backend_launch_phase > BackendLaunchPhase.wait_for_user,
      backend_launch_phase === BackendLaunchPhase.ready,
      subtasks
    )
  }
  
  function useStatusItem(name, started, finished, subtasks = {}) {
    return {
      name,
      started_at: started ? Date.now() : null,
      finished_at: finished ? Date.now() : null,
      success: finished ? true : null,
      subtasks
    }
  }
  
  // 导入状态工具函数
  import { is_finished, total_done, total_tasks } from './status-utils.js'
  
  // 延迟真值函数 - 组件内部实现
  function useDelayedTruth(x, timeout) {
    let output = false
    let timeoutId = null
    
    $: if (x) {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        output = true
      }, timeout)
    } else {
      output = false
      if (timeoutId) clearTimeout(timeoutId)
    }
    
    return output
  }
  
  // 面板控制函数
  function toggleDocs() {
    focus_docs_on_open = true
    open_tab = open_tab === "docs" ? null : "docs"
  }
  
  function toggleProcess() {
    open_tab = open_tab === "process" ? null : "process"
  }
  
  function closePanel() {
    open_tab = null
  }
  
  // 弹出功能
  async function onPopoutClick() {
    if (!("documentPictureInPicture" in window)) return
    
    try {
      // @ts-ignore
      const pip_window = await documentPictureInPicture.requestWindow()
      
      // Copy style sheets
      for (const styleSheet of document.styleSheets) {
        try {
          const style = document.createElement("style")
          style.textContent = [...styleSheet.cssRules].map(rule => rule.cssText).join("")
          pip_window.document.head.appendChild(style)
        } catch (e) {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.type = styleSheet.type
          // @ts-ignore
          link.media = styleSheet.media
          // @ts-ignore
          link.href = styleSheet.href
          pip_window.document.head.appendChild(link)
        }
      }
      
      pip_window.document.body.append(container_ref.firstElementChild)
      
      pip_window.addEventListener("pagehide", (event) => {
        const pipPlayer = event.target.querySelector("pluto-helpbox")
        if (pipPlayer && container_ref) {
          container_ref.append(pipPlayer)
        }
      })
    } catch (error) {
      console.error("Failed to open picture-in-picture window:", error)
    }
  }
  
  // 工具函数 - 这些函数现在从status-utils.js导入
</script>

<aside id="helpbox-wrapper" bind:this={container_ref}>
  <pluto-helpbox class={cl({ hidden, [`helpbox-${open_tab ?? hidden}`]: true })}>
    <header translate={false}>
      <button
        title={t("t_panel_docs_description")}
        class={cl({
          "helpbox-tab-key": true,
          "helpbox-docs": true,
          "active": open_tab === "docs",
        })}
        on:click={toggleDocs}
      >
        <span class="tabicon"></span>
        <span class="tabname">{t("t_panel_docs")}</span>
      </button>
      
      <button
        title={t("t_panel_status")}
        class={cl({
          "helpbox-tab-key": true,
          "helpbox-process": true,
          "active": open_tab === "process",
          "busy": show_business_outline,
          "something_is_happening": busy || !connected,
        })}
        id="process-status-tab-button"
        on:click={toggleProcess}
      >
        <span class="tabicon"></span>
        <span class="tabname">
          {#if open_tab === "process" || !show_business_counter}
            {t("t_panel_status_short")}
          {:else}
            {@html th("t_panel_status_progress", {
              progress: `<span class="subprogress-counter">${t("t_panel_status_progress_inner", { 
                done: status_done, 
                total: status_total 
              })}</span>`,
            })}
          {/if}
        </span>
      </button>

      {#if !hidden}
        {#if "documentPictureInPicture" in window}
          <button 
            class="helpbox-popout" 
            title={t("t_panel_popout")} 
            on:click={onPopoutClick}
          >
            <span></span>
          </button>
        {/if}
        
        <button
          class="helpbox-close"
          title={t("t_panel_close")}
          on:click={closePanel}
        >
          <span></span>
        </button>
      {/if}
    </header>
    
    {#if open_tab === "docs"}
      <LiveDocsTab
        focus_on_open={focus_docs_on_open}
        {desired_doc_query}
        {on_update_doc_query}
        {notebook}
        {sanitize_html}
      />
    {:else if open_tab === "process"}
      <StatusTab
        {notebook}
        {backend_launch_logs}
        {my_clock_is_ahead_by}
        {status}
      />
    {/if}
  </pluto-helpbox>
</aside>

<style>
  #helpbox-wrapper {
    position: fixed;
    right: 0;
    top: 60px;
    bottom: 0;
    width: 300px;
    background: var(--helpbox-bg, #f8f8f8);
    border-left: 1px solid var(--border-color, #e0e0e0);
    z-index: 100;
  }
  
  pluto-helpbox {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  pluto-helpbox.hidden {
    display: none;
  }
  
  header {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--header-bg, #ffffff);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }
  
  .helpbox-tab-key {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .helpbox-tab-key:hover {
    background: var(--hover-bg, #f0f0f0);
  }
  
  .helpbox-tab-key.active {
    background: var(--active-bg, #e8f4fd);
    border-color: var(--active-border, #2196f3);
  }
  
  .helpbox-tab-key.busy {
    animation: pulse 1.5s infinite;
  }
  
  .helpbox-tab-key.something_is_happening {
    color: var(--warning-color, #ff6b6b);
  }
  
  .tabicon {
    width: 16px;
    height: 16px;
    display: inline-block;
  }
  
  .tabname {
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .subprogress-counter {
    font-size: 0.8rem;
    color: var(--secondary-text, #666);
    margin-left: 0.25rem;
  }
  
  .helpbox-popout,
  .helpbox-close {
    margin-left: auto;
    padding: 0.5rem;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  .helpbox-popout:hover,
  .helpbox-close:hover {
    background: var(--hover-bg, #f0f0f0);
  }
  
  .flex-grow {
    flex-grow: 1;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }
</style>