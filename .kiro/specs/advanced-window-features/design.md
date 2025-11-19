# 设计文档 - 高级窗口功能

## 概述

高级窗口功能模块为便签应用提供窗口拖拽、窗口置顶、多窗口管理等桌面应用的高级特性。本模块基于VueUse的拖拽功能和Electron的窗口API实现，提供流畅的用户体验和强大的窗口管理能力。

### 设计目标

1. **流畅的拖拽体验**：60fps的窗口拖拽性能
2. **智能边界限制**：防止窗口超出屏幕范围
3. **灵活的窗口管理**：支持多窗口创建和管理
4. **状态持久化**：记住窗口位置、尺寸和置顶状态
5. **窗口间协作**：支持窗口间数据同步

### 技术选型

- **拖拽实现**：VueUse useDraggable
- **窗口API**：Electron BrowserWindow
- **状态管理**：Pinia Store
- **动画优化**：requestAnimationFrame + CSS Transform
- **类型系统**：TypeScript 5.6+

## 架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Vue Components Layer                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  StickyNote    │  │   Toolbar      │  │   Settings   │  │
│  │   Component    │  │   Component    │  │   Component  │  │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘  │
│           │                   │                   │          │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   Composables Layer                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  useDraggable  │  │   useWindow    │  │ useMultiWin  │  │
│  │   (VueUse)     │  │   (Custom)     │  │   (Custom)   │  │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘  │
│           │                   │                   │          │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Pinia Store Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Notes Store (Extended)                   │   │
│  │  - Window States                                      │   │
│  │  - Window List Management                             │   │
│  │  - Inter-Window Communication                         │   │
│  └────────────────────────┬─────────────────────────────┘   │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  Electron IPC Layer                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Window Drag   │  │  Always On Top │  │  Multi-Window│  │
│  │   Handlers     │  │    Handlers    │  │   Handlers   │  │
│  └────────┬───────┘  └────────┬───────┘  └──────┬───────┘  │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────┐
│                  Electron Main Process                       │
│                   Window Manager                             │
└─────────────────────────────────────────────────────────────┘
```

### 窗口拖拽流程

```
User Action                 Renderer Process              Main Process
    │                            │                            │
    │ 1. Mouse Down              │                            │
    ├───────────────────────────>│                            │
    │                            │ 2. Start Drag              │
    │                            │    (useDraggable)          │
    │                            │                            │
    │ 3. Mouse Move              │                            │
    ├───────────────────────────>│                            │
    │                            │ 4. Calculate Position      │
    │                            │    (with boundary check)   │
    │                            │                            │
    │                            │ 5. Update Window Position  │
    │                            ├───────────────────────────>│
    │                            │    IPC: setPosition        │
    │                            │                            │
    │                            │                            │ 6. Move Window
    │                            │                            │
    │ 7. Mouse Up                │                            │
    ├───────────────────────────>│                            │
    │                            │ 8. End Drag                │
    │                            │                            │
    │                            │ 9. Save Position           │
    │                            │    (debounced)             │
    │                            │                            │
```

## 组件和接口

### 1. 拖拽 Composable (composables/useDraggable.ts)

```typescript
interface UseDraggableOptions {
  // 拖拽句柄元素
  handle?: Ref<HTMLElement | null>
  
  // 拖拽边界限制
  boundary?: {
    left: number
    top: number
    right: number
    bottom: number
  }
  
  // 最小可见区域（像素）
  minVisibleArea?: number
  
  // 拖拽开始回调
  onStart?: (position: { x: number; y: number }) => void
  
  // 拖拽中回调
  onMove?: (position: { x: number; y: number }) => void
  
  // 拖拽结束回调
  onEnd?: (position: { x: number; y: number }) => void
  
  // 是否禁用拖拽
  disabled?: Ref<boolean>
}

interface UseDraggableReturn {
  // 当前位置
  position: Ref<{ x: number; y: number }>
  
  // 是否正在拖拽
  isDragging: Ref<boolean>
  
  // 拖拽样式
  style: ComputedRef<CSSProperties>
  
  // 手动设置位置
  setPosition: (x: number, y: number) => void
  
  // 重置位置
  reset: () => void
}

function useDraggable(
  target: Ref<HTMLElement | null>,
  options?: UseDraggableOptions
): UseDraggableReturn
```

### 2. 窗口操作 Composable (composables/useWindow.ts)

```typescript
interface UseWindowOptions {
  // 窗口ID（用于多窗口场景）
  windowId?: string
  
  // 是否自动保存状态
  autoSave?: boolean
  
  // 保存防抖延迟（毫秒）
  saveDelay?: number
}

interface UseWindowReturn {
  // 窗口状态
  windowState: Ref<{
    position: { x: number; y: number }
    size: { width: number; height: number }
    isAlwaysOnTop: boolean
    isMinimized: boolean
    isFocused: boolean
  }>
  
