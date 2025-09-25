<script>
  import { onMount, onDestroy, setContext ,createEventDispatcher} from 'svelte'
  import {
    createEditorStore,
    createStatusStore,
    createCellStore,
    createActionsStore,
    createUIStore,
    DEFAULT_CELL_METADATA
  } from './editor-stores.js'
  import { ws_address_from_base, create_pluto_connection } from "../common/PlutoConnection.js"
  
import _ from "../imports/lodash.js"
  // Import child components
  import FilePicker from './FilePicker.svelte'
  import Preamble from './Preamble.svelte'
  import Notebook from './Notebook.svelte'
  import BottomRightPanel from './BottomRightPanel.svelte'
  import DropRuler from './DropRuler.svelte'
  import SelectionArea from './SelectionArea.svelte'
  // Import missing components
  import { RecentlyDisabledInfo, UndoDelete } from '../components/UndoDelete.js'
  import SlideControls from './SlideControls.svelte'
  import Scroller from './Scroller.svelte'
  import ExportBanner from './ExportBanner.svelte'
  import Popup from './Popup.svelte'
  import ProgressBar from './ProgressBar.svelte'
  import NonCellOutput from './NonCellOutput.svelte'
  import { IsolatedCell } from '../components/Cell.js'
  import RecordingPlaybackUI from './RecordingPlaybackUI.svelte'
  import RecordingUI from './RecordingUI.svelte'
  import HijackExternalLinksToOpenInNewTab from './HijackExternalLinksToOpenInNewTab.svelte'
  import FrontMatterInput from './FrontmatterInput.svelte'
  import { ViewCodeOrLaunchBackendButtons } from '../components/Editor/LaunchBackendButton.js'
  import SafePreviewUI from './SafePreviewUI.svelte'
  import LanguagePicker from './LanguagePicker.svelte'
  import PlutoLandUpload from './PlutoLandUpload.svelte'
  
  // Import utilities
  // import { create_pluto_connection, ws_address_from_base } from '../common/PlutoConnection.js'
  import { init_feedback } from '../common/Feedback.js'
  import { serialize_cells, deserialize_cells, detect_deserializer } from '../common/Serialization.js'
  import { slice_utf8, length_utf8 } from '../common/UnicodeTools.js'
  import {
      has_ctrl_or_cmd_pressed,
      ctrl_or_cmd_name,
      is_mac_keyboard,
      in_textarea_or_input,
      and,
      control_name,
      alt_or_options_name,
  } from '../common/KeyboardShortcuts.js'
  import { BackendLaunchPhase, count_stat } from '../common/Binder.js'
  import { setup_mathjax } from '../common/SetupMathJax.js'
  import { slider_server_actions, nothing_actions } from '../common/SliderServerClient.js'
  import { get_environment } from '../common/Environment.js'
  import { ProcessStatus } from '../common/ProcessStatus.js'
  import { open_pluto_popup } from '../common/open_pluto_popup.js'
  import { get_included_external_source } from '../common/external_source.js'
  import { getCurrentLanguage, t, th } from '../common/lang.js'
  
  // Props
  export let launch_params = {}
  export let initial_notebook_state = {}
  export let pluto_editor_element = null
  
  // 常量
  const default_path = ""
  const DEBUG_DIFFING = false
  
  // 创建状态管理 store
  const editorStore = createEditorStore(launch_params, initial_notebook_state)
  const statusStore = createStatusStore(editorStore, launch_params)
  const cellStore = createCellStore(editorStore)
  const uiStore = createUIStore(editorStore)
  
  // 创建动作 store（需要 client）
  let client = null
  let actions = null

  // 初始化客户端连接
  async function initializeClient() {
    try {
      if (typeof window !== 'undefined' && !$editorStore.static_preview) {
        // 定义回调函数
        const on_unrequested_update = (message, by_me) => {
          console.log('Unrequested update:', message, by_me)
          if (message.patch) {
            apply_notebook_patches(message.patch)
          }
          // 这里可以添加处理其他类型消息的逻辑
        }
        
        const on_connection_status = (status, hopeless) => {
          console.log('Connection status changed:', status, hopeless)
          editorStore.update(state => ({ ...state, connected: status, hopeless }))
          
          if (hopeless) {
            // 显示断开连接的提示
            console.log('Connection lost hopelessly')
          }
        }
        
        const on_reconnect = async () => {
          console.log('Attempting to reconnect')
          try {
            // 尝试重新同步状态
            if (actions) {
              const sync_result = await actions?.send?.('sync_state', {}, {}, false)
              return sync_result?.success !== false
            }
          } catch (error) {
            console.error('Reconnect sync failed:', error)
          }
          return false
        }
        
        // 创建连接
        client = await create_pluto_connection({
          ws_address: ws_address_from_base(),
          on_unrequested_update,
          on_connection_status,
          on_reconnect,
          connect_metadata: { notebook_id: notebook.notebook_id },
        })
        
        // 连接成功
        console.log('Client connection established:', client)
        
        // 更新actions以使用真实的client
        actions = createActionsStore(editorStore, client, launch_params)
        
        // 重新设置上下文
        setContext('plutoActions', actions)
        
        // 发送初始消息测试连接
        if (client && client.send) {
          try {
            await client.send('current_time', {}, {})
            console.log('Connection test successful')
          } catch (error) {
            console.error('Connection test failed:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize client connection:', error)
      editorStore.update(state => ({ ...state, connected: false, initialization_error: error.message }))
    }
  }
  
  // 补丁监听器
  let patch_listeners = []

  // 应用笔记本补丁
  let apply_notebook_patches = function apply_notebook_patches(patch) {
    console.log('Applying notebook patch:', patch)
    
    try {
      editorStore.update(state => {
        // 这里应该是根据补丁更新notebook状态的逻辑
        // 这是一个简化版本，实际实现可能需要更复杂的逻辑
        if (patch.type === 'replace_notebook') {
          return { ...state, notebook: patch.notebook }
        } else if (patch.type === 'update_cell') {
          const updated_notebook = { ...state.notebook }
          if (updated_notebook.cell_results) {
            updated_notebook.cell_results[patch.cell_id] = patch.result
          }
          return { ...state, notebook: updated_notebook }
        }
        return state
      })
    } catch (error) {
      console.error('Failed to apply patch:', error)
    }
  }
  
  // 设置上下文 - 初始为null，将在onMount中更新
  setContext('plutoActions', null)
  setContext('plutoNotebook', { subscribe: editorStore.subscribe })
  setContext('plutoStatus', { subscribe: statusStore.subscribe })
  setContext('plutoCells', { subscribe: cellStore.subscribe })
  setContext('plutoUI', { subscribe: uiStore.subscribe })
  
  // 事件分发器
  const dispatch = createEventDispatcher()
  
  // 生命周期
  onMount(() => {
    console.log('Editor component mounted')
    
    // 先初始化actions为默认值
    actions = createActionsStore(editorStore, null, launch_params)
    setContext('plutoActions', actions)
    dispatch('editor_mount', { editor: actions })
    
    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('paste', handlePaste)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // 初始化语言设置
    updateLang()
    
    // 初始化连接状态
    handleConnectionStatusChange(is_connected)
    
    // 添加焦点管理
    document.addEventListener('focus', handleFocusChange, true)
    document.addEventListener('blur', handleFocusChange, true)
    
    // 添加拖拽事件监听
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('dragend', handleDragEnd)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    
    // 添加窗口事件监听
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)
    
    // 初始化客户端连接
    initializeClient()
  })
  
  onDestroy(() => {
    console.log('Editor component destroyed')
    dispatch('editor_destroy')
    
    // 移除事件监听器
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('paste', handlePaste)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('focus', handleFocusChange, true)
    document.removeEventListener('blur', handleFocusChange, true)
    document.removeEventListener('dragstart', handleDragStart)
    document.removeEventListener('dragend', handleDragEnd)
    document.removeEventListener('dragover', handleDragOver)
    document.removeEventListener('drop', handleDrop)
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleScroll)
  })
  
  // 语言更新函数
  function updateLang() {
    const lang = notebook.metadata?.frontmatter?.language
    document.documentElement.lang = lang ?? getCurrentLanguage()
    console.log("Updated lang to", document.documentElement.lang)
  }
  
  // 事件处理函数
  function handleExportMenuToggle() {
    editorStore.update(state => ({ ...state, export_menu_open: !state.export_menu_open }))
  }
  
  function handleRecordingStart() {
    editorStore.update(state => ({ ...state, recording_waiting_to_start: true }))
  }
  
  function handleRecordingStates({ is_recording, recording_waiting_to_start }) {
    editorStore.update(state => ({ 
      ...state, 
      is_recording, 
      recording_waiting_to_start 
    }))
  }
  

  
  function handleScrollerChange(enabled) {
    editorStore.update(state => ({ 
      ...state, 
      scroller: enabled 
    }))
  }
  
  function handleSelectionChange(selected_cell_ids) {
    editorStore.update(state => {
      const currentSelected = state.selected_cells
      if (
        selected_cell_ids.length !== currentSelected.length ||
        _.difference(selected_cell_ids, currentSelected).length !== 0
      ) {
        return { ...state, selected_cells: selected_cell_ids }
      }
      return state
    })
  }
  
  function handleFrontmatterChange(newval) {
    actions?.update_notebook?.((nb) => {
      nb.metadata["frontmatter"] = newval
    })
  }
  
  // 键盘快捷键处理
  function handleKeyDown(event) {
    if (in_textarea_or_input()) return
    
    // 复制功能 (Ctrl/Cmd + C)
    if (has_ctrl_or_cmd_pressed(event) && event.key === 'c') {
      const serialized = serialize_selected()
      if (serialized) {
        event.preventDefault()
        requestAnimationFrame(() => {
          navigator.clipboard.writeText(serialized).catch(console.error)
        })
      }
    }
    
    // 粘贴功能 (Ctrl/Cmd + V)
    if (has_ctrl_or_cmd_pressed(event) && event.key === 'v') {
      event.preventDefault()
      navigator.clipboard.readText().then(text => {
        try {
          const deserialized = deserialize_cells(text)
          if (deserialized && deserialized.length > 0) {
            actions?.add_deserialized_cells?.(deserialized)
          }
        } catch (error) {
          console.warn('Failed to paste cells:', error)
        }
      }).catch(console.error)
    }
    
    // 全选 (Ctrl/Cmd + A)
    if (has_ctrl_or_cmd_pressed(event) && event.key === 'a') {
      event.preventDefault()
      const all_cell_ids = notebook.cell_order
      editorStore.update(state => ({ ...state, selected_cells: all_cell_ids }))
    }
    
    // 删除选中单元格 (Delete 或 Backspace)
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selected_cells.length > 0) {
        event.preventDefault()
        actions?.delete_selected_cells?.()
      }
    }
    
    // 运行选中单元格 (Shift + Enter)
    if (event.key === 'Enter' && event.shiftKey) {
      if (selected_cells.length > 0) {
        event.preventDefault()
        actions?.set_and_run_multiple?.(selected_cells)
      }
    }
    
    // 添加新单元格 (A 键)
    if (event.key === 'a' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      actions?.add_cell?.()
    }
  }
  
  // 剪贴板事件处理
  async function handlePaste(event) {
    const topaste = event.clipboardData?.getData("text/plain")
    if (topaste) {
      const deserializer = detect_deserializer(topaste)
      if (deserializer != null) {
        // 需要实现add_deserialized_cells方法
        console.warn("add_deserialized_cells not implemented")
        event.preventDefault()
      }
    }
  }
  
  // 页面卸载处理
  function handleBeforeUnload(event) {
    const unsaved_cells = notebook.cell_order.filter(
      (id) => $editorStore.cell_inputs_local[id] && notebook.cell_inputs[id].code !== $editorStore.cell_inputs_local[id].code
    )
    const first_unsaved = unsaved_cells[0]
    if (first_unsaved != null) {
      window.dispatchEvent(new CustomEvent("cell_focus", { detail: { cell_id: first_unsaved } }))
      event.stopImmediatePropagation()
      event.preventDefault()
      event.returnValue = ""
    }
  }
  
  // 辅助函数
  function serialize_selected(cell_id = null) {
    const cells_to_serialize = cell_id == null || selected_cells.includes(cell_id) ? selected_cells : [cell_id]
    if (cells_to_serialize.length) {
      return serialize_cells(cells_to_serialize.map((id) => notebook.cell_inputs[id]))
    }
  }

  function export_url(type) {
    // 实现导出 URL 生成
    const base_url = window.location.origin + window.location.pathname
    const params = new URLSearchParams(window.location.search)
    
    switch (type) {
      case "notebookfile":
        return `${base_url}?notebookfile=${encodeURIComponent(notebook.path)}`
      case "notebookexport":
        return `${base_url}?notebookexport=${encodeURIComponent(notebook.path)}`
      default:
        return base_url
    }
  }
  
  function restart(maybe_confirm = false) {
    const warn_about_untrusted_code = client?.session_options?.security?.warn_about_untrusted_code ?? true
    const source = notebook.metadata?.risky_file_source
    
    if (
      !warn_about_untrusted_code ||
      !maybe_confirm ||
      source == null ||
      confirm(
        `${th("t_safe_preview_confirm_before_danger")} ${t("t_safe_preview_confirm_before")}\n\n${source}\n\n${t("t_safe_preview_confirm_after")}`
      )
    ) {
      actions?.update_notebook?.((nb) => {
        delete nb.metadata.risky_file_source
      })
      
      if (client) {
        client.send("restart_process", {}, { notebook_id: notebook.notebook_id })
      }
    }
  }
  
  function restart_button(text, maybe_confirm = false) {
    return `<a href="#" id="restart-process-button" onClick="${() => restart(maybe_confirm)}">${text}</a>`
  }
  
  // 处理最近删除的单元格
  function handleUndoDelete() {
    const rd = $editorStore.recently_deleted
    if (rd == null) return
    
    actions?.update_notebook?.((notebook) => {
      for (let { index, cell } of rd) {
        notebook.cell_inputs[cell.cell_id] = cell
        notebook.cell_order = [...notebook.cell_order.slice(0, index), cell.cell_id, ...notebook.cell_order.slice(index, Infinity)]
      }
    })?.then(() => {
      actions?.set_and_run_multiple?.(rd.map(({ cell }) => cell.cell_id))
    })
  }
  
  // 处理最近自动禁用的单元格
  function handleRecentlyDisabled() {
    const recently_auto_disabled_cells = $editorStore.recently_auto_disabled_cells
    if (!recently_auto_disabled_cells || Object.keys(recently_auto_disabled_cells).length === 0) return
    
    // 重新启用所有自动禁用的单元格
    actions?.update_notebook?.((notebook) => {
      for (const [cell_id, [old_code, new_code]] of Object.entries(recently_auto_disabled_cells)) {
        if (notebook.cell_inputs[cell_id]) {
          notebook.cell_inputs[cell_id].code = new_code
          notebook.cell_inputs[cell_id].metadata.disabled = false
        }
      }
    })
  }
  
  // 处理单元格选择
  function handleCellSelection(cellId, selected) {
    if (selected) {
      if (!selected_cells.includes(cellId)) {
        selected_cells = [...selected_cells, cellId]
      }
    } else {
      selected_cells = selected_cells.filter(id => id !== cellId)
    }
  }
  
  // 处理全选
  function handleSelectAll() {
    selected_cells = notebook.cell_order.slice()
  }
  
  // 处理取消选择
  function handleDeselectAll() {
    selected_cells = []
  }
  
  // 处理连接状态变化
  function handleConnectionStatusChange(isConnected) {
    if (isConnected) {
      // 连接恢复时的处理
      console.log("Connection restored")
      // 可以在这里添加重新连接后的逻辑，比如重新加载数据
    } else {
      // 连接断开时的处理
      console.log("Connection lost")
      // 可以在这里添加连接断开时的逻辑，比如显示提示信息
    }
  }
  
  // 处理导出功能
  function handleExport(type) {
    const url = export_url(type)
    if (url) {
      window.open(url, '_blank')
    }
  }
  
  // 处理热重载
  function handleHotReload() {
    if (client) {
      client.send("reload", {}, { notebook_id: notebook.notebook_id })
    }
  }
  
  // 处理笔记本重置
  function handleNotebookReset() {
    // 重置笔记本状态
    actions?.update_notebook?.((notebook) => {
      // 清除所有输出和状态
      for (let cell_id of notebook.cell_order) {
        if (notebook.cell_results[cell_id]) {
          notebook.cell_results[cell_id].output = null
          notebook.cell_results[cell_id].runtime = null
        }
      }
    })
  }
  
  // 处理窗口大小变化
  function handleResize() {
    console.log('Window resized:', window.innerWidth, 'x', window.innerHeight)
    // 窗口大小变化时的处理逻辑
    // 可以在这里更新布局相关的状态
    // 例如：更新响应式布局状态
    // editorStore.update(state => ({ ...state, window_size: { width: window.innerWidth, height: window.innerHeight } }))
  }
  
  // 处理滚动事件
  function handleScroll() {
    console.log('Window scrolled:', window.scrollY)
    // 滚动事件的处理逻辑
    // 可以在这里实现懒加载、无限滚动等功能
    // 例如：更新滚动位置状态
    // editorStore.update(state => ({ ...state, scroll_position: window.scrollY }))
  }
  
  // 处理焦点变化
  function handleFocusChange(event) {
    // 焦点管理逻辑
    if (event.type === 'focus') {
      // 元素获得焦点时的处理
      console.log('Element focused:', event.target)
      // 可以在这里添加焦点相关的状态更新
      // editorStore.update(state => ({ ...state, focused_element: event.target }))
    } else if (event.type === 'blur') {
      // 元素失去焦点时的处理
      console.log('Element blurred:', event.target)
      // 可以在这里添加失去焦点相关的状态更新
      // editorStore.update(state => ({ ...state, focused_element: null }))
    }
  }
  
  // 处理拖拽事件
  function handleDragStart(event) {
    console.log('Drag started:', event)
    // 拖拽开始时的处理
    // 可以在这里设置拖拽数据
    // event.dataTransfer.setData('text/plain', 'some data')
  }
  
  function handleDragEnd(event) {
    console.log('Drag ended:', event)
    // 拖拽结束时的处理
    // 可以在这里清理拖拽相关的状态
  }
  
  function handleDragOver(event) {
    event.preventDefault()
    console.log('Drag over:', event)
    // 拖拽悬停时的处理
    // 可以在这里添加视觉反馈
    // event.dataTransfer.dropEffect = 'move'
  }
  
  function handleDrop(event) {
    event.preventDefault()
    console.log('Drop event:', event)
    // 拖拽放下时的处理
    // 可以在这里处理拖拽的数据
    // const data = event.dataTransfer.getData('text/plain')
  }
  
  // 处理文件移动
  function handleFileMove(newPath) {
    actions?.update_notebook?.((notebook) => {
      notebook.path = newPath
    })
  }
  
  // 处理文件保存（submit_file_change）
  async function submit_file_change(new_path, reset_cm_value) {
    const old_path = notebook.path
    if (old_path === new_path) {
      return
    }
    if (!notebook.in_temp_dir) {
      if (!confirm(t("t_confirm_move_file", { old_path, new_path, interpolation: { escapeValue: false } }))) {
        throw new Error("Declined by user")
      }
    }

    editorStore.update(state => ({ ...state, moving_file: true }))

    try {
      await actions?.update_notebook?.((notebook) => {
        notebook.in_temp_dir = false
        notebook.path = new_path
      })
      // @ts-ignore
      document.activeElement?.blur()
      reset_cm_value?.()
    } catch (error) {
      alert("Failed to move file:\n\n" + error.message)
    } finally {
      editorStore.update(state => ({ ...state, moving_file: false }))
    }
  }
  
  // 处理桌面文件保存（desktop_submit_file_change）
  async function desktop_submit_file_change() {
    editorStore.update(state => ({ ...state, moving_file: true }))
    /**
     * `window.plutoDesktop?.ipcRenderer` is basically what allows the
     * frontend to communicate with the electron side. It is an IPC
     * bridge between render process and main process. More info
     * [here](https://www.electronjs.org/docs/latest/api/ipc-renderer).
     *
     * "PLUTO-MOVE-NOTEBOOK" is an event triggered in the main process
     * once the move is complete, we listen to it using `once`.
     * More info [here](https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendereroncechannel-listener)
     */
    window.plutoDesktop?.ipcRenderer.once("PLUTO-MOVE-NOTEBOOK", async (/** @type {string?} */ loc) => {
      if (!!loc) {
        await actions?.update_notebook?.((notebook) => {
          notebook.in_temp_dir = false
          notebook.path = loc
        })
      }
      editorStore.update(state => ({ ...state, moving_file: false }))
      // @ts-ignore
      document.activeElement?.blur()
    })

    // ask the electron backend to start moving the notebook. The event above will be fired once it is done.
    window.plutoDesktop?.fileSystem.moveNotebook()
  }
  
  // 响应式变量
  $: statusval = Object.entries($statusStore).find(([k, v]) => v)?.[0] || null
  $: binder_session_url = $editorStore.binder_session_url
  $: binder_session_token = $editorStore.binder_session_token
  $: notebook = $editorStore.notebook
  $: export_menu_open = $editorStore.export_menu_open
  $: scroller = $editorStore.scroller
  $: selected_cells = $editorStore.selected_cells
  $: is_recording = $editorStore.is_recording
  $: recording_waiting_to_start = $editorStore.recording_waiting_to_start
  $: disable_ui = $editorStore.disable_ui
  $: static_preview = $editorStore.static_preview
  $: inspecting_hidden_code = $editorStore.inspecting_hidden_code
  $: backend_launch_phase = $editorStore.backend_launch_phase
  $: backend_launch_logs = $editorStore.backend_launch_logs
  $: desired_doc_query = $editorStore.desired_doc_query
  $: connected = $editorStore.connected
  $: initializing = $editorStore.initializing
  $: moving_file = $editorStore.moving_file
  $: recently_deleted = $editorStore.recently_deleted
  $: show_slide_controls = $editorStore.show_slide_controls
  $: status_done = $statusStore.status_done
  
  // 计算选择的单元格数量
  $: selected_cells_count = selected_cells.length
  $: has_selected_cells = selected_cells_count > 0
  
  // 计算状态相关的派生属性
  $: is_ready = statusval === "👍"
  $: is_error = statusval === "😞" || $editorStore.initialization_error
  $: is_loading = initializing || statusval === "🚀" || statusval === "⏳"
  $: is_reconnecting = statusval === "🔌"
  $: show_progress = is_loading && !status_done
  
  // 处理最近删除的单元格显示
  $: show_undo_delete = recently_deleted != null && recently_deleted.length > 0
  
  // 处理最近自动禁用的单元格
  $: recently_auto_disabled_cells = $editorStore.recently_auto_disabled_cells
  $: show_recently_disabled = recently_auto_disabled_cells != null && Object.keys(recently_auto_disabled_cells).length > 0
  
  // 处理连接状态
  $: connection_status = $statusStore.connected
  $: is_connected = connection_status === true
  
  // 响应式更新语言
  $: if (notebook.metadata?.frontmatter?.language) {
    updateLang()
  }
  
  // 监听连接状态变化
  $: if (connection_status !== undefined) {
    handleConnectionStatusChange(is_connected)
  }
