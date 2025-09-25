#!/usr/bin/env node

/**
 * 创建Svelte Store迁移脚本
 * 将Preact的Context和状态管理转换为Svelte Store
 * 使用方法: node create-svelte-store.js <store-name> <context-file>
 */

const fs = require('fs');
const path = require('path');

class StoreGenerator {
  constructor(storeName, contextFile) {
    this.storeName = storeName;
    this.contextFile = contextFile;
    this.storeContent = '';
  }

  generateCoreStore() {
    const storeNameCapitalized = this.storeName.charAt(0).toUpperCase() + this.storeName.slice(1);
    
    this.storeContent = `/**
 * ${storeNameCapitalized} Store
 * 迁移自: ${this.contextFile}
 * 创建时间: ${new Date().toISOString()}
 */

import { writable, derived, readable } from 'svelte/store';
import { getContext, setContext } from 'svelte';

// 初始状态
const initialState = {
  // TODO: 从原始Context中提取初始状态
  // 示例:
  // cells: [],
  // notebook: null,
  // isLoading: false
};

// 创建可写store
function create${storeNameCapitalized}Store() {
  const { subscribe, set, update } = writable(initialState);
  
  return {
    subscribe,
    set,
    update,
    
    // 自定义方法
    // TODO: 从原始Context中提取方法
    // 示例:
    // addCell: (cell) => update(state => ({
    //   ...state,
    //   cells: [...state.cells, cell]
    // })),
    // 
    // removeCell: (cellId) => update(state => ({
    //   ...state,
    //   cells: state.cells.filter(cell => cell.id !== cellId)
    // })),
    // 
    // reset: () => set(initialState)
  };
}

// 派生store示例
// export const derived${storeNameCapitalized} = derived(
//   ${this.storeName}Store,
//   $${this.storeName} => {
//     // TODO: 实现派生逻辑
//     return $${this.storeName}.cells.length;
//   }
// );

// 创建store实例
export const ${this.storeName}Store = create${storeNameCapitalized}Store();

// Context key (用于在组件树中传递store)
export const ${this.storeName.toUpperCase()}_STORE_KEY = Symbol('${this.storeName}-store');

// 辅助函数：在组件中获取store
export function get${storeNameCapitalized}Store() {
  return getContext(${this.storeName.toUpperCase()}_STORE_KEY);
}

// 辅助函数：设置store到Context
export function set${storeNameCapitalized}Store(store) {
  setContext(${this.storeName.toUpperCase()}_STORE_KEY, store);
}

export default ${this.storeName}Store;
`;
  }

  generateIndexStore() {
    return `/**
 * Svelte Store 索引文件
 * 导出所有store以便统一管理
 */

// 核心store
export { ${this.storeName}Store } from './${this.storeName}.js';

// UI状态store
export { uiStore } from './ui.js';

// Notebook状态store
export { notebookStore } from './notebook.js';

// 连接状态store
export { connectionStore } from './connection.js';

// 用户偏好store
export { preferencesStore } from './preferences.js';

// 全局store组合
export const stores = {
  ui: uiStore,
  notebook: notebookStore,
  connection: connectionStore,
  preferences: preferencesStore,
  ${this.storeName}: ${this.storeName}Store
};

// 初始化所有store的函数
export function initializeStores(initialData = {}) {
  // TODO: 根据initialData初始化各个store
  console.log('Initializing stores with data:', initialData);
}

// 重置所有store的函数
export function resetStores() {
  // TODO: 实现各个store的重置逻辑
  console.log('Resetting all stores');
}
`;
  }

