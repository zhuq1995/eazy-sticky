/**
 * 窗口功能属性测试数据生成器
 * 使用 fast-check 生成用于窗口拖拽、置顶、多窗口管理等功能的属性测试数据
 */

import * as fc from 'fast-check'
import type {
    Position,
    Size,
    WindowState,
    WindowInfo,
    DragState,
    DragConstraints,
    DragBoundary,
    WindowBounds,
    ScreenBounds,
    WindowCreateOptions,
    MultiWindowConfig
} from '../src/types'

// ==================== 基础数据生成器 ====================

/**
 * 生成有效的窗口位置坐标
 * 范围：0-3840（支持4K显示器和多显示器场景）
 */
export const arbWindowX = fc.integer({ min: 0, max: 3840 })
export const arbWindowY = fc.integer({ min: 0, max: 2160 })

/**
 * 生成任意位置坐标（包括负数，用于测试边界限制）
 * 范围：-1000 到 5000
 */
export const arbAnyX = fc.integer({ min: -1000, max: 5000 })
export const arbAnyY = fc.integer({ min: -1000, max: 5000 })

/**
 * 生成有效的窗口尺寸
 * 范围：200-800（符合设计文档中的最小和最大尺寸限制）
 */
export const arbWindowWidth = fc.integer({ min: 200, max: 800 })
export const arbWindowHeight = fc.integer({ min: 200, max: 800 })

/**
 * 生成任意尺寸（包括无效值，用于测试尺寸限制）
 * 范围：50-1500
 */
export const arbAnyWidth = fc.integer({ min: 50, max: 1500 })
export const arbAnyHeight = fc.integer({ min: 50, max: 1500 })

/**
 * 生成时间戳
 * 范围：2020-2030年
 */
export const arbTimestamp = fc.integer({ min: 1577836800000, max: 1893456000000 })

/**
 * 生成窗口ID
 */
export const arbWindowId = fc.oneof(
    fc.constant('main'),
    fc.constant('window-1'),
    fc.constant('window-2'),
    fc.uuid().map(id => `window-${id}`),
    arbTimestamp.map(ts => `window-${ts}`)
)

/**
 * 生成便签ID
 */
export const arbNoteId = fc.oneof(
    fc.uuid().map(id => `note-${id}`),
    arbTimestamp.map(ts => `note-${ts}`)
)

// ==================== 位置和尺寸生成器 ====================

/**
 * 生成有效的窗口位置
 * 位置在屏幕范围内
 */
export const arbPosition: fc.Arbitrary<Position> = fc.record({
    x: arbWindowX,
    y: arbWindowY
})

/**
 * 生成任意窗口位置（包括屏幕外）
 * 用于测试边界限制功能
 */
export const arbAnyPosition: fc.Arbitrary<Position> = fc.record({
    x: arbAnyX,
    y: arbAnyY
})

/**
 * 生成有效的窗口尺寸
 * 尺寸在允许范围内（200-800）
 */
export const arbSize: fc.Arbitrary<Size> = fc.record({
    width: arbWindowWidth,
    height: arbWindowHeight
})

/**
 * 生成任意窗口尺寸（包括无效值）
 * 用于测试尺寸限制功能
 */
export const arbAnySize: fc.Arbitrary<Size> = fc.record({
    width: arbAnyWidth,
    height: arbAnyHeight
})

/**
 * 生成窗口边界
 */
export const arbWindowBounds: fc.Arbitrary<WindowBounds> = fc.record({
    x: arbWindowX,
    y: arbWindowY,
    width: arbWindowWidth,
    height: arbWindowHeight
})

/**
 * 生成屏幕边界
 * 常见屏幕分辨率
 */
export const arbScreenBounds: fc.Arbitrary<ScreenBounds> = fc.oneof(
    // 1920x1080 (Full HD)
    fc.constant({ x: 0, y: 0, width: 1920, height: 1080 }),
    // 2560x1440 (2K)
    fc.constant({ x: 0, y: 0, width: 2560, height: 1440 }),
    // 3840x2160 (4K)
    fc.constant({ x: 0, y: 0, width: 3840, height: 2160 }),
    // 1366x768 (常见笔记本)
    fc.constant({ x: 0, y: 0, width: 1366, height: 768 }),
    // 自定义屏幕
    fc.record({
        x: fc.constant(0),
        y: fc.constant(0),
        width: fc.integer({ min: 1024, max: 3840 }),
        height: fc.integer({ min: 768, max: 2160 })
    })
)