  // 窗口操作方法
  setPosition: (x: number, y: number) => Promise<void>
  setSize: (width: number, height: number) => Promise<void>
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
  minimize: () => Promise<void>
  close: () => Promise<void>
  focus: () => Promise<void>
  
  // 状态查询
  getPosition: () => Promise<{ x: number; y: number }>
  getSize: () => Promise<{ width: number; height: number }>
  isAlwaysOnTop: () => Promise<boolean>
  
  // 边界检查
  checkBoundary: (position: { x: number; y: number }) => { x: number; y: number }
  
  // 保存状态
  saveState: () => Promise<void>
  
  // 恢复状态
  restoreState: () => Promise<void>
}

function useWindow(options?: UseWindowOptions): UseWindowReturn
```

### 3. 多窗口管理 Composable (composables/useMultiWindow.ts)

```typescript
interface WindowInfo {
  id: string
  noteId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isAlwaysOnTop: boolean
  createdAt: number
}

interface UseMultiWindowReturn {
  // 窗口列表
  windows: Ref<WindowInfo[]>
  
  // 当前窗口ID
  currentWindowId: Ref<string>
  
  // 创建新窗口
  createWindow: (noteId?: string, position?: { x: number; y: number }) => Promise<string>
  
  // 关闭窗口
  closeWindow: (windowId: string) => Promise<void>
  
  // 聚焦窗口
  focusWindow: (windowId: string) => Promise<void>
  
  // 获取窗口信息
  getWindowInfo: (windowId: string) => WindowInfo | undefined
  
  // 更新窗口信息
  updateWindowInfo: (windowId: string, info: Partial<WindowInfo>) => void
  
  // 窗口数量限制
  maxWindows: number
  canCreateWindow: ComputedRef<boolean>
  
  // 窗口间通信
  broadcast: (event: string, data: any) => void
  onBroadcast: (event: string, handler: (data: any) => void) => void
}

function useMultiWindow(): UseMultiWindowReturn
```

### 4. 主进程窗口管理器扩展

```typescript
// electron/main.ts 扩展

interface WindowManagerExtended {
  // 创建窗口（带位置偏移）
  createWindow(options?: {
    noteId?: string
    position?: { x: number; y: number }
    size?: { width: number; height: number }
    alwaysOnTop?: boolean
  }): BrowserWindow
  
  // 设置窗口置顶
  setAlwaysOnTop(windowId: number, alwaysOnTop: boolean): void
  
  // 获取窗口置顶状态
  isAlwaysOnTop(windowId: number): boolean
  
  // 获取所有窗口信息
  getAllWindowsInfo(): WindowInfo[]
  
  // 广播消息到所有窗口
  broadcastToAll(channel: string, data: any): void
  
  // 发送消息到特定窗口
  sendToWindow(windowId: number, channel: string, data: any): void
  
  // 计算新窗口位置（避免重叠）
  calculateNewWindowPosition(): { x: number; y: number }
  
  // 检查位置是否在屏幕内
  isPositionInScreen(position: { x: number; y: number }): boolean
  
  // 调整位置到屏幕内
  adjustPositionToScreen(position: { x: number; y: number }): { x: number; y: number }
}
```

## 数据模型

### 窗口状态

```typescript
interface WindowState {
  id: string
  noteId: string
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  isAlwaysOnTop: boolean
  isMinimized: boolean
  isFocused: boolean
  createdAt: number
  updatedAt: number
}

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}
```

### 拖拽状态

```typescript
interface DragState {
  isDragging: boolean
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  offset: { x: number; y: number }
  timestamp: number
}

interface DragConstraints {
  minX: number
  minY: number
  maxX: number
  maxY: number
  minVisibleArea: number
}
```

### 多窗口配置

```typescript
interface MultiWindowConfig {
  maxWindows: number
  defaultSize: { width: number; height: number }
  defaultPosition: { x: number; y: number }
  positionOffset: { x: number; y: number }
  minDistance: number
}
```

## 默认配置

```typescript
// 拖拽配置
const DEFAULT_DRAG_CONFIG = {
  minVisibleArea: 50, // 最小可见区域（像素）
  boundary: {
    left: 0,
    top: 0,
    right: screen.width,
    bottom: screen.height
  },
  saveDelay: 500 // 保存延迟（毫秒）
}

// 窗口配置
const DEFAULT_WINDOW_CONFIG = {
  width: 300,
  height: 300,
  minWidth: 200,
  minHeight: 200,
  maxWidth: 800,
  maxHeight: 800,
  alwaysOnTop: false
}

// 多窗口配置
const DEFAULT_MULTI_WINDOW_CONFIG: MultiWindowConfig = {
  maxWindows: 20,
  defaultSize: { width: 300, height: 300 },
  defaultPosition: { x: 100, y: 100 },
  positionOffset: { x: 30, y: 30 },
  minDistance: 20
}

