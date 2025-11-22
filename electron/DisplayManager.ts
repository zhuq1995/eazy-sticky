/**
 * DisplayManager - 显示器管理器
 * 
 * 职责：
 * - 检测和监控显示器配置
 * - 处理跨显示器窗口移动
 * - 验证和调整窗口位置
 * - 处理显示器变更事件
 * 
 * 验证需求: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4
 */

import { screen, Display, BrowserWindow } from 'electron'
import { EventEmitter } from 'events'

// ==================== 类型定义 ====================

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
 * 位置坐标接口
 */
export interface Position {
    x: number
    y: number
}

/**
 * 窗口边界接口
 */
export interface Bounds {
    x: number
    y: number
    width: number
    height: number
}

// ==================== DisplayManager 类 ====================

/**
 * 显示器管理器类
 * 验证需求: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4
 */
export class DisplayManager extends EventEmitter {
    private displays: DisplayInfo[] = []
    private primaryDisplay: DisplayInfo | null = null
    private windows: Map<number, BrowserWindow> = new Map()
    private displayChangeDebounceTimer: NodeJS.Timeout | null = null
    private readonly DISPLAY_CHANGE_DEBOUNCE_DELAY = 200 // 防抖延迟（毫秒）

    constructor() {
        super()
        this.updateDisplays()
        this.setupDisplayListeners()
    }

    // ==================== 显示器检测 ====================

    /**
     * 获取所有显示器
     * @returns 显示器信息数组
     * 验证需求: 5.1
     */
    getAllDisplays(): DisplayInfo[] {
        return [...this.displays]
    }

    /**
     * 获取主显示器
     * @returns 主显示器信息
     * 验证需求: 5.2
     */
    getPrimaryDisplay(): DisplayInfo {
        if (!this.primaryDisplay) {
            this.updateDisplays()
        }
        return this.primaryDisplay!
    }

    /**
     * 获取指定点所在的显示器
     * @param point 坐标点
     * @returns 显示器信息
     * 验证需求: 5.3
     */
    getDisplayNearestPoint(point: Position): DisplayInfo {
        const display = screen.getDisplayNearestPoint(point)
        return this.convertToDisplayInfo(display)
    }

