/**
 * AutoLauncher - 开机自启动管理器
 * 
 * 职责：
 * - 管理应用的开机自启动配置
 * - 支持 Windows、macOS、Linux 三个平台
 * - 配置持久化到本地存储
 * 
 * 验证需求: 7.1, 7.2, 7.3, 7.4
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// ==================== 类型定义 ====================

/**
 * 自启动配置接口
 */
export interface AutoLaunchConfig {
    /** 是否启用开机自启动 */
    enabled: boolean
    /** 是否隐藏启动（后台启动） */
    hidden: boolean
    /** 应用路径（可选，默认使用当前应用路径） */
    path?: string
}

/**
 * 平台类型
 */
enum Platform {
    WINDOWS = 'win32',
    MACOS = 'darwin',
    LINUX = 'linux'
}

// ==================== AutoLauncher 类 ====================

/**
 * 开机自启动管理器
 * 验证需求: 7.1, 7.2, 7.3, 7.4
 */
export class AutoLauncher {
    private config: AutoLaunchConfig
    private configPath: string
    private readonly CONFIG_FILE_NAME = 'autolaunch.json'

    /**
     * 构造函数
     */
    constructor() {
        // 配置文件路径
        this.configPath = path.join(app.getPath('userData'), this.CONFIG_FILE_NAME)

        // 默认配置
        this.config = {
            enabled: false,
            hidden: false,
            path: app.getPath('exe')
        }

        // 加载配置
        this.loadConfig()

        console.log('[AutoLauncher] 初始化完成', {
            configPath: this.configPath,
            config: this.config
        })
    }

    /**
     * 启用开机自启动
     * @param hidden 是否隐藏启动（可选，默认false）
     * @returns 是否成功
     * 验证需求: 7.2
     */
    async enable(hidden: boolean = false): Promise<boolean> {
        console.log('[AutoLauncher] 启用开机自启动', { hidden })

        try {
            const platform = process.platform as Platform
            let success = false

            switch (platform) {
                case Platform.WINDOWS:
                    success = await this.enableWindows(hidden)
                    break
                case Platform.MACOS:
                    success = await this.enableMacOS(hidden)
                    break
                case Platform.LINUX:
                    success = await this.enableLinux(hidden)
                    break
                default:
                    console.error('[AutoLauncher] 不支持的平台:', platform)
                    return false
            }

            if (success) {
                // 更新配置
                this.config.enabled = true
                this.config.hidden = hidden
                this.saveConfig()

                console.log('[AutoLauncher] 开机自启动已启用')
                return true
            } else {
                console.error('[AutoLauncher] 启用开机自启动失败')
                return false
            }
        } catch (error) {
            console.error('[AutoLauncher] 启用开机自启动时发生错误:', error)
            return false
        }
    }

    /**
     * 禁用开机自启动
     * @returns 是否成功
     * 验证需求: 7.3
     */
    async disable(): Promise<boolean> {
        console.log('[AutoLauncher] 禁用开机自启动')

        try {
            const platform = process.platform as Platform
            let success = false

            switch (platform) {
                case Platform.WINDOWS:
                    success = await this.disableWindows()
                    break
                case Platform.MACOS:
                    success = await this.disableMacOS()
                    break
                case Platform.LINUX:
                    success = await this.disableLinux()
                    break
                default:
                    console.error('[AutoLauncher] 不支持的平台:', platform)
                    return false
            }

            if (success) {
                // 更新配置
                this.config.enabled = false
                this.saveConfig()

                console.log('[AutoLauncher] 开机自启动已禁用')
                return true
            } else {
                console.error('[AutoLauncher] 禁用开机自启动失败')
                return false
            }
        } catch (error) {
            console.error('[AutoLauncher] 禁用开机自启动时发生错误:', error)
            return false
        }
    }

    /**
     * 检查是否已启用开机自启动
     * @returns 是否已启用
     * 验证需求: 7.4
     */
    async isEnabled(): Promise<boolean> {
        try {
            const platform = process.platform as Platform

            switch (platform) {
                case Platform.WINDOWS:
                    return await this.isEnabledWindows()
                case Platform.MACOS:
                    return await this.isEnabledMacOS()
                case Platform.LINUX:
                    return await this.isEnabledLinux()
                default:
                    console.error('[AutoLauncher] 不支持的平台:', platform)
                    return false
            }
        } catch (error) {
            console.error('[AutoLauncher] 检查自启动状态时发生错误:', error)
            return false
        }
    }

