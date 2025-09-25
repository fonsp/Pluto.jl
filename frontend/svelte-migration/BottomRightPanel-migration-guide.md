# BottomRightPanel 组件迁移指南

## 概述

本指南记录了将 BottomRightPanel 组件从 Preact 迁移到 Svelte 的过程，包括主要变化、状态管理转换和最佳实践。

## 迁移文件

### 主要组件
- `BottomRightPanel.js` → `BottomRightPanel.svelte`
- `LiveDocsTab.js` → `LiveDocsTab.svelte` 
- `StatusTab.js` → `StatusTab.svelte`
- `DiscreteProgressBar.js` → `DiscreteProgressBar.svelte`
- `PkgTerminalView.js` → `PkgTerminalView.svelte`

## 主要变化

### 1. 状态管理

#### Preact (类组件)
```javascript
export class BottomRightPanel extends Component {
  constructor() {
    this.state = {
      open_tab: null,
      status: null,
      show_business_outline: false,
      show_business_counter: false,
      my_clock_is_ahead_by: 0
    }
  }
}
```

#### Svelte (响应式)
```svelte
<script>
  let open_tab = null
  let status = null
  let show_business_outline = false
  let show_business_counter = false
  let my_clock_is_ahead_by = 0
  
  // 派生状态
  $: hidden = open_tab == null
  $: status = useWithBackendStatus(notebook, backend_launch_phase)
  $: [status_total, status_done] = calculateStatusProgress(status)
  $: busy = status_done < status_total
  $: show_business_outline = useDelayedTruth(busy, 700)
  $: show_business_counter = useDelayedTruth(busy, 3000)
</script>
```

### 2. 生命周期管理

#### Preact
```javascript
componentDidMount() {
  window.addEventListener('open_bottom_right_panel', this.on_open_panel)
}

componentWillUnmount() {
  window.removeEventListener('open_bottom_right_panel', this.on_open_panel)
}
```

#### Svelte
```svelte
<script>
  onMount(() => {
    window.addEventListener('open_bottom_right_panel', handleOpenPanel)
    return () => {
      window.removeEventListener('open_bottom_right_panel', handleOpenPanel)
    }
  })
</script>
```

### 3. 事件处理

#### Preact
```javascript
on_open_panel = (e) => {
  this.setState({
    focus_docs_on_open: false,
    open_tab: e.detail
  })
}
```

#### Svelte
```svelte
<script>
  const dispatch = createEventDispatcher()
  
  function handleOpenPanel(e) {
    focus_docs_on_open = false
    open_tab = e.detail
  }
</script>
```

### 4. 自定义 Hooks 转换

#### Preact Hooks
```javascript
const useDelayedTruth = (x, timeout) => {
  const [output, set_output] = useState(false)
  
  useEffect(() => {
    let timeout_id = null
    if (x) {
      timeout_id = setTimeout(() => set_output(true), timeout)
    } else {
      set_output(false)
    }
    return () => {
      if (timeout_id) clearTimeout(timeout_id)
    }
  }, [x, timeout])
  
  return output
}
```

#### Svelte 响应式
```svelte
<script>
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
</script>
```

### 5. 条件渲染

#### Preact
```javascript
render() {
  return (
    <div className={cl({ hidden: this.state.hidden })}>
      {this.state.open_tab === "docs" && <LiveDocsTab />}
      {this.state.open_tab === "process" && <StatusTab />}
    </div>
  )
}
```

#### Svelte
```svelte
<div class={cl({ hidden })}>
  {#if open_tab === "docs"}
    <LiveDocsTab />
  {:else if open_tab === "process"}
    <StatusTab />
  {/if}
</div>
```

### 6. 列表渲染

#### Preact
```javascript
render() {
  return (
    <div>
      {this.state.docs.map(doc => (
        <div key={doc.name} className="docs-item">
          <h4>{doc.name}</h4>
          <p>{doc.docstring}</p>
        </div>
      ))}
    </div>
  )
}
```

#### Svelte
```svelte
<div>
  {#each docs as doc}
    <div class="docs-item">
      <h4>{doc.name}</h4>
      <p>{doc.docstring}</p>
    </div>
  {/each}
</div>
```

## 新特性

### 1. 更好的响应式
- 自动依赖跟踪
- 简化的状态更新
- 更直观的派生状态

### 2. 性能优化
- 编译时优化
- 更小的运行时
- 更少的样板代码

### 3. 开发体验
- 更好的 TypeScript 支持
- 热重载
- 更清晰的错误信息

## 兼容性

### 与 Preact 集成
```javascript
// 使用自定义元素包装器
import BottomRightPanelSvelte from './BottomRightPanel.svelte'
import { createPreactCompatibleComponent } from './Editor-integration.js'

const BottomRightPanel = createPreactCompatibleComponent(BottomRightPanelSvelte, {
  props: ['notebook', 'desired_doc_query', 'on_update_doc_query', 'connected', 'backend_launch_phase', 'backend_launch_logs', 'sanitize_html']
})
```

### 事件系统
```javascript
// 保持与现有事件系统的兼容性
window.dispatchEvent(new CustomEvent('open_bottom_right_panel', { detail: 'docs' }))
```

## 迁移步骤

1. **创建 Svelte 组件文件** (.svelte)
2. **转换状态管理** (this.state → let/const)
3. **转换生命周期** (componentDidMount → onMount)
4. **转换事件处理** (this.method → function)
5. **转换渲染逻辑** (JSX → Svelte 模板)
6. **添加样式** (CSS → <style>)
7. **测试集成** (与现有 Preact 应用)

## 注意事项

1. **Props 传递**: Svelte 使用 `export let` 声明 props
2. **事件系统**: 使用 `createEventDispatcher` 创建自定义事件
3. **条件渲染**: 使用 `{#if}` 块而不是逻辑与运算符
4. **列表渲染**: 使用 `{#each}` 块并提供 key
5. **样式作用域**: Svelte 样式默认是作用域的

## 性能对比

| 指标 | Preact | Svelte |
|------|--------|--------|
| 包大小 | ~10KB | ~2KB |
| 运行时性能 | 好 | 优秀 |
| 内存使用 | 中等 | 低 |
| 开发体验 | 好 | 优秀 |

## 结论

BottomRightPanel 组件成功迁移到 Svelte，带来了更好的性能、更简洁的代码和更好的开发体验。新的实现保持了与现有 Preact 应用的完全兼容性，同时利用了 Svelte 的响应式优势。