// 性能配置
const PERFORMANCE_CONFIG = {
  dragThrottle: 16, // 拖拽节流（毫秒，约60fps）
  saveDebounce: 500, // 保存防抖（毫秒）
  animationDuration: 200 // 动画时长（毫秒）
}
```


## 正确性属性

*属性是指在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 拖拽开始触发

*对于任何*鼠标按下事件，如果在可拖拽区域，都应该开始拖拽操作并设置isDragging为true
**验证需求: 1.1**

### 属性 2: 拖拽位置跟随

*对于任何*鼠标移动事件，如果拖拽已开始，窗口位置都应该实时更新跟随鼠标
**验证需求: 1.2**

### 属性 3: 拖拽结束保存

*对于任何*鼠标释放事件，如果拖拽已开始，都应该结束拖拽并保存窗口位置
**验证需求: 1.3**

### 属性 4: 拖拽视觉反馈

*对于任何*拖拽状态，都应该有对应的视觉反馈（CSS类或样式）
**验证需求: 1.4**

### 属性 5: 可编辑区域不触发拖拽

*对于任何*在可编辑区域（contenteditable）的鼠标事件，都不应该触发窗口拖拽
**验证需求: 1.5**

### 属性 6: 左边界限制

*对于任何*窗口x坐标，如果小于0，都应该被限制为0
**验证需求: 2.1**

### 属性 7: 上边界限制

*对于任何*窗口y坐标，如果小于0，都应该被限制为0
**验证需求: 2.2**

### 属性 8: 右边界限制

*对于任何*窗口位置，如果超出屏幕右边界，都应该被限制在屏幕内
**验证需求: 2.3**

### 属性 9: 下边界限制

*对于任何*窗口位置，如果超出屏幕下边界，都应该被限制在屏幕内
**验证需求: 2.4**

### 属性 10: 最小可见区域

*对于任何*边界限制后的窗口位置，都应该保持至少50像素的可见区域
**验证需求: 2.5**

### 属性 11: 置顶状态设置

*对于任何*置顶操作，窗口的alwaysOnTop属性都应该变为true
**验证需求: 3.1**

### 属性 12: 置顶窗口层级

*对于任何*置顶状态的窗口，都应该显示在所有非置顶窗口之上
**验证需求: 3.2**

### 属性 13: 置顶状态切换

*对于任何*窗口，连续两次置顶操作应该切换状态（true -> false -> true）
**验证需求: 3.3**

### 属性 14: 置顶UI更新

*对于任何*置顶状态变更，置顶按钮的视觉状态都应该同步更新
**验证需求: 3.4**

### 属性 15: 置顶状态持久化

*对于任何*置顶状态变更，新状态都应该保存到持久化存储
**验证需求: 3.5**

### 属性 16: 创建窗口增加数量

*对于任何*创建窗口操作，窗口列表长度都应该增加1
**验证需求: 4.1**

### 属性 17: 窗口ID唯一性

*对于任何*新创建的窗口，其ID都应该与现有窗口ID不重复
**验证需求: 4.2**

### 属性 18: 新窗口位置偏移

*对于任何*新创建的窗口，其位置都应该相对于上一个窗口有偏移
**验证需求: 4.3**

### 属性 19: 窗口列表注册

*对于任何*新创建的窗口，都应该能在窗口列表中找到
**验证需求: 4.4**

### 属性 20: 关闭窗口操作

*对于任何*关闭窗口操作，该窗口都应该被销毁
**验证需求: 5.1**

### 属性 21: 关闭窗口减少数量

*对于任何*关闭窗口操作，窗口列表长度都应该减少1
**验证需求: 5.2**

### 属性 22: 关闭时保存数据

*对于任何*关闭窗口操作，该窗口对应的便签数据都应该被保存
**验证需求: 5.3**

### 属性 23: 关闭时清理监听器

*对于任何*关闭的窗口，其所有事件监听器都应该被移除
**验证需求: 5.4**

### 属性 24: 窗口状态响应式

*对于任何*窗口状态数据，都应该是响应式的（Ref或Reactive）
**验证需求: 6.1**

### 属性 25: 位置状态自动更新

*对于任何*窗口位置变更，响应式的位置状态都应该自动更新
**验证需求: 6.2**

### 属性 26: 尺寸状态自动更新

*对于任何*窗口尺寸变更，响应式的尺寸状态都应该自动更新
**验证需求: 6.3**

### 属性 27: 置顶状态自动更新

*对于任何*窗口置顶状态变更，响应式的置顶状态都应该自动更新
**验证需求: 6.4**

### 属性 28: 组件卸载清理

*对于任何*组件卸载，所有窗口状态监听器都应该被清理
**验证需求: 6.5**

### 属性 29: 位置变更持久化

*对于任何*窗口位置变更，新位置都应该保存到持久化存储
**验证需求: 7.1**

### 属性 30: 位置恢复

*对于任何*存储中的有效位置数据，应用启动时都应该使用该位置创建窗口
**验证需求: 7.3**


### 属性 31: 多窗口独立保存

*对于任何*窗口，其位置和状态都应该独立保存和恢复
**验证需求: 7.5**

### 属性 32: 尺寸调整操作

*对于任何*尺寸调整操作，窗口的width和height都应该改变
**验证需求: 8.1**

### 属性 33: 最小尺寸限制

*对于任何*窗口尺寸，如果小于200x200，都应该被限制为最小尺寸
**验证需求: 8.2**

### 属性 34: 最大尺寸限制

*对于任何*窗口尺寸，如果大于800x800，都应该被限制为最大尺寸
**验证需求: 8.3**

### 属性 35: 尺寸变更持久化

*对于任何*窗口尺寸变更，新尺寸都应该保存到持久化存储
**验证需求: 8.4**

### 属性 36: 内容区域自适应

*对于任何*窗口尺寸变更，内容区域都应该调整以适应新尺寸
**验证需求: 8.5**

### 属性 37: 数据变更广播

*对于任何*窗口的数据变更，都应该广播通知到其他窗口
**验证需求: 9.1**

### 属性 38: 接收通知刷新

*对于任何*接收到的数据更新通知，窗口都应该刷新显示内容
**验证需求: 9.2**

### 属性 39: 创建时订阅事件

*对于任何*新创建的窗口，都应该订阅全局数据变更事件
**验证需求: 9.3**

### 属性 40: 关闭时取消订阅

*对于任何*关闭的窗口，都应该取消订阅全局数据变更事件
**验证需求: 9.4**

### 属性 41: 同步失败保持状态

*对于任何*数据同步失败，窗口状态都应该保持不变且错误被记录
**验证需求: 9.5**

### 属性 42: 拖拽性能要求

*对于任何*拖拽操作，窗口位置更新应该在16毫秒内完成（60fps）
**验证需求: 10.1**

### 属性 43: 使用RAF优化

*对于任何*拖拽操作，都应该使用requestAnimationFrame进行渲染优化
**验证需求: 10.2**

### 属性 44: 保存防抖延迟

*对于任何*拖拽结束，位置保存都应该使用防抖机制延迟执行
**验证需求: 10.3**

### 属性 45: 多窗口独立拖拽

*对于任何*窗口的拖拽操作，都应该独立处理不互相影响
**验证需求: 10.4**

### 属性 46: 拖拽不阻塞主线程

*对于任何*频繁的拖拽操作，都不应该阻塞主线程导致界面卡顿
**验证需求: 10.5**

### 属性 47: 快捷键创建窗口

*对于任何*快捷键触发，都应该创建新的便签窗口
**验证需求: 11.1**

### 属性 48: 快捷键窗口位置

*对于任何*快捷键创建的窗口，位置都应该在当前鼠标位置附近
**验证需求: 11.2**

### 属性 49: 聚焦窗口附近创建

*对于任何*有聚焦窗口时的快捷键操作，新窗口都应该在聚焦窗口附近
**验证需求: 11.3**

### 属性 50: 新窗口自动聚焦

*对于任何*快捷键创建的窗口，都应该自动获得焦点
**验证需求: 11.4**

### 属性 51: 拖拽开始添加CSS类

*对于任何*拖拽开始，都应该添加拖拽状态的CSS类到窗口元素
**验证需求: 12.1**

### 属性 52: 拖拽结束移除CSS类

*对于任何*拖拽结束，都应该移除拖拽状态的CSS类
**验证需求: 12.2**

### 属性 53: 使用Transform更新位置

*对于任何*窗口位置更新，都应该使用CSS transform而非top/left
**验证需求: 12.3**

### 属性 54: 拖拽中禁用过渡

*对于任何*拖拽进行中的状态，窗口的CSS过渡动画都应该被禁用
**验证需求: 12.4**

### 属性 55: 拖拽后恢复过渡

*对于任何*拖拽结束，窗口的CSS过渡动画都应该被恢复
**验证需求: 12.5**

## 错误处理

### 错误类型

```typescript
enum WindowFeatureErrorType {
  DRAG_ERROR = 'DRAG_ERROR',
  BOUNDARY_ERROR = 'BOUNDARY_ERROR',
  WINDOW_CREATION_ERROR = 'WINDOW_CREATION_ERROR',
  WINDOW_OPERATION_ERROR = 'WINDOW_OPERATION_ERROR',
  STATE_SYNC_ERROR = 'STATE_SYNC_ERROR',
  SHORTCUT_REGISTRATION_ERROR = 'SHORTCUT_REGISTRATION_ERROR'
}

