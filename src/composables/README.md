# 组合式函数 (Composables)

本目录包含可复用的组合式函数。

## Composables 组织

建议按功能分类：

```
composables/
├── useNote.ts          # 便签操作相关
├── useDrag.ts          # 拖拽功能
├── useResize.ts        # 调整大小功能
├── useStorage.ts       # 本地存储
└── useElectron.ts      # Electron API 访问
```

## 可用的 Composables

### useStorage

提供类型安全的 localStorage 封装，支持序列化、错误处理和备份恢复。

**功能：**
- 自动序列化/反序列化
- 错误处理和恢复
- 备份机制
- 响应式数据绑定

### useElectron

提供类型安全的 Electron API 访问，支持窗口操作和系统信息获取。

**功能：**
- 环境检测（是否在 Electron 中运行）
- 窗口操作（关闭、最小化、最大化）
- 窗口状态管理（位置、尺寸）
- 平台信息获取
- 自动降级处理（在浏览器环境中安全运行）

**示例：**
```typescript
import { useElectron } from '@/composables/useElectron'

const {
  isElectron,
  platform,
  closeWindow,
  minimizeWindow,
  windowPosition,
  windowSize,
  updateWindowPosition,
  refreshWindowState
} = useElectron()

// 检查是否在 Electron 环境
if (isElectron.value) {
  // 刷新窗口状态
  await refreshWindowState()
  
  // 获取平台信息
  console.log('平台:', platform.value)
  
  // 窗口操作
  await minimizeWindow()
  await updateWindowPosition(100, 100)
}
```

### useDraggable

提供窗口拖拽功能，支持边界限制、性能优化和状态管理。

**功能：**
- 基于鼠标事件的拖拽逻辑
- 边界限制（左、上、右、下边界）
- 最小可见区域保证（50像素）
- 拖拽状态管理（isDragging）
- 拖拽视觉反馈（CSS类）
- 可编辑区域检测，防止误触发
- requestAnimationFrame 性能优化（60fps）
- 拖拽结束后的防抖保存
- CSS transform 动画优化

**示例：**
```typescript
import { ref } from 'vue'
import { useDraggable } from '@/composables/useDraggable'

const noteElement = ref<HTMLElement | null>(null)

const { position, isDragging, style, setPosition, reset } = useDraggable(noteElement, {
  minVisibleArea: 50,
  boundary: {
    left: 0,
    top: 0,
    right: window.screen.width,
    bottom: window.screen.height
  },
  onStart: (pos) => console.log('开始拖拽:', pos),
  onMove: (pos) => console.log('拖拽中:', pos),
  onEnd: (pos) => console.log('拖拽结束:', pos)
})

// 在模板中使用
// <div ref="noteElement" :style="style">可拖拽的便签</div>
```

### useWindow

提供窗口状态管理、位置/尺寸控制、置顶功能和状态持久化。

**功能：**
- 响应式窗口状态管理（位置、尺寸、置顶状态）
- 窗口位置设置和获取
- 窗口尺寸设置和获取（带最小/最大限制）
- 窗口置顶状态切换
- 边界检查功能
- 窗口状态保存和恢复
- 防抖自动保存
- 组件卸载时的清理逻辑

**示例：**
```typescript
import { useWindow } from '@/composables/useWindow'

const {
  windowState,
  setPosition,
  setSize,
  setAlwaysOnTop,
  checkBoundary,
  saveState,
  restoreState
} = useWindow({
  windowId: 'main',
  autoSave: true,
  saveDelay: 500
})

// 设置窗口位置
await setPosition(100, 100)

// 设置窗口尺寸（自动应用最小/最大限制）
await setSize(400, 400)

// 切换置顶状态
await setAlwaysOnTop(true)

// 恢复保存的窗口状态
await restoreState()
```

### useMultiWindow

提供多窗口管理功能，支持窗口创建、关闭、聚焦和窗口间通信。

**功能：**
- 窗口列表管理
- 创建窗口（带位置偏移避免重叠）
- 关闭窗口
- 聚焦窗口
- 窗口信息查询和更新
- 窗口数量限制（最大20个）
- 窗口间广播通信
- 窗口间事件监听
- 自动计算新窗口位置避免重叠

**示例：**
```typescript
import { useMultiWindow } from '@/composables/useMultiWindow'

const {
  windows,
  currentWindowId,
  createWindow,
  closeWindow,
  focusWindow,
  getWindowInfo,
  updateWindowInfo,
  canCreateWindow,
  broadcast,
  onBroadcast
} = useMultiWindow()

// 创建新窗口
if (canCreateWindow.value) {
  const windowId = await createWindow('note-123', { x: 100, y: 100 })
  console.log('新窗口ID:', windowId)
}

// 关闭窗口
await closeWindow('window-id')

// 聚焦窗口
await focusWindow('window-id')

// 广播消息到所有窗口
broadcast('note-updated', { noteId: 'note-123', content: 'new content' })

// 监听广播消息
onBroadcast('note-updated', (data) => {
  console.log('收到更新:', data)
})

// 查询窗口信息
const info = getWindowInfo('window-id')
console.log('窗口信息:', info)
```

