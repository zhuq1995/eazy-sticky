/**
 * 窗口操作 Composable
 * 提供窗口状态管理、位置/尺寸控制、置顶功能和状态持久化
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useElectron } from './useElectron'
import { useNotesStore } from '@/stores/notes'

/**
 * 窗口状态接口
 */
export interface WindowState {
    position: { x: number; y: number }
    size: { width: number; height: number }
    isAlwaysOnTop: boolean
    isMinimized: boolean
    isFocused: boolean
}

/**
 * 窗口操作选项接口
 */
export interface UseWindowOptions {
    // 窗口ID（用于多窗口场景）
    windowId?: string

    // 是否自动保存状态
    autoSave?: boolean

    // 保存防抖延迟（毫秒）
    saveDelay?: number
}

/**
 * 窗口操作返回值接口
 */
export interface UseWindowReturn {
    // 窗口状态
    windowState: Ref<WindowState>

    // 窗口操作方法
    setPosition: (x: number, y: number) => Promise<void>
    setSize: (width: number, height: number) => Promise<void>
    setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>
    minimize: () => Promise<void>
    close: () => Promise<void>
    focus: () => void

    // 状态查询
    getPosition: () => Promise<{ x: number; y: number }>
    getSize: () => Promise<{ width: number; height: number }>
    isAlwaysOnTop: () => Promise<boolean>

    // 边界检查
    checkBoundary: (position: { x: number; y: number }) => { x: number; y: number }

    // 保存状态
    saveState: () => Promise<void>

    // 恢复状态
    restoreState: () => Promise<void>
}

/**
 * 窗口尺寸限制常量
 */
const SIZE_CONSTRAINTS = {
    MIN_WIDTH: 200,
    MIN_HEIGHT: 200,
    MAX_WIDTH: 800,
    MAX_HEIGHT: 800
} as const

/**
 * 最小可见区域（像素）
 */
const MIN_VISIBLE_AREA = 50

/**
 * 窗口操作 Composable
 * 
 * 提供完整的窗口管理功能：
 * - 响应式窗口状态管理
 * - 窗口位置和尺寸控制
 * - 窗口置顶功能
 * - 边界检查和限制
 * - 状态持久化和恢复
 * - 自动保存机制
 * 
 * @param options - 窗口操作选项
 * @returns 窗口操作接口
 * 
 * @example
 * ```ts
 * const { windowState, setPosition, setAlwaysOnTop, saveState } = useWindow({
 *   windowId: 'main',
 *   autoSave: true,
 *   saveDelay: 500
 * })
 * 
 * // 设置窗口位置
 * await setPosition(100, 100)
 * 
 * // 切换置顶状态
 * await setAlwaysOnTop(true)
 * ```
 */