interface WindowFeatureError {
  type: WindowFeatureErrorType
  message: string
  windowId?: string
  context?: any
  timestamp: number
}
```

### 错误处理策略

1. **拖拽错误**
   - 捕获拖拽过程中的异常
   - 重置拖拽状态
   - 记录错误但不中断用户操作

2. **边界检查错误**
   - 验证屏幕边界数据
   - 使用默认边界作为后备
   - 记录警告信息

3. **窗口创建错误**
   - 检查窗口数量限制
   - 验证位置和尺寸参数
   - 提供友好的错误提示

4. **窗口操作错误**
   - 验证窗口ID有效性
   - 捕获IPC通信错误
   - 提供操作失败反馈

5. **状态同步错误**
   - 捕获广播失败
   - 保持本地状态一致性
   - 记录同步失败日志


## 测试策略

### 单元测试

使用Vitest进行单元测试，覆盖以下场景：

1. **拖拽功能测试**
   - 测试拖拽开始、移动、结束的状态变化
   - 测试边界限制逻辑
   - 测试拖拽位置计算

2. **窗口操作测试**
   - 测试窗口创建、关闭、聚焦
   - 测试窗口状态管理
   - 测试窗口列表操作

3. **置顶功能测试**
   - 测试置顶状态切换
   - 测试置顶状态持久化
   - 测试置顶UI更新

4. **多窗口管理测试**
   - 测试窗口列表管理
   - 测试窗口间通信
   - 测试窗口数量限制

### 属性测试

使用fast-check进行属性测试，验证正确性属性：

**配置要求**：
- 每个属性测试至少运行100次迭代
- 每个测试必须使用注释标记对应的设计文档属性
- 标记格式：`// Feature: advanced-window-features, Property X: [属性描述]`

