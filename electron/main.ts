/**
 * Electron 主进程入口文件
 * 
 * 职责：
 * - 创建和管理应用窗口
 * - 处理系统级事件
 * - 提供原生 API 接口
 */

import { app, BrowserWindow, screen, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { TrayManager } from './TrayManager'
import { ShortcutManager } from './ShortcutManager'
import { DisplayManager } from './DisplayManager'
import { AutoLauncher } from './AutoLauncher'
import { WindowStateManager } from './WindowStateManager'
import { ThemeAdapter } from './ThemeAdapter'

// ==================== 类型定义 ====================

interface WindowConfig {
    x?: number
    y?: number
    width: number
    height: number
    minWidth: number
    minHeight: number
    frame: boolean
    transparent: boolean
    backgroundColor: string
    resizable: boolean
    movable: boolean
    minimizable: boolean
    maximizable: boolean
    closable: boolean
    alwaysOnTop: boolean
    webPreferences: {
        preload: string
        nodeIntegration: boolean
        contextIsolation: boolean
        sandbox: boolean
        webSecurity: boolean
    }
}

interface WindowState {
    x: number
    y: number
    width: number
    height: number
    isMaximized: boolean
}

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

// ==================== 配置常量 ====================

// 主窗口配置（管理窗口）
const MAIN_WINDOW_CONFIG: WindowConfig = {
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: true,              // 有边框
    transparent: false,       // 不透明
    backgroundColor: '#ffffff',
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
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

// 便利贴窗口配置（子窗口）
const NOTE_WINDOW_CONFIG: WindowConfig = {
    width: 300,
    height: 300,
    minWidth: 200,
    minHeight: 200,
    frame: false,             // ✅ 无边框 - 使用自定义标题栏
    transparent: false,       // 不透明
    backgroundColor: '#fef9e7',
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,       // 便利贴不需要最大化
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

// 默认窗口配置（向后兼容）
const DEFAULT_WINDOW_CONFIG: WindowConfig = NOTE_WINDOW_CONFIG

// ==================== 环境检测 ====================

/**
 * 检测是否为开发环境
 * 验证需求: 1.4, 7.1
 */
function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged
}

/**
 * 检测是否为生产环境
 */
function isProduction(): boolean {
    return !isDevelopment()
}

// ==================== 平台检测 ====================

/**
 * 平台类型枚举
 */
enum Platform {
    WINDOWS = 'win32',
    MACOS = 'darwin',
    LINUX = 'linux'
}

/**
 * 获取当前平台
 * 验证需求: 8.1
 */
function getCurrentPlatform(): Platform {
    return process.platform as Platform
}

/**
 * 检测是否为 Windows 平台
 * 验证需求: 5.1
 */
function isWindows(): boolean {
    return process.platform === Platform.WINDOWS
}

/**
 * 检测是否为 macOS 平台
 * 验证需求: 5.2
 */
function isMacOS(): boolean {
    return process.platform === Platform.MACOS
}

/**
 * 检测是否为 Linux 平台
 * 验证需求: 5.3
 */
function isLinux(): boolean {
    return process.platform === Platform.LINUX
}

// 开发环境配置
const DEV_CONFIG = {
    devTools: false,          // ✅ 关闭开发者工具
    devServerUrl: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173',
    // 热重载支持
    hotReload: true,
    // 详细错误显示
    verboseErrors: true,
    // 开发服务器连接超时（毫秒）
    connectionTimeout: 10000,
    // 开发服务器重试次数
    maxRetries: 3
}

// 生产环境配置
const PROD_CONFIG = {
    devTools: false,
    indexPath: join(__dirname, '../renderer/index.html'),
    // 生产环境不显示详细错误
    verboseErrors: false
}

// 窗口状态存储路径
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json')

// ==================== 平台特定配置 ====================

/**
 * 应用 Windows 特定配置
 * 验证需求: 5.1
 */
function applyWindowsConfig(): void {
    logger.info('应用 Windows 特定配置')

    // 设置 AppUserModelId，用于任务栏和通知
    // 这确保应用在 Windows 任务栏中有正确的标识
    app.setAppUserModelId('com.example.sticky-notes')
    logger.debug('已设置 AppUserModelId: com.example.sticky-notes')

    // Windows 特定的窗口行为
    logger.debug('Windows 平台：窗口关闭时应用将退出')
}

/**
 * 应用 macOS 特定配置
 * 验证需求: 5.2, 5.3
 */
function applyMacOSConfig(): void {
    logger.info('应用 macOS 特定配置')

    // macOS 特定的应用行为
    // 在 macOS 上，应用通常在所有窗口关闭后仍保持运行
    logger.debug('macOS 平台：窗口关闭后应用将保持运行')

    // 设置 dock 图标（如果需要自定义）
    // 注意：默认情况下会使用应用图标，这里只是示例
    // const iconPath = path.join(__dirname, '../resources/icon.png')
    // if (fs.existsSync(iconPath)) {
    //     app.dock.setIcon(iconPath)
    //     logger.debug('已设置 dock 图标')
    // }

    logger.debug('macOS 平台：支持 activate 事件重新创建窗口')
}

/**
 * 应用 Linux 特定配置
 * 验证需求: 5.3
 */
function applyLinuxConfig(): void {
    logger.info('应用 Linux 特定配置')

    // Linux 平台的透明窗口支持
    // 某些 Linux 桌面环境需要特殊的命令行参数来支持透明窗口
    app.commandLine.appendSwitch('enable-transparent-visuals')
    logger.debug('已启用透明视觉效果支持')

    // 禁用 GPU 加速可以提高某些 Linux 系统上的兼容性
    // 注意：这可能会影响性能，但可以解决一些渲染问题
    app.commandLine.appendSwitch('disable-gpu')
    logger.debug('已禁用 GPU 加速（提高兼容性）')

    logger.debug('Linux 平台：窗口关闭时应用将退出')
}

/**
 * 根据当前平台应用特定配置
 * 验证需求: 5.1, 5.2, 5.3, 8.1
 */
function applyPlatformSpecificConfig(): void {
    const platform = getCurrentPlatform()
    logger.info(`检测到平台: ${platform}`)

    switch (platform) {
        case Platform.WINDOWS:
            applyWindowsConfig()
            break
        case Platform.MACOS:
            applyMacOSConfig()
            break
        case Platform.LINUX:
            applyLinuxConfig()
            break
        default:
            logger.warn(`未知平台: ${platform}，使用默认配置`)
    }
}

// ==================== WindowManager 类 ====================

class WindowManager {
    private windows: Map<number, BrowserWindow> = new Map()
    private windowsById: Map<string, BrowserWindow> = new Map() // 新增：通过自定义ID映射窗口
    private stateFilePath: string
    private displayManager: DisplayManager | null = null
    private windowStateManager: WindowStateManager | null = null
    private readonly MAX_WINDOWS = 20 // 最大窗口数量限制（验证需求: 10.3）

    constructor(stateFilePath: string = WINDOW_STATE_FILE) {
        this.stateFilePath = stateFilePath
    }

    /**
     * 设置显示器管理器
     * @param displayManager 显示器管理器实例
     * 验证需求: 5.1, 5.2, 5.3, 5.4
     */
    setDisplayManager(displayManager: DisplayManager): void {
        this.displayManager = displayManager
        logger.info('DisplayManager 已集成到 WindowManager')
    }

    /**
     * 设置窗口状态管理器
     * @param windowStateManager 窗口状态管理器实例
     * 验证需求: 8.1, 8.2, 8.3, 8.4
     */
    setWindowStateManager(windowStateManager: WindowStateManager): void {
        this.windowStateManager = windowStateManager
        logger.info('WindowStateManager 已集成到 WindowManager')
    }

    /**
     * 创建新窗口（扩展版本，支持自定义位置和尺寸）
     * @param options 窗口配置选项
     * @returns 创建的窗口实例
     * @throws Error 如果达到窗口数量上限
     * 验证需求: 4.1, 4.2, 4.3, 6.1, 6.2, 10.3
     */
    createWindow(options?: Partial<WindowConfig> & {
        windowId?: string
        noteId?: string
        position?: { x: number; y: number }
        size?: { width: number; height: number }
        alwaysOnTop?: boolean
    }): BrowserWindow {
        logger.info('创建新窗口', { options })

        // 检查窗口数量限制（验证需求: 10.3）
        if (this.windows.size >= this.MAX_WINDOWS) {
            const error = new Error(`已达到窗口数量上限（${this.MAX_WINDOWS}个）`)
            logger.error('创建窗口失败', error, {
                currentCount: this.windows.size,
                maxCount: this.MAX_WINDOWS
            })
            throw error
        }

        // 根据是否有 noteId 选择配置
        // 有 noteId = 便利贴子窗口（无边框）
        // 无 noteId = 主窗口（有边框）
        const baseConfig = options?.noteId ? NOTE_WINDOW_CONFIG : MAIN_WINDOW_CONFIG

        // 合并配置
        const config = { ...baseConfig, ...options }

        // 如果提供了自定义位置，使用它
        if (options?.position) {
            config.x = options.position.x
            config.y = options.position.y
        }

        // 如果提供了自定义尺寸，使用它
        if (options?.size) {
            config.width = options.size.width
            config.height = options.size.height
        }

        // 如果提供了置顶状态，使用它
        if (options?.alwaysOnTop !== undefined) {
            config.alwaysOnTop = options.alwaysOnTop
        }

        // 验证和调整窗口位置（验证需求: 6.1, 6.2）
        if (this.displayManager && config.x !== undefined && config.y !== undefined) {
            const adjustedPosition = this.displayManager.adjustPositionToBounds(
                { x: config.x, y: config.y },
                { width: config.width, height: config.height }
            )
            config.x = adjustedPosition.x
            config.y = adjustedPosition.y
            logger.debug('窗口位置已调整', { original: options?.position, adjusted: adjustedPosition })
        }

        // 创建窗口
        const window = new BrowserWindow(config)

        // 保存窗口引用
        this.windows.set(window.id, window)

        // 如果提供了自定义窗口ID，也保存到ID映射中
        if (options?.windowId) {
            this.windowsById.set(options.windowId, window)
            logger.debug(`窗口已注册，ID: ${options.windowId}, Electron ID: ${window.id}`)
        }

        // 注册窗口到显示器管理器（验证需求: 6.4）
        if (this.displayManager) {
            this.displayManager.registerWindow(window)
            logger.debug(`窗口已注册到 DisplayManager: ${window.id}`)
        }

        // 注册窗口到主题适配器（验证需求: 9.3）
        if (themeAdapter) {
            themeAdapter.registerWindow(window)
            logger.debug(`窗口已注册到 ThemeAdapter: ${window.id}`)
        }

        // 如果是便签窗口，默认不设置置顶（桌面模式）
        // 桌面模式：窗口保持在普通层级，会被其他窗口遮挡
        // 用户可以通过📌按钮切换到置顶模式
        if (options?.noteId) {
            // 默认不置顶，让窗口保持在普通层级
            window.setAlwaysOnTop(false)
            logger.debug(`便签窗口已设置为桌面模式（普通层级）: ${window.id}`)
        }

        // 加载内容
        this.loadContent(window, options?.windowId, options?.noteId)

        // 监听窗口事件
        this.setupWindowEvents(window)

        logger.info(`窗口创建成功，ID: ${window.id}`)

        return window
    }

    /**
     * 加载窗口内容
     * @param window 窗口实例
     * @param windowId 自定义窗口ID（可选）
     * @param noteId 便签ID（可选）
     * 验证需求: 1.4, 1.5, 7.1, 7.2
     */
    private async loadContent(window: BrowserWindow, windowId?: string, noteId?: string): Promise<void> {
        if (isDevelopment()) {
            // 开发环境：加载开发服务器
            logger.info('开发环境：连接到开发服务器', { url: DEV_CONFIG.devServerUrl })

            try {
                // 构建URL，包含窗口ID和便签ID参数
                let url = DEV_CONFIG.devServerUrl
                const params = new URLSearchParams()
                if (windowId) params.append('windowId', windowId)
                if (noteId) params.append('noteId', noteId)
                if (params.toString()) {
                    url += `?${params.toString()}`
                }

                // 尝试连接到开发服务器
                await this.loadDevServer(window, url)

                // 自动打开开发者工具（验证需求: 7.1）
                if (DEV_CONFIG.devTools) {
                    logger.info('开发环境：打开开发者工具')
                    window.webContents.openDevTools()
                }

                // 设置热重载支持（验证需求: 7.2）
                if (DEV_CONFIG.hotReload) {
                    this.setupHotReload(window)
                }
            } catch (error) {
                logger.error('连接开发服务器失败', error as Error)

                // 在开发环境显示详细错误信息（验证需求: 7.3）
                if (DEV_CONFIG.verboseErrors) {
                    this.showDevServerError(window, error as Error)
                }
            }
        } else {
            // 生产环境：加载构建文件
            logger.info('生产环境：加载构建文件', { path: PROD_CONFIG.indexPath })

            try {
                // 构建查询参数
                const query: Record<string, string> = {}
                if (windowId) query.windowId = windowId
                if (noteId) query.noteId = noteId

                await window.loadFile(PROD_CONFIG.indexPath, Object.keys(query).length > 0 ? { query } : undefined)
            } catch (error) {
                logger.error('加载构建文件失败', error as Error)
                throw error
            }
        }
    }

    /**
     * 加载开发服务器（带重试机制）
     * @param window 窗口实例
     * @param url 开发服务器URL（可选，默认使用配置中的URL）
     * 验证需求: 7.2, 7.4
     */
    private async loadDevServer(window: BrowserWindow, url?: string): Promise<void> {
        const targetUrl = url || DEV_CONFIG.devServerUrl
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= DEV_CONFIG.maxRetries; attempt++) {
            try {
                logger.debug(`尝试连接开发服务器 (${attempt}/${DEV_CONFIG.maxRetries})`, { url: targetUrl })

                // 设置超时
                const loadPromise = window.loadURL(targetUrl)
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`连接超时 (${DEV_CONFIG.connectionTimeout}ms)`))
                    }, DEV_CONFIG.connectionTimeout)
                })

                await Promise.race([loadPromise, timeoutPromise])

                logger.info('成功连接到开发服务器')
                return
            } catch (error) {
                lastError = error as Error
                logger.warn(`连接开发服务器失败 (尝试 ${attempt}/${DEV_CONFIG.maxRetries})`, {
                    error: (error as Error).message
                })

                // 如果不是最后一次尝试，等待一段时间后重试
                if (attempt < DEV_CONFIG.maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            }
        }

        // 所有重试都失败
        throw lastError || new Error('无法连接到开发服务器')
    }

    /**
     * 设置热重载支持
     * @param window 窗口实例
     * 验证需求: 7.2
     */
    private setupHotReload(window: BrowserWindow): void {
        logger.info('设置热重载支持')

        // 监听渲染进程的刷新请求
        window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            // 如果是网络错误，尝试重新加载
            if (errorCode === -102 || errorCode === -6) {
                logger.warn('检测到网络错误，尝试重新加载', {
                    errorCode,
                    errorDescription
                })

                setTimeout(() => {
                    if (!window.isDestroyed()) {
                        window.webContents.reload()
                    }
                }, 1000)
            }
        })

        // 监听开发服务器的更新
        window.webContents.on('did-finish-load', () => {
            logger.debug('页面加载完成')
        })
    }

    /**
     * 显示开发服务器错误
     * @param window 窗口实例
     * @param error 错误对象
     * 验证需求: 7.3, 7.4
     */
    private showDevServerError(window: BrowserWindow, error: Error): void {
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>开发服务器连接失败</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 40px;
                        background: #1e1e1e;
                        color: #d4d4d4;
                    }
                    .error-container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: #252526;
                        padding: 30px;
                        border-radius: 8px;
                        border: 1px solid #3e3e42;
                    }
                    h1 {
                        color: #f48771;
                        margin-top: 0;
                    }
                    .error-message {
                        background: #1e1e1e;
                        padding: 15px;
                        border-radius: 4px;
                        border-left: 4px solid #f48771;
                        margin: 20px 0;
                        font-family: 'Courier New', monospace;
                    }
                    .help-text {
                        color: #858585;
                        margin-top: 20px;
                    }
                    .retry-button {
                        background: #0e639c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        margin-top: 20px;
                    }
                    .retry-button:hover {
                        background: #1177bb;
                    }
                    code {
                        background: #1e1e1e;
                        padding: 2px 6px;
                        border-radius: 3px;
                        color: #ce9178;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>⚠️ 无法连接到开发服务器</h1>
                    <div class="error-message">
                        <strong>错误信息：</strong><br>
                        ${error.message}
                    </div>
                    <div class="help-text">
                        <p><strong>可能的原因：</strong></p>
                        <ul>
                            <li>开发服务器未启动</li>
                            <li>开发服务器端口配置错误</li>
                            <li>防火墙阻止了连接</li>
                        </ul>
                        <p><strong>解决方法：</strong></p>
                        <ol>
                            <li>确保开发服务器正在运行：<code>npm run dev</code></li>
                            <li>检查开发服务器 URL：<code>${DEV_CONFIG.devServerUrl}</code></li>
                            <li>检查防火墙设置</li>
                        </ol>
                    </div>
                    <button class="retry-button" onclick="location.reload()">重试连接</button>
                </div>
            </body>
            </html>
        `

        window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`)
    }

    /**
     * 设置窗口事件监听
     * @param window 窗口实例
     * 验证需求: 8.1
     */
    private setupWindowEvents(window: BrowserWindow): void {
        // 窗口关闭前事件 - 保存最终状态
        window.on('close', () => {
            logger.debug(`窗口 ${window.id} 即将关闭，保存状态`)
            this.saveWindowStateToManager(window)
        })

        // 窗口关闭事件 - 清理资源
        window.on('closed', () => {
            logger.debug(`窗口 ${window.id} 已关闭，清理资源`)
            this.cleanupWindow(window.id)
        })

        // 窗口移动事件 - 保存状态（验证需求: 8.1）
        window.on('moved', () => {
            this.saveWindowStateToManager(window)
        })

        // 窗口调整大小事件 - 保存状态（验证需求: 8.1）
        window.on('resized', () => {
            this.saveWindowStateToManager(window)
        })

        // 窗口最大化/还原事件 - 保存状态（验证需求: 8.1）
        window.on('maximize', () => {
            this.saveWindowStateToManager(window)
        })

        window.on('unmaximize', () => {
            this.saveWindowStateToManager(window)
        })

        // 窗口置顶状态变更事件 - 保存状态（验证需求: 8.1）
        window.on('always-on-top-changed', () => {
            this.saveWindowStateToManager(window)
        })
    }

    /**
     * 清理窗口资源
     * @param windowId Electron窗口ID
     * 验证需求: 5.4, 6.4
     */
    private cleanupWindow(windowId: number): void {
        try {
            logger.info(`清理窗口 ${windowId} 的资源`)

            // 从窗口映射中移除
            const window = this.windows.get(windowId)
            if (window) {
                // 从显示器管理器注销窗口（验证需求: 6.4）
                if (this.displayManager) {
                    this.displayManager.unregisterWindow(windowId)
                    logger.debug(`窗口已从 DisplayManager 注销: ${windowId}`)
                }

                // 移除所有事件监听器
                window.removeAllListeners()
                logger.debug(`已移除窗口 ${windowId} 的所有事件监听器`)

                // 从自定义ID映射中移除
                for (const [customId, win] of this.windowsById.entries()) {
                    if (win === window) {
                        this.windowsById.delete(customId)
                        logger.debug(`已从自定义ID映射中删除窗口: ${customId}`)
                        break
                    }
                }
            }

            // 从映射中删除窗口引用
            this.windows.delete(windowId)
            logger.debug(`已从窗口映射中删除窗口 ${windowId}`)

            // 记录当前活动窗口数量
            logger.info(`当前活动窗口数量: ${this.windows.size}`)
        } catch (error) {
            logger.error(`清理窗口 ${windowId} 资源失败`, error as Error)
        }
    }

    /**
     * 保存窗口状态到 WindowStateManager
     * @param window 窗口实例
     * 验证需求: 8.1
     */
    private saveWindowStateToManager(window: BrowserWindow): void {
        if (!this.windowStateManager || window.isDestroyed()) {
            return
        }

        try {
            const bounds = window.getBounds()

            // 获取窗口所在的显示器ID
            let displayId = 0
            if (this.displayManager) {
                const display = this.displayManager.getDisplayForWindow(window)
                if (display) {
                    displayId = display.id
                }
            }

            // 查找窗口的自定义ID
            let customWindowId = `window-${window.id}`
            for (const [id, win] of this.windowsById.entries()) {
                if (win === window) {
                    customWindowId = id
                    break
                }
            }

            // 构建窗口状态
            const state = {
                id: customWindowId,
                bounds: {
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                },
                isMaximized: window.isMaximized(),
                isAlwaysOnTop: window.isAlwaysOnTop(),
                displayId,
                lastUpdated: Date.now()
            }

            // 保存到 WindowStateManager
            this.windowStateManager.saveWindowState(customWindowId, state)
            logger.debug(`窗口状态已保存: ${customWindowId}`)
        } catch (error) {
            logger.error('保存窗口状态失败', error as Error, { windowId: window.id })
        }
    }

    /**
     * 保存窗口状态到存储（旧方法，保留用于兼容）
     * @param windowId 窗口ID
     */
    saveWindowState(windowId: number): void {
        const window = this.windows.get(windowId)
        if (!window) return

        this.saveWindowStateToManager(window)
    }

    /**
     * 从 WindowStateManager 恢复窗口状态
     * @param windowId 窗口ID（可选）
     * @returns 窗口状态或null
     * 验证需求: 8.2, 8.3
     */
    restoreWindowStateFromManager(windowId?: string): WindowState | null {
        if (!this.windowStateManager) {
            logger.warn('WindowStateManager 未初始化，无法恢复窗口状态')
            return null
        }

        try {
            // 如果没有指定窗口ID，尝试恢复所有窗口状态
            if (!windowId) {
                const allStates = this.windowStateManager.getAllWindowStates()
                if (allStates.length > 0) {
                    // 返回最近更新的窗口状态
                    const latestState = allStates.sort((a, b) => b.lastUpdated - a.lastUpdated)[0]
                    logger.info('恢复最近的窗口状态', { windowId: latestState.id })

                    return {
                        x: latestState.bounds.x,
                        y: latestState.bounds.y,
                        width: latestState.bounds.width,
                        height: latestState.bounds.height,
                        isMaximized: latestState.isMaximized
                    }
                }
                return null
            }

            // 恢复指定窗口的状态
            const state = this.windowStateManager.restoreWindowState(windowId)
            if (!state) {
                logger.debug(`没有找到窗口状态: ${windowId}`)
                return null
            }

            logger.info('恢复窗口状态', { windowId })
            return {
                x: state.bounds.x,
                y: state.bounds.y,
                width: state.bounds.width,
                height: state.bounds.height,
                isMaximized: state.isMaximized
            }
        } catch (error) {
            logger.error('恢复窗口状态失败', error as Error, { windowId })
            return null
        }
    }

    /**
     * 从存储恢复窗口状态（旧方法，保留用于兼容）
     * @returns 窗口状态或null
     */
    restoreWindowState(): WindowState | null {
        return this.restoreWindowStateFromManager()
    }

    /**
     * 验证窗口位置是否在屏幕范围内
     * @param x X坐标
     * @param y Y坐标
     * @param width 宽度
     * @param height 高度
     * @returns 是否有效
     */
    private isPositionValid(x: number, y: number, width: number, height: number): boolean {
        const displays = screen.getAllDisplays()

        // 检查窗口是否至少部分在某个显示器内
        for (const display of displays) {
            const { x: dx, y: dy, width: dw, height: dh } = display.bounds

            // 窗口中心点
            const centerX = x + width / 2
            const centerY = y + height / 2

            // 检查中心点是否在显示器范围内
            if (centerX >= dx && centerX <= dx + dw && centerY >= dy && centerY <= dy + dh) {
                return true
            }
        }

        return false
    }

    /**
     * 获取所有窗口
     * @returns 窗口数组
     */
    getAllWindows(): BrowserWindow[] {
        return Array.from(this.windows.values())
    }

    /**
     * 获取当前窗口数量
     * @returns 窗口数量
     * 验证需求: 10.3
     */
    getWindowCount(): number {
        return this.windows.size
    }

    /**
     * 获取最大窗口数量限制
     * @returns 最大窗口数量
     * 验证需求: 10.3
     */
    getMaxWindows(): number {
        return this.MAX_WINDOWS
    }

    /**
     * 检查是否可以创建新窗口
     * @returns 是否可以创建
     * 验证需求: 10.3
     */
    canCreateWindow(): boolean {
        return this.windows.size < this.MAX_WINDOWS
    }

    /**
     * 获取焦点窗口
     * @returns 焦点窗口或null
     */
    getFocusedWindow(): BrowserWindow | null {
        return BrowserWindow.getFocusedWindow()
    }

    /**
     * 关闭窗口（支持Electron ID）
     * @param windowId Electron窗口ID
     */
    closeWindow(windowId: number): void {
        const window = this.windows.get(windowId)
        if (window && !window.isDestroyed()) {
            window.close()
        }
    }

    /**
     * 关闭窗口（支持自定义ID）
     * @param customWindowId 自定义窗口ID
     * 验证需求: 5.1
     */
    closeWindowById(customWindowId: string): void {
        logger.info(`关闭窗口: ${customWindowId}`)
        const window = this.windowsById.get(customWindowId)
        if (window && !window.isDestroyed()) {
            window.close()
        } else {
            logger.warn(`窗口不存在或已销毁: ${customWindowId}`)
        }
    }

    /**
     * 聚焦窗口（支持自定义ID）
     * @param customWindowId 自定义窗口ID
     * @throws Error 如果窗口不存在或已销毁
     * 验证需求: 4.4
     */
    focusWindowById(customWindowId: string): void {
        logger.info(`聚焦窗口: ${customWindowId}`)
        const window = this.windowsById.get(customWindowId)
        if (window && !window.isDestroyed()) {
            if (window.isMinimized()) {
                window.restore()
            }
            window.focus()
            logger.debug(`窗口已聚焦: ${customWindowId}`)
        } else {
            const error = new Error(`窗口不存在或已销毁: ${customWindowId}`)
            logger.warn(error.message)
            throw error
        }
    }

    /**
     * 设置窗口置顶状态
     * @param customWindowId 自定义窗口ID
     * @param alwaysOnTop 是否置顶
     * 验证需求: 3.1, 3.2
     */
    setAlwaysOnTop(customWindowId: string, alwaysOnTop: boolean): void {
        logger.info(`设置窗口置顶: ${customWindowId}, 置顶: ${alwaysOnTop}`)
        const window = this.windowsById.get(customWindowId)
        if (window && !window.isDestroyed()) {
            window.setAlwaysOnTop(alwaysOnTop)
            logger.debug(`窗口 ${customWindowId} 置顶状态已更新`)
        } else {
            logger.warn(`窗口不存在或已销毁: ${customWindowId}`)
        }
    }

    /**
     * 查询窗口置顶状态
     * @param customWindowId 自定义窗口ID
     * @returns 是否置顶
     * 验证需求: 3.2
     */
    isAlwaysOnTop(customWindowId: string): boolean {
        const window = this.windowsById.get(customWindowId)
        if (window && !window.isDestroyed()) {
            return window.isAlwaysOnTop()
        }
        return false
    }

    /**
     * 获取所有窗口信息
     * @returns 窗口信息数组
     * 验证需求: 4.1, 4.4
     */
    getAllWindowsInfo(): Array<{
        id: string
        noteId: string
        position: { x: number; y: number }
        size: { width: number; height: number }
        isAlwaysOnTop: boolean
        createdAt: number
    }> {
        logger.debug('获取所有窗口信息')
        const infos: Array<{
            id: string
            noteId: string
            position: { x: number; y: number }
            size: { width: number; height: number }
            isAlwaysOnTop: boolean
            createdAt: number
        }> = []

        this.windowsById.forEach((window, id) => {
            if (!window.isDestroyed()) {
                const bounds = window.getBounds()
                infos.push({
                    id,
                    noteId: '', // 需要从窗口URL参数或其他地方获取
                    position: { x: bounds.x, y: bounds.y },
                    size: { width: bounds.width, height: bounds.height },
                    isAlwaysOnTop: window.isAlwaysOnTop(),
                    createdAt: Date.now() // 实际应该保存创建时间
                })
            }
        })

        logger.debug(`找到 ${infos.length} 个窗口`)
        return infos
    }

    /**
     * 广播消息到所有窗口
     * @param channel 消息通道
     * @param data 消息数据
     * 验证需求: 9.1
     */
    broadcastToAll(channel: string, data: any): void {
        logger.debug(`广播消息到所有窗口: ${channel}`, { data })
        let count = 0

        this.windows.forEach((window) => {
            if (!window.isDestroyed()) {
                try {
                    window.webContents.send(channel, data)
                    count++
                } catch (error) {
                    logger.error(`发送消息到窗口 ${window.id} 失败`, error as Error)
                }
            }
        })

        logger.debug(`消息已发送到 ${count} 个窗口`)
    }

    /**
     * 发送消息到特定窗口
     * @param customWindowId 自定义窗口ID
     * @param channel 消息通道
     * @param data 消息数据
     * 验证需求: 9.1
     */
    sendToWindow(customWindowId: string, channel: string, data: any): void {
        logger.debug(`发送消息到窗口 ${customWindowId}: ${channel}`, { data })
        const window = this.windowsById.get(customWindowId)

        if (window && !window.isDestroyed()) {
            try {
                window.webContents.send(channel, data)
                logger.debug(`消息已发送到窗口 ${customWindowId}`)
            } catch (error) {
                logger.error(`发送消息到窗口 ${customWindowId} 失败`, error as Error)
            }
        } else {
            logger.warn(`窗口不存在或已销毁: ${customWindowId}`)
        }
    }

    /**
     * 计算新窗口位置（避免重叠）
     * @returns 新窗口位置
     * 验证需求: 4.3
     */
    calculateNewWindowPosition(): { x: number; y: number } {
        logger.debug('计算新窗口位置')

        const offset = 30 // 位置偏移量
        const windows = Array.from(this.windows.values())

        if (windows.length === 0) {
            // 如果没有窗口，使用默认位置
            const defaultPos = { x: 100, y: 100 }
            logger.debug('没有现有窗口，使用默认位置', defaultPos)
            return defaultPos
        }

        // 获取最后一个窗口的位置
        const lastWindow = windows[windows.length - 1]
        if (lastWindow.isDestroyed()) {
            return { x: 100, y: 100 }
        }

        const bounds = lastWindow.getBounds()
        const newPos = {
            x: bounds.x + offset,
            y: bounds.y + offset
        }

        // 调整位置确保在屏幕内
        const adjustedPos = this.adjustPositionToScreen(newPos)
        logger.debug('新窗口位置', adjustedPos)

        return adjustedPos
    }

    /**
     * 检查位置是否在屏幕范围内
     * @param position 位置坐标
     * @returns 是否在屏幕内
     * 验证需求: 7.4
     */
    isPositionInScreen(position: { x: number; y: number }): boolean {
        const displays = screen.getAllDisplays()

        for (const display of displays) {
            const { x, y, width, height } = display.bounds

            // 检查位置是否在显示器范围内
            if (
                position.x >= x &&
                position.x < x + width &&
                position.y >= y &&
                position.y < y + height
            ) {
                logger.debug('位置在屏幕内', { position, display: display.bounds })
                return true
            }
        }

        logger.debug('位置不在任何屏幕内', { position })
        return false
    }

    /**
     * 调整位置到屏幕内
     * @param position 位置坐标
     * @returns 调整后的位置
     * 验证需求: 7.4
     */
    adjustPositionToScreen(position: { x: number; y: number }): { x: number; y: number } {
        // 如果位置已经在屏幕内，直接返回
        if (this.isPositionInScreen(position)) {
            return position
        }

        logger.debug('调整位置到屏幕内', { original: position })

        // 使用主显示器
        const primaryDisplay = screen.getPrimaryDisplay()
        const { x: screenX, y: screenY, width, height } = primaryDisplay.bounds

        // 默认窗口尺寸
        const defaultWindowWidth = 300
        const defaultWindowHeight = 300
        const minVisible = 50 // 最小可见区域

        // 调整位置
        const adjusted = {
            x: Math.max(screenX, Math.min(screenX + width - minVisible, position.x)),
            y: Math.max(screenY, Math.min(screenY + height - minVisible, position.y))
        }

        logger.debug('位置已调整', { adjusted })
        return adjusted
    }

    /**
     * 获取鼠标当前位置
     * @returns 鼠标位置坐标
     * 验证需求: 11.2
     */
    getCursorPosition(): { x: number; y: number } {
        const cursorPoint = screen.getCursorScreenPoint()
        logger.debug('鼠标位置', cursorPoint)
        return cursorPoint
    }

    /**
     * 计算基于鼠标位置的新窗口位置
     * @returns 新窗口位置
     * 验证需求: 11.2, 11.3
     */
    calculateWindowPositionNearCursor(): { x: number; y: number } {
        logger.debug('计算基于鼠标位置的新窗口位置')

        // 获取鼠标位置
        const cursorPos = this.getCursorPosition()

        // 窗口偏移量（避免窗口直接覆盖鼠标）
        const offset = { x: 20, y: 20 }

        // 计算新位置
        const newPos = {
            x: cursorPos.x + offset.x,
            y: cursorPos.y + offset.y
        }

        // 调整位置确保在屏幕内
        const adjustedPos = this.adjustPositionToScreen(newPos)
        logger.debug('基于鼠标的新窗口位置', adjustedPos)

        return adjustedPos
    }

    /**
     * 计算基于聚焦窗口的新窗口位置
     * @returns 新窗口位置
     * 验证需求: 11.3
     */
    calculateWindowPositionNearFocused(): { x: number; y: number } {
        logger.debug('计算基于聚焦窗口的新窗口位置')

        // 获取聚焦窗口
        const focusedWindow = this.getFocusedWindow()

        if (focusedWindow && !focusedWindow.isDestroyed()) {
            // 获取聚焦窗口的位置
            const bounds = focusedWindow.getBounds()
            const offset = 30

            // 在聚焦窗口附近创建新窗口
            const newPos = {
                x: bounds.x + offset,
                y: bounds.y + offset
            }

            // 调整位置确保在屏幕内
            const adjustedPos = this.adjustPositionToScreen(newPos)
            logger.debug('基于聚焦窗口的新窗口位置', adjustedPos)

            return adjustedPos
        }

        // 如果没有聚焦窗口，使用鼠标位置
        logger.debug('没有聚焦窗口，使用鼠标位置')
        return this.calculateWindowPositionNearCursor()
    }

    /**
     * 保存所有窗口的最终状态
     * 用于应用退出前保存
     * 验证需求: 8.1
     */
    saveAllWindowStates(): void {
        if (!this.windowStateManager) {
            logger.warn('WindowStateManager 未初始化，无法保存窗口状态')
            return
        }

        logger.info('保存所有窗口的最终状态')
        let savedCount = 0

        this.windows.forEach((window) => {
            if (!window.isDestroyed()) {
                this.saveWindowStateToManager(window)
                savedCount++
            }
        })

        // 强制立即保存所有状态
        this.windowStateManager.saveAllStatesImmediate()
        logger.info(`已保存 ${savedCount} 个窗口的最终状态`)
    }

    /**
     * 通过快捷键创建新窗口
     * @returns 创建的窗口实例
     * 验证需求: 11.1, 11.2, 11.3, 11.4
     */
    createWindowFromShortcut(): BrowserWindow {
        logger.info('通过快捷键创建新窗口')

        // 计算新窗口位置（优先使用聚焦窗口附近，否则使用鼠标位置）
        const position = this.calculateWindowPositionNearFocused()

        // 生成窗口ID
        const windowId = `window-${Date.now()}`
        const noteId = `note-${Date.now()}`

        // 创建窗口
        const window = this.createWindow({
            windowId,
            noteId,
            position,
            size: { width: 300, height: 300 }
        })

        // 自动聚焦新窗口（验证需求: 11.4）
        if (!window.isDestroyed()) {
            window.focus()
            logger.info('新窗口已聚焦', { windowId })
        }

        return window
    }
}

