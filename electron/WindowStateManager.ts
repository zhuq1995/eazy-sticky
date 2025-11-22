/**
 * WindowStateManager - 窗口状态管理器
 * 
 * 职责：
 * - 保存窗口状态到本地存储
 * - 恢复窗口状态
 * - 验证窗口位置有效性
 * - 处理多窗口状态
 * - 清理过期状态
 * 
 * 验证需求: 8.1, 8.2, 8.3, 8.4
 */

import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { DisplayManager, Bounds } from './DisplayManager'

// ==================== 类型定义 ====================

/**
 * 窗口状态接口
 */
export interface WindowState {
    id: string
    bounds: Bounds
    isMaximized: boolean
    isAlwaysOnTop: boolean
    displayId: number
    lastUpdated: number
}

/**
 * 存储的状态结构
 */
export interface StoredState {
    version: number
    windows: {
        [windowId: string]: WindowState
    }
}

// ==================== WindowStateManager 类 ====================

/**
 * 窗口状态管理器类
 * 验证需求: 8.1, 8.2, 8.3, 8.4
 */
export class WindowStateManager {
    private stateFilePath: string
    private state: StoredState
    private displayManager: DisplayManager
    private saveDebounceTimer: NodeJS.Timeout | null = null
    private readonly DEBOUNCE_DELAY = 500 // 防抖延迟（毫秒）
    private readonly MAX_STATE_AGE = 30 * 24 * 60 * 60 * 1000 // 30天（毫秒）

    /**
     * 构造函数
     * @param displayManager 显示器管理器实例
     * @param stateFilePath 状态文件路径（可选）
     */
    constructor(displayManager: DisplayManager, stateFilePath?: string) {
        this.displayManager = displayManager
        this.stateFilePath = stateFilePath || path.join(app.getPath('userData'), 'window-state.json')
        this.state = {
            version: 1,
            windows: {}
        }

        // 加载现有状态
        this.loadState()
    }

    // ==================== 状态保存 ====================

    /**
     * 保存窗口状态（带防抖）
     * @param windowId 窗口ID
     * @param state 窗口状态
     * 验证需求: 8.1
     */
    saveWindowState(windowId: string, state: WindowState): void {
        // 更新内存中的状态
        this.state.windows[windowId] = {
            ...state,
            lastUpdated: Date.now()
        }

        // 使用防抖保存到文件
        this.saveStateDebounced()
    }