// ==================== 拖拽相关生成器 ====================

/**
 * 生成拖拽边界
 */
export const arbDragBoundary: fc.Arbitrary<DragBoundary> = fc.record({
    left: fc.integer({ min: 0, max: 100 }),
    top: fc.integer({ min: 0, max: 100 }),
    right: fc.integer({ min: 1024, max: 3840 }),
    bottom: fc.integer({ min: 768, max: 2160 })
}).filter(boundary =>
    boundary.right > boundary.left + 200 &&
    boundary.bottom > boundary.top + 200
)

/**
 * 生成拖拽约束
 */
export const arbDragConstraints: fc.Arbitrary<DragConstraints> = fc.record({
    minX: fc.integer({ min: 0, max: 100 }),
    minY: fc.integer({ min: 0, max: 100 }),
    maxX: fc.integer({ min: 1024, max: 3840 }),
    maxY: fc.integer({ min: 768, max: 2160 }),
    minVisibleArea: fc.integer({ min: 20, max: 100 })
}).filter(constraints =>
    constraints.maxX > constraints.minX + 200 &&
    constraints.maxY > constraints.minY + 200
)

/**
 * 生成拖拽状态
 */
export const arbDragState: fc.Arbitrary<DragState> = fc.record({
    isDragging: fc.boolean(),
    startPosition: arbPosition,
    currentPosition: arbPosition,
    offset: arbPosition,
    timestamp: arbTimestamp
})

/**
 * 生成正在拖拽的状态
 */
export const arbDraggingState: fc.Arbitrary<DragState> = arbDragState.map(state => ({
    ...state,
    isDragging: true
}))

/**
 * 生成未拖拽的状态
 */
export const arbNotDraggingState: fc.Arbitrary<DragState> = arbDragState.map(state => ({
    ...state,
    isDragging: false
}))

// ==================== 窗口状态生成器 ====================

/**
 * 生成完整的窗口状态
 */
export const arbWindowState: fc.Arbitrary<WindowState> = fc.record({
    id: fc.option(arbWindowId, { nil: undefined }),
    noteId: fc.option(arbNoteId, { nil: undefined }),
    position: arbPosition,
    size: arbSize,
    isAlwaysOnTop: fc.boolean(),
    isMinimized: fc.boolean(),
    isFocused: fc.boolean(),
    isMaximized: fc.option(fc.boolean(), { nil: undefined }),
    createdAt: fc.option(arbTimestamp, { nil: undefined }),
    updatedAt: fc.option(arbTimestamp, { nil: undefined })
})

/**
 * 生成置顶的窗口状态
 */
export const arbAlwaysOnTopWindowState: fc.Arbitrary<WindowState> = arbWindowState.map(state => ({
    ...state,
    isAlwaysOnTop: true
}))

/**
 * 生成非置顶的窗口状态
 */
export const arbNotAlwaysOnTopWindowState: fc.Arbitrary<WindowState> = arbWindowState.map(state => ({
    ...state,
    isAlwaysOnTop: false
}))

/**
 * 生成聚焦的窗口状态
 */
export const arbFocusedWindowState: fc.Arbitrary<WindowState> = arbWindowState.map(state => ({
    ...state,
    isFocused: true,
    isMinimized: false
}))

/**
 * 生成最小化的窗口状态
 */
export const arbMinimizedWindowState: fc.Arbitrary<WindowState> = arbWindowState.map(state => ({
    ...state,
    isMinimized: true,
    isFocused: false
}))

// ==================== 窗口信息生成器 ====================

/**
 * 生成窗口信息
 */
export const arbWindowInfo: fc.Arbitrary<WindowInfo> = fc.record({
    id: arbWindowId,
    noteId: arbNoteId,
    position: arbPosition,
    size: arbSize,
    isAlwaysOnTop: fc.boolean(),
    createdAt: arbTimestamp
})

/**
 * 生成窗口信息列表
 * 确保每个窗口ID唯一
 */
