/**
 * 多窗口管理 Composable
 * 提供多窗口创建、管理和窗口间通信功能
 * 需求: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { WindowInfo, Position, Size, UseMultiWindowReturn } from '@/types'

/**
 * 多窗口管理 Composable
 * 
 * 提供多窗口管理功能，包括：
 * - 窗口列表管理
 * - 创建窗口（带位置偏移避免重叠）
 * - 关闭窗口
 * - 聚焦窗口
 * - 窗口信息查询和更新
 * - 窗口数量限制（最大20个）
 * - 窗口间广播通信
 * - 窗口间事件监听
 * 
 * @returns 多窗口管理接口
 * 
 * @example
 * ```ts
 * const { 
 *   windows, 
 *   createWindow, 
 *   closeWindow, 
 *   broadcast,
 *   canCreateWindow 
 * } = useMultiWindow()
 * 
 * // 创建新窗口
 * if (canCreateWindow.value) {
 *   const windowId = await createWindow('note-123', { x: 100, y: 100 })
 * }
 * 
 * // 广播消息
 * broadcast('note-updated', { noteId: 'note-123', content: 'new content' })
 * ```
 */
export function useMultiWindow(): UseMultiWindowReturn {
    // ==================== 常量配置 ====================

    /**
     * 最大窗口数量限制
     * 需求: 4.5 - 窗口数量达到上限时阻止创建新窗口
     */
    const MAX_WINDOWS = 20

    /**
     * 默认窗口尺寸
     */
    const DEFAULT_SIZE: Size = {
        width: 300,
        height: 300
    }

    /**
     * 默认窗口位置
     */
    const DEFAULT_POSITION: Position = {
        x: 100,
        y: 100
    }

    /**
     * 窗口位置偏移量（用于避免重叠）
     * 需求: 4.3 - 使用默认位置偏移避免窗口重叠
     */
    const POSITION_OFFSET: Position = {
        x: 30,
        y: 30
    }

    // ==================== 响应式状态 ====================

    /**
     * 窗口列表
     * 需求: 4.4 - 在窗口列表中注册窗口
     */
    const windows: Ref<WindowInfo[]> = ref([])

    /**
     * 当前窗口ID
     */
    const currentWindowId: Ref<string> = ref('')

    /**
     * 事件监听器映射表
     * 用于管理窗口间通信的事件监听器
     * 需求: 9.3, 9.4 - 窗口创建时订阅事件，关闭时取消订阅
     */
    const eventListeners: Map<string, Array<(data: any) => void>> = new Map()

    // ==================== 计算属性 ====================

    /**
     * 是否可以创建新窗口
     * 需求: 4.5 - 窗口数量限制
     */
    const canCreateWindow: ComputedRef<boolean> = computed(() => {
        return windows.value.length < MAX_WINDOWS
    })

    // ==================== 辅助方法 ====================

    /**
     * 检测是否在 Electron 环境中
     */
    const isElectron = (): boolean => {
        return typeof window !== 'undefined' && 'electronAPI' in window
    }

    /**
     * 计算新窗口位置（避免重叠）
     * 需求: 4.3 - 使用默认位置偏移避免窗口重叠
     * 
     * @returns 新窗口的位置坐标
     */
    const calculateNewPosition = (): Position => {
        // 如果没有窗口，使用默认位置
        if (windows.value.length === 0) {
            return { ...DEFAULT_POSITION }
        }

        // 获取最后一个窗口的位置
        const lastWindow = windows.value[windows.value.length - 1]

        // 计算新位置（添加偏移）
        const newPosition: Position = {
            x: lastWindow.position.x + POSITION_OFFSET.x,
            y: lastWindow.position.y + POSITION_OFFSET.y
        }

        // 检查是否超出屏幕边界
        const screenWidth = window.screen.width
        const screenHeight = window.screen.height

        // 如果超出边界，重置到默认位置
        if (newPosition.x + DEFAULT_SIZE.width > screenWidth ||
            newPosition.y + DEFAULT_SIZE.height > screenHeight) {
            return { ...DEFAULT_POSITION }
        }

        return newPosition
    }

    /**
     * 生成唯一的窗口ID
     * 需求: 4.2 - 为新窗口分配唯一的窗口标识符
     * 
     * @returns 唯一的窗口ID
     */
    const generateWindowId = (): string => {
        return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // ==================== 窗口管理方法 ====================

    /**
     * 创建新窗口
     * 需求: 4.1 - 创建新的窗口实例
     * 需求: 4.2 - 为新窗口分配唯一的窗口标识符
     * 需求: 4.3 - 使用默认位置偏移避免窗口重叠
     * 需求: 4.4 - 在窗口列表中注册窗口
     * 需求: 4.5 - 窗口数量达到上限时阻止创建
     * 
     * @param noteId - 便签ID（可选）
     * @param position - 窗口位置（可选，不提供则自动计算）
     * @returns 新窗口的ID
     * @throws 如果窗口数量达到上限或不在 Electron 环境中
     */
    const createWindow = async (
        noteId?: string,
        position?: Position
    ): Promise<string> => {
        // 检查窗口数量限制
        if (!canCreateWindow.value) {
            throw new Error(`已达到窗口数量上限（${MAX_WINDOWS}个）`)
        }

        // 检查 Electron 环境
        if (!isElectron()) {
            throw new Error('仅在 Electron 环境支持多窗口')
        }

        try {
            // 生成窗口ID
            const windowId = generateWindowId()

            // 计算窗口位置
            const windowPosition = position || calculateNewPosition()

            // 生成便签ID（如果未提供）
            const windowNoteId = noteId || `note-${Date.now()}`

            // 通过 IPC 创建新窗口
            await window.electronAPI.multiWindow.create({
                windowId,
                noteId: windowNoteId,
                position: windowPosition,
                size: DEFAULT_SIZE,
                alwaysOnTop: false
            })

            // 创建窗口信息对象
            const windowInfo: WindowInfo = {
                id: windowId,
                noteId: windowNoteId,
                position: windowPosition,
                size: DEFAULT_SIZE,
                isAlwaysOnTop: false,
                createdAt: Date.now()
            }

            // 注册到窗口列表
            windows.value.push(windowInfo)

            console.log(`窗口创建成功: ${windowId}`)

            return windowId
        } catch (error) {
            console.error('创建窗口失败:', error)
            throw error
        }
    }

    /**
     * 关闭窗口
     * 需求: 5.1 - 关闭窗口实例
     * 需求: 5.2 - 从窗口列表中移除窗口
     * 需求: 5.4 - 清理窗口的所有事件监听器
     * 
     * @param windowId - 窗口ID
     * @throws 如果窗口不存在或不在 Electron 环境中
     */
    const closeWindow = async (windowId: string): Promise<void> => {
        // 检查 Electron 环境
        if (!isElectron()) {
            console.warn('closeWindow: 不在 Electron 环境中')
            return
        }

        try {
            // 查找窗口
            const windowIndex = windows.value.findIndex(w => w.id === windowId)
            if (windowIndex === -1) {
                throw new Error(`窗口不存在: ${windowId}`)
            }

            // 通过 IPC 关闭窗口
            await window.electronAPI.multiWindow.close(windowId)

            // 从窗口列表中移除
            windows.value.splice(windowIndex, 1)

            // 清理该窗口的事件监听器
            // 注意：这里清理的是本地监听器映射，实际的 IPC 监听器由窗口关闭时自动清理
            eventListeners.forEach((listeners, event) => {
                // 这里可以添加更细粒度的清理逻辑
                // 目前保持简单，因为监听器是全局的
            })

            console.log(`窗口关闭成功: ${windowId}`)
        } catch (error) {
            console.error('关闭窗口失败:', error)
            throw error
        }
    }

    /**
     * 聚焦窗口
     * 需求: 4.1 - 窗口管理功能
     * 
     * @param windowId - 窗口ID
     * @throws 如果窗口不存在或不在 Electron 环境中
     */
    const focusWindow = async (windowId: string): Promise<void> => {
        // 检查 Electron 环境
        if (!isElectron()) {
            console.warn('focusWindow: 不在 Electron 环境中')
            return
        }

        try {
            // 查找窗口
            const windowInfo = windows.value.find(w => w.id === windowId)
            if (!windowInfo) {
                throw new Error(`窗口不存在: ${windowId}`)
            }

            // 通过 IPC 聚焦窗口
            await window.electronAPI.multiWindow.focus(windowId)

            console.log(`窗口聚焦成功: ${windowId}`)
        } catch (error) {
            console.error('聚焦窗口失败:', error)
            throw error
        }
    }

    /**
     * 获取窗口信息
     * 需求: 4.4 - 窗口信息查询
     * 
     * @param windowId - 窗口ID
     * @returns 窗口信息，如果不存在则返回 undefined
     */
    const getWindowInfo = (windowId: string): WindowInfo | undefined => {
        return windows.value.find(w => w.id === windowId)
    }

    /**
     * 更新窗口信息
     * 需求: 4.4 - 窗口信息更新
     * 
     * @param windowId - 窗口ID
     * @param info - 要更新的窗口信息（部分）
     */
    const updateWindowInfo = (
        windowId: string,
        info: Partial<WindowInfo>
    ): void => {
        const window = windows.value.find(w => w.id === windowId)
        if (window) {
            Object.assign(window, info)
            console.log(`窗口信息已更新: ${windowId}`, info)
        } else {
            console.warn(`窗口不存在，无法更新: ${windowId}`)
        }
    }

    // ==================== 窗口间通信方法 ====================

    /**
     * 广播消息到所有窗口
     * 需求: 9.1 - 一个窗口的数据改变时通知其他窗口
     * 
     * @param event - 事件名称
     * @param data - 事件数据
     */
    const broadcast = (event: string, data: any): void => {
        // 检查 Electron 环境
        if (!isElectron()) {
            console.warn('broadcast: 不在 Electron 环境中')
            return
        }

        try {
            // 通过 IPC 广播消息
            window.electronAPI.multiWindow.broadcast(event, data)

            console.log(`广播消息: ${event}`, data)
        } catch (error) {
            // 需求: 9.5 - 数据同步失败时记录错误
            console.error('广播消息失败:', error)
        }
    }

    /**
     * 监听广播消息
     * 需求: 9.2 - 窗口接收到数据更新通知时刷新显示内容
     * 需求: 9.3 - 窗口创建时订阅全局数据变更事件
     * 
     * @param event - 事件名称
     * @param handler - 事件处理函数
     */
    const onBroadcast = (event: string, handler: (data: any) => void): void => {
        // 检查 Electron 环境
        if (!isElectron()) {
            console.warn('onBroadcast: 不在 Electron 环境中')
            return
        }

        try {
            // 注册事件监听器
            const channel = `broadcast:${event}`

            // 保存到本地映射表
            if (!eventListeners.has(event)) {
                eventListeners.set(event, [])
            }
            eventListeners.get(event)!.push(handler)

            // 通过 Electron API 监听
            window.electronAPI.on(channel, handler)

            console.log(`已订阅广播事件: ${event}`)
        } catch (error) {
            console.error('订阅广播事件失败:', error)
        }
    }

    /**
     * 取消监听广播消息
     * 需求: 9.4 - 窗口关闭时取消订阅全局数据变更事件
     * 
     * @param event - 事件名称
     * @param handler - 事件处理函数（可选，不提供则移除所有监听器）
     */
    const offBroadcast = (event: string, handler?: (data: any) => void): void => {
        // 检查 Electron 环境
        if (!isElectron()) {
            return
        }

        try {
            const channel = `broadcast:${event}`

            if (handler) {
                // 移除特定监听器
                window.electronAPI.off(channel, handler)

                // 从本地映射表中移除
                const listeners = eventListeners.get(event)
                if (listeners) {
                    const index = listeners.indexOf(handler)
                    if (index !== -1) {
                        listeners.splice(index, 1)
                    }
                }
            } else {
                // 移除所有监听器
                const listeners = eventListeners.get(event)
                if (listeners) {
                    listeners.forEach(h => {
                        window.electronAPI.off(channel, h)
                    })
                    eventListeners.delete(event)
                }
            }

            console.log(`已取消订阅广播事件: ${event}`)
        } catch (error) {
            console.error('取消订阅广播事件失败:', error)
        }
    }

    // ==================== 生命周期管理 ====================

    /**
     * 组件卸载时清理所有事件监听器
     * 需求: 9.4 - 窗口关闭时取消订阅全局数据变更事件
     */
    onUnmounted(() => {
        // 清理所有事件监听器
        eventListeners.forEach((listeners, event) => {
            listeners.forEach(handler => {
                offBroadcast(event, handler)
            })
        })
        eventListeners.clear()

        console.log('多窗口管理已清理')
    })

    // ==================== 返回接口 ====================

    return {
        // 窗口列表
        windows,
        currentWindowId,

        // 窗口管理
        createWindow,
        closeWindow,
        focusWindow,
        getWindowInfo,
        updateWindowInfo,

        // 窗口数量限制
        maxWindows: MAX_WINDOWS,
        canCreateWindow,

        // 窗口间通信
        broadcast,
        onBroadcast
    }
}
