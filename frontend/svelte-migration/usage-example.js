// 示例：如何使用改进的 Svelte 状态管理系统

import { onMount } from 'svelte'
import { 
  createEditorStore, 
  createStatusStore, 
  createCellStore, 
  createActionsStore,
  createUIStore
} from './editor-stores.js'

// 创建状态管理实例
const editorStore = createEditorStore(launch_params, initial_notebook_state)
const statusStore = createStatusStore(editorStore, launch_params)
const cellStore = createCellStore(editorStore)
const uiStore = createUIStore(editorStore)

// 在组件中使用
export default {
  setup() {
    // 订阅状态变化
    const unsubscribe = editorStore.subscribe(state => {
      console.log('Editor state changed:', state)
    })
    
    // 使用派生状态
    const isConnected = statusStore.derived(s => s.connected)
    
    return {
      // 暴露给模板
      editorStore,
      statusStore,
      cellStore,
      uiStore,
      isConnected
    }
  },
  
  onDestroy() {
    // 清理订阅
    unsubscribe()
  }
}

// 在 Svelte 组件中的使用示例
<script>
  import { getContext } from 'svelte'
  
  // 从上下文中获取状态
  const actions = getContext('plutoActions')
  const notebook = getContext('plutoNotebook')
  const status = getContext('plutoStatus')
  
  // 使用动作
  function handleCellUpdate(cellId, newCode) {
    actions?.set_local_cell?.(cellId, newCode)
  }
  
  // 使用派生状态
  $: isConnected = $status.connected
  $: selectedCells = $notebook.selected_cells
</script>

<div>
  {#if isConnected}
    <p>Connected to server</p>
  {:else}
    <p>Reconnecting...</p>
  {/if}
  
  <p>Selected cells: {selectedCells.length}</p>
</div>