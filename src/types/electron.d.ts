/**
 * Electron API 类型定义
 * 定义所有与 Electron 主进程交互相关的类型
 */

// ==================== 窗口相关类型定义 ====================

/** 位置坐标接口 */
export interface Position {
    x: number
    y: number
}

/** 尺寸接口 */
export interface Size {
    width: number
    height: number
}

/** 窗口边界接口 */
export interface WindowBounds {
    x: number
    y: number
    width: number
    height: number
}

/** 窗口状态接口 */
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

/** 窗口信息接口 */
export interface WindowInfo {
    id: string
    noteId: string
    position: Position
    size: Size
    isAlwaysOnTop: boolean
    createdAt: number
}

/** 窗口创建选项接口 */
export interface WindowCreateOptions {
    windowId?: string
    noteId?: string
    position?: Position
    size?: Size
    alwaysOnTop?: boolean
}

// ==================== 托盘相关类型定义 ====================

/** 托盘菜单项配置 */
export interface TrayMenuItem {
    /** 菜单项标签文本 */
    label?: string
    /** 菜单项类型 */
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
    /** 点击回调函数 */
    click?: () => void
    /** 是否启用 */
    enabled?: boolean
    /** 是否可见 */
    visible?: boolean
    /** 是否选中（checkbox/radio 类型） */
    checked?: boolean
    /** 子菜单项 */
    submenu?: TrayMenuItem[]
}

/** 托盘通知配置 */
export interface TrayNotification {
    /** 通知标题 */
    title: string
    /** 通知内容 */
    body: string
    /** 通知图标路径（可选） */
    icon?: string
    /** 是否静音（可选） */
    silent?: boolean
}

/** 托盘管理器配置 */
export interface TrayManagerConfig {
    /** 托盘图标路径 */
    iconPath?: string
    /** 托盘工具提示文本 */
    tooltip?: string
    /** 是否启用通知功能 */
    enableNotifications?: boolean
}

// ==================== 快捷键相关类型定义 ====================

/** 快捷键配置 */
export interface ShortcutConfig {
    /** 快捷键组合（如 'Ctrl+Shift+N'） */
    key: string
    /** 快捷键触发的动作 */
    action: string
    /** 是否启用 */
    enabled: boolean
}

/** 快捷键冲突信息 */
export interface ShortcutConflict {
    /** 冲突的快捷键 */
    key: string
    /** 冲突原因 */
    reason: string
}

// ==================== 显示器相关类型定义 ====================

/** 显示器信息接口 */
export interface DisplayInfo {
    /** 显示器ID */
    id: number
    /** 显示器边界（包含任务栏等） */
    bounds: {
        x: number
        y: number
        width: number
        height: number
    }
    /** 显示器工作区（不包含任务栏等） */
    workArea: {
        x: number
        y: number
        width: number
        height: number
    }
    /** 缩放因子 */
    scaleFactor: number
    /** 旋转角度（0, 90, 180, 270） */
    rotation: number
    /** 是否为内置显示器 */
    internal: boolean
}

/** 显示器变更事件 */
export interface DisplayChangeEvent {
    /** 变更类型 */
    type: 'added' | 'removed' | 'metrics-changed'
    /** 变更的显示器信息 */
    display: DisplayInfo
    /** 变更的指标（仅在 metrics-changed 时有值） */
    changedMetrics?: string[]
}

/** 窗口迁移事件 */
export interface WindowsMigratedEvent {
    /** 迁移的窗口数量 */
    count: number
}

// ==================== 自启动相关类型定义 ====================

/** 自启动配置接口 */
export interface AutoLaunchConfig {
    /** 是否启用开机自启动 */
    enabled: boolean
    /** 是否隐藏启动（后台启动） */
    hidden: boolean
    /** 应用路径（可选，默认使用当前应用路径） */
    path?: string
}

// ==================== 主题相关类型定义 ====================

/** 主题模式类型 */
export type ThemeMode = 'light' | 'dark' | 'system'

/** 主题配置接口 */
export interface ThemeConfig {
    /** 主题模式 */
    mode: ThemeMode
    /** 是否跟随系统主题 */
    followSystem: boolean
}

// ==================== Electron API 接口定义 ====================

/** Electron API 接口 */
export interface ElectronAPI {
    /** 窗口操作 API */
    window: {
        /** 关闭当前窗口 */
        close: () => Promise<void>
        /** 最小化当前窗口 */
        minimize: () => Promise<void>
        /** 最大化/恢复当前窗口 */
        maximize: () => Promise<void>
        /** 获取窗口位置 */
        getPosition: () => Promise<{ x: number; y: number }>
        /** 设置窗口位置 */
        setPosition: (x: number, y: number) => Promise<void>
        /** 获取窗口尺寸 */
        getSize: () => Promise<{ width: number; height: number }>
        /** 设置窗口尺寸 */
        setSize: (width: number, height: number) => Promise<void>
        /** 设置窗口置顶状态 */
        setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
        /** 获取窗口置顶状态 */
        isAlwaysOnTop: () => Promise<boolean>
        /** 聚焦当前窗口 */
        focus: () => Promise<void>
    }