// ==================== 日志系统 ====================

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

interface LogEntry {
    level: string
    message: string
    timestamp: string
    error?: {
        message: string
        stack?: string
        name?: string
    }
    context?: any
}

class Logger {
    private level: LogLevel
    private logFilePath: string
    private enableFileLogging: boolean

    constructor() {
        // 开发环境使用 DEBUG 级别，生产环境使用 INFO 级别
        this.level = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO

        // 生产环境启用文件日志
        this.enableFileLogging = process.env.NODE_ENV !== 'development'

        // 日志文件路径
        this.logFilePath = path.join(app.getPath('userData'), 'logs', 'main.log')

        // 确保日志目录存在
        if (this.enableFileLogging) {
            this.ensureLogDirectory()
        }
    }

    /**
     * 确保日志目录存在
     */
    private ensureLogDirectory(): void {
        try {
            const logDir = path.dirname(this.logFilePath)
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true })
            }
        } catch (error) {
            console.error('创建日志目录失败:', error)
        }
    }

    /**
     * 格式化日志条目
     */
    private formatLogEntry(level: string, message: string, error?: Error, context?: any): LogEntry {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString()
        }

        // 添加错误信息（包含堆栈和上下文）
        if (error) {
            entry.error = {
                message: error.message,
                name: error.name,
                stack: error.stack
            }
        }

        // 添加上下文信息
        if (context) {
            entry.context = context
        }

        return entry
    }

    /**
     * 写入日志到文件
     */
    private writeToFile(entry: LogEntry): void {
        if (!this.enableFileLogging) return

        try {
            const logLine = JSON.stringify(entry) + '\n'
            fs.appendFileSync(this.logFilePath, logLine, 'utf-8')
        } catch (error) {
            // 如果写入文件失败，至少输出到控制台
            console.error('写入日志文件失败:', error)
        }
    }

    /**
     * 记录调试信息
     */
    debug(message: string, context?: any): void {
        if (this.level <= LogLevel.DEBUG) {
            const entry = this.formatLogEntry('DEBUG', message, undefined, context)
            console.debug(`[DEBUG] ${message}`, context || '')

            // 开发环境也可以选择写入文件（当前不写入）
            // this.writeToFile(entry)
        }
    }

    /**
     * 记录一般信息
     */
    info(message: string, context?: any): void {
        if (this.level <= LogLevel.INFO) {
            const entry = this.formatLogEntry('INFO', message, undefined, context)
            console.log(`[INFO] ${message}`, context || '')
            this.writeToFile(entry)
        }
    }

    /**
     * 记录警告信息
     */
    warn(message: string, context?: any): void {
        if (this.level <= LogLevel.WARN) {
            const entry = this.formatLogEntry('WARN', message, undefined, context)
            console.warn(`[WARN] ${message}`, context || '')
            this.writeToFile(entry)
        }
    }

    /**
     * 记录错误信息（包含错误堆栈和上下文信息）
     */
    error(message: string, error?: Error, context?: any): void {
        if (this.level <= LogLevel.ERROR) {
            const entry = this.formatLogEntry('ERROR', message, error, context)

            // 输出到控制台
            console.error(`[ERROR] ${message}`)
            if (error) {
                console.error('错误详情:', error.message)
                if (error.stack) {
                    console.error('堆栈:', error.stack)
                }
            }
            if (context) {
                console.error('上下文:', context)
            }

            // 写入文件（生产环境）
            this.writeToFile(entry)
        }
    }

    /**
     * 获取日志文件路径
     */
    getLogFilePath(): string {
        return this.logFilePath
    }
}