**测试库**：fast-check

**关键属性测试**：

1. **属性 6-10: 边界限制属性**
   - 生成随机窗口位置
   - 验证所有位置都在边界内

2. **属性 16-19: 窗口创建属性**
   - 生成随机创建操作
   - 验证窗口ID唯一性和列表一致性

3. **属性 20-23: 窗口关闭属性**
   - 生成随机关闭操作
   - 验证资源清理和数据保存

4. **属性 33-34: 尺寸限制属性**
   - 生成随机尺寸值
   - 验证尺寸在限制范围内

5. **属性 37-41: 窗口间通信属性**
   - 生成随机数据变更
   - 验证广播和同步机制

### 集成测试

1. **完整拖拽流程测试**
   - 开始拖拽 → 移动窗口 → 边界限制 → 结束拖拽 → 保存位置

2. **多窗口协作测试**
   - 创建多个窗口 → 数据变更 → 窗口间同步 → 验证一致性

3. **状态持久化测试**
   - 创建窗口 → 拖拽移动 → 调整尺寸 → 重启应用 → 验证恢复

### 性能测试

1. **拖拽性能测试**
   - 测试拖拽帧率（目标60fps）
   - 测试多窗口同时拖拽性能
   - 测试内存使用

2. **窗口创建性能测试**
   - 测试单个窗口创建时间
   - 测试批量创建窗口性能
   - 测试窗口数量对性能的影响

## 实现细节

### 拖拽实现

```typescript
// composables/useDraggable.ts
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useElectron } from './useElectron'

export function useDraggable(
  target: Ref<HTMLElement | null>,
  options: UseDraggableOptions = {}
) {
  const { isElectron, updateWindowPosition } = useElectron()
  
  const position = ref({ x: 0, y: 0 })
  const isDragging = ref(false)
  const startPos = ref({ x: 0, y: 0 })
  const offset = ref({ x: 0, y: 0 })
  
  // 计算边界限制
  const boundary = computed(() => {
    if (options.boundary) return options.boundary
    
    return {
      left: 0,
      top: 0,
      right: window.screen.width,
      bottom: window.screen.height
    }
  })
  
  // 边界检查
  const checkBoundary = (pos: { x: number; y: number }) => {
    const minVisible = options.minVisibleArea || 50
    const windowWidth = target.value?.offsetWidth || 300
    const windowHeight = target.value?.offsetHeight || 300
    
    let { x, y } = pos
    
    // 左边界
    x = Math.max(boundary.value.left, x)
    // 上边界
    y = Math.max(boundary.value.top, y)
    // 右边界（保持最小可见区域）
    x = Math.min(boundary.value.right - minVisible, x)
    // 下边界（保持最小可见区域）
    y = Math.min(boundary.value.bottom - minVisible, y)
    
    return { x, y }
  }
  
  // 鼠标按下
  const handleMouseDown = (e: MouseEvent) => {
    if (options.disabled?.value) return
    
    // 检查是否在可编辑区域
    const target = e.target as HTMLElement
    if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }
    
    // 检查是否在拖拽句柄
    if (options.handle?.value && !options.handle.value.contains(target)) {
      return
    }
    
    isDragging.value = true
    startPos.value = { x: e.clientX, y: e.clientY }
    offset.value = { x: position.value.x, y: position.value.y }
    
    // 添加拖拽CSS类
    target.value?.classList.add('dragging')
    
    options.onStart?.(position.value)
    
    e.preventDefault()
  }
  
  // 鼠标移动
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return
    
    requestAnimationFrame(() => {
      const deltaX = e.clientX - startPos.value.x
      const deltaY = e.clientY - startPos.value.y
      
      const newPos = {
        x: offset.value.x + deltaX,
        y: offset.value.y + deltaY
      }
      
      // 边界检查
      position.value = checkBoundary(newPos)
      
      // 更新Electron窗口位置
      if (isElectron.value) {
        updateWindowPosition(position.value.x, position.value.y)
      }
      
      options.onMove?.(position.value)
    })
  }
  
  // 鼠标释放
  const handleMouseUp = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    
    // 移除拖拽CSS类
    target.value?.classList.remove('dragging')
    
    options.onEnd?.(position.value)
  }
  
  // 挂载事件监听
  onMounted(() => {
    if (!target.value) return
    
    target.value.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  })
  
  // 清理事件监听
  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })
  
  // 计算样式
  const style = computed(() => ({
    transform: `translate(${position.value.x}px, ${position.value.y}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.2s ease'
  }))
  
  return {
    position,
    isDragging,
    style,
    setPosition: (x: number, y: number) => {
      position.value = checkBoundary({ x, y })
    },
    reset: () => {
      position.value = { x: 0, y: 0 }
    }
  }
}
```

### 窗口操作实现

```typescript
// composables/useWindow.ts
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useElectron } from './useElectron'
import { useNotesStore } from '@/stores/notes'

