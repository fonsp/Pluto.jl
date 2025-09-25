#!/usr/bin/env node

/**
 * Preact到Svelte组件迁移脚本
 * 使用方法: node migrate-component.js <input-file> <output-file>
 */

const fs = require('fs');
const path = require('path');

// 迁移规则定义
const migrationRules = [
  {
    name: '导入语句转换',
    pattern: /import\s+{\s*([^}]+)\s*}\s+from\s+["']\.\.\/imports\/Preact\.js["']/g,
    replacement: (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const svelteImports = [];
      
      if (importList.includes('html')) {
        // html模板转换为Svelte模板
        return '<!-- HTML模板已转换为Svelte模板 -->';
      }
      
      if (importList.some(imp => ['useState', 'useEffect', 'useRef'].includes(imp))) {
        svelteImports.push('import { onMount, onDestroy, createEventDispatcher } from "svelte";');
      }
      
      return svelteImports.join('\n');
    }
  },
  {
    name: 'useState转换',
    pattern: /const\s*\[([^,]+),\s*([^\]]+)\]\s*=\s*useState\(([^)]*)\)/g,
    replacement: 'let $1 = $3;\n  // 使用$: $1 = newValue; 进行响应式更新'
  },
  {
    name: 'useEffect转换',
    pattern: /useEffect\(\(\)\s*=>\s*{([^}]*)}(?:,\s*\[([^\]]*)\])?\)/g,
    replacement: (match, effectBody, deps) => {
      if (deps && deps.trim()) {
        return `$: { ${effectBody} } // 依赖: ${deps}`;
      } else {
        return `onMount(() => { ${effectBody} });`;
      }
    }
  },
  {
    name: '函数组件转换',
    pattern: /export\s+const\s+(\w+)\s*=\s*\(({[^}]*)\}\)\s*=>\s*{([^}]*)}/g,
    replacement: (match, componentName, props, componentBody) => {
      return `<script>\n  export ${props}\n  \n  ${componentBody}\n</script>\n\n<div class="${componentName.toLowerCase()}-component">\n  <!-- 组件模板 -->\n</div>`;
    }
  },
  {
    name: 'Props解构',
    pattern: /const\s*{([^}]+)}\s*=\s*props/g,
    replacement: '// Props已在<script>标签中声明'
  }
];

// 特殊组件处理
const specialComponents = {
  'Cell.js': {
    additionalImports: [
      'import CellInput from "./CellInput.svelte";',
      'import CellOutput from "./CellOutput.svelte";',
      'import { notebookStore, uiStore } from "../stores/core.js";'
    ],
    specialTransforms: [
      {
        pattern: /useContext\(PlutoActionsContext\)/g,
        replacement: 'plutoActions'
      }
    ]
  },
  'Editor.js': {
    additionalImports: [
      'import { notebookStore, connectionStore } from "../stores/core.js";',
      'import Notebook from "./Notebook.svelte";'
    ]
  }
};

class ComponentMigrator {
  constructor(inputFile, outputFile) {
    this.inputFile = inputFile;
    this.outputFile = outputFile;
    this.componentName = path.basename(inputFile, '.js');
    this.content = '';
    this.migratedContent = '';
  }

  async readFile() {
    try {
      this.content = fs.readFileSync(this.inputFile, 'utf8');
      console.log(`✅ 读取文件: ${this.inputFile}`);
    } catch (error) {
      console.error(`❌ 读取文件失败: ${error.message}`);
      process.exit(1);
    }
  }

  applyMigrationRules() {
    this.migratedContent = this.content;

    console.log('🔧 应用迁移规则...');
    
    migrationRules.forEach(rule => {
      console.log(`  📋 应用规则: ${rule.name}`);
      this.migratedContent = this.migratedContent.replace(
        rule.pattern, 
        rule.replacement
      );
    });

    // 应用特殊组件规则
    if (specialComponents[this.componentName]) {
      console.log(`  🎯 应用特殊组件规则: ${this.componentName}`);
      const special = specialComponents[this.componentName];
      
      if (special.additionalImports) {
        this.addImports(special.additionalImports);
      }
      
      if (special.specialTransforms) {
        special.specialTransforms.forEach(transform => {
          this.migratedContent = this.migratedContent.replace(
            transform.pattern,
            transform.replacement
          );
        });
      }
    }
  }

  addImports(imports) {
    const importSection = imports.join('\n');
    this.migratedContent = importSection + '\n\n' + this.migratedContent;
  }