// 创建全局日志实例
const logger = new Logger()

// ==================== IPC 通信处理器 ====================

/**
 * 注册所有 IPC 处理器
 * @param windowManager 窗口管理器实例
 */
function registerIPCHandlers(windowManager: WindowManager): void {
    logger.info('注册 IPC 处理器')

    // 注意：shortcutManager 在应用初始化后才可用，IPC 处理器中会检查其是否存在

    // ==================== 窗口操作处理器 ====================

    /**
     * 关闭窗口
     */
    ipcMain.handle('window:close', async (event) => {
        try {
            logger.debug('IPC: window:close')
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                window.close()
            }
        } catch (error) {
            logger.error('关闭窗口失败', error as Error, { channel: 'window:close' })
            throw error
        }
    })

    /**
     * 最小化窗口
     */
    ipcMain.handle('window:minimize', async (event) => {
        try {
            logger.debug('IPC: window:minimize')
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                window.minimize()
            }
        } catch (error) {
            logger.error('最小化窗口失败', error as Error, { channel: 'window:minimize' })
            throw error
        }
    })

    /**
     * 最大化/还原窗口
     */
    ipcMain.handle('window:maximize', async (event) => {
        try {
            logger.debug('IPC: window:maximize')
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                if (window.isMaximized()) {
                    window.unmaximize()
                } else {
                    window.maximize()
                }
            }
        } catch (error) {
            logger.error('最大化窗口失败', error as Error, { channel: 'window:maximize' })
            throw error
        }
    })

    /**
     * 获取窗口位置
     */
    ipcMain.handle('window:getPosition', async (event) => {
        try {
            logger.debug('IPC: window:getPosition')
            const window = BrowserWindow.fromWebContents(event.sender)
            if (!window || window.isDestroyed()) {
                return { x: 0, y: 0 }
            }
            const bounds = window.getBounds()
            const position = { x: bounds.x, y: bounds.y }
            logger.debug('窗口位置:', position)
            return position
        } catch (error) {
            logger.error('获取窗口位置失败', error as Error, { channel: 'window:getPosition' })
            throw error
        }
    })

    /**
     * 设置窗口位置
     */
    ipcMain.handle('window:setPosition', async (event, x: number, y: number) => {
        try {
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                // 使用 setPosition 并传入 animate: false 参数以避免动画闪烁
                window.setPosition(Math.round(x), Math.round(y), false)
            }
        } catch (error) {
            logger.error('设置窗口位置失败', error as Error, {
                channel: 'window:setPosition',
                x,
                y
            })
            throw error
        }
    })

    /**
     * 获取窗口尺寸
     */
    ipcMain.handle('window:getSize', async (event) => {
        try {
            logger.debug('IPC: window:getSize')
            const window = BrowserWindow.fromWebContents(event.sender)
            if (!window || window.isDestroyed()) {
                return { width: 0, height: 0 }
            }
            const bounds = window.getBounds()
            const size = { width: bounds.width, height: bounds.height }
            logger.debug('窗口尺寸:', size)
            return size
        } catch (error) {
            logger.error('获取窗口尺寸失败', error as Error, { channel: 'window:getSize' })
            throw error
        }
    })

    /**
     * 设置窗口尺寸
     */
    ipcMain.handle('window:setSize', async (event, width: number, height: number) => {
        try {
            logger.debug('IPC: window:setSize', { width, height })
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                window.setSize(width, height)
            }
        } catch (error) {
            logger.error('设置窗口尺寸失败', error as Error, {
                channel: 'window:setSize',
                width,
                height
            })
            throw error
        }
    })

    // ==================== 系统信息处理器 ====================

    /**
     * 获取操作系统平台
     */
    ipcMain.handle('system:getPlatform', async () => {
        try {
            logger.debug('IPC: system:getPlatform')
            const platform = process.platform
            logger.debug('平台:', platform)
            return platform
        } catch (error) {
            logger.error('获取平台信息失败', error as Error, { channel: 'system:getPlatform' })
            throw error
        }
    })

    /**
     * 获取应用版本
     */
    ipcMain.handle('system:getVersion', async () => {
        try {
            logger.debug('IPC: system:getVersion')
            const version = app.getVersion()
            logger.debug('应用版本:', version)
            return version
        } catch (error) {
            logger.error('获取应用版本失败', error as Error, { channel: 'system:getVersion' })
            throw error
        }
    })

    /**
     * 获取版本信息（Electron、Node.js、Chrome等）
     */
    ipcMain.handle('system:getVersions', async () => {
        try {
            logger.debug('IPC: system:getVersions')
            const versions = process.versions
            logger.debug('版本信息:', versions)
            return versions
        } catch (error) {
            logger.error('获取版本信息失败', error as Error, { channel: 'system:getVersions' })
            throw error
        }
    })

    /**
     * 获取应用路径
     */
    ipcMain.handle('system:getPath', async (event, name: string) => {
        try {
            logger.debug('IPC: system:getPath', { name })
            const pathValue = app.getPath(name as any)
            logger.debug('路径:', pathValue)
            return pathValue
        } catch (error) {
            logger.error('获取路径失败', error as Error, {
                channel: 'system:getPath',
                name
            })
            throw error
        }
    })

    // ==================== 多窗口管理处理器 ====================

    /**
     * 创建新窗口
     * 验证需求: 4.1, 4.2, 4.3
     */
    ipcMain.handle('multiWindow:create', async (event, options: {
        windowId?: string
        noteId?: string
        position?: { x: number; y: number }
        size?: { width: number; height: number }
        alwaysOnTop?: boolean
    }) => {
        try {
            logger.info('IPC: multiWindow:create', options)

            // 创建新窗口
            const window = windowManager.createWindow(options)

            // 返回窗口信息
            const result = {
                windowId: options.windowId || `window-${window.id}`,
                success: true,
                electronId: window.id
            }

            logger.info('窗口创建成功', result)
            return result
        } catch (error) {
            logger.error('创建窗口失败', error as Error, {
                channel: 'multiWindow:create',
                options
            })
            throw error
        }
    })

    /**
     * 关闭指定窗口
     * 验证需求: 5.1, 5.2
     */
    ipcMain.handle('multiWindow:close', async (event, windowId: string) => {
        try {
            logger.info('IPC: multiWindow:close', { windowId })

            // 关闭窗口
            windowManager.closeWindowById(windowId)

            logger.info('窗口关闭成功', { windowId })
            return { success: true }
        } catch (error) {
            logger.error('关闭窗口失败', error as Error, {
                channel: 'multiWindow:close',
                windowId
            })
            throw error
        }
    })

    /**
     * 聚焦指定窗口
     * 验证需求: 4.4
     */
    ipcMain.handle('multiWindow:focus', async (event, windowId: string) => {
        try {
            logger.info('IPC: multiWindow:focus', { windowId })

            // 聚焦窗口
            windowManager.focusWindowById(windowId)

            logger.info('窗口聚焦成功', { windowId })
            return { success: true }
        } catch (error) {
            logger.error('聚焦窗口失败', error as Error, {
                channel: 'multiWindow:focus',
                windowId
            })
            throw error
        }
    })

    /**
     * 广播消息到所有窗口
     * 验证需求: 9.1
     */
    ipcMain.handle('multiWindow:broadcast', async (event, payload: {
        channel: string
        data: any
    }) => {
        try {
            logger.info('IPC: multiWindow:broadcast', {
                channel: payload.channel,
                dataType: typeof payload.data
            })

            // 广播消息到所有窗口
            windowManager.broadcastToAll(`broadcast:${payload.channel}`, payload.data)

            logger.info('消息广播成功', { channel: payload.channel })
            return { success: true }
        } catch (error) {
            logger.error('广播消息失败', error as Error, {
                channel: 'multiWindow:broadcast',
                payload
            })
            throw error
        }
    })

    /**
     * 获取所有窗口信息
     * 验证需求: 4.1, 4.4
     */
    ipcMain.handle('multiWindow:getAllWindows', async (event) => {
        try {
            logger.debug('IPC: multiWindow:getAllWindows')

            // 获取所有窗口信息
            const windows = windowManager.getAllWindowsInfo()

            logger.debug('获取窗口信息成功', { count: windows.length })
            return windows
        } catch (error) {
            logger.error('获取窗口信息失败', error as Error, {
                channel: 'multiWindow:getAllWindows'
            })
            throw error
        }
    })

    // ==================== 窗口置顶处理器 ====================

    /**
     * 设置窗口置顶状态
     * 验证需求: 3.1, 3.2
     */
    ipcMain.handle('window:setAlwaysOnTop', async (event, alwaysOnTop: boolean) => {
        try {
            logger.info('IPC: window:setAlwaysOnTop', { alwaysOnTop })

            // 获取当前窗口
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                window.setAlwaysOnTop(alwaysOnTop)
                logger.info('窗口置顶状态已更新', {
                    windowId: window.id,
                    alwaysOnTop
                })
                return { success: true, alwaysOnTop }
            } else {
                logger.warn('窗口不存在或已销毁')
                throw new Error('窗口不存在或已销毁')
            }
        } catch (error) {
            logger.error('设置窗口置顶失败', error as Error, {
                channel: 'window:setAlwaysOnTop',
                alwaysOnTop
            })
            throw error
        }
    })

    /**
     * 查询窗口置顶状态
     * 验证需求: 3.2
     */
    ipcMain.handle('window:isAlwaysOnTop', async (event) => {
        try {
            logger.debug('IPC: window:isAlwaysOnTop')

            // 获取当前窗口
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                const isOnTop = window.isAlwaysOnTop()
                logger.debug('窗口置顶状态', {
                    windowId: window.id,
                    isAlwaysOnTop: isOnTop
                })
                return isOnTop
            } else {
                logger.warn('窗口不存在或已销毁')
                return false
            }
        } catch (error) {
            logger.error('查询窗口置顶状态失败', error as Error, {
                channel: 'window:isAlwaysOnTop'
            })
            throw error
        }
    })

    /**
     * 聚焦当前窗口
     * 验证需求: 6.1
     */
    ipcMain.handle('window:focus', async (event) => {
        try {
            logger.debug('IPC: window:focus')

            // 获取当前窗口
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                // 聚焦窗口
                window.focus()
                logger.debug('窗口已聚焦', {
                    windowId: window.id
                })
            } else {
                logger.warn('窗口不存在或已销毁')
            }
        } catch (error) {
            logger.error('聚焦窗口失败', error as Error, {
                channel: 'window:focus'
            })
            throw error
        }
    })

    // ==================== 托盘管理处理器 ====================

    /**
     * 显示托盘通知
     * 验证需求: 2.1, 2.2, 2.4
     */
    ipcMain.handle('tray:showNotification', async (event, notification: {
        title: string
        body: string
        icon?: string
        silent?: boolean
    }) => {
        try {
            logger.info('IPC: tray:showNotification', { title: notification.title })

            if (!trayManager || !trayManager.isCreated()) {
                logger.warn('托盘管理器未初始化或托盘未创建')
                throw new Error('托盘管理器未初始化')
            }

            trayManager.showNotification(notification)
            logger.info('托盘通知已显示')
            return { success: true }
        } catch (error) {
            logger.error('显示托盘通知失败', error as Error, {
                channel: 'tray:showNotification',
                notification
            })
            throw error
        }
    })

    /**
     * 更新托盘菜单
     * 验证需求: 1.2
     */
    ipcMain.handle('tray:updateMenu', async (event, items: any[]) => {
        try {
            logger.info('IPC: tray:updateMenu', { itemCount: items.length })

            if (!trayManager || !trayManager.isCreated()) {
                logger.warn('托盘管理器未初始化或托盘未创建')
                throw new Error('托盘管理器未初始化')
            }

            trayManager.updateMenu(items)
            logger.info('托盘菜单已更新')
            return { success: true }
        } catch (error) {
            logger.error('更新托盘菜单失败', error as Error, {
                channel: 'tray:updateMenu',
                itemCount: items.length
            })
            throw error
        }
    })

    /**
     * 设置托盘工具提示
     * 验证需求: 1.1
     */
    ipcMain.handle('tray:setToolTip', async (event, tooltip: string) => {
        try {
            logger.info('IPC: tray:setToolTip', { tooltip })

            if (!trayManager || !trayManager.isCreated()) {
                logger.warn('托盘管理器未初始化或托盘未创建')
                throw new Error('托盘管理器未初始化')
            }

            trayManager.setToolTip(tooltip)
            logger.info('托盘工具提示已更新')
            return { success: true }
        } catch (error) {
            logger.error('设置托盘工具提示失败', error as Error, {
                channel: 'tray:setToolTip',
                tooltip
            })
            throw error
        }
    })

    /**
     * 检查托盘是否已创建
     * 验证需求: 1.1
     */
    ipcMain.handle('tray:isCreated', async () => {
        try {
            logger.debug('IPC: tray:isCreated')

            const isCreated = trayManager && trayManager.isCreated()
            logger.debug('托盘创建状态', { isCreated })
            return isCreated
        } catch (error) {
            logger.error('检查托盘状态失败', error as Error, {
                channel: 'tray:isCreated'
            })
            throw error
        }
    })

    // ==================== 快捷键管理处理器 ====================

    /**
     * 获取所有快捷键配置
     * 验证需求: 4.4
     */
    ipcMain.handle('shortcut:getAllConfigs', async () => {
        try {
            logger.debug('IPC: shortcut:getAllConfigs')

            if (!shortcutManager) {
                logger.warn('快捷键管理器未初始化')
                return []
            }

            const configs = shortcutManager.getAllConfigs()
            logger.debug('获取快捷键配置成功', { count: configs.length })
            return configs
        } catch (error) {
            logger.error('获取快捷键配置失败', error as Error, {
                channel: 'shortcut:getAllConfigs'
            })
            throw error
        }
    })

    /**
     * 更新快捷键配置
     * 验证需求: 4.1, 4.2, 4.3
     */
    ipcMain.handle('shortcut:updateConfig', async (event, config: {
        key: string
        action: string
        enabled: boolean
    }) => {
        try {
            logger.info('IPC: shortcut:updateConfig', config)

            if (!shortcutManager) {
                logger.warn('快捷键管理器未初始化')
                throw new Error('快捷键管理器未初始化')
            }

            const success = shortcutManager.updateConfig(config)

            if (success) {
                logger.info('快捷键配置更新成功', config)
                return { success: true }
            } else {
                logger.warn('快捷键配置更新失败', config)
                throw new Error('快捷键配置更新失败')
            }
        } catch (error) {
            logger.error('更新快捷键配置失败', error as Error, {
                channel: 'shortcut:updateConfig',
                config
            })
            throw error
        }
    })

    /**
     * 检查快捷键是否已注册
     * 验证需求: 3.3
     */
    ipcMain.handle('shortcut:isRegistered', async (event, key: string) => {
        try {
            logger.debug('IPC: shortcut:isRegistered', { key })

            if (!shortcutManager) {
                logger.warn('快捷键管理器未初始化')
                return false
            }

            const isRegistered = shortcutManager.isRegistered(key)
            logger.debug('快捷键注册状态', { key, isRegistered })
            return isRegistered
        } catch (error) {
            logger.error('检查快捷键注册状态失败', error as Error, {
                channel: 'shortcut:isRegistered',
                key
            })
            throw error
        }
    })

    /**
     * 获取指定动作的快捷键配置
     * 验证需求: 4.4
     */
    ipcMain.handle('shortcut:getConfigByAction', async (event, action: string) => {
        try {
            logger.debug('IPC: shortcut:getConfigByAction', { action })

            if (!shortcutManager) {
                logger.warn('快捷键管理器未初始化')
                return null
            }

            const config = shortcutManager.getConfigByAction(action)
            logger.debug('获取快捷键配置', { action, config })
            return config
        } catch (error) {
            logger.error('获取快捷键配置失败', error as Error, {
                channel: 'shortcut:getConfigByAction',
                action
            })
            throw error
        }
    })

    // ==================== 显示器管理处理器 ====================

    /**
     * 获取所有显示器信息
     * 验证需求: 5.1
     */
    ipcMain.handle('display:getAllDisplays', async () => {
        try {
            logger.debug('IPC: display:getAllDisplays')

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return []
            }

            const displays = displayManager.getAllDisplays()
            logger.debug('获取显示器信息成功', { count: displays.length })
            return displays
        } catch (error) {
            logger.error('获取显示器信息失败', error as Error, {
                channel: 'display:getAllDisplays'
            })
            throw error
        }
    })

    /**
     * 获取主显示器信息
     * 验证需求: 5.2
     */
    ipcMain.handle('display:getPrimaryDisplay', async () => {
        try {
            logger.debug('IPC: display:getPrimaryDisplay')

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return null
            }

            const primaryDisplay = displayManager.getPrimaryDisplay()
            logger.debug('获取主显示器信息成功', { display: primaryDisplay })
            return primaryDisplay
        } catch (error) {
            logger.error('获取主显示器信息失败', error as Error, {
                channel: 'display:getPrimaryDisplay'
            })
            throw error
        }
    })

    /**
     * 获取指定点所在的显示器
     * 验证需求: 5.3
     */
    ipcMain.handle('display:getDisplayNearestPoint', async (event, point: { x: number; y: number }) => {
        try {
            logger.debug('IPC: display:getDisplayNearestPoint', { point })

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return null
            }

            const display = displayManager.getDisplayNearestPoint(point)
            logger.debug('获取显示器信息成功', { display })
            return display
        } catch (error) {
            logger.error('获取显示器信息失败', error as Error, {
                channel: 'display:getDisplayNearestPoint',
                point
            })
            throw error
        }
    })

    /**
     * 获取当前窗口所在的显示器
     * 验证需求: 5.3
     */
    ipcMain.handle('display:getDisplayForWindow', async (event) => {
        try {
            logger.debug('IPC: display:getDisplayForWindow')

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return null
            }

            const window = BrowserWindow.fromWebContents(event.sender)
            if (!window || window.isDestroyed()) {
                logger.warn('窗口不存在或已销毁')
                return null
            }

            const display = displayManager.getDisplayForWindow(window)
            logger.debug('获取窗口所在显示器成功', { display })
            return display
        } catch (error) {
            logger.error('获取窗口所在显示器失败', error as Error, {
                channel: 'display:getDisplayForWindow'
            })
            throw error
        }
    })

    /**
     * 检查位置是否在显示器范围内
     * 验证需求: 6.1
     */
    ipcMain.handle('display:isPositionInBounds', async (event, position: { x: number; y: number }) => {
        try {
            logger.debug('IPC: display:isPositionInBounds', { position })

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return false
            }

            const isInBounds = displayManager.isPositionInBounds(position)
            logger.debug('位置验证结果', { position, isInBounds })
            return isInBounds
        } catch (error) {
            logger.error('验证位置失败', error as Error, {
                channel: 'display:isPositionInBounds',
                position
            })
            throw error
        }
    })

    /**
     * 调整位置到显示器内
     * 验证需求: 6.2
     */
    ipcMain.handle('display:adjustPositionToBounds', async (event, position: { x: number; y: number }, windowSize?: { width: number; height: number }) => {
        try {
            logger.debug('IPC: display:adjustPositionToBounds', { position, windowSize })

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return position
            }

            const adjustedPosition = displayManager.adjustPositionToBounds(position, windowSize)
            logger.debug('位置已调整', { original: position, adjusted: adjustedPosition })
            return adjustedPosition
        } catch (error) {
            logger.error('调整位置失败', error as Error, {
                channel: 'display:adjustPositionToBounds',
                position,
                windowSize
            })
            throw error
        }
    })

    /**
     * 获取显示器数量
     * 验证需求: 5.1
     */
    ipcMain.handle('display:getDisplayCount', async () => {
        try {
            logger.debug('IPC: display:getDisplayCount')

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return 0
            }

            const count = displayManager.getDisplayCount()
            logger.debug('显示器数量', { count })
            return count
        } catch (error) {
            logger.error('获取显示器数量失败', error as Error, {
                channel: 'display:getDisplayCount'
            })
            throw error
        }
    })

    /**
     * 检查是否为多显示器环境
     * 验证需求: 5.1
     */
    ipcMain.handle('display:isMultiDisplay', async () => {
        try {
            logger.debug('IPC: display:isMultiDisplay')

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return false
            }

            const isMulti = displayManager.isMultiDisplay()
            logger.debug('多显示器检测结果', { isMulti })
            return isMulti
        } catch (error) {
            logger.error('检测多显示器失败', error as Error, {
                channel: 'display:isMultiDisplay'
            })
            throw error
        }
    })

    /**
     * 获取显示器信息摘要
     * 验证需求: 5.1, 5.2
     */
    ipcMain.handle('display:getDisplaySummary', async () => {
        try {
            logger.debug('IPC: display:getDisplaySummary')

            if (!displayManager) {
                logger.warn('显示器管理器未初始化')
                return '显示器管理器未初始化'
            }

            const summary = displayManager.getDisplaySummary()
            logger.debug('显示器摘要', { summary })
            return summary
        } catch (error) {
            logger.error('获取显示器摘要失败', error as Error, {
                channel: 'display:getDisplaySummary'
            })
            throw error
        }
    })

    // ==================== 自启动管理处理器 ====================

    /**
     * 启用开机自启动
     * 验证需求: 7.2
     */
    ipcMain.handle('autoLaunch:enable', async (event, hidden: boolean = false) => {
        try {
            logger.info('IPC: autoLaunch:enable', { hidden })

            if (!autoLauncher) {
                logger.warn('自启动管理器未初始化')
                throw new Error('自启动管理器未初始化')
            }

            const success = await autoLauncher.enable(hidden)

            if (success) {
                logger.info('开机自启动已启用', { hidden })
                return { success: true, enabled: true, hidden }
            } else {
                logger.warn('启用开机自启动失败')
                throw new Error('启用开机自启动失败')
            }
        } catch (error) {
            logger.error('启用开机自启动失败', error as Error, {
                channel: 'autoLaunch:enable',
                hidden
            })
            throw error
        }
    })

    /**
     * 禁用开机自启动
     * 验证需求: 7.3
     */
    ipcMain.handle('autoLaunch:disable', async () => {
        try {
            logger.info('IPC: autoLaunch:disable')

            if (!autoLauncher) {
                logger.warn('自启动管理器未初始化')
                throw new Error('自启动管理器未初始化')
            }

            const success = await autoLauncher.disable()

            if (success) {
                logger.info('开机自启动已禁用')
                return { success: true, enabled: false }
            } else {
                logger.warn('禁用开机自启动失败')
                throw new Error('禁用开机自启动失败')
            }
        } catch (error) {
            logger.error('禁用开机自启动失败', error as Error, {
                channel: 'autoLaunch:disable'
            })
            throw error
        }
    })

    /**
     * 检查是否已启用开机自启动
     * 验证需求: 7.4
     */
    ipcMain.handle('autoLaunch:isEnabled', async () => {
        try {
            logger.debug('IPC: autoLaunch:isEnabled')

            if (!autoLauncher) {
                logger.warn('自启动管理器未初始化')
                return false
            }

            const isEnabled = await autoLauncher.isEnabled()
            logger.debug('开机自启动状态', { isEnabled })
            return isEnabled
        } catch (error) {
            logger.error('检查开机自启动状态失败', error as Error, {
                channel: 'autoLaunch:isEnabled'
            })
            throw error
        }
    })

    /**
     * 获取自启动配置
     * 验证需求: 7.4
     */
    ipcMain.handle('autoLaunch:getConfig', async () => {
        try {
            logger.debug('IPC: autoLaunch:getConfig')

            if (!autoLauncher) {
                logger.warn('自启动管理器未初始化')
                return {
                    enabled: false,
                    hidden: false
                }
            }

            const config = autoLauncher.getConfig()
            logger.debug('自启动配置', { config })
            return config
        } catch (error) {
            logger.error('获取自启动配置失败', error as Error, {
                channel: 'autoLaunch:getConfig'
            })
            throw error
        }
    })

    /**
     * 更新自启动配置
     * 验证需求: 7.1, 7.2, 7.3, 7.4
     */
    ipcMain.handle('autoLaunch:updateConfig', async (event, config: {
        enabled?: boolean
        hidden?: boolean
    }) => {
        try {
            logger.info('IPC: autoLaunch:updateConfig', config)

            if (!autoLauncher) {
                logger.warn('自启动管理器未初始化')
                throw new Error('自启动管理器未初始化')
            }

            const success = await autoLauncher.updateConfig(config)

            if (success) {
                logger.info('自启动配置更新成功', config)
                const updatedConfig = autoLauncher.getConfig()
                return { success: true, config: updatedConfig }
            } else {
                logger.warn('自启动配置更新失败', config)
                throw new Error('自启动配置更新失败')
            }
        } catch (error) {
            logger.error('更新自启动配置失败', error as Error, {
                channel: 'autoLaunch:updateConfig',
                config
            })
            throw error
        }
    })

    // ==================== 主题管理处理器 ====================

    /**
     * 获取当前主题
     * 验证需求: 9.1
     */
    ipcMain.handle('theme:get-current', async () => {
        try {
            logger.debug('IPC: theme:get-current')

            if (!themeAdapter) {
                logger.warn('主题适配器未初始化')
                return 'system'
            }

            const currentTheme = themeAdapter.getCurrentTheme()
            logger.debug('当前主题', { currentTheme })
            return currentTheme
        } catch (error) {
            logger.error('获取当前主题失败', error as Error, {
                channel: 'theme:get-current'
            })
            throw error
        }
    })

    /**
     * 获取主题配置
     * 验证需求: 9.4
     */
    ipcMain.handle('theme:get-config', async () => {
        try {
            logger.debug('IPC: theme:get-config')

            if (!themeAdapter) {
                logger.warn('主题适配器未初始化')
                return {
                    mode: 'system',
                    followSystem: true
                }
            }

            const config = themeAdapter.getConfig()
            logger.debug('主题配置', { config })
            return config
        } catch (error) {
            logger.error('获取主题配置失败', error as Error, {
                channel: 'theme:get-config'
            })
            throw error
        }
    })

    /**
     * 设置主题
     * 验证需求: 9.3, 9.4
     */
    ipcMain.handle('theme:set', async (event, mode: 'light' | 'dark' | 'system') => {
        try {
            logger.info('IPC: theme:set', { mode })

            if (!themeAdapter) {
                logger.warn('主题适配器未初始化')
                throw new Error('主题适配器未初始化')
            }

            themeAdapter.setTheme(mode)
            logger.info('主题已设置', { mode })
            return { success: true, mode }
        } catch (error) {
            logger.error('设置主题失败', error as Error, {
                channel: 'theme:set',
                mode
            })
            throw error
        }
    })

    /**
     * 切换主题
     * 验证需求: 9.3
     */
    ipcMain.handle('theme:toggle', async () => {
        try {
            logger.info('IPC: theme:toggle')

            if (!themeAdapter) {
                logger.warn('主题适配器未初始化')
                throw new Error('主题适配器未初始化')
            }

            themeAdapter.toggleTheme()
            const currentTheme = themeAdapter.getCurrentTheme()
            logger.info('主题已切换', { currentTheme })
            return currentTheme
        } catch (error) {
            logger.error('切换主题失败', error as Error, {
                channel: 'theme:toggle'
            })
            throw error
        }
    })

    /**
     * 获取系统主题
     * 验证需求: 9.1
     */
    ipcMain.handle('theme:get-system', async () => {
        try {
            logger.debug('IPC: theme:get-system')

            if (!themeAdapter) {
                logger.warn('主题适配器未初始化')
                return 'light'
            }

            const systemTheme = themeAdapter.getSystemTheme()
            logger.debug('系统主题', { systemTheme })
            return systemTheme
        } catch (error) {
            logger.error('获取系统主题失败', error as Error, {
                channel: 'theme:get-system'
            })
            throw error
        }
    })

    logger.info('IPC 处理器注册完成')
}

