import { nativeTheme, BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
    mode: ThemeMode
    followSystem: boolean
}

/**
 * ThemeAdapter - 系统主题适配器
 * 
 * 职责：
 * - 检测和监听系统主题变更
 * - 管理应用主题模式（light/dark/system）
 * - 同步主题到所有渲染进程
 * - 持久化主题配置
 */
export class ThemeAdapter {
    private currentTheme: ThemeMode
    private config: ThemeConfig
    private configPath: string
    private windows: Set<BrowserWindow>

    constructor() {
        this.windows = new Set()
        this.configPath = path.join(app.getPath('userData'), 'theme.json')

        // 加载配置
        this.loadConfig()

        // 初始化当前主题
        this.currentTheme = this.config.mode === 'system'
            ? this.getSystemTheme()
            : this.config.mode

        // 监听系统主题变更
        this.watchSystemTheme()

        // 设置 IPC 处理器
        this.setupIpcHandlers()
    }

    /**
     * 注册窗口以接收主题更新
     */
    registerWindow(window: BrowserWindow): void {
        this.windows.add(window)

        // 窗口关闭时移除
        window.on('closed', () => {
            this.windows.delete(window)
        })

        // 立即发送当前主题到新窗口
        this.notifyThemeChange(this.currentTheme, window)
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme(): ThemeMode {
        return this.currentTheme
    }

    /**
     * 设置主题
     */
    setTheme(mode: ThemeMode): void {
        this.config.mode = mode
        this.config.followSystem = mode === 'system'

        // 更新当前主题
        const newTheme = mode === 'system' ? this.getSystemTheme() : mode

        if (this.currentTheme !== newTheme) {
            this.currentTheme = newTheme
            this.notifyThemeChange(newTheme)
        }

        // 保存配置
        this.saveConfig()
    }

    /**
     * 切换主题（在 light 和 dark 之间切换）
     */
    toggleTheme(): void {
        const newMode = this.currentTheme === 'light' ? 'dark' : 'light'
        this.setTheme(newMode)
    }

    /**
     * 获取系统主题
     */
    getSystemTheme(): 'light' | 'dark' {
        return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    }

    /**
     * 获取配置
     */
    getConfig(): ThemeConfig {
        return { ...this.config }
    }

    /**
     * 监听系统主题变更
     */
    private watchSystemTheme(): void {
        nativeTheme.on('updated', () => {
            // 只有在跟随系统模式下才响应系统主题变更
            if (this.config.followSystem) {
                const systemTheme = this.getSystemTheme()

                if (this.currentTheme !== systemTheme) {
                    this.currentTheme = systemTheme
                    this.notifyThemeChange(systemTheme)
                }
            }
        })
    }

    /**
     * 通知渲染进程主题变更
     */
    private notifyThemeChange(theme: ThemeMode, targetWindow?: BrowserWindow): void {
        const windows = targetWindow ? [targetWindow] : Array.from(this.windows)

        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('theme-changed', theme)
            }
        })
    }

    /**
     * 设置 IPC 处理器
     */
    private setupIpcHandlers(): void {
        // 获取当前主题
        ipcMain.handle('theme:get-current', () => {
            return this.currentTheme
        })

        // 获取配置
        ipcMain.handle('theme:get-config', () => {
            return this.getConfig()
        })

        // 设置主题
        ipcMain.handle('theme:set', (_event, mode: ThemeMode) => {
            this.setTheme(mode)
            return true
        })

        // 切换主题
        ipcMain.handle('theme:toggle', () => {
            this.toggleTheme()
            return this.currentTheme
        })

        // 获取系统主题
        ipcMain.handle('theme:get-system', () => {
            return this.getSystemTheme()
        })
    }

    /**
     * 加载配置
     */
    private loadConfig(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8')
                const loaded = JSON.parse(data)

                // 验证配置
                if (this.isValidConfig(loaded)) {
                    this.config = loaded
                    return
                }
            }
        } catch (error) {
            console.error('加载主题配置失败:', error)
        }

        // 使用默认配置
        this.config = {
            mode: 'system',
            followSystem: true
        }
    }

    /**
     * 保存配置
     */
    private saveConfig(): void {
        try {
            const data = JSON.stringify(this.config, null, 2)
            fs.writeFileSync(this.configPath, data, 'utf-8')
        } catch (error) {
            console.error('保存主题配置失败:', error)
        }
    }

    /**
     * 验证配置有效性
     */
    private isValidConfig(config: any): config is ThemeConfig {
        return (
            config &&
            typeof config === 'object' &&
            ['light', 'dark', 'system'].includes(config.mode) &&
            typeof config.followSystem === 'boolean'
        )
    }

    /**
     * 清理资源
     */
    destroy(): void {
        this.windows.clear()
        // 移除所有 IPC 处理器
        ipcMain.removeHandler('theme:get-current')
        ipcMain.removeHandler('theme:get-config')
        ipcMain.removeHandler('theme:set')
        ipcMain.removeHandler('theme:toggle')
        ipcMain.removeHandler('theme:get-system')
    }
}