### useTheme

提供主题管理功能，支持主题切换、系统主题跟随和主题配置管理。

**功能：**
- 获取和设置主题模式（light/dark/system）
- 监听系统主题变更
- 主题切换（在 light 和 dark 之间切换）
- 主题配置管理
- 自动应用主题到 DOM
- 响应式主题状态

**示例：**
```typescript
import { useTheme } from '@/composables/useTheme'

const {
  currentTheme,
  systemTheme,
  themeConfig,
  isDark,
  isLight,
  isFollowingSystem,
  setTheme,
  toggleTheme,
  refreshTheme,
  applyTheme
} = useTheme()

// 设置主题
await setTheme('dark')

// 切换主题（在 light 和 dark 之间切换）
await toggleTheme()

// 检查是否为深色模式
if (isDark.value) {
  console.log('当前是深色模式')
}

// 刷新主题状态
await refreshTheme()

// 手动应用主题到 DOM
applyTheme('dark')
```

### useSystemTray

提供系统托盘交互功能，支持通知、菜单更新和状态查询。

**功能：**
- 显示托盘通知
- 更新托盘菜单
- 设置托盘工具提示
- 查询托盘状态

**示例：**
```typescript
import { useSystemTray } from '@/composables/useSystemTray'

const {
  isCreated,
  showNotification,
  updateMenu,
  setToolTip,
  checkTrayStatus
} = useSystemTray()

// 显示通知
await showNotification({
  title: '新便签',
  body: '便签已创建'
})

// 更新菜单
await updateMenu([
  { label: '新建便签', click: () => createNote() },
  { type: 'separator' },
  { label: '退出', click: () => quit() }
])

// 检查托盘状态
const created = await checkTrayStatus()
```

### useGlobalShortcut

提供全局快捷键配置管理功能。

**功能：**
- 获取所有快捷键配置
- 更新快捷键配置
- 检查快捷键注册状态
- 根据动作查询快捷键

**示例：**
```typescript
import { useGlobalShortcut } from '@/composables/useGlobalShortcut'

const {
  shortcuts,
  getAllConfigs,
  updateConfig,
  isRegistered,
  getConfigByAction,
  refreshConfigs
} = useGlobalShortcut()

// 更新快捷键配置
await updateConfig({
  key: 'Ctrl+Shift+N',
  action: 'createNote',
  enabled: true
})

// 检查快捷键是否已注册
const registered = await isRegistered('Ctrl+Shift+N')

// 刷新配置
await refreshConfigs()
```

### useDisplay

提供显示器信息查询和位置验证功能。

**功能：**
- 获取所有显示器信息
- 获取主显示器信息
- 查询指定点所在的显示器
- 验证位置是否在显示器范围内
- 调整位置到显示器内
- 多显示器环境检测

**示例：**
```typescript
import { useDisplay } from '@/composables/useDisplay'

const {
  displays,
  primaryDisplay,
  currentDisplay,
  displayCount,
  isMultiDisplay,
  getAllDisplays,
  getPrimaryDisplay,
  getDisplayNearestPoint,
  getDisplayForWindow,
  isPositionInBounds,
  adjustPositionToBounds,
  getDisplaySummary,
  refreshDisplays
} = useDisplay()

// 检查是否为多显示器环境
if (isMultiDisplay.value) {
  console.log('多显示器环境')
}

// 调整位置到显示器内
const adjusted = await adjustPositionToBounds({ x: 5000, y: 5000 })

// 刷新显示器信息
await refreshDisplays()
```

### useAutoLaunch

提供开机自启动配置管理功能。

**功能：**
- 启用/禁用开机自启动
- 查询自启动状态
- 管理自启动配置
- 支持隐藏启动选项

**示例：**
```typescript
import { useAutoLaunch } from '@/composables/useAutoLaunch'

const {
  isEnabled,
  config,
  enable,
  disable,
  checkEnabled,
  getConfig,
  updateConfig,
  refreshStatus
} = useAutoLaunch()

// 启用开机自启动
await enable(false) // 不隐藏启动

// 禁用开机自启动
await disable()

// 检查状态
console.log('自启动已启用:', isEnabled.value)

// 刷新状态
await refreshStatus()
```

## 命名规范

- 文件名和函数名使用 `use` 前缀
- 使用 camelCase 命名
- 一个文件导出一个主要的 composable

## 开发指南

- 返回响应式数据和方法
- 使用 TypeScript 定义返回类型
- 处理组件卸载时的清理工作
- 可以组合其他 composables
- 利用 VueUse 提供的工具函数