/**
 * 向渲染进程发送消息
 * @param window 目标窗口
 * @param channel 消息通道
 * @param data 消息数据
 */
function sendToRenderer(window: BrowserWindow, channel: string, data?: any): void {
    try {
        if (window && !window.isDestroyed()) {
            logger.debug('发送消息到渲染进程', { channel, data })
            window.webContents.send(channel, data)
        }
    } catch (error) {
        logger.error('发送消息到渲染进程失败', error as Error, { channel, data })
    }
}

// ==================== 应用生命周期管理 ====================

// 创建全局窗口管理器实例
let windowManager: WindowManager

// 创建全局托盘管理器实例
let trayManager: TrayManager

// 创建全局快捷键管理器实例
let shortcutManager: ShortcutManager

// 创建全局显示器管理器实例
let displayManager: DisplayManager

// 创建全局自启动管理器实例
let autoLauncher: AutoLauncher

// 创建全局窗口状态管理器实例
let windowStateManager: WindowStateManager

// 创建全局主题适配器实例
let themeAdapter: ThemeAdapter

/**
 * 设置托盘事件监听器
 * @param trayManager 托盘管理器实例
 * @param windowManager 窗口管理器实例
 * 验证需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4
 */
function setupTrayEvents(trayManager: TrayManager, windowManager: WindowManager): void {
    logger.info('设置托盘事件监听器')

    // 监听创建窗口事件（验证需求: 1.3）
    trayManager.on('create-window', () => {
        logger.info('托盘事件：创建新窗口')

        try {
            // 检查窗口数量限制
            const currentWindowCount = windowManager.getAllWindows().length
            const maxWindows = 20

            if (currentWindowCount >= maxWindows) {
                logger.warn('已达到窗口数量上限，无法创建新窗口', {
                    current: currentWindowCount,
                    max: maxWindows
                })

                // 显示通知（验证需求: 2.1, 2.2）
                trayManager.showNotification({
                    title: '无法创建新便签',
                    body: `已达到窗口数量上限（${maxWindows}个）`,
                    silent: false
                })

                return
            }

            // 创建新窗口
            const position = windowManager.calculateNewWindowPosition()
            const windowId = `window-${Date.now()}`
            const noteId = `note-${Date.now()}`

            windowManager.createWindow({
                windowId,
                noteId,
                position,
                size: { width: 300, height: 300 }
            })

            // 显示通知（验证需求: 2.1）
            trayManager.showNotification({
                title: '已创建新便签',
                body: '便签已成功创建',
                silent: true
            })

            logger.info('新窗口创建成功', { windowId })
        } catch (error) {
            logger.error('托盘创建窗口失败', error as Error)

            // 显示错误通知（验证需求: 2.2）
            trayManager.showNotification({
                title: '创建便签失败',
                body: '无法创建新便签，请重试',
                silent: false
            })
        }
    })

    // 监听退出应用事件（验证需求: 1.4）
    trayManager.on('quit-app', () => {
        logger.info('托盘事件：退出应用')
        app.quit()
    })

    logger.info('托盘事件监听器设置完成')
}

