# Svelte 状态管理 vs Preact 状态管理对比

## 主要区别

### 1. 状态更新机制

**Preact (类组件):**
```javascript
// 使用 setState 更新状态
this.setState({ 
  notebook: newNotebook,
  selected_cells: newSelectedCells 
})

// 状态合并是浅层的
this.setState(prevState => ({
  ...prevState,
  notebook: { ...prevState.notebook, newField: value }
}))
```

**Svelte (Stores):**
```javascript
// 使用 update 方法更新状态
editorStore.update(state => ({
  ...state,
  notebook: newNotebook,
  selected_cells: newSelectedCells
}))

// 使用 immer 进行不可变更新
import { produce } from 'immer'
editorStore.update(state => produce(state, draft => {
  draft.notebook.newField = value
  draft.selected_cells = newSelectedCells
}))
```

### 2. 状态派生

**Preact:**
```javascript
// 在 render 中计算派生状态
render() {
  const { notebook, selected_cells } = this.state
  const hasSelectedCells = selected_cells.length > 0
  const isConnected = this.state.connected
  // ...
}
```

**Svelte:**
```javascript
// 使用 derived 创建派生状态
export const hasSelectedCellsStore = derived(
  editorStore,
  $editor => $editor.selected_cells.length > 0
)

export const isConnectedStore = derived(
  statusStore,
  $status => $status.connected
)

// 在组件中使用
$: hasSelected = $hasSelectedCellsStore
$: isConnected = $isConnectedStore
```

### 3. 组件间状态共享

**Preact (Context):**
```javascript
// 提供上下文
<PlutoActionsContext.Provider value={this.real_actions}>
  <PlutoBondsContext.Provider value={this.bonds}>
    {/* 子组件 */}
  </PlutoBondsContext.Provider>
</PlutoActionsContext.Provider>

// 消费上下文
static contextType = PlutoActionsContext
```

**Svelte (Context):**
```javascript
// 设置上下文
setContext('plutoActions', actions)
setContext('plutoNotebook', { subscribe: editorStore.subscribe })

// 获取上下文
const actions = getContext('plutoActions')
const notebook = getContext('plutoNotebook')
```

### 4. 生命周期管理

**Preact:**
```javascript
componentDidMount() {
  // 初始化逻辑
}

componentWillUnmount() {
  // 清理逻辑
}
```

**Svelte:**
```javascript
onMount(() => {
  // 初始化逻辑
  return () => {
    // 清理逻辑（可选）
  }
})

onDestroy(() => {
  // 清理逻辑
})
```

### 5. 事件处理

**Preact:**
```javascript
// 类方法作为事件处理器
handleExportMenuToggle = () => {
  this.setState({ export_menu_open: !this.state.export_menu_open })
}

<button onClick={this.handleExportMenuToggle}>Export</button>
```

**Svelte:**
```javascript
// 函数作为事件处理器
function handleExportMenuToggle() {
  editorStore.update(state => ({
    ...state,
    export_menu_open: !state.export_menu_open
  }))
}

<button on:click={handleExportMenuToggle}>Export</button>
```

## 优势对比

### Svelte 状态管理的优势

1. **更简洁的语法**: 不需要 `this.setState()`，直接更新 store
2. **更好的性能**: 编译时优化，减少运行时开销
3. **更清晰的依赖关系**: 使用派生状态明确表达依赖
4. **更好的 TypeScript 支持**: Store 可以有明确的类型定义
5. **更灵活的组合**: 可以轻松地组合多个 store

### 迁移注意事项

1. **状态结构**: 保持与原始 Preact 组件相同的状态结构
2. **异步操作**: 使用 async/await 而不是 Promise.then
3. **错误处理**: 添加适当的错误边界和状态恢复
4. **性能优化**: 使用派生状态避免不必要的重新计算
5. **测试**: 确保状态管理逻辑有适当的测试覆盖

## 最佳实践

1. **使用派生状态**: 避免在组件中重复计算
2. **保持不可变性**: 使用 immer 或其他不可变更新库
3. **合理划分 Store**: 按功能模块划分不同的 store
4. **添加类型定义**: 为 store 和状态结构添加 TypeScript 类型
5. **使用上下文**: 避免 props drilling