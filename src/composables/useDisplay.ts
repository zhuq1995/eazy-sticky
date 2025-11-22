/**
 * 显示器管理 Composable
 * 提供显示器信息查询和位置验证功能
 * 需求: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useElectron } from './useElectron'

/**
 * 显示器信息接口
 */
export interface DisplayInfo {
    id: number
    bounds: {
        x: number
        y: number
        width: number
        height: number
    }
    workArea: {
        x: number
        y: number
        width: number
        height: number
    }
    scaleFactor: number
    rotation: number
    internal: boolean
}

/**
 * useDisplay 返回值接口
 */
export interface UseDisplayReturn {
    /** 所有显示器信息 */
    displays: Ref<DisplayInfo[]>

    /** 主显示器信息 */
    primaryDisplay: Ref<DisplayInfo | null>

    /** 当前窗口所在的显示器 */
    currentDisplay: Ref<DisplayInfo | null>

    /** 显示器数量 */
    displayCount: ComputedRef<number>

    /** 是否为多显示器环境 */
    isMultiDisplay: ComputedRef<boolean>

    /** 获取所有显示器信息 */
    getAllDisplays: () => Promise<DisplayInfo[]>

    /** 获取主显示器信息 */
    getPrimaryDisplay: () => Promise<DisplayInfo>

    /** 获取指定点所在的显示器 */
    getDisplayNearestPoint: (point: { x: number; y: number }) => Promise<DisplayInfo>

    /** 获取当前窗口所在的显示器 */
    getDisplayForWindow: () => Promise<DisplayInfo>

    /** 检查位置是否在显示器范围内 */
    isPositionInBounds: (position: { x: number; y: number }) => Promise<boolean>

    /** 调整位置到显示器内 */
    adjustPositionToBounds: (position: { x: number; y: number }, windowSize?: { width: number; height: number }) => Promise<{ x: number; y: number }>

    /** 获取显示器信息摘要 */
    getDisplaySummary: () => Promise<string>

    /** 刷新显示器信息 */
    refreshDisplays: () => Promise<void>
}

/**
 * 显示器管理 Composable
 * 
 * 提供显示器信息查询和位置验证功能：
 * - 获取所有显示器信息
 * - 获取主显示器信息
 * - 查询指定点所在的显示器
 * - 验证位置是否在显示器范围内
 * - 调整位置到显示器内
 * - 多显示器环境检测
 * 
 * @returns 显示器管理接口
 * 
 * @example
 * ```ts
 * const { displays, isMultiDisplay, adjustPositionToBounds } = useDisplay()
 * 
 * // 检查是否为多显示器环境
 * if (isMultiDisplay.value) {
 *   console.log('多显示器环境')
 * }
 * 
 * // 调整位置到显示器内
 * const adjusted = await adjustPositionToBounds({ x: 5000, y: 5000 })
 * ```
 */