  generateUIStore() {
    return `/**
 * UI状态Store
 * 管理UI相关的状态
 */

import { writable } from 'svelte/store';

// UI状态初始值
const initialUIState = {
  theme: 'light',
  sidebarOpen: false,
  modalOpen: false,
  loading: false,
  notifications: []
};

function createUIStore() {
  const { subscribe, set, update } = writable(initialUIState);
  
  return {
    subscribe,
    set,
    update,
    
    // UI操作方法
    toggleSidebar: () => update(state => ({
      ...state,
      sidebarOpen: !state.sidebarOpen
    })),
    
    openModal: () => update(state => ({
      ...state,
      modalOpen: true
    })),
    
    closeModal: () => update(state => ({
      ...state,
      modalOpen: false
    })),
    
    setTheme: (theme) => update(state => ({
      ...state,
      theme
    })),
    
    showNotification: (notification) => update(state => ({
      ...state,
      notifications: [...state.notifications, notification]
    })),
    
    removeNotification: (id) => update(state => ({
      ...state,
      notifications: state.notifications.filter(n => n.id !== id)
    })),
    
    setLoading: (loading) => update(state => ({
      ...state,
      loading
    })),
    
    reset: () => set(initialUIState)
  };
}

export const uiStore = createUIStore();
`;
  }

  generateNotebookStore() {
    return `/**
 * Notebook状态Store
 * 管理Notebook相关的状态
 */

import { writable } from 'svelte/store';

// Notebook状态初始值
const initialNotebookState = {
  cells: [],
  metadata: {},
  isRunning: false,
  isDirty: false,
  selectedCell: null,
  executionOrder: []
};

function createNotebookStore() {
  const { subscribe, set, update } = writable(initialNotebookState);
  
  return {
    subscribe,
    set,
    update,
    
    // Notebook操作方法
    addCell: (cell) => update(state => ({
      ...state,
      cells: [...state.cells, cell],
      isDirty: true
    })),
    
    removeCell: (cellId) => update(state => ({
      ...state,
      cells: state.cells.filter(cell => cell.id !== cellId),
      isDirty: true
    })),
    
    updateCell: (cellId, updates) => update(state => ({
      ...state,
      cells: state.cells.map(cell => 
        cell.id === cellId ? { ...cell, ...updates } : cell
      ),
      isDirty: true
    })),
    
    selectCell: (cellId) => update(state => ({
      ...state,
      selectedCell: cellId
    })),
    
    setRunning: (isRunning) => update(state => ({
      ...state,
      isRunning
    })),
    
    addToExecutionOrder: (cellId) => update(state => ({
      ...state,
      executionOrder: [...state.executionOrder, cellId]
    })),
    
    clearExecutionOrder: () => update(state => ({
      ...state,
      executionOrder: []
    })),
    
    save: () => update(state => ({
      ...state,
      isDirty: false
    })),
    
    reset: () => set(initialNotebookState)
  };
}

export const notebookStore = createNotebookStore();
`;
  }

  generateConnectionStore() {
    return `/**
 * 连接状态Store
 * 管理WebSocket连接状态
 */

import { writable } from 'svelte/store';

// 连接状态初始值
const initialConnectionState = {
  isConnected: false,
  connectionStatus: 'disconnected', // disconnected, connecting, connected, error
  lastError: null,
  reconnectAttempts: 0,
  serverUrl: null,
  sessionId: null
};

function createConnectionStore() {
  const { subscribe, set, update } = writable(initialConnectionState);
  
  return {
    subscribe,
    set,
    update,
    
    // 连接操作方法
    connect: (serverUrl, sessionId) => update(state => ({
      ...state,
      isConnected: true,
      connectionStatus: 'connected',
      serverUrl,
      sessionId,
      lastError: null
    })),
    
    disconnect: () => update(state => ({
      ...state,
      isConnected: false,
      connectionStatus: 'disconnected',
      serverUrl: null,
      sessionId: null
    })),
    
    setConnecting: () => update(state => ({
      ...state,
      connectionStatus: 'connecting'
    })),
    
    setError: (error) => update(state => ({
      ...state,
      connectionStatus: 'error',
      lastError: error,
      isConnected: false
    })),
    
    incrementReconnectAttempts: () => update(state => ({
      ...state,
      reconnectAttempts: state.reconnectAttempts + 1
    })),
    
    resetReconnectAttempts: () => update(state => ({
      ...state,
      reconnectAttempts: 0
    })),
    
    reset: () => set(initialConnectionState)
  };
}

export const connectionStore = createConnectionStore();
`;
  }