  generateSvelteComponent() {
    // 提取组件逻辑
    const scriptMatch = this.migratedContent.match(/<script>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch ? scriptMatch[1] : '';
    
    // 生成完整的Svelte组件
    const svelteComponent = `<!-- 
  迁移自: ${this.inputFile}
  迁移时间: ${new Date().toISOString()}
  状态: 需要手动审查和调整
-->

<script>
  // 导入语句
  ${this.generateImports()}
  
  // Props定义
  ${this.generateProps()}
  
  // 状态变量
  ${this.generateStateVariables()}
  
  // 生命周期函数
  ${this.generateLifecycleFunctions()}
  
  // 事件处理函数
  ${this.generateEventHandlers()}
  
  // 派生状态
  ${this.generateDerivedState()}
</script>

<!-- 组件模板 -->
<div class="${this.componentName.toLowerCase()}-container">
  <!-- TODO: 手动添加模板内容 -->
  <slot />
</div>

<style>
  .${this.componentName.toLowerCase()}-container {
    /* TODO: 添加样式 */
  }
</style>
`;

    this.migratedContent = svelteComponent;
  }

  generateImports() {
    const imports = [
      'import { onMount, onDestroy, createEventDispatcher } from "svelte";',
      'import { fade, slide } from "svelte/transition";',
      'import { notebookStore, uiStore } from "../stores/core.js";'
    ];
    
    return imports.join('\n');
  }

  generateProps() {
    // 从原始代码中提取props
    const propsMatch = this.content.match(/export\s+const\s+\w+\s*=\s*\(({[^}]+})\)/);
    if (propsMatch) {
      return `export let ${propsMatch[1].replace(/\{/g, '').replace(/\}/g, '').replace(/,/g, ';\n  export let ')};`;
    }
    return '// Props需要手动提取';
  }

  generateStateVariables() {
    return `// 状态变量需要手动从useState转换
  // 示例: let count = 0;`;
  }

  generateLifecycleFunctions() {
    return `onMount(() => {
    // 组件挂载逻辑
    console.log('${this.componentName} component mounted');
  });

  onDestroy(() => {
    // 组件卸载逻辑
    console.log('${this.componentName} component destroyed');
  });`;
  }

  generateEventHandlers() {
    return `// 事件处理函数需要手动转换
  function handleClick(event) {
    // TODO: 实现点击处理
  }`;
  }

  generateDerivedState() {
    return `// 派生状态需要手动从useMemo/useEffect转换
  // 示例: $: doubled = count * 2;`;
  }

  async writeFile() {
    try {
      // 确保输出目录存在
      const outputDir = path.dirname(this.outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(this.outputFile, this.migratedContent);
      console.log(`✅ 写入文件: ${this.outputFile}`);
    } catch (error) {
      console.error(`❌ 写入文件失败: ${error.message}`);
      process.exit(1);
    }
  }

  generateReport() {
    const report = `
迁移报告
========

源文件: ${this.inputFile}
目标文件: ${this.outputFile}
组件名称: ${this.componentName}
迁移时间: ${new Date().toISOString()}

迁移状态:
- ✅ 基础语法转换
- ⚠️  需要手动审查
- ⚠️  需要手动测试

下一步:
1. 审查生成的Svelte组件
2. 手动调整模板部分
3. 转换状态管理逻辑
4. 更新事件处理
5. 运行测试验证
6. 更新样式

注意事项:
- 检查Props定义是否正确
- 验证状态变量的响应式更新
- 确保事件处理逻辑正确
- 测试组件的所有功能
- 检查性能表现
`;

    const reportFile = this.outputFile.replace('.svelte', '-migration-report.txt');
    fs.writeFileSync(reportFile, report);
    console.log(`✅ 生成迁移报告: ${reportFile}`);
  }

  async migrate() {
    console.log(`🚀 开始迁移: ${this.inputFile}`);
    
    await this.readFile();
    this.applyMigrationRules();
    this.generateSvelteComponent();
    await this.writeFile();
    this.generateReport();
    
    console.log('✅ 迁移完成！');
    console.log('⚠️  请注意：生成的代码需要手动审查和调整');
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('使用方法: node migrate-component.js <input-file> <output-file>');
    console.log('示例: node migrate-component.js frontend/components/Cell.js frontend/svelte-components/Cell.svelte');
    process.exit(1);
  }
  
  const [inputFile, outputFile] = args;
  
  // 验证输入文件存在
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 输入文件不存在: ${inputFile}`);
    process.exit(1);
  }
  
  // 验证是JavaScript文件
  if (!inputFile.endsWith('.js')) {
    console.error('❌ 输入文件必须是.js文件');
    process.exit(1);
  }
  
  // 验证输出文件是.svelte文件
  if (!outputFile.endsWith('.svelte')) {
    console.error('❌ 输出文件必须是.svelte文件');
    process.exit(1);
  }
  
  const migrator = new ComponentMigrator(inputFile, outputFile);
  await migrator.migrate();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComponentMigrator, migrationRules };