    /** 多窗口管理 API */
    multiWindow: {
        /** 创建新窗口 */
        create: (options: WindowCreateOptions) => Promise<string>
        /** 关闭指定窗口 */
        close: (windowId: string) => Promise<void>
        /** 聚焦指定窗口 */
        focus: (windowId: string) => Promise<void>
        /** 向所有窗口广播消息 */
        broadcast: (event: string, data: any) => Promise<void>
        /** 获取所有窗口信息 */
        getAllWindows: () => Promise<WindowInfo[]>
    }

    /** 系统信息 API */
    system: {
        /** 当前操作系统平台 */
        platform: string
        /** 获取应用版本号 */
        getVersion: () => Promise<string>
        /** 获取 Electron、Node.js 和 Chrome 的版本信息 */
        getVersions: () => Promise<NodeJS.ProcessVersions>
        /** 获取应用路径 */
        getPath: (name: string) => Promise<string>
    }

    /** 托盘管理 API */
    tray: {
        /** 显示托盘通知 */
        showNotification: (notification: TrayNotification) => Promise<{ success: boolean }>
        /** 更新托盘菜单 */
        updateMenu: (items: TrayMenuItem[]) => Promise<{ success: boolean }>
        /** 设置托盘工具提示 */
        setToolTip: (tooltip: string) => Promise<{ success: boolean }>
        /** 检查托盘是否已创建 */
        isCreated: () => Promise<boolean>
    }

    /** 快捷键管理 API */
    shortcut: {
        /** 获取所有快捷键配置 */
        getAllConfigs: () => Promise<ShortcutConfig[]>
        /** 更新快捷键配置 */
        updateConfig: (config: ShortcutConfig) => Promise<{ success: boolean }>
        /** 检查快捷键是否已注册 */
        isRegistered: (key: string) => Promise<boolean>
        /** 获取指定动作的快捷键配置 */
        getConfigByAction: (action: string) => Promise<ShortcutConfig | null>
    }

    /** 显示器管理 API */
    display: {
        /** 获取所有显示器信息 */
        getAllDisplays: () => Promise<DisplayInfo[]>
        /** 获取主显示器信息 */
        getPrimaryDisplay: () => Promise<DisplayInfo>
        /** 获取指定点所在的显示器 */
        getDisplayNearestPoint: (point: Position) => Promise<DisplayInfo>
        /** 获取当前窗口所在的显示器 */
        getDisplayForWindow: () => Promise<DisplayInfo>
        /** 检查位置是否在显示器范围内 */
        isPositionInBounds: (position: Position) => Promise<boolean>
        /** 调整位置到显示器内 */
        adjustPositionToBounds: (position: Position, windowSize?: Size) => Promise<Position>
        /** 获取显示器数量 */
        getDisplayCount: () => Promise<number>
        /** 检查是否为多显示器环境 */
        isMultiDisplay: () => Promise<boolean>
        /** 获取显示器信息摘要 */
        getDisplaySummary: () => Promise<string>
    }

    /** 自启动管理 API */
    autoLaunch: {
        /** 启用开机自启动 */
        enable: (hidden?: boolean) => Promise<{ success: boolean; enabled: boolean; hidden?: boolean }>
        /** 禁用开机自启动 */
        disable: () => Promise<{ success: boolean; enabled: boolean }>
        /** 检查是否已启用开机自启动 */
        isEnabled: () => Promise<boolean>
        /** 获取自启动配置 */
        getConfig: () => Promise<AutoLaunchConfig>
        /** 更新自启动配置 */
        updateConfig: (config: Partial<AutoLaunchConfig>) => Promise<{ success: boolean; config: AutoLaunchConfig }>
    }

    /** 主题管理 API */
    theme: {
        /** 获取当前主题 */
        getCurrent: () => Promise<ThemeMode>
        /** 获取主题配置 */
        getConfig: () => Promise<ThemeConfig>
        /** 设置主题 */
        set: (mode: ThemeMode) => Promise<{ success: boolean; mode: ThemeMode }>
        /** 切换主题（在 light 和 dark 之间切换） */
        toggle: () => Promise<ThemeMode>
        /** 获取系统主题 */
        getSystem: () => Promise<'light' | 'dark'>
    }

    /** 事件监听 API */
    on: (channel: string, callback: (...args: any[]) => void) => void
    /** 取消事件监听 */
    off: (channel: string, callback: (...args: any[]) => void) => void
}

// ==================== 全局类型声明 ====================

declare global {
    interface Window {
        /** Electron API 对象 */
        electronAPI: ElectronAPI
    }
}

export { }