    /**
     * 保存状态到文件（防抖）
     * 验证需求: 8.1
     */
    private saveStateDebounced(): void {
        // 清除现有的定时器
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer)
        }

        // 设置新的定时器
        this.saveDebounceTimer = setTimeout(() => {
            this.saveStateImmediate()
            this.saveDebounceTimer = null
        }, this.DEBOUNCE_DELAY)
    }

    /**
     * 立即保存状态到文件
     * 验证需求: 8.1
     */
    private saveStateImmediate(): void {
        try {
            // 确保目录存在
            const dir = path.dirname(this.stateFilePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }

            // 写入文件
            const data = JSON.stringify(this.state, null, 2)
            fs.writeFileSync(this.stateFilePath, data, 'utf-8')
        } catch (error) {
            console.error('保存窗口状态失败:', error)
        }
    }

    /**
     * 强制立即保存所有状态
     * 用于应用退出前保存最终状态
     * 验证需求: 8.1
     */
    saveAllStatesImmediate(): void {
        // 取消防抖定时器
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer)
            this.saveDebounceTimer = null
        }

        // 立即保存
        this.saveStateImmediate()
    }

    // ==================== 状态恢复 ====================

    /**
     * 恢复窗口状态
     * @param windowId 窗口ID
     * @returns 窗口状态或null
     * 验证需求: 8.2, 8.3
     */
    restoreWindowState(windowId: string): WindowState | null {
        const state = this.state.windows[windowId]

        if (!state) {
            return null
        }

        // 验证状态有效性
        if (!this.validateState(state)) {
            console.warn(`窗口状态无效: ${windowId}`)
            return null
        }

        return state
    }

    /**
     * 获取所有窗口状态
     * @returns 窗口状态数组
     * 验证需求: 8.2
     */
    getAllWindowStates(): WindowState[] {
        return Object.values(this.state.windows).filter(state => this.validateState(state))
    }

    /**
     * 删除窗口状态
     * @param windowId 窗口ID
     * 验证需求: 8.1
     */
    deleteWindowState(windowId: string): void {
        if (this.state.windows[windowId]) {
            delete this.state.windows[windowId]
            this.saveStateDebounced()
        }
    }

    // ==================== 状态验证 ====================

    /**
     * 验证状态有效性
     * @param state 窗口状态
     * @returns 是否有效
     * 验证需求: 8.3
     */
    private validateState(state: WindowState): boolean {
        // 检查必需字段
        if (!state.id || !state.bounds || typeof state.lastUpdated !== 'number') {
            return false
        }

        // 检查边界值
        const { x, y, width, height } = state.bounds
        if (
            typeof x !== 'number' ||
            typeof y !== 'number' ||
            typeof width !== 'number' ||
            typeof height !== 'number'
        ) {
            return false
        }

        // 检查尺寸是否合理
        if (width < 100 || height < 100 || width > 10000 || height > 10000) {
            return false
        }

        // 使用 DisplayManager 验证位置
        if (!this.displayManager.isBoundsInDisplays(state.bounds)) {
            // 位置不在显示器范围内，尝试调整
            const adjustedBounds = this.displayManager.adjustBoundsToBounds(state.bounds)
            state.bounds = adjustedBounds
        }

        return true
    }

    /**
     * 验证并调整窗口边界
     * @param bounds 原始边界
     * @returns 调整后的边界
     * 验证需求: 8.3
     */
    validateAndAdjustBounds(bounds: Bounds): Bounds {
        // 检查边界是否在显示器范围内
        if (this.displayManager.isBoundsInDisplays(bounds)) {
            return bounds
        }

        // 调整到显示器范围内
        return this.displayManager.adjustBoundsToBounds(bounds)
    }

    // ==================== 状态清理 ====================

    /**
     * 清理过期状态
     * @param maxAge 最大年龄（毫秒），默认30天
     * @returns 清理的状态数量
     * 验证需求: 8.4
     */
    cleanupOldStates(maxAge: number = this.MAX_STATE_AGE): number {
        const now = Date.now()
        let cleanedCount = 0

        for (const [windowId, state] of Object.entries(this.state.windows)) {
            const age = now - state.lastUpdated

            if (age > maxAge) {
                delete this.state.windows[windowId]
                cleanedCount++
            }
        }

        if (cleanedCount > 0) {
            this.saveStateImmediate()
        }

        return cleanedCount
    }

    /**
     * 清理所有状态
     * 验证需求: 8.4
     */
    clearAllStates(): void {
        this.state.windows = {}
        this.saveStateImmediate()
    }

    // ==================== 状态加载 ====================

    /**
     * 从文件加载状态
     * 验证需求: 8.2
     */
    private loadState(): void {
        try {
            if (!fs.existsSync(this.stateFilePath)) {
                return
            }

            const data = fs.readFileSync(this.stateFilePath, 'utf-8')
            const loadedState = JSON.parse(data) as StoredState

            // 验证版本
            if (loadedState.version !== 1) {
                console.warn('窗口状态版本不匹配，使用默认状态')
                return
            }

            // 加载状态
            this.state = loadedState

            // 清理过期状态
            this.cleanupOldStates()
        } catch (error) {
            console.error('加载窗口状态失败:', error)
            // 使用默认状态
            this.state = {
                version: 1,
                windows: {}
            }
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 获取状态文件路径
     * @returns 文件路径
     */
    getStateFilePath(): string {
        return this.stateFilePath
    }

    /**
     * 获取窗口状态数量
     * @returns 状态数量
     */
    getStateCount(): number {
        return Object.keys(this.state.windows).length
    }

    /**
     * 检查窗口状态是否存在
     * @param windowId 窗口ID
     * @returns 是否存在
     */
    hasWindowState(windowId: string): boolean {
        return windowId in this.state.windows
    }

    /**
     * 获取状态摘要（用于日志）
     * @returns 状态摘要
     */
    getStateSummary(): string {
        const count = this.getStateCount()
        const validCount = this.getAllWindowStates().length

        return `窗口状态: ${validCount}/${count} 个有效状态`
    }

    /**
     * 销毁管理器
     * 验证需求: 8.1
     */
    destroy(): void {
        // 取消防抖定时器
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer)
            this.saveDebounceTimer = null
        }

        // 保存最终状态
        this.saveStateImmediate()
    }
}
