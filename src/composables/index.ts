/**
 * Composables 统一导出
 * 
 * 提供所有可复用组合式函数的统一导出入口
 */

// 基础功能
export { useElectron } from './useElectron'
export type { UseElectronReturn } from './useElectron'

export { useStorage } from './useStorage'
export type { UseStorageReturn } from './useStorage'

// 窗口管理
export { useWindow } from './useWindow'
export type { UseWindowReturn, WindowState, UseWindowOptions } from './useWindow'

export { useMultiWindow } from './useMultiWindow'
export type { UseMultiWindowReturn, WindowInfo } from './useMultiWindow'

// UI 交互
export { useDraggable } from './useDraggable'
export type { UseDraggableReturn, UseDraggableOptions, DragBoundary } from './useDraggable'

export { useResizable } from './useResizable'
export type { UseResizableReturn, UseResizableOptions, ResizeConstraints } from './useResizable'

// 系统集成
export { useTheme } from './useTheme'
export type { UseThemeReturn } from './useTheme'

export { useSystemTray } from './useSystemTray'
export type { UseSystemTrayReturn, TrayNotification, TrayMenuItem } from './useSystemTray'

export { useGlobalShortcut } from './useGlobalShortcut'
export type { UseGlobalShortcutReturn, ShortcutConfig } from './useGlobalShortcut'

export { useDisplay } from './useDisplay'
export type { UseDisplayReturn, DisplayInfo } from './useDisplay'

export { useAutoLaunch } from './useAutoLaunch'
export type { UseAutoLaunchReturn, AutoLaunchConfig } from './useAutoLaunch'