  generatePreferencesStore() {
    return `/**
 * 用户偏好Store
 * 管理用户设置和偏好
 */

import { writable } from 'svelte/store';

// 用户偏好初始值
const initialPreferencesState = {
  theme: 'light',
  fontSize: 14,
  fontFamily: 'monospace',
  autoSave: true,
  autoSaveInterval: 30000, // 30秒
  showLineNumbers: true,
  wordWrap: true,
  tabSize: 4,
  indentWithSpaces: false,
  showWhitespace: false,
  enableVimMode: false
};

function createPreferencesStore() {
  const { subscribe, set, update } = writable(initialPreferencesState);
  
  return {
    subscribe,
    set,
    update,
    
    // 偏好设置方法
    setTheme: (theme) => update(state => ({
      ...state,
      theme
    })),
    
    setFontSize: (fontSize) => update(state => ({
      ...state,
      fontSize
    })),
    
    setFontFamily: (fontFamily) => update(state => ({
      ...state,
      fontFamily
    })),
    
    toggleAutoSave: () => update(state => ({
      ...state,
      autoSave: !state.autoSave
    })),
    
    setAutoSaveInterval: (interval) => update(state => ({
      ...state,
      autoSaveInterval: interval
    })),
    
    toggleLineNumbers: () => update(state => ({
      ...state,
      showLineNumbers: !state.showLineNumbers
    })),
    
    toggleWordWrap: () => update(state => ({
      ...state,
      wordWrap: !state.wordWrap
    })),
    
    setTabSize: (tabSize) => update(state => ({
      ...state,
      tabSize
    })),
    
    toggleIndentWithSpaces: () => update(state => ({
      ...state,
      indentWithSpaces: !state.indentWithSpaces
    })),
    
    toggleShowWhitespace: () => update(state => ({
      ...state,
      showWhitespace: !state.showWhitespace
    })),
    
    toggleVimMode: () => update(state => ({
      ...state,
      enableVimMode: !state.enableVimMode
    })),
    
    loadFromStorage: () => {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('pluto-preferences');
        if (stored) {
          set(JSON.parse(stored));
        }
      }
    },
    
    saveToStorage: () => {
      if (typeof localStorage !== 'undefined') {
        subscribe(state => {
          localStorage.setItem('pluto-preferences', JSON.stringify(state));
        });
      }
    },
    
    reset: () => set(initialPreferencesState)
  };
}

export const preferencesStore = createPreferencesStore();
`;
  }

  async generateAllStores() {
    const storesDir = path.join(process.cwd(), 'frontend', 'stores');
    
    // 创建stores目录
    if (!fs.existsSync(storesDir)) {
      fs.mkdirSync(storesDir, { recursive: true });
    }

    // 生成核心store
    this.generateCoreStore();
    await this.writeFile(path.join(storesDir, `${this.storeName}.js`), this.storeContent);

    // 生成其他store文件
    await this.writeFile(path.join(storesDir, 'ui.js'), this.generateUIStore());
    await this.writeFile(path.join(storesDir, 'notebook.js'), this.generateNotebookStore());
    await this.writeFile(path.join(storesDir, 'connection.js'), this.generateConnectionStore());
    await this.writeFile(path.join(storesDir, 'preferences.js'), this.generatePreferencesStore());
    
    // 生成索引文件
    await this.writeFile(path.join(storesDir, 'index.js'), this.generateIndexStore());

    console.log('✅ 所有store文件生成完成！');
  }

  async writeFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 写入文件: ${filePath}`);
    } catch (error) {
      console.error(`❌ 写入文件失败: ${error.message}`);
      throw error;
    }
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('使用方法: node create-svelte-store.js <store-name> [context-file]');
    console.log('示例: node create-svelte-store.js notebook frontend/common/PlutoContext.js');
    process.exit(1);
  }
  
  const [storeName, contextFile] = args;
  
  const generator = new StoreGenerator(storeName, contextFile || '');
  await generator.generateAllStores();
  
  console.log('\n📋 下一步:');
  console.log('1. 审查生成的store文件');
  console.log('2. 根据原始Context实现具体逻辑');
  console.log('3. 在组件中使用这些store');
  console.log('4. 测试store的功能');
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { StoreGenerator };