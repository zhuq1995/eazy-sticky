/**
 * 开机自启动 Composable
 * 提供开机自启动配置管理功能
 * 需求: 7.1, 7.2, 7.3, 7.4
 */

import { ref, type Ref } from 'vue'
import { useElectron } from './useElectron'

/**
 * 自启动配置接口
 */
export interface AutoLaunchConfig {
    enabled: boolean
    hidden: boolean
    path?: string
}

/**
 * useAutoLaunch 返回值接口
 */
export interface UseAutoLaunchReturn {
    /** 是否已启用自启动 */
    isEnabled: Ref<boolean>

    /** 自启动配置 */
    config: Ref<AutoLaunchConfig>

    /** 启用开机自启动 */
    enable: (hidden?: boolean) => Promise<boolean>

    /** 禁用开机自启动 */
    disable: () => Promise<boolean>

    /** 检查是否已启用 */
    checkEnabled: () => Promise<boolean>

    /** 获取配置 */
    getConfig: () => Promise<AutoLaunchConfig>

    /** 更新配置 */
    updateConfig: (config: Partial<AutoLaunchConfig>) => Promise<boolean>

    /** 刷新状态 */
    refreshStatus: () => Promise<void>
}

/**
 * 开机自启动 Composable
 * 
 * 提供开机自启动配置管理功能：
 * - 启用/禁用开机自启动
 * - 查询自启动状态
 * - 管理自启动配置
 * - 支持隐藏启动选项
 * 
 * @returns 自启动管理接口
 * 
 * @example
 * ```ts
 * const { isEnabled, enable, disable } = useAutoLaunch()
 * 
 * // 启用开机自启动
 * await enable(false) // 不隐藏启动
 * 
 * // 禁用开机自启动
 * await disable()
 * 
 * // 检查状态
 * console.log('自启动已启用:', isEnabled.value)
 * ```
 */
export function useAutoLaunch(): UseAutoLaunchReturn {
    // ==================== 依赖注入 ====================

    const { isElectron } = useElectron()

    // ==================== 响应式状态 ====================

    /**
     * 是否已启用自启动
     * 需求: 7.4 - 提供查询当前自启动状态的接口
     */
    const isEnabled = ref<boolean>(false)

    /**
     * 自启动配置
     */
    const config = ref<AutoLaunchConfig>({
        enabled: false,
        hidden: false
    })

    // ==================== 自启动操作方法 ====================

    /**
     * 启用开机自启动
     * 需求: 7.1 - 提供启用和禁用开机自启动的接口
     * 需求: 7.2 - 用户启用开机自启动时在操作系统中注册应用的自启动项
     * 
     * @param hidden - 是否隐藏启动（可选，默认false）
     * @returns 操作是否成功
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const enable = async (hidden: boolean = false): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('enable: 不在 Electron 环境中')
            return false
        }

        try {
            const result = await window.electronAPI.autoLaunch.enable(hidden)

            if (result.success) {
                isEnabled.value = true
                config.value.enabled = true
                config.value.hidden = hidden
                console.log('开机自启动已启用', { hidden })
                return true
            } else {
                console.warn('启用开机自启动失败')
                return false
            }
        } catch (error) {
            console.error('启用开机自启动失败:', error)
            throw error
        }
    }

    /**
     * 禁用开机自启动
     * 需求: 7.1 - 提供启用和禁用开机自启动的接口
     * 需求: 7.3 - 用户禁用开机自启动时从操作系统中移除应用的自启动项
     * 
     * @returns 操作是否成功
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const disable = async (): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('disable: 不在 Electron 环境中')
            return false
        }

        try {
            const result = await window.electronAPI.autoLaunch.disable()

            if (result.success) {
                isEnabled.value = false
                config.value.enabled = false
                console.log('开机自启动已禁用')
                return true
            } else {
                console.warn('禁用开机自启动失败')
                return false
            }
        } catch (error) {
            console.error('禁用开机自启动失败:', error)
            throw error
        }
    }

    /**
     * 检查是否已启用
     * 需求: 7.4 - 提供查询当前自启动状态的接口
     * 
     * @returns 是否已启用
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const checkEnabled = async (): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('checkEnabled: 不在 Electron 环境中')
            return false
        }

        try {
            const enabled = await window.electronAPI.autoLaunch.isEnabled()
            isEnabled.value = enabled
            console.log('自启动状态:', enabled)
            return enabled
        } catch (error) {
            console.error('检查自启动状态失败:', error)
            throw error
        }
    }

    /**
     * 获取配置
     * 
     * @returns 自启动配置
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getConfig = async (): Promise<AutoLaunchConfig> => {
        if (!isElectron.value) {
            console.warn('getConfig: 不在 Electron 环境中')
            return config.value
        }

        try {
            const cfg = await window.electronAPI.autoLaunch.getConfig()
            config.value = cfg
            isEnabled.value = cfg.enabled
            console.log('自启动配置:', cfg)
            return cfg
        } catch (error) {
            console.error('获取自启动配置失败:', error)
            throw error
        }
    }

    /**
     * 更新配置
     * 
     * @param newConfig - 新的配置（部分）
     * @returns 操作是否成功
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const updateConfig = async (newConfig: Partial<AutoLaunchConfig>): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('updateConfig: 不在 Electron 环境中')
            return false
        }

        try {
            const result = await window.electronAPI.autoLaunch.updateConfig(newConfig)

            if (result.success) {
                // 更新本地状态
                config.value = { ...config.value, ...newConfig }
                if (newConfig.enabled !== undefined) {
                    isEnabled.value = newConfig.enabled
                }
                console.log('自启动配置已更新:', newConfig)
                return true
            } else {
                console.warn('更新自启动配置失败')
                return false
            }
        } catch (error) {
            console.error('更新自启动配置失败:', error)
            throw error
        }
    }

    /**
     * 刷新状态
     * 从主进程重新加载自启动状态和配置
     */
    const refreshStatus = async (): Promise<void> => {
        try {
            await checkEnabled()
            await getConfig()
            console.log('自启动状态已刷新')
        } catch (error) {
            console.error('刷新自启动状态失败:', error)
            throw error
        }
    }

    // ==================== 返回接口 ====================

    return {
        isEnabled,
        config,
        enable,
        disable,
        checkEnabled,
        getConfig,
        updateConfig,
        refreshStatus
    }
}