</script>

{#if !disable_ui}
  <HijackExternalLinksToOpenInNewTab />
{/if}

<main class="pluto-editor">
  <!-- 安全预览UI -->
  <SafePreviewUI
    process_waiting_for_permission={$statusStore.process_waiting_for_permission}
    risky_file_source={notebook.metadata?.risky_file_source}
    {restart}
    warn_about_untrusted_code={$statusStore.warn_about_untrusted_code}
  />
  
  <!-- 录制UI -->
  <RecordingUI
    notebook_name={notebook.shortpath}
    recording_waiting_to_start={recording_waiting_to_start}
    set_recording_states={handleRecordingStates}
    {is_recording}
    {patch_listeners}
    {export_url}
  />
  
  <!-- 录制播放UI -->
  <RecordingPlaybackUI
    {launch_params}
    {initializing}
    apply_notebook_patches={apply_notebook_patches}
    reset_notebook_state={() => {
      editorStore.set({
        ...$editorStore,
        notebook: initial_notebook_state
      })
    }}
  />
  
  <!-- 后端启动按钮 -->
  <ViewCodeOrLaunchBackendButtons
    editor={{ actions, client, launch_params, status: $statusStore }}
    {launch_params}
    status={$statusStore}
  />
  {#if static_preview && $statusStore.offer_local}
    <button
      title={t("t_navigate_to_previous_page")}
      on:click={() => history.back()}
      class="floating_back_button"
    >
      <span></span>
    </button>
  {/if}
  
  <Scroller active={scroller} />
  <ProgressBar {notebook} {backend_launch_phase} status={$statusStore} />
  
  <header id="pluto-nav" class:show_export={export_menu_open}>
    <ExportBanner
      notebook_id={notebook.notebook_id}
      print_title={notebook.metadata?.frontmatter?.title ??
        new URLSearchParams(window.location.search).get("name") ??
        notebook.shortpath}
      notebookfile_url={export_url("notebookfile")}
      notebookexport_url={export_url("notebookexport")}
      open={export_menu_open}
      onClose={handleExportMenuToggle}
      start_recording={handleRecordingStart}
    />
    
    {#if $statusStore.binder}
      <div id="binder_spinners">
        <binder-spinner id="ring_1"></binder-spinner>
        <binder-spinner id="ring_2"></binder-spinner>
        <binder-spinner id="ring_3"></binder-spinner>
      </div>
    {/if}
    
    <nav id="at_the_top">
      <a href={binder_session_url != null 
        ? `${binder_session_url}?token=${binder_session_token}` 
        : "./"}>
        <h1>
          <img id="logo-big" src={get_included_external_source("pluto-logo-big")?.href} alt="Pluto.jl" />
          <img id="logo-small" src={get_included_external_source("pluto-logo-small")?.href} />
        </h1>
      </a>
      
      {#if $editorStore.extended_components.CustomHeader}
        <svelte:component this={$editorStore.extended_components.CustomHeader} 
          notebook_id={notebook.notebook_id} />
      {/if}
      
      <div class="flex_grow_1"></div>
      
      {#if $editorStore.extended_components.CustomHeader == null}
        {#if $statusStore.binder}
          <pluto-filepicker>
            <a href={export_url("notebookfile")} target="_blank">{t("t_save_notebook_ellipsis")}</a>
          </pluto-filepicker>
        {:else}
          <FilePicker
            {client}
            value={notebook.in_temp_dir ? "" : notebook.path}
            on_submit={submit_file_change}
            on_desktop_submit={desktop_submit_file_change}
            clear_on_blur={true}
            suggest_new_file={{
              base: $client?.session_options?.server?.notebook_path_suggestion ?? "",
            }}
            placeholder={t("t_save_notebook_ellipsis")}
            button_label={notebook.in_temp_dir
              ? t("t_save_notebook_button_label_when_currently_not_saved")
              : t("t_save_notebook_button_label_when_currently_saved")}
          />
        {/if}
      {/if}
      
      <div class="flex_grow_2"></div>
      
      <div id="process_status">
        {#if $statusStore.binder && $statusStore.loading}
          {t("t_process_status_loading_binder")}
        {:else if statusval === "disconnected"}
          {t("t_process_status_reconnecting")}
        {:else if statusval === "loading"}
          {t("t_process_status_loading")}
        {:else if statusval === "nbpkg_restart_required"}
          {@html th("t_process_restart_action_required", { restart_notebook: restart_button(t("t_process_restart_action")) })}
        {:else if statusval === "nbpkg_restart_recommended"}
          {@html th("t_process_restart_action_recommended", { restart_notebook: restart_button(t("t_process_restart_action")) })}
        {:else if statusval === "process_restarting"}
          {@html th("t_process_restarting")}
        {:else if statusval === "process_dead"}
          {@html th("t_process_exited_restart_action", { restart_action_short: restart_button(t("t_process_restart_action_short")) })}
        {:else if statusval === "process_waiting_for_permission"}
          {@html restart_button(t("t_process_give_permission_to_run_code"), true)}
        {/if}
      </div>
      
      <button class="toggle_export" title={t("t_export_action_ellipsis")} on:click={handleExportMenuToggle}>
        <span></span>
      </button>
    </nav>
  </header>
  
  <SafePreviewUI
    process_waiting_for_permission={$statusStore.process_waiting_for_permission}
    risky_file_source={notebook.metadata?.risky_file_source}
    {restart}
    warn_about_untrusted_code={$statusStore.sanitize_html}
  />
  
  <RecordingUI 
    notebook_name={notebook.shortpath}
    recording_waiting_to_start={recording_waiting_to_start}
    set_recording_states={handleRecordingStates}
    {is_recording}
    {patch_listeners}
    {export_url}
  />
  
  <RecordingPlaybackUI 
    {launch_params}
    {initializing}
    {apply_notebook_patches}
    reset_notebook_state={handleNotebookReset}
  />
  
  <ViewCodeOrLaunchBackendButtons {actions} {launch_params} status={$statusStore} />
  
  <FrontMatterInput
    filename={notebook.shortpath}
    remote_frontmatter={notebook.metadata?.frontmatter} 
    set_remote_frontmatter={handleFrontmatterChange}
  />
  
  <PlutoLandUpload
    notebook_id={notebook.notebook_id}
    notebookexport_url={export_url("notebookexport")}
  />
  
  <div class="main-content">
    <Preamble
      last_update_time={$editorStore.last_update_time}
      any_code_differs={$statusStore.code_differs}
      last_hot_reload_time={notebook.last_hot_reload_time}
      {connected}
    />
    
    <Notebook
    {notebook}
    cell_inputs_local={$editorStore.cell_inputs_local}
    disable_input={disable_ui || !connected}
    last_created_cell={$editorStore.last_created_cell}
    {selected_cells}
    is_initializing={initializing}
    {inspecting_hidden_code}
    is_process_ready={() => notebook.process_status === ProcessStatus.ready}
    process_waiting_for_permission={$statusStore.process_waiting_for_permission}
    sanitize_html={$statusStore.sanitize_html}
    onCellSelection={handleCellSelection}
  />
    
    <DropRuler
      {actions}
      {selected_cells}
      set_scroller={handleScrollerChange}
      {serialize_selected}
      {pluto_editor_element}
    />
    
    <NonCellOutput 
      notebook_id={notebook.notebook_id} 
      environment_component={$editorStore.extended_components.NonCellOutputComponents} 
    />
  </div>
  
  {#if !disable_ui}
    <SelectionArea
      cell_order={notebook.cell_order}
      set_scroller={handleScrollerChange}
      on_selection={handleSelectionChange}
    />
  {/if}
  
  <BottomRightPanel
    {desired_doc_query}
    on_update_doc_query={(query) => actions?.set_doc_query?.(query)}
    {connected}
    {backend_launch_phase}
    {backend_launch_logs}
    {notebook}
  />
  
  <div id="processes">
    <div id="processes-title">
      <button on:click={() => actions?.set_doc_query?.("")} class="toggle-docs">
        <span></span>
      </button>
      <h1>{t("t_processes")}</h1>
      <button on:click={() => {}} class="help" title={t("t_shortcut_help")}>
        <span></span>
      </button>
    </div>
    <BottomRightPanel
      {desired_doc_query}
      on_update_doc_query={(query) => actions?.set_doc_query?.(query)}
      {connected}
      {backend_launch_phase}
      {backend_launch_logs}
      {notebook}
    />
  </div>

  <!-- 最近删除的单元格撤销 -->
  {#if show_undo_delete}
    <RecentlyDisabledInfo {notebook} recently_auto_disabled_cells={recently_deleted}>
      <UndoDelete onClick={handleUndoDelete} />
    </RecentlyDisabledInfo>
  {/if}
  
  <!-- 最近自动禁用的单元格 -->
  {#if show_recently_disabled}
    <RecentlyDisabledInfo {notebook} {recently_auto_disabled_cells}>
      <button class="enable_disabled_cells" on:click={handleRecentlyDisabled}>
        {t("t_enable_disabled_cells")}
      </button>
    </RecentlyDisabledInfo>
  {/if}
  
  <!-- 幻灯片控制 -->
  {#if show_slide_controls}
    <SlideControls {notebook} {actions} />
  {/if}
  
  <footer>
    <LanguagePicker
      {client}
      value={getCurrentLanguage()}
      on_change={(lang) => {
        // 语言切换实现
        console.warn("Language change not implemented")
      }}
    />
    
    <a href="https://github.com/fonsp/Pluto.jl/wiki" target="_blank">{t("t_help")}</a>
    <a href="https://github.com/fonsp/Pluto.jl/issues" target="_blank">{t("t_feedback")}</a>
    
    {#if $statusStore.code_differs}
      <span id="unsaved_changes">{t("t_unsaved_changes_indicator")}</span>
    {/if}
  </footer>
  
  <!-- 底部信息栏 - 与原始Editor.js保持一致 -->
  <div id="info">
    <div id="info-left">
      <span id="notebook_id">{notebook.notebook_id}</span>
      <span id="process_status">{statusval}</span>
    </div>
    <div id="info-right">
      <span id="notebook_path">{notebook.path}</span>
      <span id="notebook_save_status">{notebook.last_save_time ? new Date(notebook.last_save_time).toLocaleString() : "未保存"}</span>
    </div>
  </div>
  
  <Popup />
</main>

<style>
  .pluto-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  
  .main-content {
    display: block;
    min-height: calc(100vh - 60px);
    padding-bottom: 2rem;
  }
  
  :global(#pluto-nav) {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--main-bg-color, white);
    border-bottom: 1px solid var(--nav-border-color, #e0e0e0);
  }
  
  :global(#at_the_top) {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    gap: 1rem;
  }
  
  :global(.flex_grow_1) {
    flex-grow: 1;
  }
  
  :global(.flex_grow_2) {
    flex-grow: 2;
  }
  
  :global(.floating_back_button) {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 1000;
    background: var(--button-bg, #f0f0f0);
    border: 1px solid var(--button-border, #ccc);
    border-radius: 4px;
    padding: 0.5rem;
    cursor: pointer;
  }
  
  :global(#process_status) {
    font-size: 0.9rem;
    color: var(--status-text-color, #666);
  }
  
  :global(.toggle_export) {
    background: none;
    border: 1px solid var(--button-border, #ccc);
    border-radius: 4px;
    padding: 0.5rem;
    cursor: pointer;
  }
  
  :global(#processes) {
    position: fixed;
    right: 0;
    top: 60px;
    bottom: 0;
    width: 300px;
    background: var(--processes-bg, #f8f8f8);
    border-left: 1px solid var(--border-color, #e0e0e0);
    overflow-y: auto;
  }
  
  :global(#processes-title) {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }
  
  /* 底部信息栏样式 - 与原始Editor.js保持一致 */
  :global(#info) {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border-top: 1px solid #dee2e6;
    font-size: 0.875rem;
    color: #6c757d;
  }
  
  :global(#info-left) {
    display: flex;
    gap: 1rem;
  }
  
  :global(#info-right) {
    display: flex;
    gap: 1rem;
  }
  
  :global(#notebook_id) {
    font-family: monospace;
  }
  
  :global(#notebook_path) {
    font-family: monospace;
  }
  
  /* 启用禁用单元格按钮样式 */
  :global(.enable_disabled_cells) {
    background: #28a745;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  
  :global(.enable_disabled_cells:hover) {
    background: #218838;
  }
  
  :global(footer) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--footer-bg, #f8f8f8);
    border-top: 1px solid var(--border-color, #e0e0e0);
    gap: 1rem;
  }
  
  :global(#unsaved_changes) {
    color: var(--warning-color, #ff6b6b);
    font-weight: bold;
  }
</style>