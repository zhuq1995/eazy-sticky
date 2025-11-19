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
    devTools: true,
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

    constructor(stateFilePath: string = WINDOW_STATE_FILE) {
        this.stateFilePath = stateFilePath
    }

    /**
     * 创建新窗口（扩展版本，支持自定义位置和尺寸）
     * @param options 窗口配置选项
     * @returns 创建的窗口实例
     * 验证需求: 4.1, 4.2, 4.3
     */
    createWindow(options?: Partial<WindowConfig> & {
        windowId?: string
        noteId?: string
        position?: { x: number; y: number }
        size?: { width: number; height: number }
        alwaysOnTop?: boolean
    }): BrowserWindow {
        logger.info('创建新窗口', { options })

        // 合并配置
        const config = { ...DEFAULT_WINDOW_CONFIG, ...options }

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

        // 创建窗口
        const window = new BrowserWindow(config)

        // 保存窗口引用
        this.windows.set(window.id, window)

        // 如果提供了自定义窗口ID，也保存到ID映射中
        if (options?.windowId) {
            this.windowsById.set(options.windowId, window)
            logger.debug(`窗口已注册，ID: ${options.windowId}, Electron ID: ${window.id}`)
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
     */
    private setupWindowEvents(window: BrowserWindow): void {
        // 窗口关闭前事件 - 保存最终状态
        window.on('close', () => {
            logger.debug(`窗口 ${window.id} 即将关闭，保存状态`)
            this.saveWindowState(window.id)
        })

        // 窗口关闭事件 - 清理资源
        window.on('closed', () => {
            logger.debug(`窗口 ${window.id} 已关闭，清理资源`)
            this.cleanupWindow(window.id)
        })

        // 窗口移动事件 - 保存状态
        window.on('moved', () => {
            this.saveWindowState(window.id)
        })

        // 窗口调整大小事件 - 保存状态
        window.on('resized', () => {
            this.saveWindowState(window.id)
        })

        // 窗口最大化/还原事件 - 保存状态
        window.on('maximize', () => {
            this.saveWindowState(window.id)
        })

        window.on('unmaximize', () => {
            this.saveWindowState(window.id)
        })
    }

    /**
     * 清理窗口资源
     * @param windowId Electron窗口ID
     * 验证需求: 5.4
     */
    private cleanupWindow(windowId: number): void {
        try {
            logger.info(`清理窗口 ${windowId} 的资源`)

            // 从窗口映射中移除
            const window = this.windows.get(windowId)
            if (window) {
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
     * 保存窗口状态到存储
     * @param windowId 窗口ID
     */
    saveWindowState(windowId: number): void {
        const window = this.windows.get(windowId)
        if (!window) return

        try {
            const bounds = window.getBounds()
            const state: WindowState = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                isMaximized: window.isMaximized()
            }

            // 读取现有状态
            let storedState: StoredWindowState = {
                version: 1,
                windows: {}
            }

            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf-8')
                storedState = JSON.parse(data)
            }

            // 更新窗口状态
            storedState.windows[`window-${windowId}`] = {
                ...state,
                lastUpdated: Date.now()
            }

            // 写入文件
            fs.writeFileSync(this.stateFilePath, JSON.stringify(storedState, null, 2))
        } catch (error) {
            console.error('保存窗口状态失败:', error)
        }
    }

    /**
     * 从存储恢复窗口状态
     * @returns 窗口状态或null
     */
    restoreWindowState(): WindowState | null {
        try {
            if (!fs.existsSync(this.stateFilePath)) {
                return null
            }

            const data = fs.readFileSync(this.stateFilePath, 'utf-8')
            const storedState: StoredWindowState = JSON.parse(data)

            // 获取主窗口状态
            const mainWindowState = storedState.windows['window-main']
            if (!mainWindowState) {
                return null
            }

            // 验证窗口位置是否在屏幕范围内
            const { x, y, width, height } = mainWindowState
            if (!this.isPositionValid(x, y, width, height)) {
                console.warn('保存的窗口位置超出屏幕范围，使用默认位置')
                return null
            }

            return {
                x: mainWindowState.x,
                y: mainWindowState.y,
                width: mainWindowState.width,
                height: mainWindowState.height,
                isMaximized: mainWindowState.isMaximized
            }
        } catch (error) {
            console.error('恢复窗口状态失败:', error)
            return null
        }
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
        } else {
            logger.warn(`窗口不存在或已销毁: ${customWindowId}`)
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
            logger.debug('IPC: window:setPosition', { x, y })
            const window = BrowserWindow.fromWebContents(event.sender)
            if (window && !window.isDestroyed()) {
                window.setPosition(x, y)
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

/**
 * 注册全局快捷键
 * @param windowManager 窗口管理器实例
 * 验证需求: 11.1, 11.2, 11.3, 11.4, 11.5
 */
function registerGlobalShortcuts(windowManager: WindowManager): void {
    logger.info('注册全局快捷键')

    try {
        // 根据平台选择快捷键
        // macOS: Cmd+N, Windows/Linux: Ctrl+N
        const shortcut = isMacOS() ? 'Cmd+N' : 'Ctrl+N'
        logger.info(`注册快捷键: ${shortcut}`)

        // 注册快捷键（验证需求: 11.1）
        const registered = globalShortcut.register(shortcut, () => {
            logger.info(`快捷键 ${shortcut} 被触发`)

            try {
                // 检查窗口数量限制
                const currentWindowCount = windowManager.getAllWindows().length
                const maxWindows = 20 // 与多窗口配置保持一致

                if (currentWindowCount >= maxWindows) {
                    logger.warn('已达到窗口数量上限，无法创建新窗口', {
                        current: currentWindowCount,
                        max: maxWindows
                    })
                    return
                }

                // 通过快捷键创建新窗口（验证需求: 11.2, 11.3, 11.4）
                windowManager.createWindowFromShortcut()
            } catch (error) {
                logger.error('快捷键创建窗口失败', error as Error)
            }
        })

        // 检查注册是否成功（验证需求: 11.5）
        if (registered) {
            logger.info(`快捷键 ${shortcut} 注册成功`)
        } else {
            // 快捷键注册失败，可能被其他应用占用
            logger.warn(`快捷键 ${shortcut} 注册失败，可能被其他应用占用`, {
                shortcut,
                platform: process.platform
            })

            // 尝试注册备用快捷键
            const alternativeShortcut = isMacOS() ? 'Cmd+Shift+N' : 'Ctrl+Shift+N'
            logger.info(`尝试注册备用快捷键: ${alternativeShortcut}`)

            const alternativeRegistered = globalShortcut.register(alternativeShortcut, () => {
                logger.info(`备用快捷键 ${alternativeShortcut} 被触发`)

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

                    windowManager.createWindowFromShortcut()
                } catch (error) {
                    logger.error('备用快捷键创建窗口失败', error as Error)
                }
            })

            if (alternativeRegistered) {
                logger.info(`备用快捷键 ${alternativeShortcut} 注册成功`)
            } else {
                logger.error(`备用快捷键 ${alternativeShortcut} 也注册失败`)
            }
        }

        // 记录所有已注册的快捷键
        const registeredShortcuts = globalShortcut.isRegistered(shortcut)
        logger.debug('快捷键注册状态', {
            shortcut,
            registered: registeredShortcuts
        })
    } catch (error) {
        logger.error('注册全局快捷键失败', error as Error)
    }
}

/**
 * 注销所有全局快捷键
 * 验证需求: 11.5
 */
function unregisterGlobalShortcuts(): void {
    logger.info('注销所有全局快捷键')

    try {
        globalShortcut.unregisterAll()
        logger.info('全局快捷键已注销')
    } catch (error) {
        logger.error('注销全局快捷键失败', error as Error)
    }
}

// 应用就绪时初始化
app.whenReady().then(() => {
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

        // 创建窗口管理器
        logger.info('创建窗口管理器')
        windowManager = new WindowManager()

        // 注册 IPC 处理器
        registerIPCHandlers(windowManager)

        // 注册全局快捷键（验证需求: 11.1, 11.2, 11.3, 11.4, 11.5）
        registerGlobalShortcuts(windowManager)

        // 尝试恢复窗口状态
        logger.info('尝试恢复窗口状态')
        const savedState = windowManager.restoreWindowState()

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
 * 验证需求: 5.4
 */
app.on('before-quit', (event) => {
    logger.info('应用即将退出')
    logger.debug(`平台: ${getCurrentPlatform()}`)

    try {
        // 注销所有全局快捷键（验证需求: 11.5）
        unregisterGlobalShortcuts()

        // 保存所有窗口的最终状态
        const windows = windowManager.getAllWindows()
        logger.info(`保存 ${windows.length} 个窗口的最终状态`)

        windows.forEach((window) => {
            if (!window.isDestroyed()) {
                windowManager.saveWindowState(window.id)
                logger.debug(`已保存窗口 ${window.id} 的状态`)
            }
        })

        logger.info('所有窗口状态已保存')
    } catch (error) {
        logger.error('保存窗口状态失败', error as Error)
    }
})

/**
 * 应用即将退出事件处理
 * 确保快捷键被注销
 * 验证需求: 11.5
 */
app.on('will-quit', () => {
    logger.info('应用即将退出，确保快捷键已注销')
    unregisterGlobalShortcuts()
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