    /**
     * 获取配置
     * @returns 当前配置
     * 验证需求: 7.4
     */
    getConfig(): AutoLaunchConfig {
        return { ...this.config }
    }

    /**
     * 更新配置
     * @param config 部分配置
     * @returns 是否成功
     */
    async updateConfig(config: Partial<AutoLaunchConfig>): Promise<boolean> {
        console.log('[AutoLauncher] 更新配置', config)

        try {
            // 如果要启用自启动
            if (config.enabled === true && !this.config.enabled) {
                const success = await this.enable(config.hidden ?? this.config.hidden)
                return success
            }

            // 如果要禁用自启动
            if (config.enabled === false && this.config.enabled) {
                const success = await this.disable()
                return success
            }

            // 如果只是更新隐藏状态
            if (config.hidden !== undefined && config.hidden !== this.config.hidden) {
                if (this.config.enabled) {
                    // 重新启用以应用新的隐藏状态
                    await this.disable()
                    const success = await this.enable(config.hidden)
                    return success
                } else {
                    // 只更新配置
                    this.config.hidden = config.hidden
                    this.saveConfig()
                    return true
                }
            }

            return true
        } catch (error) {
            console.error('[AutoLauncher] 更新配置时发生错误:', error)
            return false
        }
    }

    // ==================== Windows 平台实现 ====================

    /**
     * Windows 平台：启用开机自启动
     * 使用 Electron app.setLoginItemSettings API
     * 验证需求: 7.2
     */
    private async enableWindows(hidden: boolean): Promise<boolean> {
        console.log('[AutoLauncher] Windows: 启用开机自启动', { hidden })

        try {
            app.setLoginItemSettings({
                openAtLogin: true,
                openAsHidden: hidden,
                path: this.config.path || app.getPath('exe'),
                args: hidden ? ['--hidden'] : []
            })

            console.log('[AutoLauncher] Windows: 开机自启动已启用')
            return true
        } catch (error) {
            console.error('[AutoLauncher] Windows: 启用开机自启动失败:', error)
            return false
        }
    }

    /**
     * Windows 平台：禁用开机自启动
     * 验证需求: 7.3
     */
    private async disableWindows(): Promise<boolean> {
        console.log('[AutoLauncher] Windows: 禁用开机自启动')

        try {
            app.setLoginItemSettings({
                openAtLogin: false
            })

            console.log('[AutoLauncher] Windows: 开机自启动已禁用')
            return true
        } catch (error) {
            console.error('[AutoLauncher] Windows: 禁用开机自启动失败:', error)
            return false
        }
    }

    /**
     * Windows 平台：检查是否已启用
     * 验证需求: 7.4
     */
    private async isEnabledWindows(): Promise<boolean> {
        try {
            const settings = app.getLoginItemSettings()
            return settings.openAtLogin
        } catch (error) {
            console.error('[AutoLauncher] Windows: 检查自启动状态失败:', error)
            return false
        }
    }

    // ==================== macOS 平台实现 ====================

    /**
     * macOS 平台：启用开机自启动
     * 使用 Electron app.setLoginItemSettings API
     * 验证需求: 7.2
     */
    private async enableMacOS(hidden: boolean): Promise<boolean> {
        console.log('[AutoLauncher] macOS: 启用开机自启动', { hidden })

        try {
            app.setLoginItemSettings({
                openAtLogin: true,
                openAsHidden: hidden
            })

            console.log('[AutoLauncher] macOS: 开机自启动已启用')
            return true
        } catch (error) {
            console.error('[AutoLauncher] macOS: 启用开机自启动失败:', error)
            return false
        }
    }

    /**
     * macOS 平台：禁用开机自启动
     * 验证需求: 7.3
     */
    private async disableMacOS(): Promise<boolean> {
        console.log('[AutoLauncher] macOS: 禁用开机自启动')

        try {
            app.setLoginItemSettings({
                openAtLogin: false
            })

            console.log('[AutoLauncher] macOS: 开机自启动已禁用')
            return true
        } catch (error) {
            console.error('[AutoLauncher] macOS: 禁用开机自启动失败:', error)
            return false
        }
    }

    /**
     * macOS 平台：检查是否已启用
     * 验证需求: 7.4
     */
    private async isEnabledMacOS(): Promise<boolean> {
        try {
            const settings = app.getLoginItemSettings()
            return settings.openAtLogin
        } catch (error) {
            console.error('[AutoLauncher] macOS: 检查自启动状态失败:', error)
            return false
        }
    }