/**
 * 注册全局快捷键
 * @param shortcutManager 快捷键管理器实例
 * @param windowManager 窗口管理器实例
 * 验证需求: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */
function registerGlobalShortcuts(shortcutManager: ShortcutManager, windowManager: WindowManager): void {
    logger.info('注册全局快捷键')

    try {
        // 根据平台选择默认快捷键
        // macOS: Cmd+Shift+N, Windows/Linux: Ctrl+Shift+N
        const defaultShortcut = isMacOS() ? 'Cmd+Shift+N' : 'Ctrl+Shift+N'
        logger.info(`默认快捷键: ${defaultShortcut}`)

        // 定义快捷键处理函数
        const createNoteHandler = () => {
            logger.info('快捷键触发：创建新便签')

            try {
                // 检查窗口数量限制
                const currentWindowCount = windowManager.getAllWindows().length
                const maxWindows = 20

                if (currentWindowCount >= maxWindows) {
                    logger.warn('已达到窗口数量上限，无法创建新窗口', {
                        current: currentWindowCount,
                        max: maxWindows
                    })
                    return
                }

                // 通过快捷键创建新窗口
                windowManager.createWindowFromShortcut()
            } catch (error) {
                logger.error('快捷键创建窗口失败', error as Error)
            }
        }

        // 检查是否已有配置
        const existingConfig = shortcutManager.getConfigByAction('createNote')

        if (existingConfig && existingConfig.enabled) {
            // 使用已保存的配置
            logger.info(`使用已保存的快捷键配置: ${existingConfig.key}`)
            const registered = shortcutManager.register(existingConfig.key, 'createNote', createNoteHandler)

            if (registered) {
                logger.info(`快捷键注册成功: ${existingConfig.key}`)
            } else {
                logger.warn(`快捷键注册失败: ${existingConfig.key}，尝试使用默认快捷键`)
                // 尝试注册默认快捷键
                const defaultRegistered = shortcutManager.register(defaultShortcut, 'createNote', createNoteHandler)

                if (defaultRegistered) {
                    logger.info(`默认快捷键注册成功: ${defaultShortcut}`)
                } else {
                    logger.error(`默认快捷键也注册失败: ${defaultShortcut}`)
                }
            }
        } else {
            // 注册默认快捷键
            logger.info(`注册默认快捷键: ${defaultShortcut}`)
            const registered = shortcutManager.register(defaultShortcut, 'createNote', createNoteHandler)

            if (registered) {
                logger.info(`快捷键注册成功: ${defaultShortcut}`)
            } else {
                logger.warn(`快捷键注册失败，可能被其他应用占用: ${defaultShortcut}`)

                // 尝试备用快捷键
                const alternativeShortcut = isMacOS() ? 'Cmd+Alt+N' : 'Ctrl+Alt+N'
                logger.info(`尝试注册备用快捷键: ${alternativeShortcut}`)

                const alternativeRegistered = shortcutManager.register(alternativeShortcut, 'createNote', createNoteHandler)

                if (alternativeRegistered) {
                    logger.info(`备用快捷键注册成功: ${alternativeShortcut}`)
                } else {
                    logger.error(`备用快捷键也注册失败: ${alternativeShortcut}`)
                }
            }
        }

        // 记录所有已注册的快捷键
        const allConfigs = shortcutManager.getAllConfigs()
        logger.info(`已注册 ${allConfigs.length} 个快捷键`, {
            shortcuts: allConfigs.map(c => ({ key: c.key, action: c.action, enabled: c.enabled }))
        })
    } catch (error) {
        logger.error('注册全局快捷键失败', error as Error)
    }
}