export function useWindow(options: UseWindowOptions = {}) {
  const { isElectron, windowPosition, windowSize } = useElectron()
  const store = useNotesStore()
  
  const windowState = ref({
    position: { x: 0, y: 0 },
    size: { width: 300, height: 300 },
    isAlwaysOnTop: false,
    isMinimized: false,
    isFocused: true
  })
  
  // 防抖保存
  const debouncedSave = useDebounceFn(() => {
    if (options.autoSave !== false) {
      saveState()
    }
  }, options.saveDelay || 500)
  
  // 监听状态变化
  watch(() => windowState.value.position, debouncedSave, { deep: true })
  watch(() => windowState.value.size, debouncedSave, { deep: true })
  watch(() => windowState.value.isAlwaysOnTop, debouncedSave)
  
  // 设置位置
  const setPosition = async (x: number, y: number) => {
    if (!isElectron.value) return
    
    await window.electronAPI.window.setPosition(x, y)
    windowState.value.position = { x, y }
  }
  
  // 设置尺寸
  const setSize = async (width: number, height: number) => {
    if (!isElectron.value) return
    
    // 尺寸限制
    width = Math.max(200, Math.min(800, width))
    height = Math.max(200, Math.min(800, height))
    
    await window.electronAPI.window.setSize(width, height)
    windowState.value.size = { width, height }
  }
  
  // 设置置顶
  const setAlwaysOnTop = async (alwaysOnTop: boolean) => {
    if (!isElectron.value) return
    
    await window.electronAPI.window.setAlwaysOnTop(alwaysOnTop)
    windowState.value.isAlwaysOnTop = alwaysOnTop
  }
  
  // 边界检查
  const checkBoundary = (position: { x: number; y: number }) => {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const minVisible = 50
    
    return {
      x: Math.max(0, Math.min(screenWidth - minVisible, position.x)),
      y: Math.max(0, Math.min(screenHeight - minVisible, position.y))
    }
  }
  
  // 保存状态
  const saveState = async () => {
    const windowId = options.windowId || 'main'
    await store.saveWindowState(windowId, windowState.value)
  }
  
  // 恢复状态
  const restoreState = async () => {
    const windowId = options.windowId || 'main'
    const saved = await store.loadWindowState(windowId)
    
    if (saved) {
      // 检查位置是否在屏幕内
      const adjustedPos = checkBoundary(saved.position)
      windowState.value = { ...saved, position: adjustedPos }
      
      // 应用到窗口
      await setPosition(adjustedPos.x, adjustedPos.y)
      await setSize(saved.size.width, saved.size.height)
      if (saved.isAlwaysOnTop) {
        await setAlwaysOnTop(true)
      }
    }
  }
  
  return {
    windowState,
    setPosition,
    setSize,
    setAlwaysOnTop,
    minimize: () => window.electronAPI?.window.minimize(),
    close: () => window.electronAPI?.window.close(),
    focus: () => window.focus(),
    getPosition: () => window.electronAPI?.window.getPosition(),
    getSize: () => window.electronAPI?.window.getSize(),
    isAlwaysOnTop: () => window.electronAPI?.window.isAlwaysOnTop(),
    checkBoundary,
    saveState,
    restoreState
  }
}
```


### 多窗口管理实现

```typescript
// composables/useMultiWindow.ts
import { ref, computed } from 'vue'
import { useElectron } from './useElectron'

