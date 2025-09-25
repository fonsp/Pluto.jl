# Preact到Svelte迁移工具集

这个目录包含了将Pluto.jl前端从Preact迁移到Svelte的自动化工具集。

## 🚀 快速开始

### 1. 分析当前代码结构
```bash
# 分析所有组件并生成迁移计划
node batch-migrate.js --plan-only --verbose

# 分析特定目录
node batch-migrate.js --input-dir frontend/components --plan-only
```

### 2. 创建Svelte Store
```bash
# 创建所有基础store
node create-svelte-store.js notebook

# 创建特定类型的store
node create-svelte-store.js ui
node create-svelte-store.js connection
node create-svelte-store.js preferences
```

### 3. 迁移单个组件
```bash
# 迁移Cell组件
node migrate-component.js frontend/components/Cell.js frontend/svelte-components/Cell.svelte

# 迁移Editor组件
node migrate-component.js frontend/components/Editor.js frontend/svelte-components/Editor.svelte
```

### 4. 批量迁移组件
```bash
# 迁移所有组件（试运行）
node batch-migrate.js --dry-run

# 迁移所有组件（正式执行）
node batch-migrate.js

# 迁移特定模式的组件
node batch-migrate.js --include "Cell*" --include "Notebook*"

# 排除测试文件
node batch-migrate.js --exclude "*Test.js" --exclude "*Mock.js"
```

## 📋 可用脚本

### migrate-component.js
迁移单个Preact组件到Svelte。

**用法:**
```bash
node migrate-component.js <输入文件> <输出文件>
```

**功能:**
- 自动转换Preact语法到Svelte语法
- 处理useState、useEffect等hooks
- 转换组件结构
- 生成迁移报告

### create-svelte-store.js
创建Svelte Store来替代Preact的Context。

**用法:**
```bash
node create-svelte-store.js <store名称> [context文件]
```

**功能:**
- 生成基础store结构
- 创建常用store（ui、notebook、connection、preferences）
- 提供store索引文件
- 包含最佳实践示例

### batch-migrate.js
批量分析和迁移组件。

**用法:**
```bash
node batch-migrate.js [选项]
```

**选项:**
- `--input-dir <路径>`: 输入目录 (默认: frontend/components)
- `--output-dir <路径>`: 输出目录 (默认: frontend/svelte-components)
- `--pattern <模式>`: 文件匹配模式 (默认: *.js)
- `--exclude <模式>`: 排除的文件模式
- `--include <模式>`: 包含的文件模式
- `--dry-run`: 试运行，不实际迁移文件
- `--verbose`: 显示详细日志
- `--plan-only`: 只生成迁移计划
- `--force`: 覆盖已存在的文件

**功能:**
- 自动分析组件复杂度
- 生成迁移计划
- 批量执行迁移
- 生成详细报告

## 📊 组件复杂度分类

工具会自动分析组件复杂度并分类：

### 🔵 简单组件 (Simple)
- 静态展示组件
- 无状态组件
- 基本交互组件
- 示例: Button、Icon、Loading

### 🟡 中等复杂度 (Medium)
- 有状态组件
- 使用useState/useEffect
- 简单业务逻辑
- 示例: Modal、Dropdown、Tooltip

### 🟠 复杂组件 (Complex)
- 复杂状态管理
- 多个hooks组合
- 复杂交互逻辑
- 示例: CellInput、CellOutput、FilePicker

### 🔴 核心组件 (Critical)
- 核心业务逻辑
- 关键功能组件
- 需要特殊处理
- 示例: Cell、Editor、Notebook

## 📁 输出结构

迁移后的文件结构：
```
frontend/
├── svelte-components/          # 迁移后的Svelte组件
│   ├── Cell.svelte
│   ├── Editor.svelte
│   └── ...
├── stores/                     # Svelte Store
│   ├── index.js               # Store索引
│   ├── ui.js                  # UI状态store
│   ├── notebook.js            # Notebook状态store
│   ├── connection.js          # 连接状态store
│   ├── preferences.js         # 用户偏好store
│   └── ...
└── migration-reports/          # 迁移报告
    ├── migration-report.json
    └── migration-report.md
```

## 🔧 迁移规则

### 语法转换
- `useState` → `let` 变量声明 + `$:` 响应式语句
- `useEffect` → `onMount` / `onDestroy` / `$:` 响应式语句
- `useContext` → Store订阅或Context API
- `props` → `export let` 声明
- `html\`...\`` → Svelte模板语法

### 组件结构
- 函数组件 → Svelte组件文件
- JSX语法 → Svelte模板语法
- 事件处理 → Svelte事件语法
- 样式处理 → `<style>` 标签

### 状态管理
- Context → Svelte Store
- 本地状态 → 组件内变量
- 全局状态 → 共享Store
- 派生状态 → `derived` store

## ⚠️ 注意事项

### 自动迁移的限制
1. **需要手动调整的部分:**
   - 复杂的业务逻辑
   - 特定的交互模式
   - 性能优化逻辑
   - 样式和动画

2. **必须手动处理的部分:**
   - WebSocket连接逻辑
   - 特定的第三方库集成
   - 复杂的状态同步
   - 错误处理边界

### 迁移后的工作
1. **代码审查:** 检查每个迁移的组件
2. **功能测试:** 验证所有功能正常
3. **性能优化:** 优化渲染性能
4. **样式调整:** 确保UI一致性
5. **文档更新:** 更新相关文档

## 🐛 故障排除

### 常见问题

**Q: 迁移后的组件无法工作？**
A: 检查以下方面：
- Props定义是否正确
- 事件处理语法是否正确
- Store订阅是否正确
- 导入路径是否正确

**Q: 状态管理出现问题？**
A: 确保：
- Store正确初始化
- 响应式语句正确使用
- 组件正确订阅store
- 状态更新逻辑正确

**Q: 样式丢失或错乱？**
A: 检查：
- CSS类名是否正确
- 样式作用域是否正确
- 全局样式是否导入
- 响应式设计是否正常

### 调试技巧
1. 使用`--verbose`选项查看详细日志
2. 使用`--dry-run`选项先进行试运行
3. 检查生成的迁移报告
4. 对比原始组件和迁移后的组件
5. 逐步验证每个功能点

## 📚 相关资源

- [Svelte官方文档](https://svelte.dev/docs)
- [Svelte教程](https://svelte.dev/tutorial)
- [迁移指南](../SvelteMigrationGuide.md)
- [检查清单](migration-checklist.md)

## 🤝 贡献

如果您发现了问题或有改进建议，请：
1. 创建GitHub Issue
2. 提交Pull Request
3. 联系开发团队

---

**最后更新**: $(date)
**版本**: v1.0.0