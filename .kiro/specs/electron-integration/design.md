# 设计文档 - Electron 集成

## 概述

Electron集成模块负责将Vue Web应用封装为原生桌面应用，提供窗口管理、进程间通信、系统集成等桌面应用特有的功能。本模块基于Electron框架实现，遵循安全最佳实践，确保应用的稳定性和安全性。

### 设计目标

1. **安全性优先**：启用上下文隔离和禁用Node.js集成
2. **跨平台支持**：支持Windows、macOS和Linux
3. **开发体验**：提供热重载和开发者工具
4. **性能优化**：快速启动和流畅的窗口操作
5. **可维护性**：清晰的架构和完整的类型定义

### 技术选型

- **桌面框架**：Electron 32.2+
- **构建工具**：electron-vite 2.3+
- **类型系统**：TypeScript 5.6+
- **进程通信**：Electron IPC (ipcMain/ipcRenderer)

## 架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Operating System                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Electron Application                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Main Process (Node.js)                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │    │
│  │  │   Window     │  │     IPC      │  │   App    │ │    │
│  │  │  Manager     │  │   Handlers   │  │Lifecycle │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │    │
│  └────────────────────────┬───────────────────────────┘    │
│                            │ IPC Communication               │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │            Preload Script (Bridge)                  │    │
│  │         contextBridge.exposeInMainWorld()           │    │
│  └────────────────────────┬───────────────────────────┘    │
│                            │ window.electronAPI              │
│  ┌────────────────────────┴───────────────────────────┐    │
│  │         Renderer Process (Chromium)                 │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │           Vue 3 Application                   │  │    │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────┐ │  │    │
│  │  │  │ Components │  │   Stores   │  │ Styles │ │  │    │
│  │  │  └────────────┘  └────────────┘  └────────┘ │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 进程通信流程

```
Renderer Process                Preload Script              Main Process
     │                               │                           │
     │ 1. Call API                   │                           │
     ├──────────────────────────────>│                           │
     │   window.electronAPI.xxx()    │                           │
     │                               │ 2. Invoke IPC             │
     │                               ├──────────────────────────>│
     │                               │   ipcRenderer.invoke()    │
     │                               │                           │
     │                               │                           │ 3. Handle
     │                               │                           │    Request
     │                               │                           │
     │                               │ 4. Return Result          │
     │                               │<──────────────────────────┤
     │ 5. Resolve Promise            │                           │
     │<──────────────────────────────┤                           │
     │                               │                           │
```

## 组件和接口

### 1. 主进程 (electron/main.ts)

#### 窗口管理器

```typescript
interface WindowManager {
  // 创建新窗口
  createWindow(options?: WindowOptions): BrowserWindow
  
  // 获取所有窗口
  getAllWindows(): BrowserWindow[]
  
  // 获取焦点窗口
  getFocusedWindow(): BrowserWindow | null
  
  // 关闭窗口
  closeWindow(windowId: number): void
  
  // 保存窗口状态
  saveWindowState(windowId: number): void
  
  // 恢复窗口状态
  restoreWindowState(): WindowState | null
}

interface WindowOptions {
  width?: number
  height?: number
  x?: number
  y?: number
  frame?: boolean
  transparent?: boolean
  alwaysOnTop?: boolean
}

interface WindowState {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}
```

#### IPC处理器

```typescript
interface IPCHandlers {
  // 窗口操作
  'window:close': () => void
  'window:minimize': () => void
  'window:maximize': () => void
  'window:getPosition': () => { x: number; y: number }
  'window:setPosition': (x: number, y: number) => void
  'window:getSize': () => { width: number; height: number }
  'window:setSize': (width: number, height: number) => void
  
  // 系统信息
  'system:getPlatform': () => string
  'system:getVersion': () => string
  'system:getVersions': () => NodeJS.ProcessVersions
  'system:getPath': (name: string) => string
}
```

#### 应用生命周期

```typescript
interface AppLifecycle {
  // 应用就绪
  onReady(): void
  
  // 应用激活（macOS）
  onActivate(): void
  
  // 所有窗口关闭
  onWindowAllClosed(): void
  
  // 应用退出前
  onBeforeQuit(): void
  
  // 错误处理
  onError(error: Error): void
}
```

### 2. 预加载脚本 (electron/preload.ts)

#### Electron API 接口

