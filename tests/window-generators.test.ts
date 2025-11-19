/**
 * 窗口生成器测试
 * 验证所有生成器能够正常工作并生成有效数据
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
    // 基础生成器
    arbWindowX,
    arbWindowY,
    arbAnyX,
    arbAnyY,
    arbWindowWidth,
    arbWindowHeight,
    arbWindowId,
    arbNoteId,

    // 位置和尺寸生成器
    arbPosition,
    arbAnyPosition,
    arbSize,
    arbAnySize,
    arbWindowBounds,
    arbScreenBounds,

    // 拖拽相关生成器
    arbDragBoundary,
    arbDragConstraints,
    arbDragState,
    arbDraggingState,
    arbNotDraggingState,

    // 窗口状态生成器
    arbWindowState,
    arbAlwaysOnTopWindowState,
    arbNotAlwaysOnTopWindowState,
    arbFocusedWindowState,
    arbMinimizedWindowState,

    // 窗口信息生成器
    arbWindowInfo,
    arbWindowInfoList,
    arbNonEmptyWindowList,

    // 窗口创建选项生成器
    arbWindowCreateOptions,
    arbFullWindowCreateOptions,
    arbMinimalWindowCreateOptions,

    // 多窗口配置生成器
    arbMultiWindowConfig,
    arbDefaultMultiWindowConfig,

    // 边界情况生成器
    arbBoundaryPosition,
    arbOutOfBoundsPosition,
    arbMinSize,
    arbMaxSize,
    arbBelowMinSize,
    arbAboveMaxSize,

    // 辅助函数
    generateSamples,
    isPositionInBounds,
    isSizeInRange,
    calculateDistance,
    areWindowIdsUnique
} from './window-generators'

describe('窗口生成器 - 基础生成器', () => {
    it('应该生成有效的窗口X坐标', () => {
        fc.assert(
            fc.property(arbWindowX, (x) => {
                expect(x).toBeGreaterThanOrEqual(0)
                expect(x).toBeLessThanOrEqual(3840)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的窗口Y坐标', () => {
        fc.assert(
            fc.property(arbWindowY, (y) => {
                expect(y).toBeGreaterThanOrEqual(0)
                expect(y).toBeLessThanOrEqual(2160)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的窗口宽度', () => {
        fc.assert(
            fc.property(arbWindowWidth, (width) => {
                expect(width).toBeGreaterThanOrEqual(200)
                expect(width).toBeLessThanOrEqual(800)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的窗口高度', () => {
        fc.assert(
            fc.property(arbWindowHeight, (height) => {
                expect(height).toBeGreaterThanOrEqual(200)
                expect(height).toBeLessThanOrEqual(800)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的窗口ID', () => {
        fc.assert(
            fc.property(arbWindowId, (id) => {
                expect(typeof id).toBe('string')
                expect(id.length).toBeGreaterThan(0)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的便签ID', () => {
        fc.assert(
            fc.property(arbNoteId, (id) => {
                expect(typeof id).toBe('string')
                expect(id.length).toBeGreaterThan(0)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 位置和尺寸生成器', () => {
    it('应该生成有效的位置对象', () => {
        fc.assert(
            fc.property(arbPosition, (position) => {
                expect(position).toHaveProperty('x')
                expect(position).toHaveProperty('y')
                expect(typeof position.x).toBe('number')
                expect(typeof position.y).toBe('number')
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的尺寸对象', () => {
        fc.assert(
            fc.property(arbSize, (size) => {
                expect(size).toHaveProperty('width')
                expect(size).toHaveProperty('height')
                expect(size.width).toBeGreaterThanOrEqual(200)
                expect(size.width).toBeLessThanOrEqual(800)
                expect(size.height).toBeGreaterThanOrEqual(200)
                expect(size.height).toBeLessThanOrEqual(800)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的窗口边界', () => {
        fc.assert(
            fc.property(arbWindowBounds, (bounds) => {
                expect(bounds).toHaveProperty('x')
                expect(bounds).toHaveProperty('y')
                expect(bounds).toHaveProperty('width')
                expect(bounds).toHaveProperty('height')
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的屏幕边界', () => {
        fc.assert(
            fc.property(arbScreenBounds, (bounds) => {
                expect(bounds.x).toBe(0)
                expect(bounds.y).toBe(0)
                expect(bounds.width).toBeGreaterThanOrEqual(1024)
                expect(bounds.height).toBeGreaterThanOrEqual(768)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 拖拽相关生成器', () => {
    it('应该生成有效的拖拽边界', () => {
        fc.assert(
            fc.property(arbDragBoundary, (boundary) => {
                expect(boundary).toHaveProperty('left')
                expect(boundary).toHaveProperty('top')
                expect(boundary).toHaveProperty('right')
                expect(boundary).toHaveProperty('bottom')
                expect(boundary.right).toBeGreaterThan(boundary.left)
                expect(boundary.bottom).toBeGreaterThan(boundary.top)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的拖拽约束', () => {
        fc.assert(
            fc.property(arbDragConstraints, (constraints) => {
                expect(constraints).toHaveProperty('minX')
                expect(constraints).toHaveProperty('minY')
                expect(constraints).toHaveProperty('maxX')
                expect(constraints).toHaveProperty('maxY')
                expect(constraints).toHaveProperty('minVisibleArea')
                expect(constraints.maxX).toBeGreaterThan(constraints.minX)
                expect(constraints.maxY).toBeGreaterThan(constraints.minY)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成有效的拖拽状态', () => {
        fc.assert(
            fc.property(arbDragState, (state) => {
                expect(state).toHaveProperty('isDragging')
                expect(state).toHaveProperty('startPosition')
                expect(state).toHaveProperty('currentPosition')
                expect(state).toHaveProperty('offset')
                expect(state).toHaveProperty('timestamp')
                expect(typeof state.isDragging).toBe('boolean')
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成正在拖拽的状态', () => {
        fc.assert(
            fc.property(arbDraggingState, (state) => {
                expect(state.isDragging).toBe(true)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成未拖拽的状态', () => {
        fc.assert(
            fc.property(arbNotDraggingState, (state) => {
                expect(state.isDragging).toBe(false)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 窗口状态生成器', () => {
    it('应该生成有效的窗口状态', () => {
        fc.assert(
            fc.property(arbWindowState, (state) => {
                expect(state).toHaveProperty('position')
                expect(state).toHaveProperty('size')
                expect(state).toHaveProperty('isAlwaysOnTop')
                expect(state).toHaveProperty('isMinimized')
                expect(state).toHaveProperty('isFocused')
                expect(typeof state.isAlwaysOnTop).toBe('boolean')
                expect(typeof state.isMinimized).toBe('boolean')
                expect(typeof state.isFocused).toBe('boolean')
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成置顶的窗口状态', () => {
        fc.assert(
            fc.property(arbAlwaysOnTopWindowState, (state) => {
                expect(state.isAlwaysOnTop).toBe(true)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成非置顶的窗口状态', () => {
        fc.assert(
            fc.property(arbNotAlwaysOnTopWindowState, (state) => {
                expect(state.isAlwaysOnTop).toBe(false)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成聚焦的窗口状态', () => {
        fc.assert(
            fc.property(arbFocusedWindowState, (state) => {
                expect(state.isFocused).toBe(true)
                expect(state.isMinimized).toBe(false)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成最小化的窗口状态', () => {
        fc.assert(
            fc.property(arbMinimizedWindowState, (state) => {
                expect(state.isMinimized).toBe(true)
                expect(state.isFocused).toBe(false)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 窗口信息生成器', () => {
    it('应该生成有效的窗口信息', () => {
        fc.assert(
            fc.property(arbWindowInfo, (info) => {
                expect(info).toHaveProperty('id')
                expect(info).toHaveProperty('noteId')
                expect(info).toHaveProperty('position')
                expect(info).toHaveProperty('size')
                expect(info).toHaveProperty('isAlwaysOnTop')
                expect(info).toHaveProperty('createdAt')
                expect(typeof info.id).toBe('string')
                expect(typeof info.noteId).toBe('string')
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成窗口信息列表', () => {
        fc.assert(
            fc.property(arbWindowInfoList(0, 10), (list) => {
                expect(Array.isArray(list)).toBe(true)
                expect(list.length).toBeLessThanOrEqual(10)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成非空窗口列表', () => {
        fc.assert(
            fc.property(arbNonEmptyWindowList, (list) => {
                expect(list.length).toBeGreaterThan(0)
                expect(list.length).toBeLessThanOrEqual(20)
            }),
            { numRuns: 100 }
        )
    })

    it('窗口列表中的ID应该唯一', () => {
        fc.assert(
            fc.property(arbWindowInfoList(5, 10), (list) => {
                expect(areWindowIdsUnique(list)).toBe(true)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 窗口创建选项生成器', () => {
    it('应该生成窗口创建选项', () => {
        fc.assert(
            fc.property(arbWindowCreateOptions, (options) => {
                expect(options).toBeDefined()
                // 所有字段都是可选的
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成完整的窗口创建选项', () => {
        fc.assert(
            fc.property(arbFullWindowCreateOptions, (options) => {
                expect(options.windowId).toBeDefined()
                expect(options.noteId).toBeDefined()
                expect(options.position).toBeDefined()
                expect(options.size).toBeDefined()
                expect(typeof options.alwaysOnTop).toBe('boolean')
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成最小窗口创建选项', () => {
        fc.assert(
            fc.property(arbMinimalWindowCreateOptions, (options) => {
                expect(options.windowId).toBeUndefined()
                expect(options.noteId).toBeUndefined()
                expect(options.position).toBeUndefined()
                expect(options.size).toBeUndefined()
                expect(options.alwaysOnTop).toBeUndefined()
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 多窗口配置生成器', () => {
    it('应该生成多窗口配置', () => {
        fc.assert(
            fc.property(arbMultiWindowConfig, (config) => {
                expect(config).toHaveProperty('maxWindows')
                expect(config).toHaveProperty('defaultSize')
                expect(config).toHaveProperty('defaultPosition')
                expect(config).toHaveProperty('positionOffset')
                expect(config).toHaveProperty('minDistance')
                expect(config.maxWindows).toBeGreaterThan(0)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成默认的多窗口配置', () => {
        fc.assert(
            fc.property(arbDefaultMultiWindowConfig, (config) => {
                expect(config.maxWindows).toBe(20)
                expect(config.defaultSize).toEqual({ width: 300, height: 300 })
                expect(config.defaultPosition).toEqual({ x: 100, y: 100 })
                expect(config.positionOffset).toEqual({ x: 30, y: 30 })
                expect(config.minDistance).toBe(20)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 边界情况生成器', () => {
    it('应该生成边界位置', () => {
        fc.assert(
            fc.property(arbBoundaryPosition, (position) => {
                // 边界位置应该在屏幕边缘或角落
                const isOnEdge =
                    position.x === 0 ||
                    position.x === 1920 ||
                    position.y === 0 ||
                    position.y === 1080
                expect(isOnEdge).toBe(true)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成超出边界的位置', () => {
        fc.assert(
            fc.property(arbOutOfBoundsPosition, (position) => {
                // 至少有一个坐标超出标准屏幕范围
                const isOutOfBounds =
                    position.x < 0 ||
                    position.x > 1920 ||
                    position.y < 0 ||
                    position.y > 1080
                expect(isOutOfBounds).toBe(true)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成最小尺寸', () => {
        fc.assert(
            fc.property(arbMinSize, (size) => {
                expect(size.width).toBe(200)
                expect(size.height).toBe(200)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成最大尺寸', () => {
        fc.assert(
            fc.property(arbMaxSize, (size) => {
                expect(size.width).toBe(800)
                expect(size.height).toBe(800)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成小于最小尺寸的尺寸', () => {
        fc.assert(
            fc.property(arbBelowMinSize, (size) => {
                expect(size.width).toBeLessThan(200)
                expect(size.height).toBeLessThan(200)
            }),
            { numRuns: 100 }
        )
    })

    it('应该生成大于最大尺寸的尺寸', () => {
        fc.assert(
            fc.property(arbAboveMaxSize, (size) => {
                expect(size.width).toBeGreaterThan(800)
                expect(size.height).toBeGreaterThan(800)
            }),
            { numRuns: 100 }
        )
    })
})

describe('窗口生成器 - 辅助函数', () => {
    it('generateSamples 应该生成指定数量的样本', () => {
        const samples = generateSamples(arbWindowId, 5)
        expect(samples).toHaveLength(5)
    })

    it('isPositionInBounds 应该正确判断位置是否在边界内', () => {
        const bounds = { x: 0, y: 0, width: 1920, height: 1080 }

        expect(isPositionInBounds({ x: 100, y: 100 }, bounds)).toBe(true)
        expect(isPositionInBounds({ x: -10, y: 100 }, bounds)).toBe(false)
        expect(isPositionInBounds({ x: 1900, y: 100 }, bounds)).toBe(false)
    })

    it('isSizeInRange 应该正确判断尺寸是否在范围内', () => {
        expect(isSizeInRange({ width: 300, height: 300 })).toBe(true)
        expect(isSizeInRange({ width: 100, height: 300 })).toBe(false)
        expect(isSizeInRange({ width: 900, height: 300 })).toBe(false)
    })

    it('calculateDistance 应该正确计算两点之间的距离', () => {
        const distance = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })
        expect(distance).toBe(5)
    })

    it('areWindowIdsUnique 应该正确判断窗口ID是否唯一', () => {
        const uniqueWindows = [
            { id: 'w1', noteId: 'n1', position: { x: 0, y: 0 }, size: { width: 300, height: 300 }, isAlwaysOnTop: false, createdAt: 1000 },
            { id: 'w2', noteId: 'n2', position: { x: 0, y: 0 }, size: { width: 300, height: 300 }, isAlwaysOnTop: false, createdAt: 1000 }
        ]

        const duplicateWindows = [
            { id: 'w1', noteId: 'n1', position: { x: 0, y: 0 }, size: { width: 300, height: 300 }, isAlwaysOnTop: false, createdAt: 1000 },
            { id: 'w1', noteId: 'n2', position: { x: 0, y: 0 }, size: { width: 300, height: 300 }, isAlwaysOnTop: false, createdAt: 1000 }
        ]

        expect(areWindowIdsUnique(uniqueWindows)).toBe(true)
        expect(areWindowIdsUnique(duplicateWindows)).toBe(false)
    })
})
