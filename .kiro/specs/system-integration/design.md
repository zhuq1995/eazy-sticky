# 设计文档 - 系统集成

## 概述

本文档描述了便签应用与操作系统深度集成的设计方案。系统集成模块将实现系统托盘、全局快捷键、多显示器支持、开机自启动、窗口状态恢复、系统主题适配和性能优化等功能，为用户提供完整的桌面应用体验。

### 设计目标

1. **系统托盘集成**：提供托盘图标和菜单，支持最小化到托盘和托盘通知
2. **全局快捷键**：实现系统级快捷键，支持自定义配置
3. **多显示器支持**：正确处理多显示器环境，支持跨显示器拖拽
4. **系统集成优化**：实现开机自启动、窗口状态恢复、系统主题适配
5. **性能优化**：优化资源占用，提升应用响应速度

### 技术栈

- Electron Tray API：系统托盘功能
- Electron globalShortcut API：全局快捷键
- Electron screen API：多显示器支持
- Electron app API：开机自启动和应用生命周期
- Electron nativeTheme API：系统主题检测

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      主进程 (Main Process)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  TrayManager     │  │ ShortcutManager  │                │
│  │  - 托盘图标      │  │ - 快捷键注册     │                │
│  │  - 托盘菜单      │  │ - 快捷键配置     │                │
│  │  - 托盘通知      │  │ - 冲突处理       │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ DisplayManager   │  │ AutoLauncher     │                │
│  │  - 显示器检测    │  │ - 自启动管理     │                │
│  │  - 跨屏拖拽      │  │ - 配置持久化     │                │
│  │  - 位置调整      │  └──────────────────┘                │
│  └──────────────────┘                                        │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │WindowStateManager│  │  ThemeAdapter    │                │
│  │  - 状态保存      │  │ - 主题检测       │                │
│  │  - 状态恢复      │  │ - 主题切换       │                │
│  │  - 位置验证      │  │ - 主题同步       │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                               │
│  ┌──────────────────────────────────────────┐               │
│  │         WindowManager (已存在)            │               │
│  │  - 窗口创建和管理                         │               │
│  │  - IPC 通信                               │               │
│  └──────────────────────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   渲染进程 (Renderer Process)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────┐               │
│  │         Vue 组件和 Composables             │               │
│  │  - 使用 Electron API 与主进程通信         │               │
│  │  - 响应系统事件                           │               │
│  └──────────────────────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 模块职责

#### TrayManager（系统托盘管理器）
- 创建和管理系统托盘图标
- 构建和更新托盘菜单
- 显示托盘通知
- 处理托盘事件

#### ShortcutManager（全局快捷键管理器）
- 注册和注销全局快捷键
- 管理快捷键配置
- 处理快捷键冲突
- 提供快捷键自定义接口

#### DisplayManager（显示器管理器）
- 检测和监控显示器配置
- 处理跨显示器窗口移动
- 验证和调整窗口位置
- 处理显示器变更事件

#### AutoLauncher（自动启动管理器）
- 管理开机自启动配置
- 跨平台自启动实现
- 配置持久化

#### WindowStateManager（窗口状态管理器）
- 保存窗口状态到本地存储
- 恢复窗口状态
- 验证窗口位置有效性
- 处理多窗口状态

#### ThemeAdapter（主题适配器）
- 检测系统主题
- 监听主题变更
- 同步主题到渲染进程
- 提供手动主题切换

## 组件和接口设计

### 1. TrayManager

#### 接口定义

```typescript
interface TrayMenuItem {
  label: string
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
  click?: () => void
  enabled?: boolean
  visible?: boolean
  checked?: boolean
  submenu?: TrayMenuItem[]
}

interface TrayNotification {
  title: string
  body: string
  icon?: string
  silent?: boolean
}

class TrayManager {
  private tray: Tray | null
  private windowManager: WindowManager
  
  constructor(windowManager: WindowManager)
  
  // 创建托盘图标
  createTray(): void
  
  // 更新托盘菜单
  updateMenu(items: TrayMenuItem[]): void
  
  // 显示托盘通知
  showNotification(notification: TrayNotification): void
  
  // 销毁托盘
  destroy(): void
  
  // 获取默认菜单
  private getDefaultMenu(): TrayMenuItem[]
  
  // 处理托盘点击
  private handleTrayClick(): void
  
  // 处理托盘右键点击
  private handleTrayRightClick(): void
}
```