export function useMultiWindow() {
  const { isElectron } = useElectron()
  const windows = ref<WindowInfo[]>([])
  const currentWindowId = ref<string>('')
  const maxWindows = 20
  
  // 计算新窗口位置
  const calculateNewPosition = () => {
    const offset = 30
    const lastWindow = windows.value[windows.value.length - 1]
    
    if (lastWindow) {
      return {
        x: lastWindow.position.x + offset,
        y: lastWindow.position.y + offset
      }
    }
    
    return { x: 100, y: 100 }
  }
  
  // 创建窗口
  const createWindow = async (noteId?: string, position?: { x: number; y: number }) => {
    if (windows.value.length >= maxWindows) {
      throw new Error('已达到窗口数量上限')
    }
    
    if (!isElectron.value) {
      throw new Error('仅在Electron环境支持多窗口')
    }
    
    const windowId = `window-${Date.now()}`
    const pos = position || calculateNewPosition()
    
    // 通过IPC创建新窗口
    await window.electronAPI.multiWindow.create({
      windowId,
      noteId: noteId || `note-${Date.now()}`,
      position: pos,
      size: { width: 300, height: 300 }
    })
    
    // 注册窗口
    const windowInfo: WindowInfo = {
      id: windowId,
      noteId: noteId || `note-${Date.now()}`,
      position: pos,
      size: { width: 300, height: 300 },
      isAlwaysOnTop: false,
      createdAt: Date.now()
    }
    
    windows.value.push(windowInfo)
    
    return windowId
  }
  
  // 关闭窗口
  const closeWindow = async (windowId: string) => {
    if (!isElectron.value) return
    
    await window.electronAPI.multiWindow.close(windowId)
    
    const index = windows.value.findIndex(w => w.id === windowId)
    if (index !== -1) {
      windows.value.splice(index, 1)
    }
  }
  
  // 聚焦窗口
  const focusWindow = async (windowId: string) => {
    if (!isElectron.value) return
    
    await window.electronAPI.multiWindow.focus(windowId)
  }
  
  // 获取窗口信息
  const getWindowInfo = (windowId: string) => {
    return windows.value.find(w => w.id === windowId)
  }
  
  // 更新窗口信息
  const updateWindowInfo = (windowId: string, info: Partial<WindowInfo>) => {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      Object.assign(window, info)
    }
  }
  
  // 广播消息
  const broadcast = (event: string, data: any) => {
    if (!isElectron.value) return
    
    window.electronAPI.multiWindow.broadcast(event, data)
  }
  
  // 监听广播
  const onBroadcast = (event: string, handler: (data: any) => void) => {
    if (!isElectron.value) return
    
    window.electronAPI.on(`broadcast:${event}`, handler)
  }
  
  const canCreateWindow = computed(() => windows.value.length < maxWindows)
  
  return {
    windows,
    currentWindowId,
    createWindow,
    closeWindow,
    focusWindow,
    getWindowInfo,
    updateWindowInfo,
    broadcast,
    onBroadcast,
    maxWindows,
    canCreateWindow
  }
}
```

### 主进程扩展

```typescript
// electron/main.ts 扩展

// 窗口管理器扩展
class WindowManagerExtended extends WindowManager {
  private windowsMap: Map<string, BrowserWindow> = new Map()
  
  createWindow(options: {
    windowId?: string
    noteId?: string
    position?: { x: number; y: number }
    size?: { width: number; height: number }
    alwaysOnTop?: boolean
  }): BrowserWindow {
    const windowId = options.windowId || `window-${Date.now()}`
    const position = options.position || this.calculateNewWindowPosition()
    
    const window = new BrowserWindow({
      ...DEFAULT_WINDOW_CONFIG,
      x: position.x,
      y: position.y,
      width: options.size?.width || 300,
      height: options.size?.height || 300,
      alwaysOnTop: options.alwaysOnTop || false
    })
    
    // 加载内容
    if (process.env.NODE_ENV === 'development') {
      window.loadURL(`${DEV_CONFIG.devServerUrl}?windowId=${windowId}&noteId=${options.noteId}`)
    } else {
      window.loadFile(PROD_CONFIG.indexPath, {
        query: { windowId, noteId: options.noteId }
      })
    }
    
    // 保存窗口引用
    this.windowsMap.set(windowId, window)
    
    // 监听窗口事件
    window.on('closed', () => {
      this.windowsMap.delete(windowId)
    })
    
    return window
  }
  