export const arbWindowInfoList = (minLength: number = 0, maxLength: number = 20): fc.Arbitrary<WindowInfo[]> => {
    return fc.array(arbWindowInfo, { minLength, maxLength }).map(windows => {
        // 确保ID唯一
        const uniqueWindows: WindowInfo[] = []
        const seenIds = new Set<string>()

        for (const window of windows) {
            if (!seenIds.has(window.id)) {
                seenIds.add(window.id)
                uniqueWindows.push(window)
            }
        }

        return uniqueWindows
    })
}

/**
 * 生成非空窗口列表
 */
export const arbNonEmptyWindowList = arbWindowInfoList(1, 20)

/**
 * 生成接近上限的窗口列表（用于测试窗口数量限制）
 */
export const arbNearMaxWindowList = arbWindowInfoList(15, 20)

// ==================== 窗口创建选项生成器 ====================

/**
 * 生成窗口创建选项
 */
export const arbWindowCreateOptions: fc.Arbitrary<WindowCreateOptions> = fc.record({
    windowId: fc.option(arbWindowId, { nil: undefined }),
    noteId: fc.option(arbNoteId, { nil: undefined }),
    position: fc.option(arbPosition, { nil: undefined }),
    size: fc.option(arbSize, { nil: undefined }),
    alwaysOnTop: fc.option(fc.boolean(), { nil: undefined })
})

/**
 * 生成带完整选项的窗口创建配置
 */
export const arbFullWindowCreateOptions: fc.Arbitrary<WindowCreateOptions> = fc.record({
    windowId: arbWindowId,
    noteId: arbNoteId,
    position: arbPosition,
    size: arbSize,
    alwaysOnTop: fc.boolean()
})

/**
 * 生成最小窗口创建选项（所有字段为undefined）
 */
export const arbMinimalWindowCreateOptions: fc.Arbitrary<WindowCreateOptions> = fc.constant({
    windowId: undefined,
    noteId: undefined,
    position: undefined,
    size: undefined,
    alwaysOnTop: undefined
})

// ==================== 多窗口配置生成器 ====================

/**
 * 生成多窗口配置
 */
export const arbMultiWindowConfig: fc.Arbitrary<MultiWindowConfig> = fc.record({
    maxWindows: fc.integer({ min: 1, max: 50 }),
    defaultSize: arbSize,
    defaultPosition: arbPosition,
    positionOffset: fc.record({
        x: fc.integer({ min: 10, max: 50 }),
        y: fc.integer({ min: 10, max: 50 })
    }),
    minDistance: fc.integer({ min: 10, max: 50 })
})

/**
 * 生成默认的多窗口配置（符合设计文档）
 */
export const arbDefaultMultiWindowConfig: fc.Arbitrary<MultiWindowConfig> = fc.constant({
    maxWindows: 20,
    defaultSize: { width: 300, height: 300 },
    defaultPosition: { x: 100, y: 100 },
    positionOffset: { x: 30, y: 30 },
    minDistance: 20
})

// ==================== 组合生成器 ====================

/**
 * 生成窗口位置变化序列
 * 用于测试拖拽过程中的位置更新
 */
export const arbPositionSequence = (length: number = 10): fc.Arbitrary<Position[]> => {
    return fc.array(arbPosition, { minLength: length, maxLength: length })
}

/**
 * 生成窗口尺寸变化序列
 * 用于测试窗口调整大小过程
 */
export const arbSizeSequence = (length: number = 10): fc.Arbitrary<Size[]> => {
    return fc.array(arbSize, { minLength: length, maxLength: length })
}

/**
 * 生成窗口状态变化序列
 * 用于测试窗口状态的连续变化
 */
export const arbWindowStateSequence = (length: number = 5): fc.Arbitrary<WindowState[]> => {
    return fc.array(arbWindowState, { minLength: length, maxLength: length })
}

// ==================== 边界情况生成器 ====================

/**
 * 生成边界位置（屏幕边缘）
 */