#### 实现细节

**托盘图标创建**
- 使用 Electron Tray API 创建托盘图标
- 根据平台选择合适的图标尺寸（Windows: 16x16, macOS: 22x22）
- 支持图标模板模式（macOS）

**托盘菜单**
- 提供默认菜单项：新建便签、显示所有便签、隐藏所有便签、退出
- 支持动态更新菜单
- 支持子菜单和分隔符

**托盘通知**
- 使用 Electron Notification API
- 支持点击通知跳转到相关窗口
- 自动关闭通知（3秒后）

**平台差异处理**
- Windows: 支持托盘图标右键菜单
- macOS: 支持图标模板和深色模式
- Linux: 基础托盘功能

### 2. ShortcutManager

#### 接口定义

```typescript
interface ShortcutConfig {
  key: string
  action: string
  enabled: boolean
}

interface ShortcutConflict {
  key: string
  reason: string
}

class ShortcutManager {
  private shortcuts: Map<string, ShortcutConfig>
  private windowManager: WindowManager
  private configPath: string
  
  constructor(windowManager: WindowManager)
  
  // 注册快捷键
  register(key: string, action: string): boolean
  
  // 注销快捷键
  unregister(key: string): void
  
  // 注销所有快捷键
  unregisterAll(): void
  
  // 检查快捷键是否已注册
  isRegistered(key: string): boolean
  
  // 更新快捷键配置
  updateConfig(config: ShortcutConfig): boolean
  
  // 获取所有快捷键配置
  getAllConfigs(): ShortcutConfig[]
  
  // 加载配置
  private loadConfig(): void
  
  // 保存配置
  private saveConfig(): void
  
  // 验证快捷键格式
  private validateKey(key: string): boolean
  
  // 处理快捷键冲突
  private handleConflict(key: string): ShortcutConflict | null
}
```

#### 实现细节

**快捷键注册**
- 使用 Electron globalShortcut API
- 默认快捷键：Ctrl+Shift+N（Windows/Linux）、Cmd+Shift+N（macOS）
- 注册失败时尝试备用快捷键

**快捷键配置**
- 配置存储在 userData 目录
- JSON 格式存储
- 支持运行时更新

**冲突处理**
- 检测快捷键是否已被占用
- 记录冲突日志
- 提供用户通知

**快捷键验证**
- 验证快捷键格式（如 Ctrl+Shift+N）
- 检查修饰键组合的有效性
- 防止无效快捷键注册

### 3. DisplayManager

#### 接口定义

```typescript
interface DisplayInfo {
  id: number
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  workArea: {
    x: number
    y: number
    width: number
    height: number
  }
  scaleFactor: number
  rotation: number
  internal: boolean
}

class DisplayManager {
  private displays: DisplayInfo[]
  private windowManager: WindowManager
  
  constructor(windowManager: WindowManager)
  
  // 获取所有显示器
  getAllDisplays(): DisplayInfo[]
  
  // 获取主显示器
  getPrimaryDisplay(): DisplayInfo
  
  // 获取指定点所在的显示器
  getDisplayNearestPoint(point: { x: number; y: number }): DisplayInfo
  
  // 检查位置是否在显示器范围内
  isPositionInBounds(position: { x: number; y: number }): boolean
  
  // 调整位置到显示器内
  adjustPositionToBounds(position: { x: number; y: number }): { x: number; y: number }
  
  // 处理显示器变更
  private handleDisplayChange(): void
  
  // 更新显示器列表
  private updateDisplays(): void
  
  // 迁移窗口到有效显示器
  private migrateWindowsToValidDisplay(): void
}
```

#### 实现细节

