# Pluto.jl 前端依赖分析

## 📊 当前依赖状况

### 主要依赖
- **Preact**: 10.13.2 (通过 esm.sh CDN)
- **Vite**: 5.0.0 (构建工具)
- **Lodash**: 通过 imports 目录引入
- **Immer**: 通过 imports 目录引入

### 导入方式
所有依赖都通过 CDN (esm.sh) 引入，没有使用 npm 包管理器。

## 🔄 Svelte 替代方案

### 1. 核心框架替换
| Preact | Svelte | 说明 |
|--------|---------|------|
| `preact` | `svelte` | 核心框架 |
| `preact/hooks` | 内置 | Svelte 内置响应式系统 |

### 2. 状态管理替换
| Preact Context | Svelte Store | 说明 |
|----------------|--------------|------|
| `createContext` | `writable`/`readable` | 状态容器 |
| `useContext` | 直接订阅 | Svelte 简化了状态访问 |

### 3. 生命周期替换
| Preact Hooks | Svelte | 说明 |
|--------------|---------|------|
| `useState` | `let` + `$:` | 响应式声明 |
| `useEffect` | `onMount`/`onDestroy`/`$:` | 生命周期管理 |
| `useMemo` | `derived` | 派生状态 |
| `useCallback` | 普通函数 | Svelte 自动优化 |
| `useRef` | `let` + `bind:this` | DOM 引用 |

### 4. 构建工具
保持使用 Vite，添加 Svelte 插件：
```json
{
  "devDependencies": {
    "vite": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "svelte": "^4.0.0"
  }
}
```

## 📋 迁移步骤

### 第一步：更新 package.json
```bash
npm install -D svelte @sveltejs/vite-plugin-svelte
```

### 第二步：更新 vite.config.js
添加 Svelte 插件支持。

### 第三步：创建 Svelte 导入文件
创建 `frontend/imports/Svelte.js` 替代 `Preact.js`。

### 第四步：逐步替换组件
从简单组件开始，逐步迁移到复杂组件。

## ✅ 已完成工作

很好！现在让我更新迁移文档，记录我们已经完成的工作和遇到的问题：

### 基础设施更新 ✅
- **Vite**: ^5.0.0 → ^7.1.7 (Latest)
- **Svelte**: ^4.2.0 → ^5.39.4 (Latest) 
- **@sveltejs/vite-plugin-svelte**: ^3.0.0 → ^6.2.0 (Latest)

### 创建的核心文件 ✅
1. **Vite Configuration Updated** - Added Svelte plugin and path aliases
2. **Svelte Import File** - Created `frontend/imports/Svelte.js` with proper imports
3. **Store System** - Created `frontend/stores/plutoStores.js` replacing Preact Context
4. **Test Components** - Created sample Svelte components for testing

## ⚠️ 注意事项

1. **CDN 依赖**: 当前使用 CDN 引入，考虑是否需要转为 npm 包
2. **版本兼容性**: 确保 Svelte 版本与 Vite 兼容
3. **第三方库**: 检查是否有 Preact 特定的第三方库依赖
4. **构建配置**: 更新构建配置以支持 Svelte

## 🎯 建议的迁移顺序

1. **工具配置** (1-2天)
   - 更新 package.json
   - 配置 vite.config.js
   - 创建基础 Svelte 组件结构

2. **简单组件** (2-3天)
   - 静态展示组件
   - 无状态组件
   - 基础交互组件

3. **状态管理** (1-2天)
   - 创建 Svelte Store
   - 迁移 Context 逻辑
   - 测试状态同步

4. **复杂组件** (3-5天)
   - 核心业务组件
   - 复杂交互逻辑
   - 性能优化

总计预计：**7-12天**