export function useDisplay(): UseDisplayReturn {
    // ==================== 依赖注入 ====================

    const { isElectron } = useElectron()

    // ==================== 响应式状态 ====================

    /**
     * 所有显示器信息
     * 需求: 5.1 - 应用启动时检测所有连接的显示器并获取其边界信息
     */
    const displays = ref<DisplayInfo[]>([])

    /**
     * 主显示器信息
     * 需求: 5.3 - 提供获取主显示器信息的接口
     */
    const primaryDisplay = ref<DisplayInfo | null>(null)

    /**
     * 当前窗口所在的显示器
     */
    const currentDisplay = ref<DisplayInfo | null>(null)

    // ==================== 计算属性 ====================

    /**
     * 显示器数量
     */
    const displayCount = computed(() => displays.value.length)

    /**
     * 是否为多显示器环境
     */
    const isMultiDisplay = computed(() => displays.value.length > 1)

    // ==================== 显示器操作方法 ====================

    /**
     * 获取所有显示器信息
     * 需求: 5.1 - 应用启动时检测所有连接的显示器并获取其边界信息
     * 需求: 5.2 - 显示器配置变更时更新显示器列表
     * 
     * @returns 显示器信息数组
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getAllDisplays = async (): Promise<DisplayInfo[]> => {
        if (!isElectron.value) {
            console.warn('getAllDisplays: 不在 Electron 环境中')
            return []
        }

        try {
            const displayList = await window.electronAPI.display.getAllDisplays()
            displays.value = displayList
            console.log('已获取所有显示器信息:', displayList.length)
            return displayList
        } catch (error) {
            console.error('获取显示器信息失败:', error)
            throw error
        }
    }

    /**
     * 获取主显示器信息
     * 需求: 5.3 - 提供获取主显示器信息的接口
     * 
     * @returns 主显示器信息
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getPrimaryDisplay = async (): Promise<DisplayInfo> => {
        if (!isElectron.value) {
            throw new Error('getPrimaryDisplay: 不在 Electron 环境中')
        }

        try {
            const display = await window.electronAPI.display.getPrimaryDisplay()
            primaryDisplay.value = display
            console.log('已获取主显示器信息:', display.id)
            return display
        } catch (error) {
            console.error('获取主显示器信息失败:', error)
            throw error
        }
    }

    /**
     * 获取指定点所在的显示器
     * 需求: 5.4 - 提供获取指定坐标所在显示器的接口
     * 
     * @param point - 坐标点
     * @returns 显示器信息
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getDisplayNearestPoint = async (point: { x: number; y: number }): Promise<DisplayInfo> => {
        if (!isElectron.value) {
            throw new Error('getDisplayNearestPoint: 不在 Electron 环境中')
        }

        try {
            const display = await window.electronAPI.display.getDisplayNearestPoint(point)
            console.log(`点 (${point.x}, ${point.y}) 所在的显示器:`, display.id)
            return display
        } catch (error) {
            console.error('获取指定点所在的显示器失败:', error)
            throw error
        }
    }

    /**
     * 获取当前窗口所在的显示器
     * 需求: 6.3 - 窗口移动时实时更新窗口所在的显示器信息
     * 
     * @returns 显示器信息
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getDisplayForWindow = async (): Promise<DisplayInfo> => {
        if (!isElectron.value) {
            throw new Error('getDisplayForWindow: 不在 Electron 环境中')
        }

        try {
            const display = await window.electronAPI.display.getDisplayForWindow()
            currentDisplay.value = display
            console.log('当前窗口所在的显示器:', display.id)
            return display
        } catch (error) {
            console.error('获取当前窗口所在的显示器失败:', error)
            throw error
        }
    }

    /**
     * 检查位置是否在显示器范围内
     * 需求: 6.2 - 便签窗口位置超出所有显示器的边界时将窗口移动到主显示器的可见区域
     * 
     * @param position - 位置坐标
     * @returns 是否在范围内
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const isPositionInBounds = async (position: { x: number; y: number }): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('isPositionInBounds: 不在 Electron 环境中')
            return false
        }

        try {
            const inBounds = await window.electronAPI.display.isPositionInBounds(position)
            console.log(`位置 (${position.x}, ${position.y}) 是否在范围内:`, inBounds)
            return inBounds
        } catch (error) {
            console.error('检查位置是否在范围内失败:', error)
            throw error
        }
    }

    /**
     * 调整位置到显示器内
     * 需求: 6.2 - 便签窗口位置超出所有显示器的边界时将窗口移动到主显示器的可见区域
     * 需求: 6.4 - 显示器断开连接时将该显示器上的所有窗口移动到主显示器
     * 
     * @param position - 原始位置
     * @param windowSize - 窗口尺寸（可选）
     * @returns 调整后的位置
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const adjustPositionToBounds = async (
        position: { x: number; y: number },
        windowSize?: { width: number; height: number }
    ): Promise<{ x: number; y: number }> => {
        if (!isElectron.value) {
            console.warn('adjustPositionToBounds: 不在 Electron 环境中')
            return position
        }

        try {
            const adjusted = await window.electronAPI.display.adjustPositionToBounds(position, windowSize)
            console.log(`位置已调整: (${position.x}, ${position.y}) -> (${adjusted.x}, ${adjusted.y})`)
            return adjusted
        } catch (error) {
            console.error('调整位置失败:', error)
            throw error
        }
    }

    /**
     * 获取显示器信息摘要
     * 
     * @returns 显示器信息摘要字符串
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const getDisplaySummary = async (): Promise<string> => {
        if (!isElectron.value) {
            console.warn('getDisplaySummary: 不在 Electron 环境中')
            return ''
        }

        try {
            const summary = await window.electronAPI.display.getDisplaySummary()
            console.log('显示器信息摘要:', summary)
            return summary
        } catch (error) {
            console.error('获取显示器信息摘要失败:', error)
            throw error
        }
    }

    /**
     * 刷新显示器信息
     * 需求: 5.2 - 显示器配置变更时更新显示器列表
     * 
     * 从主进程重新加载所有显示器信息
     */
    const refreshDisplays = async (): Promise<void> => {
        try {
            await getAllDisplays()
            await getPrimaryDisplay()
            console.log('显示器信息已刷新')
        } catch (error) {
            console.error('刷新显示器信息失败:', error)
            throw error
        }
    }

    // ==================== 返回接口 ====================

    return {
        displays,
        primaryDisplay,
        currentDisplay,
        displayCount,
        isMultiDisplay,
        getAllDisplays,
        getPrimaryDisplay,
        getDisplayNearestPoint,
        getDisplayForWindow,
        isPositionInBounds,
        adjustPositionToBounds,
        getDisplaySummary,
        refreshDisplays
    }
}
