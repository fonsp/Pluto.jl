<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import { cl } from '../common/ClassTable.js'
  import { t } from '../common/lang.js'
  import DiscreteProgressBar from './DiscreteProgressBar.svelte'
  import PkgTerminalView from './PkgTerminalView.svelte'
  import NotifyWhenDone from './NotifyWhenDone.svelte'
  import { scroll_to_busy_cell } from '../svelte-migration/ProgressBar-svelte-functions.js'
  
  export let notebook = {}
  export let backend_launch_logs = null
  export let my_clock_is_ahead_by = 0
  export let status = null
  
  const dispatch = createEventDispatcher()
  
  // 全局排序顺序
  const global_order = `
workspace

create_process
init_process


pkg

analysis
waiting_for_others
resolve
remove
add
instantiate
instantiate1
instantiate2
instantiate3
precompile

run


saving
`
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
  
  // 黑名单过滤
  const blocklist = ["saving"]
  
  // 获取描述映射
  let descriptions = {}
  onMount(() => {
    descriptions = t("t_status_names", { returnObjects: true }) || {}
  })
  
  // 导入状态工具函数
  import { is_started, is_finished, is_busy, total_done, total_tasks } from './status-utils.js'
  
  // 工具函数
  function isnumber(str) {
    return /^\d+$/.test(str)
  }
  
  function prettytime(time_ns) {
    if (time_ns == null) {
      return "---"
    }
    let result = time_ns
    const prefices = ["n", "μ", "m", ""]
    let i = 0
    while (i < prefices.length - 1 && result >= 1000.0) {
      i += 1
      result /= 1000
    }
    const roundedtime = result.toFixed(time_ns < 100 || result >= 100.0 ? 0 : 1)

    return roundedtime + "\xa0" + prefices[i] + "s"
  }
  
  function friendly_name(task_name) {
    const descr = descriptions[task_name]
    return descr != null ? descr : isnumber(task_name) ? `Step ${task_name}` : task_name
  }
  
  function sort_on(a, b) {
    const a_order = global_order.indexOf(a.name)
    const b_order = global_order.indexOf(b.name)
    if (a_order === -1 && b_order === -1) {
      if (a.started_at != null || b.started_at != null) {
        return (a.started_at ?? Infinity) - (b.started_at ?? Infinity)
      } else if (isnumber(a.name) && isnumber(b.name)) {
        return parseInt(a.name) - parseInt(b.name)
      } else {
        return a.name.localeCompare(b.name)
      }
    } else {
      let m = (x) => (x === -1 ? Infinity : x)
      return m(a_order) - m(b_order)
    }
  }
  
  function to_ns(x) {
    return x * 1e9
  }
  
  // 状态管理
  let expanded_tasks = new Set()
  
  function toggle_task(task_path) {
    if (expanded_tasks.has(task_path)) {
      expanded_tasks.delete(task_path)
    } else {
      expanded_tasks.add(task_path)
    }
    expanded_tasks = new Set(expanded_tasks) // 触发更新
  }
  
  // 自动展开和折叠逻辑
  $: if (status) {
    // 自动展开忙碌或失败的任务
    const autoExpandTasks = (status_tree, path = []) => {
      const mystatus = path.reduce((entry, key) => entry?.subtasks?.[key], status_tree)
      if (!mystatus) return
      
      const path_str = path.join('/')
      const started = path.length > 0 && is_started(mystatus)
      const finished = started && is_finished(mystatus)
      const busy = started && !finished
      
      if ((busy || mystatus.success === false) && path.length > 0) {
        const timeout = Math.max(100, 500 - path.length * 200)
        setTimeout(() => {
          if (!expanded_tasks.has(path_str)) {
            toggle_task(path_str)
          }
        }, timeout)
      }
      
      // 自动折叠完成的任务
      if (finished && expanded_tasks.has(path_str)) {
        const timeout = 1800 - path.length * 200
        setTimeout(() => {
          if (expanded_tasks.has(path_str)) {
            toggle_task(path_str)
          }
        }, timeout)
      }
      
      // 递归处理子任务
      Object.keys(mystatus.subtasks || {}).forEach(key => {
        autoExpandTasks(status_tree, [...path, key])
      })
    }
    
    autoExpandTasks(status)
  }
  
  // 递归状态项组件 - 使用Svelte语法
  function renderStatusItem(status_tree, path = [], nbpkg) {
    if (!status_tree) return ''
    
    const mystatus = path.reduce((entry, key) => entry?.subtasks?.[key], status_tree)
    if (!mystatus) return ''
    
    const path_str = path.join('/')
    const is_open = expanded_tasks.has(path_str) || (path.length === 0)
    const started = path.length > 0 && is_started(mystatus)
    const finished = started && is_finished(mystatus)
    const busy = started && !finished
    
    const start = mystatus.started_at ?? 0
    const end = mystatus.finished_at ?? 0
    
    // 渲染子任务
    const renderChildren = () => {
      if (!is_open) return ''
      
      const subtasks = Object.entries(mystatus.subtasks || {})
        .sort((a, b) => sort_on(a[1], b[1]))
        .filter(([key]) => !blocklist.includes(key))
      
      // 如果是数字索引的子任务，显示进度条
      if (subtasks.length > 0 && subtasks.every(([key]) => isnumber(key))) {
        const kids = Object.values(mystatus.subtasks || {})
        const done = kids.reduce((acc, x) => acc + (is_finished(x) ? 1 : 0), 0)
        const busy_kids = kids.reduce((acc, x) => acc + (is_busy(x) ? 1 : 0), 0)
        const total = kids.length
        const failed_indices = kids.reduce((acc, x, i) => (x.success === false ? [...acc, i] : acc), [])
        
        return `
          <div class="progress-bar-container">
            ${DiscreteProgressBar ? `<DiscreteProgressBar 
              busy={${busy_kids}} 
              done={${done}} 
              total={${total}} 
              failed_indices={${JSON.stringify(failed_indices)}}
              onClick={${mystatus.name === "evaluate" ? '() => scroll_to_busy_cell()' : 'undefined'}}
            />` : ''}
          </div>
        `
      } else {
        // 否则渲染子任务列表
        return subtasks.map(([key, subtask]) => 
          renderStatusItem(status_tree, [...path, key], nbpkg)
        ).join('')
      }
    }
    
    // 计算进度计数器
    let inner_progress = ''
    if (started) {
      const t = total_tasks(mystatus)
      const d = total_done(mystatus)
      if (t > 1) {
        inner_progress = `<span class="subprogress-counter"> (${d}/${t})</span>`
      }
    }
    
    const can_open = Object.values(mystatus.subtasks || {}).length > 0
    
    // 根节点只渲染子内容
    if (path.length === 0) {
      return renderChildren()
    }
    
    // 渲染当前节点
    return `
      <pl-status
        data-depth="${path.length}"
        class="${cl({
          started,
          failed: mystatus.success === false,
          finished,
          busy,
          is_open,
          can_open,
        })}"
        aria-expanded="${can_open ? is_open : undefined}"
      >
        <div on:click="${() => toggle_task(path_str)}">
          <span class="status-icon"></span>
          <span class="status-name">${friendly_name(mystatus.name)}${inner_progress}</span>
          <span class="status-time">
            ${finished ? prettytime(to_ns(end - start)) : busy ? prettytime(to_ns(Date.now() / 1000 - start - (mystatus.timing === "local" ? 0 : my_clock_is_ahead_by))) : ''}
          </span>
        </div>
        ${renderChildren()}
        ${is_open && mystatus.name === "pkg" && nbpkg?.terminal_outputs?.nbpkg_sync ? 
          `<div class="pkg-terminal">
            <PkgTerminalView value="${nbpkg.terminal_outputs.nbpkg_sync}" />
          </div>` : ''}
        ${is_open && mystatus.name === "backend_launch" && backend_launch_logs ? 
          `<div class="backend-terminal">
            <PkgTerminalView value="${backend_launch_logs}" />
          </div>` : ''}
      </pl-status>
    `
  }
