/**
 * 窗口生成器使用示例
 * 展示如何在属性测试中使用窗口生成器
 */

import * as fc from 'fast-check'
import {
    arbPosition,
    arbAnyPosition,
    arbSize,
    arbWindowState,
    arbWindowInfoList,
    arbDragState,
    isPositionInBounds,
    isSizeInRange,
    areWindowIdsUnique,
    printSamples
} from './window-generators'

// ==================== 示例 1: 测试边界限制 ====================

/**
 * 属性 6: 左边界限制
 * 对于任何窗口x坐标，如果小于0，都应该被限制为0
 */
function checkLeftBoundary(position: { x: number; y: number }): { x: number; y: number } {
    return {
        x: Math.max(0, position.x),
        y: position.y
    }
}

// 使用生成器测试
export function testLeftBoundary() {
    fc.assert(
        fc.property(arbAnyPosition, (position) => {
            const limited = checkLeftBoundary(position)
            // 验证：限制后的x坐标应该 >= 0
            return limited.x >= 0
        }),
        { numRuns: 100 }
    )
}

// ==================== 示例 2: 测试尺寸限制 ====================

/**
 * 属性 33: 最小尺寸限制
 * 对于任何窗口尺寸，如果小于200x200，都应该被限制为最小尺寸
 */
function limitSize(size: { width: number; height: number }): { width: number; height: number } {
    return {
        width: Math.max(200, Math.min(800, size.width)),
        height: Math.max(200, Math.min(800, size.height))
    }
}

// 使用生成器测试
export function testSizeLimit() {
    fc.assert(
        fc.property(arbSize, (size) => {
            const limited = limitSize(size)
            // 验证：限制后的尺寸应该在有效范围内
            return isSizeInRange(limited)
        }),
        { numRuns: 100 }
    )
}

// ==================== 示例 3: 测试窗口ID唯一性 ====================

/**
 * 属性 17: 窗口ID唯一性
 * 对于任何新创建的窗口，其ID都应该与现有窗口ID不重复
 */
function addWindow(
    windows: Array<{ id: string;[key: string]: any }>,
    newWindow: { id: string;[key: string]: any }
): Array<{ id: string;[key: string]: any }> {
    // 如果ID已存在，生成新ID
    const existingIds = new Set(windows.map(w => w.id))
    if (existingIds.has(newWindow.id)) {
        newWindow.id = `${newWindow.id}-${Date.now()}`
    }
    return [...windows, newWindow]
}

// 使用生成器测试
export function testWindowIdUniqueness() {
    fc.assert(
        fc.property(
            arbWindowInfoList(0, 10),
            arbWindowState,
            (windows, newWindowState) => {
                const newWindow = {
                    id: newWindowState.id || `window-${Date.now()}`,
                    noteId: newWindowState.noteId || `note-${Date.now()}`,
                    position: newWindowState.position,
                    size: newWindowState.size,
                    isAlwaysOnTop: newWindowState.isAlwaysOnTop,
                    createdAt: Date.now()
                }

                const updatedWindows = addWindow(windows, newWindow)

                // 验证：所有窗口ID应该唯一
                return areWindowIdsUnique(updatedWindows)
            }
        ),
        { numRuns: 100 }
    )
}

// ==================== 示例 4: 测试拖拽状态转换 ====================

/**
 * 属性 1-3: 拖拽状态转换
 * 拖拽开始 -> 拖拽中 -> 拖拽结束
 */
function startDrag(state: any): any {
    return {
        ...state,
        isDragging: true,
        startPosition: state.currentPosition
    }
}

function endDrag(state: any): any {
    return {
        ...state,
        isDragging: false
    }
}

// 使用生成器测试
export function testDragStateTransition() {
    fc.assert(
        fc.property(arbDragState, (initialState) => {
            // 开始拖拽
            const draggingState = startDrag(initialState)
            // 验证：拖拽状态应该为true
            if (!draggingState.isDragging) return false

            // 结束拖拽
            const endedState = endDrag(draggingState)
            // 验证：拖拽状态应该为false
            return !endedState.isDragging
        }),
        { numRuns: 100 }
    )
}

// ==================== 示例 5: 测试窗口置顶状态切换 ====================

/**
 * 属性 13: 置顶状态切换
 * 对于任何窗口，连续两次置顶操作应该切换状态（true -> false -> true）
 */
function toggleAlwaysOnTop(state: any): any {
    return {
        ...state,
        isAlwaysOnTop: !state.isAlwaysOnTop
    }
}

// 使用生成器测试
export function testAlwaysOnTopToggle() {
    fc.assert(
        fc.property(arbWindowState, (initialState) => {
            const originalValue = initialState.isAlwaysOnTop

            // 第一次切换
            const state1 = toggleAlwaysOnTop(initialState)
            if (state1.isAlwaysOnTop === originalValue) return false

            // 第二次切换
            const state2 = toggleAlwaysOnTop(state1)
            // 验证：应该恢复到原始值
            return state2.isAlwaysOnTop === originalValue
        }),
        { numRuns: 100 }
    )
}

// ==================== 示例 6: 组合多个生成器 ====================

/**
 * 测试窗口拖拽到新位置后的边界检查
 */
export function testDragWithBoundaryCheck() {
    fc.assert(
        fc.property(
            arbWindowState,
            arbAnyPosition,
            (windowState, newPosition) => {
                // 模拟拖拽到新位置
                const updatedState = {
                    ...windowState,
                    position: checkLeftBoundary(newPosition)
                }

                // 验证：新位置应该在边界内
                const bounds = { x: 0, y: 0, width: 1920, height: 1080 }
                return isPositionInBounds(updatedState.position, bounds)
            }
        ),
        { numRuns: 100 }
    )
}

// ==================== 调试示例 ====================

/**
 * 打印生成器样本用于调试
 */
export function debugGenerators() {
    console.log('\n=== 窗口位置样本 ===')
    printSamples(arbPosition, 3)

    console.log('\n=== 窗口状态样本 ===')
    printSamples(arbWindowState, 3)

    console.log('\n=== 拖拽状态样本 ===')
    printSamples(arbDragState, 3)
}

// ==================== 运行示例 ====================

if (import.meta.vitest) {
    const { describe, it, expect } = import.meta.vitest

    describe('窗口生成器使用示例', () => {
        it('示例 1: 测试左边界限制', () => {
            expect(() => testLeftBoundary()).not.toThrow()
        })

        it('示例 2: 测试尺寸限制', () => {
            expect(() => testSizeLimit()).not.toThrow()
        })

        it('示例 3: 测试窗口ID唯一性', () => {
            expect(() => testWindowIdUniqueness()).not.toThrow()
        })

        it('示例 4: 测试拖拽状态转换', () => {
            expect(() => testDragStateTransition()).not.toThrow()
        })

        it('示例 5: 测试置顶状态切换', () => {
            expect(() => testAlwaysOnTopToggle()).not.toThrow()
        })

        it('示例 6: 测试拖拽边界检查', () => {
            expect(() => testDragWithBoundaryCheck()).not.toThrow()
        })
    })
}

// 如果直接运行此文件，打印调试信息
if (import.meta.url === `file://${process.argv[1]}`) {
    debugGenerators()
}