    /**
     * 获取包含指定窗口的显示器
     * @param window 窗口实例
     * @returns 显示器信息
     * 验证需求: 5.3
     */
    getDisplayForWindow(window: BrowserWindow): DisplayInfo {
        const bounds = window.getBounds()
        const centerPoint = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        }
        return this.getDisplayNearestPoint(centerPoint)
    }

    // ==================== 位置验证 ====================

    /**
     * 检查位置是否在显示器范围内
     * @param position 位置坐标
     * @returns 是否在范围内
     * 验证需求: 6.1
     */
    isPositionInBounds(position: Position): boolean {
        for (const display of this.displays) {
            const { x, y, width, height } = display.bounds

            if (
                position.x >= x &&
                position.x < x + width &&
                position.y >= y &&
                position.y < y + height
            ) {
                return true
            }
        }

        return false
    }

    /**
     * 检查窗口边界是否在显示器范围内
     * @param bounds 窗口边界
     * @returns 是否在范围内
     * 验证需求: 6.1
     */
    isBoundsInDisplays(bounds: Bounds): boolean {
        // 检查窗口中心点是否在任何显示器内
        const centerPoint = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        }

        return this.isPositionInBounds(centerPoint)
    }

    /**
     * 检查窗口是否至少部分可见
     * @param bounds 窗口边界
     * @param minVisiblePixels 最小可见像素数（默认50）
     * @returns 是否可见
     * 验证需求: 6.1
     */
    isWindowVisible(bounds: Bounds, minVisiblePixels: number = 50): boolean {
        for (const display of this.displays) {
            const { x: dx, y: dy, width: dw, height: dh } = display.bounds

            // 计算窗口与显示器的交集
            const intersectX = Math.max(bounds.x, dx)
            const intersectY = Math.max(bounds.y, dy)
            const intersectWidth = Math.min(bounds.x + bounds.width, dx + dw) - intersectX
            const intersectHeight = Math.min(bounds.y + bounds.height, dy + dh) - intersectY

            // 如果有交集且交集面积大于最小可见像素
            if (intersectWidth > 0 && intersectHeight > 0) {
                const visibleArea = intersectWidth * intersectHeight
                if (visibleArea >= minVisiblePixels) {
                    return true
                }
            }
        }

        return false
    }

    // ==================== 位置调整 ====================

    /**
     * 调整位置到显示器内
     * @param position 原始位置
     * @param windowSize 窗口尺寸（可选）
     * @returns 调整后的位置
     * 验证需求: 6.2
     */
    adjustPositionToBounds(position: Position, windowSize?: { width: number; height: number }): Position {
        // 如果位置已经在显示器范围内，直接返回
        if (this.isPositionInBounds(position)) {
            return { ...position }
        }

        // 使用主显示器进行调整
        const primaryDisplay = this.getPrimaryDisplay()
        const { x, y, width, height } = primaryDisplay.workArea

        // 默认窗口尺寸
        const winWidth = windowSize?.width || 300
        const winHeight = windowSize?.height || 300

        // 最小可见区域
        const minVisible = 50

        // 调整 X 坐标
        let adjustedX = position.x
        if (adjustedX < x) {
            adjustedX = x
        } else if (adjustedX + winWidth > x + width) {
            adjustedX = x + width - Math.max(minVisible, winWidth)
        }

        // 调整 Y 坐标
        let adjustedY = position.y
        if (adjustedY < y) {
            adjustedY = y
        } else if (adjustedY + winHeight > y + height) {
            adjustedY = y + height - Math.max(minVisible, winHeight)
        }

        return { x: adjustedX, y: adjustedY }
    }

    /**
     * 调整窗口边界到显示器内
     * @param bounds 原始边界
     * @returns 调整后的边界
     * 验证需求: 6.2
     */
    adjustBoundsToBounds(bounds: Bounds): Bounds {
        // 检查窗口中心点是否在显示器内
        const centerPoint = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        }

        // 如果中心点在显示器内，直接返回
        if (this.isPositionInBounds(centerPoint)) {
            return { ...bounds }
        }

        // 调整位置
        const adjustedPosition = this.adjustPositionToBounds(
            { x: bounds.x, y: bounds.y },
            { width: bounds.width, height: bounds.height }
        )

        return {
            x: adjustedPosition.x,
            y: adjustedPosition.y,
            width: bounds.width,
            height: bounds.height
        }
    }

    /**
     * 将窗口移动到主显示器
     * @param window 窗口实例
     * @returns 新的窗口位置
     * 验证需求: 6.3
     */
    moveWindowToPrimaryDisplay(window: BrowserWindow): Position {
        if (window.isDestroyed()) {
            throw new Error('窗口已销毁')
        }

        const primaryDisplay = this.getPrimaryDisplay()
        const { x, y, width, height } = primaryDisplay.workArea

        // 计算居中位置
        const bounds = window.getBounds()
        const newPosition = {
            x: x + Math.floor((width - bounds.width) / 2),
            y: y + Math.floor((height - bounds.height) / 2)
        }

        // 移动窗口
        window.setPosition(newPosition.x, newPosition.y)

        return newPosition
    }

    // ==================== 窗口管理 ====================

    /**
     * 注册窗口到管理器
     * @param window 窗口实例
     * 验证需求: 6.4
     */
    registerWindow(window: BrowserWindow): void {
        if (!window || window.isDestroyed()) {
            return
        }

        this.windows.set(window.id, window)

        // 验证窗口位置
        const bounds = window.getBounds()
        if (!this.isWindowVisible(bounds)) {
            // 如果窗口不可见，移动到主显示器
            this.moveWindowToPrimaryDisplay(window)
        }
    }

    /**
     * 注销窗口
     * @param windowId 窗口ID
     * 验证需求: 6.4
     */
    unregisterWindow(windowId: number): void {
        this.windows.delete(windowId)
    }

    /**
     * 迁移所有窗口到有效显示器
     * @returns 迁移的窗口数量
     * 验证需求: 6.3, 6.4
     */
    migrateWindowsToValidDisplay(): number {
        let migratedCount = 0

        this.windows.forEach((window, windowId) => {
            if (window.isDestroyed()) {
                this.windows.delete(windowId)
                return
            }

            const bounds = window.getBounds()

            // 检查窗口是否可见
            if (!this.isWindowVisible(bounds)) {
                try {
                    // 移动到主显示器
                    this.moveWindowToPrimaryDisplay(window)
                    migratedCount++
                } catch (error) {
                    console.error(`迁移窗口 ${windowId} 失败:`, error)
                }
            }
        })

        return migratedCount
    }

    // ==================== 显示器变更处理 ====================

    /**
     * 设置显示器变更监听器
     * 验证需求: 5.4
     */
    private setupDisplayListeners(): void {
        // 监听显示器添加事件
        screen.on('display-added', (event, newDisplay) => {
            this.handleDisplayChange('added', newDisplay)
        })

        // 监听显示器移除事件
        screen.on('display-removed', (event, oldDisplay) => {
            this.handleDisplayChange('removed', oldDisplay)
        })

        // 监听显示器度量变更事件
        screen.on('display-metrics-changed', (event, display, changedMetrics) => {
            this.handleDisplayChange('metrics-changed', display, changedMetrics)
        })
    }

    /**
     * 处理显示器变更
     * @param type 变更类型
     * @param display 显示器实例
     * @param changedMetrics 变更的度量（可选）
     * 验证需求: 5.4, 6.3, 6.4, 10.2
     */
    private handleDisplayChange(
        type: 'added' | 'removed' | 'metrics-changed',
        display: Display,
        changedMetrics?: string[]
    ): void {
        // 使用防抖机制处理显示器变更事件（验证需求: 10.2）
        if (this.displayChangeDebounceTimer) {
            clearTimeout(this.displayChangeDebounceTimer)
        }

        this.displayChangeDebounceTimer = setTimeout(() => {
            // 更新显示器列表
            this.updateDisplays()

            // 触发事件
            this.emit('display-changed', {
                type,
                display: this.convertToDisplayInfo(display),
                changedMetrics
            })

            // 如果是显示器移除，迁移窗口
            if (type === 'removed') {
                const migratedCount = this.migrateWindowsToValidDisplay()
                if (migratedCount > 0) {
                    this.emit('windows-migrated', { count: migratedCount })
                }
            }

            this.displayChangeDebounceTimer = null
        }, this.DISPLAY_CHANGE_DEBOUNCE_DELAY)
    }

    /**
     * 更新显示器列表
     * 验证需求: 5.1, 5.2
     */
    private updateDisplays(): void {
        // 获取所有显示器
        const allDisplays = screen.getAllDisplays()
        this.displays = allDisplays.map(d => this.convertToDisplayInfo(d))

        // 获取主显示器
        const primary = screen.getPrimaryDisplay()
        this.primaryDisplay = this.convertToDisplayInfo(primary)
    }

    /**
     * 转换 Electron Display 到 DisplayInfo
     * @param display Electron Display 对象
     * @returns DisplayInfo 对象
     */
    private convertToDisplayInfo(display: Display): DisplayInfo {
        return {
            id: display.id,
            bounds: {
                x: display.bounds.x,
                y: display.bounds.y,
                width: display.bounds.width,
                height: display.bounds.height
            },
            workArea: {
                x: display.workArea.x,
                y: display.workArea.y,
                width: display.workArea.width,
                height: display.workArea.height
            },
            scaleFactor: display.scaleFactor,
            rotation: display.rotation,
            internal: display.internal
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 获取显示器总边界（所有显示器的包围盒）
     * @returns 总边界
     */
    getTotalBounds(): Bounds {
        if (this.displays.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 }
        }

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const display of this.displays) {
            const { x, y, width, height } = display.bounds
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x + width)
            maxY = Math.max(maxY, y + height)
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        }
    }

    /**
     * 获取显示器数量
     * @returns 显示器数量
     */
    getDisplayCount(): number {
        return this.displays.length
    }

    /**
     * 检查是否为多显示器环境
     * @returns 是否为多显示器
     */
    isMultiDisplay(): boolean {
        return this.displays.length > 1
    }

    /**
     * 获取显示器信息摘要（用于日志）
     * @returns 显示器信息摘要
     */
    getDisplaySummary(): string {
        const count = this.displays.length
        const primary = this.primaryDisplay

        if (!primary) {
            return '无显示器'
        }

        const summary = [
            `显示器数量: ${count}`,
            `主显示器: ${primary.bounds.width}x${primary.bounds.height} @ (${primary.bounds.x},${primary.bounds.y})`,
            `缩放因子: ${primary.scaleFactor}`
        ]

        if (count > 1) {
            summary.push(`多显示器模式`)
        }

        return summary.join(', ')
    }

    /**
     * 销毁管理器
     * 验证需求: 10.1
     */
    destroy(): void {
        // 取消防抖定时器（验证需求: 10.1）
        if (this.displayChangeDebounceTimer) {
            clearTimeout(this.displayChangeDebounceTimer)
            this.displayChangeDebounceTimer = null
        }

        // 移除所有事件监听器
        this.removeAllListeners()

        // 清空窗口映射
        this.windows.clear()

        // 清空显示器列表
        this.displays = []
        this.primaryDisplay = null
    }
}