```typescript
interface ElectronAPI {
  // 窗口操作
  window: {
    close: () => Promise<void>
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    getPosition: () => Promise<{ x: number; y: number }>
    setPosition: (x: number, y: number) => Promise<void>
    getSize: () => Promise<{ width: number; height: number }>
    setSize: (width: number, height: number) => Promise<void>
  }
  
  // 系统信息
  system: {
    platform: string
    getVersion: () => Promise<string>
    getVersions: () => Promise<NodeJS.ProcessVersions>
    getPath: (name: string) => Promise<string>
  }
  
  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

// 全局类型声明
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 3. 渲染进程集成

#### Electron Composable (composables/useElectron.ts)

```typescript
interface UseElectronReturn {
  // 检查是否在Electron环境
  isElectron: Ref<boolean>
  
  // 平台信息
  platform: Ref<string>
  
  // 窗口操作
  closeWindow: () => Promise<void>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  
  // 窗口状态
  windowPosition: Ref<{ x: number; y: number }>
  windowSize: Ref<{ width: number; height: number }>
  
  // 更新窗口状态
  updateWindowPosition: (x: number, y: number) => Promise<void>
  updateWindowSize: (width: number, height: number) => Promise<void>
}

function useElectron(): UseElectronReturn
```

## 数据模型

### 窗口配置

```typescript
interface WindowConfig {
  // 基础配置
  width: number
  height: number
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
  
  // 外观配置
  frame: boolean
  transparent: boolean
  backgroundColor: string
  
  // 行为配置
  resizable: boolean
  movable: boolean
  minimizable: boolean
  maximizable: boolean
  closable: boolean
  alwaysOnTop: boolean
  
  // 安全配置
  webPreferences: {
    preload: string
    nodeIntegration: boolean
    contextIsolation: boolean
    sandbox: boolean
    webSecurity: boolean
  }
}
```

### IPC消息格式

```typescript
interface IPCMessage<T = any> {
  channel: string
  data?: T
  requestId?: string
  timestamp: number
}

interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    stack?: string
  }
  requestId?: string
  timestamp: number
}
```

### 窗口状态存储

```typescript
interface StoredWindowState {
  version: number
  windows: {
    [windowId: string]: {
      x: number
      y: number
      width: number
      height: number
      isMaximized: boolean
      lastUpdated: number
    }
  }
}
```

## 默认配置

```typescript
// 默认窗口配置
const DEFAULT_WINDOW_CONFIG: WindowConfig = {
  width: 300,
  height: 300,
  minWidth: 200,
  minHeight: 200,
  frame: false,
  transparent: true,
  backgroundColor: '#00000000',
  resizable: true,
  movable: true,
  minimizable: true,
  maximizable: false,
  closable: true,
  alwaysOnTop: false,
  webPreferences: {
    preload: join(__dirname, '../preload/preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true
  }
}

// 开发环境配置
const DEV_CONFIG = {
  devTools: true,
  devServerUrl: 'http://localhost:5173'
}

// 生产环境配置
const PROD_CONFIG = {
  devTools: false,
  indexPath: join(__dirname, '../renderer/index.html')
}
```


## 正确性属性

*属性是指在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 窗口加载内容

*对于任何*创建的浏览器窗口，都应该成功加载Vue应用的渲染内容
**验证需求: 1.3**

### 属性 2: 无边框窗口配置

*对于任何*创建的便签窗口，frame属性应该为false
**验证需求: 2.1**

### 属性 3: 透明背景配置

*对于任何*创建的便签窗口，transparent属性应该为true
**验证需求: 2.2**

### 属性 4: 窗口可调整大小

*对于任何*创建的便签窗口，resizable属性应该为true
**验证需求: 2.4**

### 属性 5: 禁用最大化

*对于任何*创建的便签窗口，maximizable属性应该为false
**验证需求: 2.5**

### 属性 6: 预加载脚本配置

*对于任何*创建的窗口，webPreferences应该包含有效的preload脚本路径
**验证需求: 3.1**

### 属性 7: 上下文隔离启用

*对于任何*创建的窗口，contextIsolation应该为true
**验证需求: 3.2**

### 属性 8: Node.js集成禁用

*对于任何*创建的窗口，nodeIntegration应该为false
**验证需求: 3.3**

### 属性 9: 安全API暴露

*对于任何*预加载脚本，都应该使用contextBridge.exposeInMainWorld暴露API
**验证需求: 3.4**

### 属性 10: API访问限制

*对于任何*渲染进程的API调用，只能访问通过contextBridge暴露的API
**验证需求: 3.5**

### 属性 11: IPC消息接收

*对于任何*有效的IPC消息，主进程都应该能够接收并处理
**验证需求: 4.1**

### 属性 12: IPC响应返回

*对于任何*IPC请求，主进程都应该返回响应（成功或错误）
**验证需求: 4.2**

### 属性 13: IPC错误处理

*对于任何*导致错误的IPC调用，应该返回包含错误信息的响应
**验证需求: 4.3**

### 属性 14: IPC异步返回

*对于任何*IPC方法调用，都应该返回Promise对象
**验证需求: 4.4**

### 属性 15: 主进程主动通知

*对于任何*需要通知渲染进程的事件，主进程都应该能够发送消息
**验证需求: 4.5**

### 属性 16: 退出前事件触发

*对于任何*应用退出操作，都应该触发before-quit事件
**验证需求: 5.4**

### 属性 17: 窗口资源清理

*对于任何*关闭的窗口，相关的事件监听器和资源都应该被清理
**验证需求: 5.5**

### 属性 18: 窗口关闭操作

*对于任何*有效的窗口ID，关闭请求应该成功关闭对应窗口
**验证需求: 6.1**

### 属性 19: 窗口最小化操作

*对于任何*有效的窗口ID，最小化请求应该成功最小化对应窗口
**验证需求: 6.2**

### 属性 20: 获取窗口位置

*对于任何*窗口，都应该能够获取其当前的x和y坐标
**验证需求: 6.3**

### 属性 21: 设置窗口位置

*对于任何*有效的坐标值，窗口应该移动到指定位置
**验证需求: 6.4**

### 属性 22: 获取窗口尺寸

*对于任何*窗口，都应该能够获取其当前的宽度和高度
**验证需求: 6.5**

### 属性 23: 错误日志记录

*对于任何*未捕获的异常或错误，都应该记录到日志系统
**验证需求: 7.3, 9.1, 9.2**

### 属性 24: 资源加载错误处理

*对于任何*资源加载失败，都应该记录详细的错误信息
**验证需求: 7.4**

### 属性 25: 平台信息返回

*对于任何*平台信息请求，都应该返回有效的平台标识符
**验证需求: 8.1**

### 属性 26: 路径信息返回

*对于任何*有效的路径名称请求，都应该返回对应的路径字符串
**验证需求: 8.4**

### 属性 27: Promise拒绝处理

*对于任何*未处理的Promise拒绝，都应该记录拒绝信息
**验证需求: 9.3**

### 属性 28: 错误信息完整性

*对于任何*记录的错误，都应该包含错误堆栈和上下文信息
**验证需求: 9.4**

### 属性 29: 窗口状态保存

*对于任何*窗口位置或尺寸的变更，都应该保存新的状态到存储
**验证需求: 10.1**

### 属性 30: 窗口状态恢复

*对于任何*有效的保存状态，应用启动时都应该使用该状态创建窗口
**验证需求: 10.3**

## 错误处理

### 错误类型

```typescript
enum ElectronErrorType {
  WINDOW_CREATION_ERROR = 'WINDOW_CREATION_ERROR',
  IPC_COMMUNICATION_ERROR = 'IPC_COMMUNICATION_ERROR',
  RESOURCE_LOAD_ERROR = 'RESOURCE_LOAD_ERROR',
  WINDOW_STATE_ERROR = 'WINDOW_STATE_ERROR',
  PRELOAD_SCRIPT_ERROR = 'PRELOAD_SCRIPT_ERROR',
  UNCAUGHT_EXCEPTION = 'UNCAUGHT_EXCEPTION'
}

interface ElectronError {
  type: ElectronErrorType
  message: string
  stack?: string
  context?: {
    windowId?: number
    channel?: string
    platform?: string
    [key: string]: any
  }
  timestamp: number
}
```

### 错误处理策略

1. **窗口创建错误**
   - 记录详细错误信息
   - 尝试使用默认配置重新创建
   - 如果仍然失败，显示错误对话框

2. **IPC通信错误**
   - 捕获并记录错误
   - 返回标准化的错误响应
   - 不中断应用运行

3. **资源加载错误**
   - 记录加载失败的资源URL
   - 在开发环境显示详细错误
   - 在生产环境显示友好提示

4. **窗口状态错误**
   - 验证保存的状态数据
   - 如果数据无效，使用默认配置
   - 记录错误但不影响启动

5. **未捕获异常**
   - 全局捕获并记录
   - 尝试优雅降级
   - 防止应用崩溃

### 日志系统

```typescript
interface Logger {
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, error?: Error, context?: any): void
  debug(message: string, context?: any): void
}

