/**
 * 全局快捷键管理器
 * 
 * 职责：
 * - 注册和注销全局快捷键
 * - 管理快捷键配置
 * - 处理快捷键冲突
 * - 提供快捷键自定义接口
 * 
 * 验证需求: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */

import { globalShortcut, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// ==================== 类型定义 ====================

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
    key: string
    action: string
    enabled: boolean
}

/**
 * 快捷键冲突信息
 */
export interface ShortcutConflict {
    key: string
    reason: string
}

/**
 * 存储的快捷键配置
 */
interface StoredShortcutConfig {
    version: number
    shortcuts: ShortcutConfig[]
}

/**
 * 快捷键动作类型
 */
export type ShortcutAction = 'createNote' | 'showAllNotes' | 'hideAllNotes' | 'toggleNotes'

// ==================== ShortcutManager 类 ====================

/**
 * 全局快捷键管理器
 * 验证需求: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */
export class ShortcutManager {
    private shortcuts: Map<string, ShortcutConfig> = new Map()
    private handlers: Map<string, () => void> = new Map()
    private configPath: string

    /**
     * 构造函数
     */
    constructor() {
        // 配置文件路径
        this.configPath = path.join(app.getPath('userData'), 'shortcuts.json')

        // 加载配置
        this.loadConfig()
    }

    /**
     * 注册快捷键
     * 验证需求: 3.1, 3.2
     * @param key 快捷键字符串（如 'Ctrl+Shift+N'）
     * @param action 动作名称
     * @param handler 快捷键处理函数
     * @returns 是否注册成功
     */
    register(key: string, action: string, handler: () => void): boolean {
        console.log(`注册快捷键: ${key} -> ${action}`)

        try {
            // 验证快捷键格式
            if (!this.validateKey(key)) {
                console.error(`快捷键格式无效: ${key}`)
                return false
            }

            // 检查快捷键是否已被占用
            const conflict = this.handleConflict(key)
            if (conflict) {
                console.warn(`快捷键冲突: ${conflict.reason}`)
                return false
            }

            // 注册快捷键
            const registered = globalShortcut.register(key, handler)

            if (registered) {
                // 保存配置
                this.shortcuts.set(key, {
                    key,
                    action,
                    enabled: true
                })

                // 保存处理函数
                this.handlers.set(key, handler)

                // 持久化配置
                this.saveConfig()

                console.log(`快捷键注册成功: ${key}`)
                return true
            } else {
                console.error(`快捷键注册失败: ${key}`)
                return false
            }
        } catch (error) {
            console.error(`注册快捷键失败: ${key}`, error)
            return false
        }
    }

    /**
     * 注销快捷键
     * 验证需求: 3.4
     * @param key 快捷键字符串
     */
    unregister(key: string): void {
        console.log(`注销快捷键: ${key}`)

        try {
            // 注销快捷键
            globalShortcut.unregister(key)

            // 从映射中删除
            this.shortcuts.delete(key)
            this.handlers.delete(key)

            // 持久化配置
            this.saveConfig()

            console.log(`快捷键注销成功: ${key}`)
        } catch (error) {
            console.error(`注销快捷键失败: ${key}`, error)
        }
    }

    /**
     * 注销所有快捷键
     * 验证需求: 3.4
     */
    unregisterAll(): void {
        console.log('注销所有快捷键')

        try {
            // 注销所有快捷键
            globalShortcut.unregisterAll()

            // 清空映射
            this.shortcuts.clear()
            this.handlers.clear()

            console.log('所有快捷键已注销')
        } catch (error) {
            console.error('注销所有快捷键失败', error)
        }
    }

    /**
     * 检查快捷键是否已注册
     * 验证需求: 3.3
     * @param key 快捷键字符串
     * @returns 是否已注册
     */
    isRegistered(key: string): boolean {
        return globalShortcut.isRegistered(key)
    }

    /**
     * 更新快捷键配置
     * 验证需求: 4.1, 4.2, 4.3
     * @param config 快捷键配置
     * @returns 是否更新成功
     */
    updateConfig(config: ShortcutConfig): boolean {
        console.log(`更新快捷键配置: ${config.key} -> ${config.action}`)

        try {
            // 验证快捷键格式
            if (!this.validateKey(config.key)) {
                console.error(`快捷键格式无效: ${config.key}`)
                return false
            }

            // 查找旧的快捷键配置
            let oldKey: string | null = null
            for (const [key, shortcut] of this.shortcuts.entries()) {
                if (shortcut.action === config.action) {
                    oldKey = key
                    break
                }
            }

            // 如果旧快捷键存在且与新快捷键不同，注销旧快捷键
            if (oldKey && oldKey !== config.key) {
                console.log(`注销旧快捷键: ${oldKey}`)
                this.unregister(oldKey)
            }

            // 如果快捷键已启用，注册新快捷键
            if (config.enabled) {
                // 获取处理函数
                const handler = this.handlers.get(oldKey || config.key)
                if (handler) {
                    // 注册新快捷键
                    const registered = this.register(config.key, config.action, handler)
                    if (!registered) {
                        console.error(`注册新快捷键失败: ${config.key}`)
                        return false
                    }
                } else {
                    console.error(`未找到快捷键处理函数: ${config.action}`)
                    return false
                }
            } else {
                // 如果快捷键已禁用，只保存配置
                this.shortcuts.set(config.key, config)
                this.saveConfig()
            }

            console.log(`快捷键配置更新成功: ${config.key}`)
            return true
        } catch (error) {
            console.error(`更新快捷键配置失败: ${config.key}`, error)
            return false
        }
    }