/**
 * 注销所有全局快捷键
 * 验证需求: 3.4
 */
function unregisterGlobalShortcuts(shortcutManager: ShortcutManager): void {
    logger.info('注销所有全局快捷键')

    try {
        shortcutManager.unregisterAll()
        logger.info('全局快捷键已注销')
    } catch (error) {
        logger.error('注销全局快捷键失败', error as Error)
    }
}

// 应用就绪时初始化
app.whenReady().then(async () => {
    const environment = isDevelopment() ? 'development' : 'production'

    logger.info('='.repeat(50))
    logger.info('Electron 主进程已启动')
    logger.info('应用版本:', app.getVersion())
    logger.info('平台:', process.platform)
    logger.info('环境:', environment)
    logger.info('打包状态:', app.isPackaged ? '已打包' : '未打包')
    if (isDevelopment()) {
        logger.info('开发服务器:', DEV_CONFIG.devServerUrl)
        logger.info('开发者工具:', DEV_CONFIG.devTools ? '启用' : '禁用')
        logger.info('热重载:', DEV_CONFIG.hotReload ? '启用' : '禁用')
    }
    logger.info('='.repeat(50))

    try {
        // 应用平台特定配置
        applyPlatformSpecificConfig()

        // 创建显示器管理器（验证需求: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4）
        logger.info('创建显示器管理器')
        displayManager = new DisplayManager()
        logger.info('显示器管理器创建成功')
        logger.info(displayManager.getDisplaySummary())

        // 创建窗口状态管理器（验证需求: 8.1, 8.2, 8.3, 8.4）
        logger.info('创建窗口状态管理器')
        windowStateManager = new WindowStateManager(displayManager)
        logger.info('窗口状态管理器创建成功')
        logger.info(windowStateManager.getStateSummary())

        // 创建窗口管理器
        logger.info('创建窗口管理器')
        windowManager = new WindowManager()

        // 将 DisplayManager 集成到 WindowManager（验证需求: 5.1, 5.2, 5.3, 5.4）
        windowManager.setDisplayManager(displayManager)

        // 将 WindowStateManager 集成到 WindowManager（验证需求: 8.1, 8.2, 8.3, 8.4）
        windowManager.setWindowStateManager(windowStateManager)

        // 监听显示器变更事件（验证需求: 5.4, 6.3, 6.4）
        displayManager.on('display-changed', (event: any) => {
            logger.info('显示器配置已变更', {
                type: event.type,
                displayId: event.display.id
            })
            logger.info('更新后的显示器信息:', displayManager.getDisplaySummary())

            // 广播显示器变更事件到所有窗口
            windowManager.broadcastToAll('display:changed', event)
        })

        displayManager.on('windows-migrated', (event: any) => {
            logger.info(`已迁移 ${event.count} 个窗口到有效显示器`)

            // 通知所有窗口
            windowManager.broadcastToAll('display:windows-migrated', event)
        })

        // 创建托盘管理器（验证需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4）
        logger.info('创建托盘管理器')
        trayManager = new TrayManager({
            tooltip: '便签应用',
            enableNotifications: true
        })

        // 创建托盘图标
        trayManager.createTray()

        // 监听托盘事件
        setupTrayEvents(trayManager, windowManager)

        // 创建快捷键管理器（验证需求: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4）
        logger.info('创建快捷键管理器')
        shortcutManager = new ShortcutManager()

        // 创建自启动管理器（验证需求: 7.1, 7.2, 7.3, 7.4）
        logger.info('创建自启动管理器')
        autoLauncher = new AutoLauncher()
        logger.info('自启动管理器创建成功')

        // 加载自启动配置（验证需求: 7.4）
        const autoLaunchConfig = autoLauncher.getConfig()
        logger.info('自启动配置已加载', autoLaunchConfig)

        // 检查实际的自启动状态（验证需求: 7.4）
        const isAutoLaunchEnabled = await autoLauncher.isEnabled()
        logger.info('开机自启动状态', { isEnabled: isAutoLaunchEnabled })

        // 创建主题适配器（验证需求: 9.1, 9.2, 9.3, 9.4）
        logger.info('创建主题适配器')
        themeAdapter = new ThemeAdapter()
        logger.info('主题适配器创建成功')

        // 检测系统主题（验证需求: 9.1）
        const currentTheme = themeAdapter.getCurrentTheme()
        const systemTheme = themeAdapter.getSystemTheme()
        const themeConfig = themeAdapter.getConfig()
        logger.info('系统主题已检测', {
            currentTheme,
            systemTheme,
            config: themeConfig
        })

        // 注册 IPC 处理器
        registerIPCHandlers(windowManager)

        // 注册全局快捷键（验证需求: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4）
        registerGlobalShortcuts(shortcutManager, windowManager)

        // 清理过期的窗口状态（验证需求: 8.4）
        logger.info('清理过期的窗口状态')
        const cleanedCount = windowStateManager.cleanupOldStates()
        if (cleanedCount > 0) {
            logger.info(`已清理 ${cleanedCount} 个过期的窗口状态`)
        }

        // 设置定时清理任务（验证需求: 8.4）
        // 每24小时清理一次过期状态
        const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000 // 24小时
        setInterval(() => {
            logger.info('执行定时清理任务')
            const cleaned = windowStateManager.cleanupOldStates()
            if (cleaned > 0) {
                logger.info(`定时清理：已清理 ${cleaned} 个过期的窗口状态`)
            } else {
                logger.debug('定时清理：没有过期的窗口状态')
            }
        }, CLEANUP_INTERVAL)
        logger.info(`已设置定时清理任务，间隔: ${CLEANUP_INTERVAL / 1000 / 60 / 60} 小时`)

        // 尝试恢复窗口状态（验证需求: 8.2, 8.3）
        logger.info('尝试恢复窗口状态')
        const savedState = windowManager.restoreWindowStateFromManager()

        // 创建主窗口
        if (savedState) {
            logger.info('恢复窗口状态:', savedState)
            windowManager.createWindow({
                x: savedState.x,
                y: savedState.y,
                width: savedState.width,
                height: savedState.height
            })
        } else {
            logger.info('使用默认窗口配置')
            windowManager.createWindow()
        }

        logger.info('应用初始化完成')
    } catch (error) {
        logger.error('应用初始化失败', error as Error)
        // 即使初始化失败，也尝试创建一个基本窗口
        try {
            windowManager = new WindowManager()
            windowManager.createWindow()
        } catch (fallbackError) {
            logger.error('创建备用窗口失败', fallbackError as Error)
            app.quit()
        }
    }
}).catch((error) => {
    logger.error('应用就绪处理失败', error)
    app.quit()
})