    // ==================== Linux 平台实现 ====================

    /**
     * Linux 平台：启用开机自启动
     * 创建 .desktop 文件到 ~/.config/autostart/
     * 验证需求: 7.2
     */
    private async enableLinux(hidden: boolean): Promise<boolean> {
        console.log('[AutoLauncher] Linux: 启用开机自启动', { hidden })

        try {
            // 获取 autostart 目录
            const autostartDir = path.join(app.getPath('home'), '.config', 'autostart')

            // 确保目录存在
            if (!fs.existsSync(autostartDir)) {
                fs.mkdirSync(autostartDir, { recursive: true })
                console.log('[AutoLauncher] Linux: 创建 autostart 目录:', autostartDir)
            }

            // .desktop 文件路径
            const desktopFilePath = path.join(autostartDir, 'sticky-notes.desktop')

            // 应用名称和路径
            const appName = app.getName()
            const appPath = this.config.path || app.getPath('exe')

            // 构建 .desktop 文件内容
            const desktopFileContent = [
                '[Desktop Entry]',
                'Type=Application',
                `Name=${appName}`,
                `Exec=${appPath}${hidden ? ' --hidden' : ''}`,
                `Hidden=${hidden ? 'true' : 'false'}`,
                'NoDisplay=false',
                'X-GNOME-Autostart-enabled=true',
                'Comment=Sticky Notes Application',
                ''
            ].join('\n')

            // 写入文件
            fs.writeFileSync(desktopFilePath, desktopFileContent, 'utf-8')

            console.log('[AutoLauncher] Linux: .desktop 文件已创建:', desktopFilePath)
            return true
        } catch (error) {
            console.error('[AutoLauncher] Linux: 启用开机自启动失败:', error)
            return false
        }
    }

    /**
     * Linux 平台：禁用开机自启动
     * 删除 .desktop 文件
     * 验证需求: 7.3
     */
    private async disableLinux(): Promise<boolean> {
        console.log('[AutoLauncher] Linux: 禁用开机自启动')

        try {
            // .desktop 文件路径
            const desktopFilePath = path.join(
                app.getPath('home'),
                '.config',
                'autostart',
                'sticky-notes.desktop'
            )

            // 如果文件存在，删除它
            if (fs.existsSync(desktopFilePath)) {
                fs.unlinkSync(desktopFilePath)
                console.log('[AutoLauncher] Linux: .desktop 文件已删除:', desktopFilePath)
            }

            return true
        } catch (error) {
            console.error('[AutoLauncher] Linux: 禁用开机自启动失败:', error)
            return false
        }
    }

    /**
     * Linux 平台：检查是否已启用
     * 检查 .desktop 文件是否存在
     * 验证需求: 7.4
     */
    private async isEnabledLinux(): Promise<boolean> {
        try {
            const desktopFilePath = path.join(
                app.getPath('home'),
                '.config',
                'autostart',
                'sticky-notes.desktop'
            )

            return fs.existsSync(desktopFilePath)
        } catch (error) {
            console.error('[AutoLauncher] Linux: 检查自启动状态失败:', error)
            return false
        }
    }

    // ==================== 配置管理 ====================

    /**
     * 加载配置
     * 验证需求: 7.4
     */
    private loadConfig(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8')
                const loadedConfig = JSON.parse(data)

                // 合并配置
                this.config = {
                    ...this.config,
                    ...loadedConfig
                }

                console.log('[AutoLauncher] 配置已加载:', this.config)
            } else {
                console.log('[AutoLauncher] 配置文件不存在，使用默认配置')
            }
        } catch (error) {
            console.error('[AutoLauncher] 加载配置失败:', error)
            console.log('[AutoLauncher] 使用默认配置')
        }
    }

    /**
     * 保存配置
     * 验证需求: 7.4
     */
    private saveConfig(): void {
        try {
            // 确保目录存在
            const dir = path.dirname(this.configPath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }

            // 写入配置
            const configData = JSON.stringify(this.config, null, 2)
            fs.writeFileSync(this.configPath, configData, 'utf-8')

            console.log('[AutoLauncher] 配置已保存:', this.configPath)
        } catch (error) {
            console.error('[AutoLauncher] 保存配置失败:', error)
        }
    }
}