**显示器检测**
- 使用 Electron screen API
- 获取所有显示器的边界和工作区
- 识别主显示器

**跨显示器支持**
- 允许窗口在显示器间自由移动
- 验证窗口位置是否在有效范围内
- 自动调整超出范围的窗口位置

**显示器变更处理**
- 监听 display-added、display-removed、display-metrics-changed 事件
- 显示器断开时迁移窗口到主显示器
- 更新窗口位置缓存

**位置验证**
- 检查窗口中心点是否在显示器内
- 确保窗口至少部分可见
- 处理负坐标和多显示器布局

### 4. AutoLauncher

#### 接口定义

```typescript
interface AutoLaunchConfig {
  enabled: boolean
  hidden: boolean
  path?: string
}

class AutoLauncher {
  private config: AutoLaunchConfig
  private configPath: string
  
  constructor()
  
  // 启用开机自启动
  enable(hidden?: boolean): Promise<boolean>
  
  // 禁用开机自启动
  disable(): Promise<boolean>
  
  // 检查是否已启用
  isEnabled(): Promise<boolean>
  
  // 获取配置
  getConfig(): AutoLaunchConfig
  
  // 更新配置
  updateConfig(config: Partial<AutoLaunchConfig>): Promise<boolean>
  
  // 加载配置
  private loadConfig(): void
  
  // 保存配置
  private saveConfig(): void
  
  // 平台特定实现
  private enableWindows(): Promise<boolean>
  private enableMacOS(): Promise<boolean>
  private enableLinux(): Promise<boolean>
}
```

#### 实现细节

**Windows 实现**
- 使用注册表：HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
- 写入应用路径和启动参数
- 支持隐藏启动（--hidden 参数）

**macOS 实现**
- 使用 app.setLoginItemSettings API
- 配置 openAtLogin 和 openAsHidden
- 自动处理应用路径

**Linux 实现**
- 创建 .desktop 文件到 ~/.config/autostart/
- 配置 Exec 和 Hidden 属性
- 处理不同桌面环境

**配置持久化**
- 配置存储在 userData 目录
- JSON 格式
- 应用启动时加载配置

### 5. WindowStateManager

#### 接口定义

```typescript
interface WindowState {
  id: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isMaximized: boolean
  isAlwaysOnTop: boolean
  displayId: number
  lastUpdated: number
}

interface StoredState {
  version: number
  windows: {
    [windowId: string]: WindowState
  }
}

class WindowStateManager {
  private stateFilePath: string
  private state: StoredState
  private displayManager: DisplayManager
  private saveDebounceTimer: NodeJS.Timeout | null
  
  constructor(displayManager: DisplayManager)
  
  // 保存窗口状态
  saveWindowState(windowId: string, state: WindowState): void
  
  // 恢复窗口状态
  restoreWindowState(windowId: string): WindowState | null
  
  // 获取所有窗口状态
  getAllWindowStates(): WindowState[]
  
  // 删除窗口状态
  deleteWindowState(windowId: string): void
  
  // 清理过期状态
  cleanupOldStates(maxAge: number): void
  
  // 加载状态
  private loadState(): void
  
  // 保存状态到文件（防抖）
  private saveStateDebounced(): void
  
  // 立即保存状态
  private saveStateImmediate(): void
  
  // 验证状态有效性
  private validateState(state: WindowState): boolean
}
```

#### 实现细节

**状态保存**
- 监听窗口移动、调整大小、最大化等事件
- 使用防抖机制减少写入频率（500ms）
- 保存窗口位置、尺寸、置顶状态等

**状态恢复**
- 应用启动时读取保存的状态
- 验证位置是否在有效显示器内
- 超出范围时调整到主显示器

**状态验证**
- 检查窗口位置是否在显示器范围内
- 验证窗口尺寸是否合理
- 处理显示器配置变更

**数据格式**
```json
{
  "version": 1,
  "windows": {
    "window-1": {
      "id": "window-1",
      "bounds": { "x": 100, "y": 100, "width": 300, "height": 300 },
      "isMaximized": false,
      "isAlwaysOnTop": false,
      "displayId": 1,
      "lastUpdated": 1700000000000
    }
  }
}
```