// 日志级别
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// 日志配置
interface LogConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  filePath?: string
  maxFileSize?: number
  maxFiles?: number
}
```

## 测试策略

### 单元测试

使用Vitest进行单元测试，覆盖以下场景：

1. **窗口管理测试**
   - 测试窗口创建配置正确性
   - 测试窗口状态保存和恢复
   - 测试窗口操作方法

2. **IPC处理器测试**
   - 测试各个IPC处理器的功能
   - 测试错误处理逻辑
   - 测试响应格式

3. **预加载脚本测试**
   - 测试API暴露的完整性
   - 测试安全限制
   - 测试类型定义

4. **Composable测试**
   - 测试useElectron的功能
   - 测试环境检测
   - 测试API调用

### 属性测试

使用fast-check进行属性测试，验证正确性属性：

**配置要求**：
- 每个属性测试至少运行100次迭代
- 每个测试必须使用注释标记对应的设计文档属性
- 标记格式：`// Feature: electron-integration, Property X: [属性描述]`

**测试库**：fast-check

**关键属性测试**：

1. **属性 2-5: 窗口配置属性**
   - 生成随机窗口配置
   - 验证所有窗口都符合配置要求

2. **属性 6-10: 安全配置属性**
   - 验证所有窗口的安全配置正确
   - 验证API访问限制

3. **属性 11-15: IPC通信属性**
   - 生成随机IPC消息
   - 验证消息处理和响应

4. **属性 20-22: 窗口操作属性**
   - 生成随机窗口位置和尺寸
   - 验证操作的正确性

5. **属性 29-30: 状态持久化属性**
   - 生成随机窗口状态
   - 验证保存和恢复的一致性

### 集成测试

1. **完整启动流程测试**
   - 启动应用 → 创建窗口 → 加载内容 → 验证功能

2. **IPC通信流程测试**
   - 渲染进程调用 → IPC传输 → 主进程处理 → 响应返回

3. **窗口生命周期测试**
   - 创建窗口 → 操作窗口 → 保存状态 → 关闭窗口 → 恢复状态

### E2E测试

使用Playwright或Spectron进行端到端测试：

1. **应用启动测试**
   - 验证应用能够正常启动
   - 验证窗口正确显示

2. **窗口操作测试**
   - 测试窗口移动、调整大小
   - 测试窗口最小化、关闭

3. **跨平台测试**
   - 在Windows、macOS、Linux上测试
   - 验证平台特定行为

## 实现细节

### 主进程实现

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

class WindowManager {
  private windows: Map<number, BrowserWindow> = new Map()
  
  createWindow(options?: Partial<WindowConfig>): BrowserWindow {
    const config = { ...DEFAULT_WINDOW_CONFIG, ...options }
    
    const window = new BrowserWindow(config)
    
    // 加载内容
    if (process.env.NODE_ENV === 'development') {
      window.loadURL(DEV_CONFIG.devServerUrl)
      if (DEV_CONFIG.devTools) {
        window.webContents.openDevTools()
      }
    } else {
      window.loadFile(PROD_CONFIG.indexPath)
    }
    
    // 保存窗口引用
    this.windows.set(window.id, window)
    
    // 监听窗口事件
    window.on('closed', () => {
      this.windows.delete(window.id)
      this.saveWindowState(window.id)
    })
    
    window.on('moved', () => {
      this.saveWindowState(window.id)
    })
    
    window.on('resized', () => {
      this.saveWindowState(window.id)
    })
    
    return window
  }
  
  saveWindowState(windowId: number): void {
    const window = this.windows.get(windowId)
    if (!window) return
    
    const bounds = window.getBounds()
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: window.isMaximized()
    }
    
    // 保存到存储（使用electron-store或localStorage）
    // storage.set(`window-${windowId}`, state)
  }
  
  restoreWindowState(): WindowState | null {
    // 从存储读取
    // return storage.get('window-main')
    return null
  }
}

// IPC处理器注册
function registerIPCHandlers() {
  // 窗口操作
  ipcMain.handle('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
  })
  
  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })
  
  ipcMain.handle('window:getPosition', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { x: 0, y: 0 }
    const bounds = window.getBounds()
    return { x: bounds.x, y: bounds.y }
  })
  
  ipcMain.handle('window:setPosition', (event, x: number, y: number) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.setPosition(x, y)
  })
  
  // 系统信息
  ipcMain.handle('system:getPlatform', () => {
    return process.platform
  })
  
  ipcMain.handle('system:getVersion', () => {
    return app.getVersion()
  })
  
  ipcMain.handle('system:getVersions', () => {
    return process.versions
  })
}