export const arbBoundaryPosition: fc.Arbitrary<Position> = fc.oneof(
    // 左上角
    fc.constant({ x: 0, y: 0 }),
    // 右上角
    fc.constant({ x: 1920, y: 0 }),
    // 左下角
    fc.constant({ x: 0, y: 1080 }),
    // 右下角
    fc.constant({ x: 1920, y: 1080 }),
    // 左边缘
    fc.record({ x: fc.constant(0), y: arbWindowY }),
    // 右边缘
    fc.record({ x: fc.constant(1920), y: arbWindowY }),
    // 上边缘
    fc.record({ x: arbWindowX, y: fc.constant(0) }),
    // 下边缘
    fc.record({ x: arbWindowX, y: fc.constant(1080) })
)

/**
 * 生成超出边界的位置
 */
export const arbOutOfBoundsPosition: fc.Arbitrary<Position> = fc.oneof(
    // 左侧超出
    fc.record({ x: fc.integer({ min: -500, max: -1 }), y: arbWindowY }),
    // 右侧超出
    fc.record({ x: fc.integer({ min: 1921, max: 3000 }), y: arbWindowY }),
    // 上方超出
    fc.record({ x: arbWindowX, y: fc.integer({ min: -500, max: -1 }) }),
    // 下方超出
    fc.record({ x: arbWindowX, y: fc.integer({ min: 1081, max: 2000 }) })
)

/**
 * 生成最小尺寸（200x200）
 */
export const arbMinSize: fc.Arbitrary<Size> = fc.constant({ width: 200, height: 200 })

/**
 * 生成最大尺寸（800x800）
 */
export const arbMaxSize: fc.Arbitrary<Size> = fc.constant({ width: 800, height: 800 })

/**
 * 生成小于最小尺寸的尺寸
 */
export const arbBelowMinSize: fc.Arbitrary<Size> = fc.record({
    width: fc.integer({ min: 50, max: 199 }),
    height: fc.integer({ min: 50, max: 199 })
})

/**
 * 生成大于最大尺寸的尺寸
 */
export const arbAboveMaxSize: fc.Arbitrary<Size> = fc.record({
    width: fc.integer({ min: 801, max: 1500 }),
    height: fc.integer({ min: 801, max: 1500 })
})

// ==================== 辅助函数 ====================

/**
 * 生成 N 个样本用于调试
 */
export function generateSamples<T>(arbitrary: fc.Arbitrary<T>, count: number = 10): T[] {
    return fc.sample(arbitrary, count)
}

/**
 * 打印生成器样本（用于调试）
 */
export function printSamples<T>(arbitrary: fc.Arbitrary<T>, count: number = 5): void {
    const samples = generateSamples(arbitrary, count)
    console.log('生成的样本:')
    samples.forEach((sample, index) => {
        console.log(`样本 ${index + 1}:`, JSON.stringify(sample, null, 2))
    })
}

/**
 * 验证位置是否在边界内
 */
export function isPositionInBounds(position: Position, bounds: ScreenBounds, minVisible: number = 50): boolean {
    return (
        position.x >= bounds.x &&
        position.y >= bounds.y &&
        position.x <= bounds.width - minVisible &&
        position.y <= bounds.height - minVisible
    )
}

/**
 * 验证尺寸是否在限制范围内
 */
export function isSizeInRange(size: Size, minSize: Size = { width: 200, height: 200 }, maxSize: Size = { width: 800, height: 800 }): boolean {
    return (
        size.width >= minSize.width &&
        size.height >= minSize.height &&
        size.width <= maxSize.width &&
        size.height <= maxSize.height
    )
}

/**
 * 计算两个位置之间的距离
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 检查窗口ID列表是否唯一
 */
export function areWindowIdsUnique(windows: WindowInfo[]): boolean {
    const ids = windows.map(w => w.id)
    return ids.length === new Set(ids).size
}

/**
 * 生成带有特定属性的窗口列表
 * 例如：生成所有置顶的窗口列表
 */
export function generateWindowListWithProperty(
    count: number,
    property: Partial<WindowInfo>
): fc.Arbitrary<WindowInfo[]> {
    return fc.array(
        arbWindowInfo.map(window => ({ ...window, ...property })),
        { minLength: count, maxLength: count }
    ).map(windows => {
        // 确保ID唯一
        return windows.map((window, index) => ({
            ...window,
            id: `window-${index}-${Date.now()}`
        }))
    })
}
