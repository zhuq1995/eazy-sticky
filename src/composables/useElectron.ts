/**
 * Electron Composable
 * 提供类型安全的 Electron API 访问，支持窗口操作和系统信息获取
 * 需求: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * useElectron 返回值接口
 */
export interface UseElectronReturn {
    // 环境检测
    isElectron: ComputedRef<boolean>

    // 平台信息
    platform: ComputedRef<string>

    // 窗口操作方法
    closeWindow: () => Promise<void>
    minimizeWindow: () => Promise<void>
    maximizeWindow: () => Promise<void>

    // 窗口状态
    windowPosition: Ref<{ x: number; y: number }>
    windowSize: Ref<{ width: number; height: number }>

    // 窗口状态更新方法
    updateWindowPosition: (x: number, y: number) => Promise<void>
    updateWindowSize: (width: number, height: number) => Promise<void>

    // 刷新窗口状态
    refreshWindowState: () => Promise<void>
}

/**
 * Electron Composable
 * 
 * 提供对 Electron API 的类型安全访问，包括：
 * - 环境检测
 * - 窗口操作（关闭、最小化、最大化）
 * - 窗口状态管理（位置、尺寸）
 * - 平台信息获取
 * 
 * @returns Electron API 操作接口
 * 
 * @example
 * ```ts
 * const { isElectron, closeWindow, windowPosition, refreshWindowState } = useElectron()
 * 
 * if (isElectron.value) {
 *   await refreshWindowState() // 手动刷新状态
 *   await closeWindow()
 * }
 * ```
 */
export function useElectron(): UseElectronReturn {
    // ==================== 环境检测 ====================

    /**
     * 检测是否在 Electron 环境中运行
     * 需求: 3.5 - 渲染进程访问 Electron API
     */
    const isElectron = computed<boolean>(() => {
        return typeof window !== 'undefined' && 'electronAPI' in window
    })

    // ==================== 响应式状态 ====================

    /**
     * 平台信息
     * 需求: 8.1 - 获取操作系统平台信息
     */
    const platform = computed<string>(() => {
        if (!isElectron.value) {
            return ''
        }
        return window.electronAPI.system.platform
    })

    /**
     * 窗口位置
     * 需求: 6.3 - 获取窗口位置
     */
    const windowPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 })

    /**
     * 窗口尺寸
     * 需求: 6.5 - 获取窗口尺寸
     */
    const windowSize = ref<{ width: number; height: number }>({ width: 0, height: 0 })

    // ==================== 状态刷新 ====================

    /**
     * 刷新窗口状态
     * 从 Electron API 获取最新的窗口位置和尺寸
     */
    const refreshWindowState = async (): Promise<void> => {
        if (!isElectron.value) {
            return
        }

        try {
            // 获取窗口位置
            windowPosition.value = await window.electronAPI.window.getPosition()

            // 获取窗口尺寸
            windowSize.value = await window.electronAPI.window.getSize()
        } catch (error) {
            console.error('刷新窗口状态失败:', error)
            throw error
        }
    }

    // ==================== 窗口操作方法 ====================

    /**
     * 关闭窗口
     * 需求: 6.1 - 渲染进程请求关闭窗口
     * 
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const closeWindow = async (): Promise<void> => {
        if (!isElectron.value) {
            console.warn('closeWindow: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.window.close()
        } catch (error) {
            console.error('关闭窗口失败:', error)
            throw error
        }
    }

    /**
     * 最小化窗口
     * 需求: 6.2 - 渲染进程请求最小化窗口
     * 
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const minimizeWindow = async (): Promise<void> => {
        if (!isElectron.value) {
            console.warn('minimizeWindow: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.window.minimize()
        } catch (error) {
            console.error('最小化窗口失败:', error)
            throw error
        }
    }

    /**
     * 最大化窗口
     * 需求: 6.2 - 窗口操作（虽然需求中没有明确提到最大化，但设计文档中包含）
     * 
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const maximizeWindow = async (): Promise<void> => {
        if (!isElectron.value) {
            console.warn('maximizeWindow: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.window.maximize()
        } catch (error) {
            console.error('最大化窗口失败:', error)
            throw error
        }
    }

    // ==================== 窗口状态更新方法 ====================

    /**
     * 更新窗口位置
     * 需求: 6.4 - 渲染进程请求设置窗口位置
     * 
     * @param x - 窗口 x 坐标
     * @param y - 窗口 y 坐标
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const updateWindowPosition = async (x: number, y: number): Promise<void> => {
        if (!isElectron.value) {
            console.warn('updateWindowPosition: 不在 Electron 环境中')
            return
        }

        try {
            // 调用 Electron API 设置窗口位置
            await window.electronAPI.window.setPosition(x, y)

            // 更新本地状态
            windowPosition.value = { x, y }
        } catch (error) {
            console.error('更新窗口位置失败:', error)
            throw error
        }
    }

    /**
     * 更新窗口尺寸
     * 需求: 6.5 - 窗口尺寸操作（虽然需求中只提到获取，但设计文档中包含设置）
     * 
     * @param width - 窗口宽度
     * @param height - 窗口高度
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const updateWindowSize = async (width: number, height: number): Promise<void> => {
        if (!isElectron.value) {
            console.warn('updateWindowSize: 不在 Electron 环境中')
            return
        }

        try {
            // 调用 Electron API 设置窗口尺寸
            await window.electronAPI.window.setSize(width, height)

            // 更新本地状态
            windowSize.value = { width, height }
        } catch (error) {
            console.error('更新窗口尺寸失败:', error)
            throw error
        }
    }

    // ==================== 返回接口 ====================

    return {
        // 环境检测
        isElectron,

        // 平台信息
        platform,

        // 窗口操作
        closeWindow,
        minimizeWindow,
        maximizeWindow,

        // 窗口状态
        windowPosition,
        windowSize,

        // 状态更新
        updateWindowPosition,
        updateWindowSize,
        refreshWindowState
    }
}