export function useWindow(options: UseWindowOptions = {}): UseWindowReturn {
    const {
        windowId = 'main',
        autoSave = true,
        saveDelay = 500
    } = options

    // ==================== 依赖注入 ====================

    const { isElectron } = useElectron()
    const store = useNotesStore()

    // ==================== 响应式状态 ====================

    /**
     * 窗口状态
     * 需求: 6.1 - 提供响应式的窗口状态数据
     */
    const windowState = ref<WindowState>({
        position: { x: 0, y: 0 },
        size: { width: 300, height: 300 },
        isAlwaysOnTop: false,
        isMinimized: false,
        isFocused: true
    })

    // ==================== 边界检查 ====================

    /**
     * 检查并调整窗口位置到屏幕边界内
     * 需求: 7.4 - 保存的位置超出当前屏幕范围时调整位置到屏幕内
     * 
     * @param position - 要检查的位置
     * @returns 调整后的位置
     */
    const checkBoundary = (position: { x: number; y: number }): { x: number; y: number } => {
        const screenWidth = window.screen.width
        const screenHeight = window.screen.height

        let { x, y } = position

        // 左边界限制
        x = Math.max(0, x)

        // 上边界限制
        y = Math.max(0, y)

        // 右边界限制（保持最小可见区域）
        x = Math.min(screenWidth - MIN_VISIBLE_AREA, x)

        // 下边界限制（保持最小可见区域）
        y = Math.min(screenHeight - MIN_VISIBLE_AREA, y)

        return { x, y }
    }

    // ==================== 窗口操作方法 ====================

    /**
     * 设置窗口位置
     * 需求: 3.1, 3.2 - 窗口位置设置和获取
     * 需求: 6.2 - 窗口位置改变时自动更新响应式状态
     * 
     * @param x - 窗口 x 坐标
     * @param y - 窗口 y 坐标
     */
    const setPosition = async (x: number, y: number): Promise<void> => {
        if (!isElectron.value) {
            console.warn('setPosition: 不在 Electron 环境中')
            return
        }

        try {
            // 边界检查
            const adjustedPos = checkBoundary({ x, y })

            // 调用 Electron API 设置窗口位置
            await window.electronAPI.window.setPosition(adjustedPos.x, adjustedPos.y)

            // 需求 6.2: 自动更新响应式状态
            windowState.value.position = adjustedPos
        } catch (error) {
            console.error('设置窗口位置失败:', error)
            throw error
        }
    }

    /**
     * 设置窗口尺寸
     * 需求: 8.1, 8.2, 8.3 - 窗口尺寸设置和限制
     * 需求: 6.3 - 窗口尺寸改变时自动更新响应式状态
     * 
     * @param width - 窗口宽度
     * @param height - 窗口高度
     */
    const setSize = async (width: number, height: number): Promise<void> => {
        if (!isElectron.value) {
            console.warn('setSize: 不在 Electron 环境中')
            return
        }

        try {
            // 需求 8.2: 最小尺寸限制（200x200）
            width = Math.max(SIZE_CONSTRAINTS.MIN_WIDTH, width)
            height = Math.max(SIZE_CONSTRAINTS.MIN_HEIGHT, height)

            // 需求 8.3: 最大尺寸限制（800x800）
            width = Math.min(SIZE_CONSTRAINTS.MAX_WIDTH, width)
            height = Math.min(SIZE_CONSTRAINTS.MAX_HEIGHT, height)

            // 调用 Electron API 设置窗口尺寸
            await window.electronAPI.window.setSize(width, height)

            // 需求 6.3: 自动更新响应式状态
            windowState.value.size = { width, height }
        } catch (error) {
            console.error('设置窗口尺寸失败:', error)
            throw error
        }
    }

    /**
     * 设置窗口置顶状态
     * 需求: 3.1, 3.2, 3.3 - 窗口置顶状态切换
     * 需求: 6.4 - 窗口置顶状态改变时自动更新响应式状态
     * 
     * @param alwaysOnTop - 是否置顶
     */
    const setAlwaysOnTop = async (alwaysOnTop: boolean): Promise<void> => {
        if (!isElectron.value) {
            console.warn('setAlwaysOnTop: 不在 Electron 环境中')
            return
        }

        try {
            // 调用 Electron API 设置置顶状态
            await window.electronAPI.window.setAlwaysOnTop(alwaysOnTop)

            // 需求 6.4: 自动更新响应式状态
            windowState.value.isAlwaysOnTop = alwaysOnTop
        } catch (error) {
            console.error('设置窗口置顶状态失败:', error)
            throw error
        }
    }

    /**
     * 最小化窗口
     */
    const minimize = async (): Promise<void> => {
        if (!isElectron.value) {
            console.warn('minimize: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.window.minimize()
            windowState.value.isMinimized = true
        } catch (error) {
            console.error('最小化窗口失败:', error)
            throw error
        }
    }

    /**
     * 关闭窗口
     */
    const close = async (): Promise<void> => {
        if (!isElectron.value) {
            console.warn('close: 不在 Electron 环境中')
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
     * 聚焦窗口
     */
    const focus = (): void => {
        window.focus()
        windowState.value.isFocused = true
    }

    // ==================== 状态查询方法 ====================

    /**
     * 获取窗口位置
     * 
     * @returns 窗口位置
     */
    const getPosition = async (): Promise<{ x: number; y: number }> => {
        if (!isElectron.value) {
            return windowState.value.position
        }

        try {
            const position = await window.electronAPI.window.getPosition()
            windowState.value.position = position
            return position
        } catch (error) {
            console.error('获取窗口位置失败:', error)
            throw error
        }
    }

    /**
     * 获取窗口尺寸
     * 
     * @returns 窗口尺寸
     */
    const getSize = async (): Promise<{ width: number; height: number }> => {
        if (!isElectron.value) {
            return windowState.value.size
        }

        try {
            const size = await window.electronAPI.window.getSize()
            windowState.value.size = size
            return size
        } catch (error) {
            console.error('获取窗口尺寸失败:', error)
            throw error
        }
    }

    /**
     * 获取窗口置顶状态
     * 
     * @returns 是否置顶
     */
    const isAlwaysOnTopQuery = async (): Promise<boolean> => {
        if (!isElectron.value) {
            return windowState.value.isAlwaysOnTop
        }

        try {
            const alwaysOnTop = await window.electronAPI.window.isAlwaysOnTop()
            windowState.value.isAlwaysOnTop = alwaysOnTop
            return alwaysOnTop
        } catch (error) {
            console.error('获取窗口置顶状态失败:', error)
            throw error
        }
    }

    // ==================== 状态持久化 ====================

    /**
     * 保存窗口状态到持久化存储
     * 需求: 7.1 - 拖拽窗口到新位置时保存新位置到持久化存储
     * 需求: 3.5 - 置顶状态改变时保存新的置顶状态到存储
     * 需求: 8.4 - 窗口尺寸改变时保存新尺寸到持久化存储
     */
    const saveState = async (): Promise<void> => {
        try {
            // 将窗口状态保存到 store
            // 注意：这里假设 store 有 saveWindowState 方法
            // 如果没有，需要在 notes store 中添加
            const stateToSave = {
                windowId,
                ...windowState.value,
                timestamp: Date.now()
            }

            // 保存到 localStorage
            const key = `window-state-${windowId}`
            localStorage.setItem(key, JSON.stringify(stateToSave))

            console.log(`窗口状态已保存: ${windowId}`)
        } catch (error) {
            console.error('保存窗口状态失败:', error)
            throw error
        }
    }

    /**
     * 从持久化存储恢复窗口状态
     * 需求: 7.2 - 应用重启时从存储中读取上次的窗口位置
     * 需求: 7.3 - 存储中存在窗口位置数据时使用保存的位置创建窗口
     * 需求: 7.4 - 保存的位置超出当前屏幕范围时调整位置到屏幕内
     */
    const restoreState = async (): Promise<void> => {
        try {
            // 从 localStorage 读取保存的状态
            const key = `window-state-${windowId}`
            const savedState = localStorage.getItem(key)

            if (!savedState) {
                console.log(`没有找到保存的窗口状态: ${windowId}`)
                return
            }

            const parsed = JSON.parse(savedState)

            // 需求 7.4: 检查位置是否在屏幕内，如果不在则调整
            const adjustedPos = checkBoundary(parsed.position)

            // 恢复状态
            windowState.value = {
                position: adjustedPos,
                size: parsed.size || windowState.value.size,
                isAlwaysOnTop: parsed.isAlwaysOnTop || false,
                isMinimized: parsed.isMinimized || false,
                isFocused: parsed.isFocused !== undefined ? parsed.isFocused : true
            }

            // 需求 7.3: 应用到窗口
            if (isElectron.value) {
                await setPosition(adjustedPos.x, adjustedPos.y)
                await setSize(windowState.value.size.width, windowState.value.size.height)

                if (windowState.value.isAlwaysOnTop) {
                    await setAlwaysOnTop(true)
                }
            }

            console.log(`窗口状态已恢复: ${windowId}`)
        } catch (error) {
            console.error('恢复窗口状态失败:', error)
            // 恢复失败不抛出错误，使用默认状态
        }
    }

    // ==================== 自动保存机制 ====================

    /**
     * 防抖保存函数
     * 需求: 7.1 - 实现防抖自动保存
     */
    const debouncedSave = useDebounceFn(() => {
        if (autoSave) {
            saveState().catch(error => {
                console.error('自动保存失败:', error)
            })
        }
    }, saveDelay)

    // 监听状态变化，触发自动保存
    watch(() => windowState.value.position, debouncedSave, { deep: true })
    watch(() => windowState.value.size, debouncedSave, { deep: true })
    watch(() => windowState.value.isAlwaysOnTop, debouncedSave)

    // ==================== 生命周期管理 ====================

    /**
     * 组件卸载时的清理逻辑
     * 需求: 6.5 - 组件卸载时清理所有窗口状态监听器
     */
    onUnmounted(() => {
        // 保存最终状态
        if (autoSave) {
            saveState().catch(error => {
                console.error('卸载时保存状态失败:', error)
            })
        }

        console.log(`窗口 composable 已清理: ${windowId}`)
    })

    // ==================== 返回接口 ====================

    return {
        // 窗口状态
        windowState,

        // 窗口操作方法
        setPosition,
        setSize,
        setAlwaysOnTop,
        minimize,
        close,
        focus,

        // 状态查询
        getPosition,
        getSize,
        isAlwaysOnTop: isAlwaysOnTopQuery,

        // 边界检查
        checkBoundary,

        // 状态持久化
        saveState,
        restoreState
    }
}