// 应用生命周期
app.whenReady().then(() => {
  registerIPCHandlers()
  
  const windowManager = new WindowManager()
  const savedState = windowManager.restoreWindowState()
  
  windowManager.createWindow(savedState || undefined)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const windowManager = new WindowManager()
    windowManager.createWindow()
  }
})

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // 记录到日志文件
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  // 记录到日志文件
})
```

### 预加载脚本实现

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

const electronAPI: ElectronAPI = {
  window: {
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    getPosition: () => ipcRenderer.invoke('window:getPosition'),
    setPosition: (x, y) => ipcRenderer.invoke('window:setPosition', x, y),
    getSize: () => ipcRenderer.invoke('window:getSize'),
    setSize: (width, height) => ipcRenderer.invoke('window:setSize', width, height)
  },
  
  system: {
    platform: process.platform,
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getVersions: () => ipcRenderer.invoke('system:getVersions'),
    getPath: (name) => ipcRenderer.invoke('system:getPath', name)
  },
  
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
  },
  
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

// 安全地暴露API
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
```

### Composable实现

```typescript
// src/composables/useElectron.ts
import { ref, computed, onMounted } from 'vue'

export function useElectron() {
  const isElectron = computed(() => {
    return typeof window !== 'undefined' && 'electronAPI' in window
  })
  
  const platform = ref<string>('')
  const windowPosition = ref({ x: 0, y: 0 })
  const windowSize = ref({ width: 0, height: 0 })
  
  onMounted(async () => {
    if (!isElectron.value) return
    
    platform.value = window.electronAPI.system.platform
    windowPosition.value = await window.electronAPI.window.getPosition()
    windowSize.value = await window.electronAPI.window.getSize()
  })
  
  const closeWindow = async () => {
    if (!isElectron.value) return
    await window.electronAPI.window.close()
  }
  
  const minimizeWindow = async () => {
    if (!isElectron.value) return
    await window.electronAPI.window.minimize()
  }
  
  const maximizeWindow = async () => {
    if (!isElectron.value) return
    await window.electronAPI.window.maximize()
  }
  
  const updateWindowPosition = async (x: number, y: number) => {
    if (!isElectron.value) return
    await window.electronAPI.window.setPosition(x, y)
    windowPosition.value = { x, y }
  }
  
  const updateWindowSize = async (width: number, height: number) => {
    if (!isElectron.value) return
    await window.electronAPI.window.setSize(width, height)
    windowSize.value = { width, height }
  }
  
  return {
    isElectron,
    platform,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    windowPosition,
    windowSize,
    updateWindowPosition,
    updateWindowSize
  }
}
```

## 性能考虑

### 优化策略

1. **窗口创建优化**
   - 延迟加载非关键资源
   - 使用show: false创建窗口，ready-to-show时显示
   - 预加载常用窗口配置

2. **IPC通信优化**
   - 批量处理IPC消息
   - 使用MessagePort进行大数据传输
   - 避免频繁的同步IPC调用

3. **内存管理**
   - 及时清理关闭窗口的引用
   - 限制窗口数量上限
   - 监控内存使用

4. **启动优化**
   - 延迟加载非必需模块
   - 使用V8快照加速启动
   - 优化预加载脚本大小

### 性能指标

- 应用启动时间 < 2秒
- 窗口创建时间 < 500ms
- IPC往返时间 < 50ms
- 内存占用 < 100MB（单窗口）

## 安全考虑

1. **上下文隔离**
   - 始终启用contextIsolation
   - 禁用nodeIntegration
   - 使用sandbox模式

2. **API暴露限制**
   - 只暴露必需的API
   - 验证所有IPC输入
   - 使用白名单机制

3. **内容安全策略**
   - 设置严格的CSP
   - 禁止加载外部资源
   - 验证所有URL

4. **权限管理**
   - 最小权限原则
   - 运行时权限检查
   - 审计敏感操作

## 跨平台兼容性

### Windows特定处理

```typescript
if (process.platform === 'win32') {
  // Windows特定配置
  app.setAppUserModelId('com.example.sticky-notes')
}
```

### macOS特定处理

```typescript
if (process.platform === 'darwin') {
  // macOS特定配置
  app.dock.setIcon('/path/to/icon.png')
  
  // 处理macOS的activate事件
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}
```

### Linux特定处理

```typescript
if (process.platform === 'linux') {
  // Linux特定配置
  app.commandLine.appendSwitch('enable-transparent-visuals')
  app.commandLine.appendSwitch('disable-gpu')
}
```

## 未来扩展

1. **多窗口管理**
   - 窗口间通信
   - 窗口分组
   - 窗口布局管理

2. **原生菜单**
   - 应用菜单
   - 上下文菜单
   - 托盘菜单

3. **系统集成**
   - 全局快捷键
   - 系统托盘
   - 通知中心

4. **自动更新**
   - electron-updater集成
   - 增量更新
   - 更新通知
