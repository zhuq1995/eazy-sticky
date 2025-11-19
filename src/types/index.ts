/**
 * 核心类型定义
 * 定义应用中使用的所有 TypeScript 接口和类型
 */

// 位置坐标接口
export interface Position {
    x: number
    y: number
}

// 尺寸接口
export interface Size {
    width: number
    height: number
}

// 便签样式接口
export interface NoteStyle {
    backgroundColor: string
    fontSize: number
    fontFamily: string
}

// 便签数据接口
export interface Note {
    id: string
    content: string
    position: Position
    size: Size
    style: NoteStyle
    createdAt: number
    updatedAt: number
    isPinned: boolean
}

// 应用设置接口
export interface AppSettings {
    theme: 'light' | 'dark' | 'auto'
    defaultNoteSize: Size
    defaultNotePosition: Position
    autoSave: boolean
    saveInterval: number
}

// ==================== Electron 相关类型定义 ====================

// 窗口配置接口
export interface WindowConfig {
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

// 窗口状态接口（扩展）
export interface WindowState {
    id?: string
    noteId?: string
    position: Position
    size: Size
    isAlwaysOnTop: boolean
    isMinimized: boolean
    isFocused: boolean
    isMaximized?: boolean
    createdAt?: number
    updatedAt?: number
}

// 窗口信息接口
export interface WindowInfo {
    id: string
    noteId: string
    position: Position
    size: Size
    isAlwaysOnTop: boolean
    createdAt: number
}

// 窗口边界接口
export interface WindowBounds {
    x: number
    y: number
    width: number
    height: number
}

// 屏幕边界接口
export interface ScreenBounds {
    x: number
    y: number
    width: number
    height: number
}

// 拖拽状态接口
export interface DragState {
    isDragging: boolean
    startPosition: Position
    currentPosition: Position
    offset: Position
    timestamp: number
}

// 拖拽约束接口
export interface DragConstraints {
    minX: number
    minY: number
    maxX: number
    maxY: number
    minVisibleArea: number
}

// 拖拽边界接口
export interface DragBoundary {
    left: number
    top: number
    right: number
    bottom: number
}

// IPC 消息接口
export interface IPCMessage<T = any> {
    channel: string
    data?: T
    requestId?: string
    timestamp: number
}

// IPC 响应接口
export interface IPCResponse<T = any> {
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

// IPC 处理器类型签名
export type IPCHandler<T = any, R = any> = (event: any, ...args: T[]) => Promise<R> | R

// IPC 通道定义
export interface IPCChannels {
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

// Electron API 接口（扩展）
export interface ElectronAPI {
    // 窗口操作
    window: {
        close: () => Promise<void>
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        getPosition: () => Promise<{ x: number; y: number }>
        setPosition: (x: number, y: number) => Promise<void>
        getSize: () => Promise<{ width: number; height: number }>
        setSize: (width: number, height: number) => Promise<void>
        setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
        isAlwaysOnTop: () => Promise<boolean>
        focus: () => Promise<void>
    }

    // 多窗口管理
    multiWindow: {
        create: (options: {
            windowId?: string
            noteId?: string
            position?: Position
            size?: Size
            alwaysOnTop?: boolean
        }) => Promise<string>
        close: (windowId: string) => Promise<void>
        focus: (windowId: string) => Promise<void>
        broadcast: (event: string, data: any) => Promise<void>
        getAllWindows: () => Promise<WindowInfo[]>
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

// 全局 Window 接口扩展
declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}

// ==================== Composable 配置类型 ====================

// useDraggable 配置接口
export interface UseDraggableOptions {
    // 拖拽句柄元素
    handle?: import('vue').Ref<HTMLElement | null>

    // 拖拽边界限制
    boundary?: DragBoundary

    // 最小可见区域（像素）
    minVisibleArea?: number

    // 拖拽开始回调
    onStart?: (position: Position) => void

    // 拖拽中回调
    onMove?: (position: Position) => void

    // 拖拽结束回调
    onEnd?: (position: Position) => void

    // 是否禁用拖拽
    disabled?: import('vue').Ref<boolean>
}

// useDraggable 返回值接口
export interface UseDraggableReturn {
    // 当前位置
    position: import('vue').Ref<Position>

    // 是否正在拖拽
    isDragging: import('vue').Ref<boolean>

    // 拖拽样式
    style: import('vue').ComputedRef<import('vue').CSSProperties>

    // 手动设置位置
    setPosition: (x: number, y: number) => void

    // 重置位置
    reset: () => void
}

// useWindow 配置接口
export interface UseWindowOptions {
    // 窗口ID（用于多窗口场景）
    windowId?: string

    // 是否自动保存状态
    autoSave?: boolean

    // 保存防抖延迟（毫秒）
    saveDelay?: number
}

// useWindow 返回值接口
export interface UseWindowReturn {
    // 窗口状态
    windowState: import('vue').Ref<WindowState>

    // 窗口操作方法
    setPosition: (x: number, y: number) => Promise<void>
    setSize: (width: number, height: number) => Promise<void>
    setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
    minimize: () => Promise<void>
    close: () => Promise<void>
    focus: () => Promise<void>

    // 状态查询
    getPosition: () => Promise<Position>
    getSize: () => Promise<Size>
    isAlwaysOnTop: () => Promise<boolean>

    // 边界检查
    checkBoundary: (position: Position) => Position

    // 保存状态
    saveState: () => Promise<void>

    // 恢复状态
    restoreState: () => Promise<void>
}

// useMultiWindow 返回值接口
export interface UseMultiWindowReturn {
    // 窗口列表
    windows: import('vue').Ref<WindowInfo[]>

    // 当前窗口ID
    currentWindowId: import('vue').Ref<string>

    // 创建新窗口
    createWindow: (noteId?: string, position?: Position) => Promise<string>

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
    canCreateWindow: import('vue').ComputedRef<boolean>

    // 窗口间通信
    broadcast: (event: string, data: any) => void
    onBroadcast: (event: string, handler: (data: any) => void) => void
}

// 多窗口配置接口
export interface MultiWindowConfig {
    maxWindows: number
    defaultSize: Size
    defaultPosition: Position
    positionOffset: Position
    minDistance: number
}

// 窗口创建选项接口
export interface WindowCreateOptions {
    windowId?: string
    noteId?: string
    position?: Position
    size?: Size
    alwaysOnTop?: boolean
}

// 环境变量类型定义
export interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string
    readonly VITE_APP_VERSION: string
    readonly VITE_DEV_SERVER_PORT: string
}

export interface ImportMeta {
    readonly env: ImportMetaEnv
}