### 6. ThemeAdapter

#### 接口定义

```typescript
type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeConfig {
  mode: ThemeMode
  followSystem: boolean
}

class ThemeAdapter {
  private currentTheme: ThemeMode
  private config: ThemeConfig
  private windowManager: WindowManager
  
  constructor(windowManager: WindowManager)
  
  // 获取当前主题
  getCurrentTheme(): ThemeMode
  
  // 设置主题
  setTheme(mode: ThemeMode): void
  
  // 切换主题
  toggleTheme(): void
  
  // 获取系统主题
  getSystemTheme(): 'light' | 'dark'
  
  // 监听系统主题变更
  private watchSystemTheme(): void
  
  // 通知渲染进程主题变更
  private notifyThemeChange(theme: ThemeMode): void
  
  // 加载配置
  private loadConfig(): void
  
  // 保存配置
  private saveConfig(): void
}
```

#### 实现细节

**主题检测**
- 使用 Electron nativeTheme API
- 检测系统深色/浅色模式
- 支持手动切换主题

**主题同步**
- 监听 nativeTheme.on('updated') 事件
- 通过 IPC 通知渲染进程
- 渲染进程更新 CSS 变量或类名

**主题配置**
- 支持三种模式：light、dark、system
- system 模式跟随系统主题
- 配置持久化到本地存储

**渲染进程集成**
- 通过 IPC 接收主题变更事件
- 更新 document.documentElement 的 data-theme 属性
- CSS 使用属性选择器应用主题样式

## 数据模型

### 配置文件结构

#### 快捷键配置（shortcuts.json）
```json
{
  "version": 1,
  "shortcuts": [
    {
      "key": "Ctrl+Shift+N",
      "action": "createNote",
      "enabled": true
    }
  ]
}
```

#### 自启动配置（autolaunch.json）
```json
{
  "version": 1,
  "enabled": true,
  "hidden": false,
  "path": "/path/to/app"
}
```

#### 主题配置（theme.json）
```json
{
  "version": 1,
  "mode": "system",
  "followSystem": true
}
```

#### 窗口状态（window-state.json）
```json
{
  "version": 1,
  "windows": {
    "window-1": {
      "id": "window-1",
      "bounds": {
        "x": 100,
        "y": 100,
        "width": 300,
        "height": 300
      },
      "isMaximized": false,
      "isAlwaysOnTop": false,
      "displayId": 1,
      "lastUpdated": 1700000000000
    }
  }
}
```

## 错误处理

### 错误类型

1. **托盘创建失败**
   - 原因：图标文件不存在、系统不支持托盘
   - 处理：记录错误日志，应用继续运行

2. **快捷键注册失败**
   - 原因：快捷键被占用、格式无效
   - 处理：尝试备用快捷键，通知用户

3. **显示器检测失败**
   - 原因：系统 API 异常
   - 处理：使用默认显示器配置

4. **自启动配置失败**
   - 原因：权限不足、平台不支持
   - 处理：记录错误，通知用户

5. **状态文件读写失败**
   - 原因：文件损坏、权限不足
   - 处理：使用默认状态，重新创建文件

### 错误处理策略

```typescript
class ErrorHandler {
  // 处理托盘错误
  static handleTrayError(error: Error): void {
    logger.error('托盘创建失败', error)
    // 应用继续运行，不影响核心功能
  }
  
  // 处理快捷键错误
  static handleShortcutError(error: Error, key: string): void {
    logger.error('快捷键注册失败', error, { key })
    // 尝试备用快捷键
  }
  
  // 处理显示器错误
  static handleDisplayError(error: Error): void {
    logger.error('显示器检测失败', error)
    // 使用主显示器作为后备
  }
  
  // 处理文件读写错误
  static handleFileError(error: Error, filePath: string): void {
    logger.error('文件操作失败', error, { filePath })
    // 使用默认配置
  }
}
```

## 测试策略

### 单元测试