/**
 * macOS 激活事件处理
 * 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，重新创建窗口
 * 验证需求: 5.2, 5.3
 */
app.on('activate', () => {
    logger.info('应用被激活')

    // 只在 macOS 平台处理 activate 事件
    if (isMacOS()) {
        const windowCount = BrowserWindow.getAllWindows().length
        logger.debug(`当前窗口数量: ${windowCount}`)

        if (windowCount === 0) {
            logger.info('没有打开的窗口，创建新窗口')
            windowManager.createWindow()
        } else {
            logger.debug('已有打开的窗口，不创建新窗口')
        }
    } else {
        logger.debug(`非 macOS 平台 (${getCurrentPlatform()})，忽略 activate 事件`)
    }
})

/**
 * 所有窗口关闭事件处理
 * 在 macOS 上，应用通常保持活动状态，直到用户明确退出
 * 在其他平台上，所有窗口关闭时应用退出
 * 验证需求: 5.1, 5.2
 */
app.on('window-all-closed', () => {
    logger.info('所有窗口已关闭')

    if (isMacOS()) {
        // macOS 平台：保持应用运行
        logger.info('macOS 平台，保持应用运行（符合 macOS 应用标准行为）')
    } else {
        // Windows 和 Linux 平台：退出应用
        logger.info(`${getCurrentPlatform()} 平台，退出应用`)
        app.quit()
    }
})

