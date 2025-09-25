#!/usr/bin/env node

/**
 * 批量迁移脚本
 * 批量将Preact组件迁移到Svelte
 * 使用方法: node batch-migrate.js [选项]
 */

const fs = require('fs');
const path = require('path');
const { ComponentMigrator } = require('./migrate-component.js');

class BatchMigrator {
  constructor(options) {
    this.options = {
      inputDir: options.inputDir || 'frontend/components',
      outputDir: options.outputDir || 'frontend/svelte-components',
      pattern: options.pattern || '*.js',
      exclude: options.exclude || [],
      include: options.include || [],
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    this.migrationResults = [];
  }

  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async findComponents() {
    this.log(`搜索组件: ${this.options.inputDir}`, 'info');
    
    if (!fs.existsSync(this.options.inputDir)) {
      throw new Error(`输入目录不存在: ${this.options.inputDir}`);
    }
    
    const components = [];
    
    function walkDir(dir, basePath = '') {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          walkDir(fullPath, relativePath);
        } else if (this.shouldProcessFile(item, relativePath)) {
          components.push({
            inputPath: fullPath,
            outputPath: this.getOutputPath(relativePath),
            relativePath,
            name: path.basename(item, '.js')
          });
        }
      }, this);
    }
    
    walkDir(this.options.inputDir);
    
    this.log(`找到 ${components.length} 个组件`, 'success');
    return components;
  }

  shouldProcessFile(filename, relativePath) {
    // 检查文件扩展名
    if (!filename.endsWith('.js')) return false;
    
    // 检查排除列表
    if (this.options.exclude.some(pattern => 
      minimatch(relativePath, pattern) || 
      minimatch(filename, pattern)
    )) return false;
    
    // 如果有包含列表，检查是否匹配
    if (this.options.include.length > 0) {
      const isIncluded = this.options.include.some(pattern => 
        minimatch(relativePath, pattern) || 
        minimatch(filename, pattern)
      );
      if (!isIncluded) return false;
    }
    
    return true;
  }

  getOutputPath(relativePath) {
    const outputPath = path.join(
      this.options.outputDir,
      relativePath.replace(/\.js$/, '.svelte')
    );
    
    return outputPath;
  }

  async migrateComponent(component) {
    const { inputPath, outputPath, name, relativePath } = component;
    
    this.log(`迁移组件: ${name} (${relativePath})`, 'info');
    
    try {
      // 检查是否已经迁移
      if (fs.existsSync(outputPath) && !this.options.force) {
        this.log(`跳过已存在的组件: ${name}`, 'warning');
        this.stats.skipped++;
        return { status: 'skipped', component, reason: 'File already exists' };
      }
      
      if (this.options.dryRun) {
        this.log(`[DRY RUN] 将迁移: ${inputPath} -> ${outputPath}`, 'debug');
        this.stats.success++;
        return { status: 'success', component, dryRun: true };
      }
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 创建迁移器并执行迁移
      const migrator = new ComponentMigrator(inputPath, outputPath);
      await migrator.migrate();
      
      this.stats.success++;
      this.log(`✅ 成功迁移: ${name}`, 'success');
      
      return { 
        status: 'success', 
        component,
        outputPath,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.stats.failed++;
      this.stats.errors.push({
        component: name,
        path: relativePath,
        error: error.message,
        stack: error.stack
      });
      
      this.log(`迁移失败: ${name} - ${error.message}`, 'error');
      
      return { 
        status: 'failed', 
        component,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async analyzeComponents(components) {
    this.log('分析组件复杂度...', 'info');
    
    const analysis = {
      simple: [],     // 静态组件
      medium: [],     // 有状态组件
      complex: [],    // 复杂交互组件
      critical: []    // 核心业务组件
    };
    
    for (const component of components) {
      const complexity = await this.analyzeComponentComplexity(component);
      component.complexity = complexity;
      
      switch (complexity.level) {
        case 'simple':
          analysis.simple.push(component);
          break;
        case 'medium':
          analysis.medium.push(component);
          break;
        case 'complex':
          analysis.complex.push(component);
          break;
        case 'critical':
          analysis.critical.push(component);
          break;
      }
    }
    
    return analysis;
  }

  async analyzeComponentComplexity(component) {
    const content = fs.readFileSync(component.inputPath, 'utf8');
    
    const metrics = {
      lines: content.split('\n').length,
      useStateCount: (content.match(/useState/g) || []).length,
      useEffectCount: (content.match(/useEffect/g) || []).length,
      useContextCount: (content.match(/useContext/g) || []).length,
      propsDestructuring: content.includes('const {'),
      hasWebSocket: content.includes('WebSocket') || content.includes('pluto_connection'),
      hasComplexLogic: content.includes('immer') || content.includes('reduce'),
      isCoreComponent: ['Cell', 'Editor', 'Notebook'].includes(component.name)
    };
    
    let level = 'simple';
    let reasons = [];
    
    if (metrics.isCoreComponent) {
      level = 'critical';
      reasons.push('核心业务组件');
    } else if (metrics.useStateCount > 3 || metrics.useEffectCount > 2) {
      level = 'complex';
      reasons.push('复杂状态管理');
    } else if (metrics.useStateCount > 0 || metrics.useContextCount > 0) {
      level = 'medium';
      reasons.push('有状态组件');
    }
    
    if (metrics.hasWebSocket) {
      reasons.push('包含WebSocket逻辑');
    }
    
    if (metrics.hasComplexLogic) {
      reasons.push('复杂业务逻辑');
    }
    
    return {
      level,
      reasons,
      metrics
    };
  }

  generateMigrationPlan(analysis) {
    this.log('生成迁移计划...', 'info');
    
    const plan = {
      phases: [
        {
          name: 'Phase 1: 简单组件',
          components: analysis.simple,
          priority: 'high',
          estimatedTime: '1-2天',
          description: '先迁移静态和无状态组件，建立基础'
        },
        {
          name: 'Phase 2: 中等复杂度组件',
          components: analysis.medium,
          priority: 'medium',
          estimatedTime: '2-3天',
          description: '迁移有状态组件，完善状态管理'
        },
        {
          name: 'Phase 3: 复杂组件',
          components: analysis.complex,
          priority: 'medium',
          estimatedTime: '3-5天',
          description: '迁移复杂交互组件，处理边缘情况'
        },
        {
          name: 'Phase 4: 核心组件',
          components: analysis.critical,
          priority: 'low',
          estimatedTime: '5-7天',
          description: '最后迁移核心业务组件，确保稳定性'
        }
      ],
      summary: {
        total: analysis.simple.length + analysis.medium.length + analysis.complex.length + analysis.critical.length,
        byComplexity: {
          simple: analysis.simple.length,
          medium: analysis.medium.length,
          complex: analysis.complex.length,
          critical: analysis.critical.length
        }
      }
    };
    
    return plan;
  }

  async execute() {
    this.log('开始批量迁移...', 'info');
    this.log(`输入目录: ${this.options.inputDir}`, 'debug');
    this.log(`输出目录: ${this.options.outputDir}`, 'debug');
    this.log(`模式: ${this.options.pattern}`, 'debug');
    
    try {
      // 查找组件
      const components = await this.findComponents();
      this.stats.total = components.length;
      
      // 分析组件复杂度
      const analysis = await this.analyzeComponents(components);
      
      // 生成迁移计划
      const plan = this.generateMigrationPlan(analysis);
      
      if (this.options.planOnly) {
        this.log('生成迁移计划完成:', 'success');
        console.log('\n📋 迁移计划:');
        plan.phases.forEach(phase => {
          console.log(`\n${phase.name}:`);
          console.log(`  组件数量: ${phase.components.length}`);
          console.log(`  优先级: ${phase.priority}`);
          console.log(`  预计时间: ${phase.estimatedTime}`);
          console.log(`  描述: ${phase.description}`);
          
          if (this.options.verbose) {
            console.log('  组件列表:');
            phase.components.forEach(comp => {
              console.log(`    - ${comp.name} (${comp.complexity.level})`);
            });
          }
        });
        
        return { plan, analysis };
      }
      
      // 执行迁移
      const results = [];
      
      for (const component of components) {
        const result = await this.migrateComponent(component);
        results.push(result);
        this.migrationResults.push(result);
      }
      
      // 生成报告
      await this.generateReport(plan, analysis, results);
      
      this.log('批量迁移完成！', 'success');
      this.log(`总计: ${this.stats.total}, 成功: ${this.stats.success}, 失败: ${this.stats.failed}, 跳过: ${this.stats.skipped}`, 'info');
      
      return { plan, analysis, results, stats: this.stats };
      
    } catch (error) {
      this.log(`批量迁移失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateReport(plan, analysis, results) {
    const report = {
      timestamp: new Date().toISOString(),
      options: this.options,
      stats: this.stats,
      plan,
      analysis: {
        simple: analysis.simple.map(c => ({ name: c.name, path: c.relativePath })),
        medium: analysis.medium.map(c => ({ name: c.name, path: c.relativePath })),
        complex: analysis.complex.map(c => ({ name: c.name, path: c.relativePath })),
        critical: analysis.critical.map(c => ({ name: c.name, path: c.relativePath }))
      },
      results: results.map(r => ({
        component: r.component.name,
        status: r.status,
        error: r.error,
        timestamp: r.timestamp
      })),
      errors: this.stats.errors
    };
    
    const reportPath = path.join(process.cwd(), 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`生成迁移报告: ${reportPath}`, 'success');
    
    // 生成人类可读的报告
    const humanReport = this.generateHumanReadableReport(report);
    const humanReportPath = path.join(process.cwd(), 'migration-report.md');
    fs.writeFileSync(humanReportPath, humanReport);
    
    this.log(`生成人类可读报告: ${humanReportPath}`, 'success');
  }

  generateHumanReadableReport(report) {
    return `# 迁移报告
生成时间: ${report.timestamp}

## 统计摘要
- 总计组件: ${report.stats.total}
- 成功迁移: ${report.stats.success}
- 失败迁移: ${report.stats.failed}
- 跳过组件: ${report.stats.skipped}

## 复杂度分析
- 简单组件: ${report.analysis.simple.length}
- 中等复杂度: ${report.analysis.medium.length}
- 复杂组件: ${report.analysis.complex.length}
- 核心组件: ${report.analysis.critical.length}

## 迁移计划
${report.plan.phases.map(phase => `
### ${phase.name}
- 组件数量: ${phase.components.length}
- 优先级: ${phase.priority}
- 预计时间: ${phase.estimatedTime}
- 描述: ${phase.description}
`).join('\n')}

## 错误汇总
${report.errors.length > 0 ? report.errors.map(error => `
### ${error.component}
- 路径: ${error.path}
- 错误: ${error.error}
`).join('\n') : '无错误'}

## 建议
1. 优先处理失败的组件
2. 按阶段逐步迁移
3. 充分测试每个阶段
4. 保持与后端的兼容性

## 下一步
1. 审查失败的迁移
2. 手动修复问题
3. 运行测试验证
4. 继续下一阶段的迁移
`;
  }
}

// 简单的通配符匹配函数
function minimatch(str, pattern) {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp(`^${regex}$`).test(str);
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const options = {
    inputDir: getArgValue(args, '--input-dir') || 'frontend/components',
    outputDir: getArgValue(args, '--output-dir') || 'frontend/svelte-components',
    pattern: getArgValue(args, '--pattern') || '*.js',
    exclude: getArgValues(args, '--exclude') || [],
    include: getArgValues(args, '--include') || [],
    dryRun: hasArg(args, '--dry-run'),
    verbose: hasArg(args, '--verbose'),
    planOnly: hasArg(args, '--plan-only'),
    force: hasArg(args, '--force')
  };
  
  if (hasArg(args, '--help')) {
    console.log(`
批量迁移脚本

使用方法: node batch-migrate.js [选项]

选项:
  --input-dir <路径>      输入目录 (默认: frontend/components)
  --output-dir <路径>     输出目录 (默认: frontend/svelte-components)
  --pattern <模式>        文件匹配模式 (默认: *.js)
  --exclude <模式>        排除的文件模式 (可多次使用)
  --include <模式>        包含的文件模式 (可多次使用)
  --dry-run              试运行，不实际迁移文件
  --verbose              显示详细日志
  --plan-only            只生成迁移计划，不执行迁移
  --force                覆盖已存在的文件
  --help                 显示帮助信息

示例:
  node batch-migrate.js
  node batch-migrate.js --input-dir frontend/components --output-dir frontend/svelte-components
  node batch-migrate.js --plan-only --verbose
  node batch-migrate.js --exclude "*Test.js" --exclude "*Mock.js"
`);
    return;
  }
  
  const migrator = new BatchMigrator(options);
  
  try {
    const result = await migrator.execute();
    
    if (result.plan) {
      console.log('\n📋 迁移建议:');
      console.log('1. 按阶段逐步迁移，先简单后复杂');
      console.log('2. 每个阶段完成后充分测试');
      console.log('3. 关注核心组件的稳定性');
      console.log('4. 保持与后端的兼容性');
    }
    
  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  }
}

function getArgValue(args, name) {
  const index = args.indexOf(name);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

function getArgValues(args, name) {
  const values = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && i + 1 < args.length) {
      values.push(args[i + 1]);
    }
  }
  return values.length > 0 ? values : null;
}

function hasArg(args, name) {
  return args.includes(name);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BatchMigrator };