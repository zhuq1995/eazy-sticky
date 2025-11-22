# TypeScript 类型定义

本目录包含应用的 TypeScript 类型定义。

## 文件说明

- `index.ts` - 核心类型定义（Note, AppSettings, Composable 配置等）
- `electron.d.ts` - Electron API 类型定义（窗口、托盘、快捷键、显示器、自启动、主题等）

## 类型组织

```
types/
├── index.ts        # 核心应用类型
│   ├── Note 相关类型
│   ├── AppSettings 相关类型
│   ├── WindowConfig 相关类型
│   ├── Composable 配置类型
│   └── 重新导出 Electron 类型
│
└── electron.d.ts   # Electron API 类型
    ├── 窗口相关类型（Position, Size, WindowState, WindowInfo）
    ├── 托盘相关类型（TrayMenuItem, TrayNotification, TrayManagerConfig）
    ├── 快捷键相关类型（ShortcutConfig, ShortcutConflict）
    ├── 显示器相关类型（DisplayInfo, DisplayChangeEvent）
    ├── 自启动相关类型（AutoLaunchConfig）
    ├── 主题相关类型（ThemeMode, ThemeConfig）
    └── ElectronAPI 接口定义
```

## 类型分类

### 核心应用类型 (index.ts)

**便签相关**
- `Note` - 便签数据接口
- `NoteStyle` - 便签样式接口
- `AppSettings` - 应用设置接口

**窗口配置**
- `WindowConfig` - 窗口配置接口
- `ScreenBounds` - 屏幕边界接口
- `MultiWindowConfig` - 多窗口配置接口

**拖拽相关**
- `DragState` - 拖拽状态接口
- `DragConstraints` - 拖拽约束接口
- `DragBoundary` - 拖拽边界接口

**Composable 配置**
- `UseDraggableOptions` - useDraggable 配置
- `UseWindowOptions` - useWindow 配置
- `UseMultiWindowReturn` - useMultiWindow 返回值

### Electron API 类型 (electron.d.ts)

**窗口管理**
- `Position` - 位置坐标
- `Size` - 尺寸
- `WindowBounds` - 窗口边界
- `WindowState` - 窗口状态
- `WindowInfo` - 窗口信息
- `WindowCreateOptions` - 窗口创建选项

**系统托盘**
- `TrayMenuItem` - 托盘菜单项配置
- `TrayNotification` - 托盘通知配置
- `TrayManagerConfig` - 托盘管理器配置

**全局快捷键**
- `ShortcutConfig` - 快捷键配置
- `ShortcutConflict` - 快捷键冲突信息

**多显示器**
- `DisplayInfo` - 显示器信息
- `DisplayChangeEvent` - 显示器变更事件
- `WindowsMigratedEvent` - 窗口迁移事件

**开机自启动**
- `AutoLaunchConfig` - 自启动配置

**系统主题**
- `ThemeMode` - 主题模式（'light' | 'dark' | 'system'）
- `ThemeConfig` - 主题配置

**Electron API**
- `ElectronAPI` - 完整的 Electron API 接口定义
  - `window` - 窗口操作 API
  - `multiWindow` - 多窗口管理 API
  - `system` - 系统信息 API
  - `tray` - 托盘管理 API
  - `shortcut` - 快捷键管理 API
  - `display` - 显示器管理 API
  - `autoLaunch` - 自启动管理 API
  - `theme` - 主题管理 API
  - `on/off` - 事件监听 API

## 使用示例

### 导入核心类型

```typescript
import type { Note, Position, Size } from '@/types'
```

### 导入 Electron 类型

```typescript
import type { 
  TrayMenuItem, 
  ShortcutConfig, 
  DisplayInfo,
  AutoLaunchConfig,
  ThemeMode 
} from '@/types'
```

### 使用 Electron API

```typescript
// 在渲染进程中使用
const api = window.electronAPI

// 托盘操作
await api.tray.showNotification({
  title: '新便签',
  body: '已创建新便签'
})

// 快捷键配置
const configs = await api.shortcut.getAllConfigs()

// 显示器信息
const displays = await api.display.getAllDisplays()

// 自启动配置
await api.autoLaunch.enable(true)

// 主题管理
await api.theme.set('dark')
```

## 开发指南

### 类型定义规范

- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型和工具类型
- 导出所有公共类型
- 为复杂类型添加 JSDoc 注释
- 保持类型定义与实现同步

### 添加新类型

1. 确定类型所属模块（核心应用 vs Electron API）
2. 在相应文件中添加类型定义
3. 添加 JSDoc 注释说明用途
4. 在 `index.ts` 中导出（如果需要）
5. 更新本 README 文档

### 类型命名约定

- 接口使用 PascalCase：`WindowState`
- 类型别名使用 PascalCase：`ThemeMode`
- 配置接口以 Config 结尾：`AutoLaunchConfig`
- 事件接口以 Event 结尾：`DisplayChangeEvent`
- 选项接口以 Options 结尾：`WindowCreateOptions`

## 注意事项

- `electron.d.ts` 包含全局类型声明，会自动在整个项目中可用
- `index.ts` 重新导出 Electron 类型，保持向后兼容
- 所有 Electron API 都通过 `window.electronAPI` 访问
- 类型定义应与 `electron/preload.ts` 中的实现保持一致