/**
 * 应用退出前事件处理
 * 保存所有窗口的最终状态
 * 验证需求: 5.4, 8.1
 */
app.on('before-quit', (event) => {
    logger.info('应用即将退出')
    logger.debug(`平台: ${getCurrentPlatform()}`)

    try {
        // 注销所有全局快捷键（验证需求: 3.4）
        if (shortcutManager) {
            unregisterGlobalShortcuts(shortcutManager)
        }

        // 销毁托盘（验证需求: 1.4）
        if (trayManager && trayManager.isCreated()) {
            logger.info('销毁托盘')
            trayManager.destroy()
        }

        // 保存所有窗口的最终状态（验证需求: 8.1）
        if (windowManager) {
            logger.info('保存所有窗口的最终状态')
            windowManager.saveAllWindowStates()
        }

        // 销毁窗口状态管理器（验证需求: 8.1）
        if (windowStateManager) {
            logger.info('销毁窗口状态管理器')
            windowStateManager.destroy()
        }

        // 销毁显示器管理器（验证需求: 5.4）
        if (displayManager) {
            logger.info('销毁显示器管理器')
            displayManager.destroy()
        }

        // 销毁主题适配器（验证需求: 9.4）
        if (themeAdapter) {
            logger.info('销毁主题适配器')
            themeAdapter.destroy()
        }

        logger.info('所有资源已清理')
    } catch (error) {
        logger.error('清理资源失败', error as Error)
    }
})

/**
 * 应用即将退出事件处理
 * 确保快捷键被注销
 * 验证需求: 3.4
 */
app.on('will-quit', () => {
    logger.info('应用即将退出，确保快捷键已注销')
    if (shortcutManager) {
        unregisterGlobalShortcuts(shortcutManager)
    }
})

// ==================== 全局错误处理 ====================

/**
 * 处理未捕获的异常
 * 验证需求: 7.3, 9.1, 9.4
 */
process.on('uncaughtException', (error: Error) => {
    // 记录错误信息，包含错误堆栈和上下文信息
    logger.error('未捕获的异常', error, {
        type: 'UNCAUGHT_EXCEPTION',
        timestamp: Date.now(),
        platform: process.platform,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
    })

    // 在开发环境显示详细错误信息（验证需求: 7.3）
    if (isDevelopment() && DEV_CONFIG.verboseErrors) {
        console.error('='.repeat(50))
        console.error('❌ 未捕获的异常详情:')
        console.error('消息:', error.message)
        console.error('名称:', error.name)
        console.error('堆栈:', error.stack)
        console.error('时间:', new Date().toISOString())
        console.error('平台:', process.platform)
        console.error('Node 版本:', process.version)
        console.error('Electron 版本:', process.versions.electron)
        console.error('='.repeat(50))
    }

    // 应用继续运行，不崩溃
})

/**
 * 处理未处理的 Promise 拒绝
 * 验证需求: 7.3, 9.3, 9.4
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    // 将 reason 转换为 Error 对象
    const error = reason instanceof Error ? reason : new Error(String(reason))

    // 记录 Promise 拒绝信息，包含错误堆栈和上下文信息
    logger.error('未处理的 Promise 拒绝', error, {
        type: 'UNHANDLED_REJECTION',
        timestamp: Date.now(),
        reason: String(reason),
        platform: process.platform,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
    })

    // 在开发环境显示详细错误信息（验证需求: 7.3）
    if (isDevelopment() && DEV_CONFIG.verboseErrors) {
        console.error('='.repeat(50))
        console.error('❌ 未处理的 Promise 拒绝详情:')
        console.error('原因:', reason)
        console.error('Promise:', promise)
        if (error.stack) {
            console.error('堆栈:', error.stack)
        }
        console.error('时间:', new Date().toISOString())
        console.error('平台:', process.platform)
        console.error('Node 版本:', process.version)
        console.error('Electron 版本:', process.versions.electron)
        console.error('='.repeat(50))
    }
})

/**
 * 处理资源加载错误
 * 验证需求: 7.3, 7.4
 */
app.on('web-contents-created', (_event, webContents) => {
    // 监听资源加载失败事件（验证需求: 7.4）
    webContents.on('did-fail-load', (_loadEvent, errorCode, errorDescription, validatedURL) => {
        logger.error('资源加载失败', new Error(errorDescription), {
            type: 'RESOURCE_LOAD_ERROR',
            errorCode,
            url: validatedURL,
            timestamp: Date.now()
        })

        // 在开发环境显示详细的加载失败信息（验证需求: 7.3, 7.4）
        if (isDevelopment() && DEV_CONFIG.verboseErrors) {
            console.error('='.repeat(50))
            console.error('❌ 资源加载失败详情:')
            console.error('错误代码:', errorCode)
            console.error('错误描述:', errorDescription)
            console.error('URL:', validatedURL)
            console.error('时间:', new Date().toISOString())
            console.error('='.repeat(50))
        }
    })

    // 监听控制台消息（捕获渲染进程的错误）
    webContents.on('console-message', (_msgEvent, level, message, line, sourceId) => {
        // level: 0=verbose, 1=info, 2=warning, 3=error
        if (level === 3) {
            logger.error('渲染进程错误', new Error(message), {
                type: 'RENDERER_ERROR',
                line,
                sourceId,
                timestamp: Date.now()
            })

            // 在开发环境显示详细错误（验证需求: 7.3）
            if (isDevelopment() && DEV_CONFIG.verboseErrors) {
                console.error('='.repeat(50))
                console.error('❌ 渲染进程错误:')
                console.error('消息:', message)
                console.error('行号:', line)
                console.error('源文件:', sourceId)
                console.error('时间:', new Date().toISOString())
                console.error('='.repeat(50))
            }
        } else if (isDevelopment()) {
            // 在开发环境也显示其他级别的控制台消息
            const levelNames = ['VERBOSE', 'INFO', 'WARNING', 'ERROR']
            const levelName = levelNames[level] || 'UNKNOWN'
            console.log(`[渲染进程 ${levelName}] ${message}`)
        }
    })
})
