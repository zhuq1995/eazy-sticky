/**
 * 全局快捷键 Composable
 * 提供快捷键配置管理功能
 * 需求: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */

import { ref, type Ref } from 'vue'
import { useElectron } from './useElectron'

/**
 * 快捷键配置接口
 */
export interface ShortcutConfig {
    key: string
    action: string
    enabled: boolean
}

/**
 * useGlobalShortcut 返回值接口
 */
export interface UseGlobalShortcutReturn {
    /** 所有快捷键配置 */
    shortcuts: Ref<ShortcutConfig[]>

    /** 获取所有快捷键配置 */
    getAllConfigs: () => Promise<ShortcutConfig[]>

    /** 更新快捷键配置 */
    updateConfig: (config: ShortcutConfig) => Promise<boolean>

    /** 检查快捷键是否已注册 */
    isRegistered: (key: string) => Promise<boolean>

    /** 根据动作获取快捷键配置 */
    getConfigByAction: (action: string) => Promise<ShortcutConfig | null>

    /** 刷新快捷键配置 */
    refreshConfigs: () => Promise<void>
}

/**
 * 全局快捷键 Composable
 * 
 * 提供全局快捷键配置管理功能：
 * - 获取所有快捷键配置
 * - 更新快捷键配置
 * - 检查快捷键注册状态
 * - 根据动作查询快捷键
 * 
 * @returns 快捷键管理接口
 * 
 * @example
 * ```ts
 * const { shortcuts, updateConfig, isRegistered } = useGlobalShortcut()
 * 
 * // 更新快捷键配置
 * await updateConfig({
 *   key: 'Ctrl+Shift+N',
 *   action: 'createNote',
 *   enabled: true
 * })
 * 
 * // 检查快捷键是否已注册
 * const registered = await isRegistered('Ctrl+Shift+N')
 * ```
 */
export function useGlobalShortcut(): UseGlobalShortcutReturn {
    // ==================== 依赖注入 ====================

    const { isElectron } = useElectron()

    // ==================== 响应式状态 ====================

    /**
     * 所有快捷键配置
     * 需求: 3.1 - 应用启动时注册全局快捷键
     * 需求: 4.1 - 提供修改快捷键配置的接口
     */
    const shortcuts = ref<ShortcutConfig[]>([])

    // ==================== 快捷键操作方法 ====================

    /**
     * 获取所有快捷键配置
     * 需求: 4.1 - 提供修改快捷键配置的接口
     * 
     * @returns 快捷键配置数组
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getAllConfigs = async (): Promise<ShortcutConfig[]> => {
        if (!isElectron.value) {
            console.warn('getAllConfigs: 不在 Electron 环境中')
            return []
        }

        try {
            const configs = await window.electronAPI.shortcut.getAllConfigs()
            shortcuts.value = configs
            console.log('已获取所有快捷键配置:', configs.length)
            return configs
        } catch (error) {
            console.error('获取快捷键配置失败:', error)
            throw error
        }
    }

    /**
     * 更新快捷键配置
     * 需求: 4.2 - 用户修改快捷键配置时验证快捷键格式的有效性
     * 需求: 4.3 - 快捷键配置更新时注销旧的快捷键并注册新的快捷键
     * 需求: 4.4 - 将快捷键配置持久化到本地存储
     * 
     * @param config - 快捷键配置
     * @returns 更新是否成功
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const updateConfig = async (config: ShortcutConfig): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('updateConfig: 不在 Electron 环境中')
            return false
        }

        try {
            const result = await window.electronAPI.shortcut.updateConfig(config)

            if (result.success) {
                // 更新本地状态
                const index = shortcuts.value.findIndex(s => s.action === config.action)
                if (index !== -1) {
                    shortcuts.value[index] = config
                } else {
                    shortcuts.value.push(config)
                }

                console.log('快捷键配置已更新:', config)
                return true
            } else {
                console.warn('快捷键配置更新失败')
                return false
            }
        } catch (error) {
            console.error('更新快捷键配置失败:', error)
            throw error
        }
    }

    /**
     * 检查快捷键是否已注册
     * 需求: 3.3 - 快捷键注册失败时记录错误日志并通知用户快捷键冲突
     * 
     * @param key - 快捷键
     * @returns 是否已注册
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const isRegistered = async (key: string): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('isRegistered: 不在 Electron 环境中')
            return false
        }

        try {
            const registered = await window.electronAPI.shortcut.isRegistered(key)
            console.log(`快捷键 ${key} 注册状态:`, registered)
            return registered
        } catch (error) {
            console.error('检查快捷键注册状态失败:', error)
            throw error
        }
    }

    /**
     * 根据动作获取快捷键配置
     * 
     * @param action - 动作名称
     * @returns 快捷键配置或 null
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getConfigByAction = async (action: string): Promise<ShortcutConfig | null> => {
        if (!isElectron.value) {
            console.warn('getConfigByAction: 不在 Electron 环境中')
            return null
        }

        try {
            const config = await window.electronAPI.shortcut.getConfigByAction(action)
            console.log(`动作 ${action} 的快捷键配置:`, config)
            return config
        } catch (error) {
            console.error('获取快捷键配置失败:', error)
            throw error
        }
    }

    /**
     * 刷新快捷键配置
     * 从主进程重新加载所有快捷键配置
     */
    const refreshConfigs = async (): Promise<void> => {
        try {
            await getAllConfigs()
            console.log('快捷键配置已刷新')
        } catch (error) {
            console.error('刷新快捷键配置失败:', error)
            throw error
        }
    }

    // ==================== 返回接口 ====================

    return {
        shortcuts,
        getAllConfigs,
        updateConfig,
        isRegistered,
        getConfigByAction,
        refreshConfigs
    }
}