1. **TrayManager 测试**
   - 托盘创建和销毁
   - 菜单更新
   - 通知显示

2. **ShortcutManager 测试**
   - 快捷键注册和注销
   - 配置加载和保存
   - 冲突检测

3. **DisplayManager 测试**
   - 显示器检测
   - 位置验证
   - 位置调整算法

4. **AutoLauncher 测试**
   - 启用和禁用自启动
   - 配置持久化
   - 平台特定实现

5. **WindowStateManager 测试**
   - 状态保存和恢复
   - 状态验证
   - 防抖机制

6. **ThemeAdapter 测试**
   - 主题检测
   - 主题切换
   - 系统主题监听

### 集成测试

1. **系统托盘集成**
   - 托盘菜单与窗口管理器交互
   - 托盘通知与窗口聚焦

2. **快捷键集成**
   - 快捷键触发窗口创建
   - 快捷键与窗口管理器交互

3. **多显示器集成**
   - 窗口跨显示器移动
   - 显示器变更时窗口迁移

4. **状态恢复集成**
   - 应用重启后恢复窗口状态
   - 多窗口状态恢复

### 手动测试

1. **托盘功能**
   - 托盘图标显示
   - 托盘菜单操作
   - 托盘通知

2. **快捷键功能**
   - 全局快捷键触发
   - 快捷键冲突处理
   - 快捷键自定义

3. **多显示器**
   - 跨显示器拖拽
   - 显示器断开连接
   - 显示器重新连接

4. **开机自启动**
   - 启用自启动后重启系统
   - 禁用自启动后重启系统

5. **主题适配**
   - 系统主题切换
   - 手动主题切换
   - 主题同步到所有窗口

## 性能优化

### 优化策略

1. **防抖机制**
   - 窗口状态保存使用防抖（500ms）
   - 显示器变更事件使用防抖（200ms）

2. **资源释放**
   - 应用空闲时释放不必要的监听器
   - 窗口关闭时清理相关资源

3. **窗口数量限制**
   - 限制最大窗口数量为 20 个
   - 达到上限时禁止创建新窗口

4. **配置缓存**
   - 配置文件读取后缓存在内存
   - 配置变更时才写入文件

5. **事件节流**
   - 高频事件（如鼠标移动）使用节流
   - 降低事件处理频率

### 性能指标

- 托盘菜单打开时间：< 100ms
- 快捷键响应时间：< 50ms
- 窗口状态保存时间：< 10ms
- 显示器检测时间：< 50ms
- 主题切换时间：< 100ms

## 平台兼容性

### Windows
- ✅ 系统托盘
- ✅ 全局快捷键
- ✅ 多显示器支持
- ✅ 开机自启动（注册表）
- ✅ 系统主题适配

### macOS
- ✅ 系统托盘（图标模板）
- ✅ 全局快捷键
- ✅ 多显示器支持
- ✅ 开机自启动（Login Items）
- ✅ 系统主题适配

### Linux
- ✅ 系统托盘（基础功能）
- ✅ 全局快捷键
- ✅ 多显示器支持
- ✅ 开机自启动（.desktop 文件）
- ⚠️ 系统主题适配（部分桌面环境）

## 安全考虑

1. **快捷键安全**
   - 验证快捷键格式
   - 防止恶意快捷键注册
   - 限制快捷键数量

2. **文件安全**
   - 配置文件存储在 userData 目录
   - 验证文件内容格式
   - 处理文件损坏情况

3. **权限控制**
   - 自启动需要用户确认
   - 快捷键冲突时提示用户
   - 敏感操作记录日志

## 未来扩展

1. **托盘增强**
   - 托盘图标动画
   - 更丰富的通知类型
   - 托盘菜单自定义

2. **快捷键增强**
   - 更多快捷键操作
   - 快捷键配置界面
   - 快捷键帮助文档

3. **显示器增强**
   - 记住每个显示器的窗口布局
   - 显示器配置预设
   - 虚拟桌面支持

4. **主题增强**
   - 自定义主题颜色
   - 主题预设
   - 主题导入导出