</script>

<div class="status-tab">
  <div class="status-header">
    <h3>{t("t_status_tab_title")}</h3>
    {#if my_clock_is_ahead_by > 0}
      <div class="clock-warning">
        ⚠️ Your clock is ahead by {Math.round(my_clock_is_ahead_by / 1000)}s
      </div>
    {/if}
  </div>
  
  <div class="status-content">
      {#if status}
        <NotifyWhenDone {status} />
        <div class="status-list">
          {@html renderStatusItem(status, [], notebook.nbpkg)}
        </div>
      {:else}
        <div class="status-empty">
          {t("t_status_no_tasks")}
        </div>
      {/if}
      
      {#if backend_launch_logs && backend_launch_logs.length > 0}
        <div class="backend-logs">
          <h4>{t("t_backend_logs")}</h4>
          <PkgTerminalView value={backend_launch_logs} />
        </div>
      {/if}
    </div>
</div>

<style>
  :global(pl-status) {
    display: block;
    margin: 0;
    padding: 0;
    border: none;
  }
  
  :global(pl-status > div) {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    user-select: none;
    border-radius: 0.25rem;
    transition: background 0.2s ease;
  }
  
  :global(pl-status > div:hover) {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(pl-status .status-icon) {
    width: 0.75rem;
    height: 0.75rem;
    margin-right: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
  
  :global(pl-status.started .status-icon) {
    background: var(--pluto-status-started-color, #ffc107);
  }
  
  :global(pl-status.finished .status-icon) {
    background: var(--pluto-status-finished-color, #28a745);
  }
  
  :global(pl-status.failed .status-icon) {
    background: var(--pluto-status-failed-color, #dc3545);
  }
  
  :global(pl-status.busy .status-icon) {
    animation: pulse 1.5s infinite;
    background: var(--pluto-status-busy-color, #007bff);
  }
  
  :global(pl-status .status-name) {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--pluto-text-color, #333);
  }
  
  :global(pl-status .status-time) {
    font-size: 0.75rem;
    color: var(--pluto-text-muted, #666);
    margin-left: 0.5rem;
  }
  
  :global(pl-status .subprogress-counter) {
    font-size: 0.75rem;
    color: var(--pluto-text-muted, #666);
    margin-left: 0.25rem;
  }
  
  :global(pl-status .progress-bar-container) {
    margin: 0.25rem 0 0.25rem 1.25rem;
  }
  
  :global(pl-status .pkg-terminal),
  :global(pl-status .backend-terminal) {
    margin: 0.5rem 0 0 1.25rem;
    border: 1px solid var(--pluto-border-color, #ddd);
    border-radius: 0.25rem;
    background: var(--pluto-terminal-bg, #f8f9fa);
  }
  
  :global(pl-status[data-depth="1"] > div) {
    padding-left: 1rem;
  }
  
  :global(pl-status[data-depth="2"] > div) {
    padding-left: 1.5rem;
  }
  
  :global(pl-status[data-depth="3"] > div) {
    padding-left: 2rem;
  }
  
  :global(pl-status.can_open > div::before) {
    content: "▶";
    margin-right: 0.25rem;
    font-size: 0.75rem;
    transition: transform 0.2s ease;
    color: var(--pluto-text-muted, #666);
  }
  
  :global(pl-status.is_open.can_open > div::before) {
    transform: rotate(90deg);
  }
  
  .status-tab {
    padding: 1rem;
    background: var(--pluto-surface-bg, #fff);
    border-radius: 0.5rem;
    border: 1px solid var(--pluto-border-color, #ddd);
    max-height: 400px;
    overflow-y: auto;
  }
  
  .status-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .status-empty {
    text-align: center;
    color: var(--pluto-text-muted, #666);
    padding: 2rem;
    font-style: italic;
  }
  
  .backend-logs {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--pluto-border-color, #ddd);
  }
  
  .backend-logs h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--pluto-text-color, #333);
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>