# Preact到Svelte依赖分析

## 当前Preact依赖分析

### 核心框架依赖
| Preact依赖 | Svelte替代方案 | 状态 | 说明 |
|-----------|--------------|------|------|
| `preact` | `svelte` | ✅ 已配置 | Svelte核心框架，已通过Vite配置 |
| `preact/hooks` | `svelte` | ✅ 已配置 | Svelte内置响应式系统，无需单独hooks包 |
| `preact/compat` | 无需 | ✅ 已移除 | Svelte不需要React兼容层 |

### 状态管理依赖
| Preact依赖 | Svelte替代方案 | 状态 | 说明 |
|-----------|--------------|------|------|
| `createContext` | `writable`/`readable` stores | ✅ 已创建 | 使用Svelte Store替代Context API |
| `useContext` | `getContext`或直接store订阅 | ✅ 已创建 | Svelte提供更简洁的store订阅模式 |
| `useState` | `writable` store | ✅ 已创建 | 使用writable store管理组件状态 |
| `useEffect` | `$:` 响应式语句或`onMount` | ✅ 已创建 | Svelte响应式系统自动处理副作用 |
| `useMemo` | `derived` store | ✅ 已创建 | 使用derived store进行计算缓存 |
| `useCallback` | 普通函数 | ✅ 已优化 | Svelte不需要useCallback优化 |

### 工具库依赖
| 工具库 | 状态 | 说明 |
|--------|------|------|
| `lodash-es` | ✅ 兼容 | 与Svelte完全兼容，无需修改 |
| `immer` | ✅ 兼容 | 与Svelte完全兼容，无需修改 |
| `htm` | ❌ 待替换 | Preact专用的JSX模板库，需要替换 |

### 生命周期和事件
| Preact依赖 | Svelte替代方案 | 状态 | 说明 |
|-----------|--------------|------|------|
| `useEffect` | `onMount`, `beforeUpdate`, `afterUpdate` | ✅ 已创建 | Svelte提供更细粒度的生命周期控制 |
| `useLayoutEffect` | `beforeUpdate` | ✅ 已配置 | Svelte的beforeUpdate等价于useLayoutEffect |
| `useRef` | `bind:this` | ✅ 已配置 | Svelte使用模板引用替代useRef |
| `useEventListener` | `createEventDispatcher` | ✅ 已创建 | Svelte提供事件派发机制 |

## 已创建的替代方案

### 1. Svelte Store系统 (`frontend/stores/plutoStores.js`)
- ✅ 核心应用状态存储 (plutoActions, plutoBonds)
- ✅ UI状态存储 (isLoading, notebookTitle)
- ✅ 连接状态存储
- ✅ 用户偏好存储
- ✅ 计算状态存储 (hasUnsavedChanges)
- ✅ 辅助函数 (updateCell, addCell等)
- ✅ SetWithEmptyCallback类实现

### 2. 组件转换示例
- ✅ `HelloSvelte.svelte` - 基础组件示例
- ✅ `Popup.svelte` - 复杂交互组件转换
- ✅ 生命周期管理转换
- ✅ 状态管理转换
- ✅ 事件处理转换

### 3. 导入系统
- ✅ `frontend/imports/Svelte.js` - Svelte核心功能导入
- ✅ 本地npm包导入配置
- ✅ 工具函数导入 (produce, debounce等)

## 待处理依赖

### 高优先级
1. **htm库替换**
   - 当前用于JSX模板
   - 需要转换为Svelte模板语法
   - 影响所有组件模板部分

2. **第三方UI库**
   - 检查是否有Preact专用的UI库
   - 寻找Svelte等价库或自定义实现

### 中优先级
1. **路由系统**
   - 如果有Preact路由依赖
   - 考虑使用SvelteKit或独立路由库

2. **表单处理**
   - 检查表单相关依赖
   - 评估Svelte表单库选项

### 低优先级
1. **动画库**
   - 如果有Preact动画库
   - Svelte内置transition支持

## 兼容性评估

### ✅ 完全兼容
- Lodash工具函数
- Immer不可变更新
- 原生JavaScript功能
- CSS样式和主题

### ⚠️ 需要适配
- Context API → Store系统
- JSX模板 → Svelte模板
- 组件生命周期
- 事件处理机制

### ❌ 需要重写
- 使用htm的模板部分
- Preact特定的优化
- React生态系统依赖

## 下一步计划

1. **完成基础组件迁移**
   - 转换更多简单组件
   - 验证Store系统功能
   - 完善测试覆盖

2. **处理htm模板**
   - 分析htm使用模式
   - 创建模板转换工具
   - 批量转换组件模板

3. **集成测试**
   - 测试Store间通信
   - 验证组件交互
   - 性能基准测试

4. **文档完善**
   - 编写迁移指南
   - 更新开发文档
   - 培训材料准备