    /**
     * 获取所有快捷键配置
     * 验证需求: 4.4
     * @returns 快捷键配置数组
     */
    getAllConfigs(): ShortcutConfig[] {
        return Array.from(this.shortcuts.values())
    }

    /**
     * 获取指定动作的快捷键配置
     * @param action 动作名称
     * @returns 快捷键配置或 null
     */
    getConfigByAction(action: string): ShortcutConfig | null {
        for (const config of this.shortcuts.values()) {
            if (config.action === action) {
                return config
            }
        }
        return null
    }

    /**
     * 加载配置
     * 验证需求: 4.1
     */
    private loadConfig(): void {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.log('快捷键配置文件不存在，使用默认配置')
                this.initDefaultConfig()
                return
            }

            const data = fs.readFileSync(this.configPath, 'utf-8')
            const storedConfig: StoredShortcutConfig = JSON.parse(data)

            // 加载快捷键配置
            for (const config of storedConfig.shortcuts) {
                this.shortcuts.set(config.key, config)
            }

            console.log(`已加载 ${storedConfig.shortcuts.length} 个快捷键配置`)
        } catch (error) {
            console.error('加载快捷键配置失败', error)
            this.initDefaultConfig()
        }
    }

    /**
     * 保存配置
     * 验证需求: 4.1
     */
    private saveConfig(): void {
        try {
            const storedConfig: StoredShortcutConfig = {
                version: 1,
                shortcuts: Array.from(this.shortcuts.values())
            }

            // 确保目录存在
            const dir = path.dirname(this.configPath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }

            // 写入文件
            fs.writeFileSync(this.configPath, JSON.stringify(storedConfig, null, 2), 'utf-8')

            console.log('快捷键配置已保存')
        } catch (error) {
            console.error('保存快捷键配置失败', error)
        }
    }

    /**
     * 初始化默认配置
     */
    private initDefaultConfig(): void {
        console.log('初始化默认快捷键配置')

        // 根据平台选择默认快捷键
        const isMacOS = process.platform === 'darwin'
        const defaultKey = isMacOS ? 'Cmd+Shift+N' : 'Ctrl+Shift+N'

        // 设置默认配置
        this.shortcuts.set(defaultKey, {
            key: defaultKey,
            action: 'createNote',
            enabled: true
        })

        // 保存配置
        this.saveConfig()
    }

    /**
     * 验证快捷键格式
     * 验证需求: 4.2
     * @param key 快捷键字符串
     * @returns 是否有效
     */
    private validateKey(key: string): boolean {
        // 快捷键格式：修饰键+主键
        // 修饰键：Ctrl, Shift, Alt, Cmd (macOS), Super (Linux)
        // 主键：A-Z, 0-9, F1-F12, 特殊键等

        if (!key || typeof key !== 'string') {
            return false
        }

        // 分割快捷键
        const parts = key.split('+')
        if (parts.length < 2) {
            // 至少需要一个修饰键和一个主键
            return false
        }

        // 验证修饰键
        const validModifiers = ['Ctrl', 'Control', 'Shift', 'Alt', 'Option', 'Cmd', 'Command', 'Super']
        const modifiers = parts.slice(0, -1)
        const mainKey = parts[parts.length - 1]

        // 检查修饰键是否有效
        for (const modifier of modifiers) {
            if (!validModifiers.includes(modifier)) {
                console.error(`无效的修饰键: ${modifier}`)
                return false
            }
        }

        // 检查主键是否有效
        if (!mainKey || mainKey.length === 0) {
            console.error('主键不能为空')
            return false
        }

        // 主键可以是字母、数字、功能键或特殊键
        const validMainKeyPattern = /^([A-Z]|[0-9]|F[1-9]|F1[0-2]|Space|Tab|Enter|Escape|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Up|Down|Left|Right|Plus|Minus)$/
        if (!validMainKeyPattern.test(mainKey)) {
            console.error(`无效的主键: ${mainKey}`)
            return false
        }

        return true
    }

    /**
     * 处理快捷键冲突
     * 验证需求: 3.3, 4.3
     * @param key 快捷键字符串
     * @returns 冲突信息或 null
     */
    private handleConflict(key: string): ShortcutConflict | null {
        // 检查快捷键是否已被 Electron 注册
        if (globalShortcut.isRegistered(key)) {
            return {
                key,
                reason: '快捷键已被占用'
            }
        }

        // 检查快捷键是否已在本应用中注册
        if (this.shortcuts.has(key)) {
            return {
                key,
                reason: '快捷键已在应用中注册'
            }
        }

        return null
    }

    /**
     * 获取配置文件路径
     * @returns 配置文件路径
     */
    getConfigPath(): string {
        return this.configPath
    }

    /**
     * 重新加载配置
     */
    reloadConfig(): void {
        console.log('重新加载快捷键配置')

        // 注销所有快捷键
        this.unregisterAll()

        // 重新加载配置
        this.loadConfig()
    }
}