  setAlwaysOnTop(windowId: string, alwaysOnTop: boolean) {
    const window = this.windowsMap.get(windowId)
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop)
    }
  }
  
  isAlwaysOnTop(windowId: string): boolean {
    const window = this.windowsMap.get(windowId)
    return window?.isAlwaysOnTop() || false
  }
  
  getAllWindowsInfo(): WindowInfo[] {
    const infos: WindowInfo[] = []
    
    this.windowsMap.forEach((window, id) => {
      const bounds = window.getBounds()
      infos.push({
        id,
        noteId: '', // 从窗口URL参数获取
        position: { x: bounds.x, y: bounds.y },
        size: { width: bounds.width, height: bounds.height },
        isAlwaysOnTop: window.isAlwaysOnTop(),
        createdAt: Date.now()
      })
    })
    
    return infos
  }
  
  broadcastToAll(channel: string, data: any) {
    this.windowsMap.forEach(window => {
      window.webContents.send(channel, data)
    })
  }
  
  sendToWindow(windowId: string, channel: string, data: any) {
    const window = this.windowsMap.get(windowId)
    if (window) {
      window.webContents.send(channel, data)
    }
  }
  
  calculateNewWindowPosition(): { x: number; y: number } {
    const offset = 30
    const windows = Array.from(this.windowsMap.values())
    
    if (windows.length === 0) {
      return { x: 100, y: 100 }
    }
    
    const lastWindow = windows[windows.length - 1]
    const bounds = lastWindow.getBounds()
    
    return {
      x: bounds.x + offset,
      y: bounds.y + offset
    }
  }
  
  isPositionInScreen(position: { x: number; y: number }): boolean {
    const displays = screen.getAllDisplays()
    
    return displays.some(display => {
      const { x, y, width, height } = display.bounds
      return position.x >= x && position.x < x + width &&
             position.y >= y && position.y < y + height
    })
  }
  
  adjustPositionToScreen(position: { x: number; y: number }): { x: number; y: number } {
    if (this.isPositionInScreen(position)) {
      return position
    }
    
    // 使用主显示器
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.bounds
    
    return {
      x: Math.max(0, Math.min(width - 300, position.x)),
      y: Math.max(0, Math.min(height - 300, position.y))
    }
  }
}

// 注册多窗口IPC处理器
function registerMultiWindowHandlers(windowManager: WindowManagerExtended) {
  ipcMain.handle('multiWindow:create', async (event, options) => {
    const window = windowManager.createWindow(options)
    return { windowId: options.windowId, success: true }
  })
  
  ipcMain.handle('multiWindow:close', async (event, windowId) => {
    windowManager.closeWindow(windowId)
  })
  
  ipcMain.handle('multiWindow:focus', async (event, windowId) => {
    windowManager.focusWindow(windowId)
  })
  
  ipcMain.handle('multiWindow:broadcast', async (event, { channel, data }) => {
    windowManager.broadcastToAll(`broadcast:${channel}`, data)
  })
  
  ipcMain.handle('window:setAlwaysOnTop', async (event, alwaysOnTop) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.setAlwaysOnTop(alwaysOnTop)
    }
  })
  
  ipcMain.handle('window:isAlwaysOnTop', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window?.isAlwaysOnTop() || false
  })
}
```

## 性能优化

### 拖拽性能优化

1. **使用requestAnimationFrame**
   - 确保拖拽更新与浏览器刷新率同步
   - 避免过度渲染

2. **使用CSS Transform**
   - 利用GPU加速
   - 避免触发重排（reflow）

3. **节流和防抖**
   - 拖拽移动使用requestAnimationFrame节流
   - 位置保存使用防抖延迟

4. **禁用过渡动画**
   - 拖拽时禁用CSS transition
   - 减少不必要的动画计算

### 多窗口性能优化

1. **窗口数量限制**
   - 限制最大窗口数量（默认20个）
   - 防止资源耗尽

2. **延迟加载**
   - 窗口内容按需加载
   - 减少初始化开销

3. **事件委托**
   - 使用事件委托减少监听器数量
   - 提高事件处理效率

4. **内存管理**
   - 及时清理关闭窗口的资源
   - 监控内存使用

### 性能指标

- 拖拽帧率：≥ 60fps
- 窗口创建时间：< 500ms
- 内存占用：< 50MB/窗口
- 多窗口同步延迟：< 100ms

## 安全考虑

1. **窗口数量限制**
   - 防止恶意创建大量窗口
   - 保护系统资源

2. **位置验证**
   - 验证窗口位置在屏幕范围内
   - 防止窗口不可访问

3. **IPC消息验证**
   - 验证窗口ID有效性
   - 防止跨窗口攻击

4. **状态隔离**
   - 每个窗口独立状态
   - 防止状态污染

## 未来扩展

1. **窗口分组**
   - 窗口标签和分类
   - 分组管理和操作

2. **窗口布局**
   - 预设布局模板
   - 自动排列窗口

3. **窗口动画**
   - 创建/关闭动画
   - 切换动画效果

4. **触摸支持**
   - 触摸拖拽
   - 手势操作
