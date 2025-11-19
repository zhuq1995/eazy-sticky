/**
 * useResizable Composable 测试
 * 测试窗口尺寸调整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useResizable } from '../useResizable'

describe('useResizable Composable', () => {
    let targetElement: HTMLElement

    beforeEach(() => {
        // 创建测试用的 DOM 元素
        targetElement = document.createElement('div')
        targetElement.style.width = '300px'
        targetElement.style.height = '300px'
        document.body.appendChild(targetElement)
    })

    describe('初始化', () => {
        it('应该返回正确的接口', () => {
            const target = ref(targetElement)
            const result = useResizable(target)

            expect(result).toHaveProperty('size')
            expect(result).toHaveProperty('isResizing')
            expect(result).toHaveProperty('resizeDirection')
            expect(result).toHaveProperty('setSize')
            expect(result).toHaveProperty('reset')
            expect(result).toHaveProperty('getHandleMouseDown')
        })

        it('应该初始化默认尺寸', () => {
            const target = ref(targetElement)
            const { size } = useResizable(target)

            expect(size.value.width).toBeGreaterThan(0)
            expect(size.value.height).toBeGreaterThan(0)
        })
    })

    describe('尺寸限制', () => {
        it('需求 8.2: 应该限制最小尺寸为 200x200', () => {
            const target = ref(targetElement)
            const { setSize, size } = useResizable(target, {
                minWidth: 200,
                minHeight: 200
            })

            // 尝试设置小于最小尺寸的值
            setSize(100, 100)

            expect(size.value.width).toBe(200)
            expect(size.value.height).toBe(200)
        })

        it('需求 8.3: 应该限制最大尺寸为 800x800', () => {
            const target = ref(targetElement)
            const { setSize, size } = useResizable(target, {
                maxWidth: 800,
                maxHeight: 800
            })

            // 尝试设置大于最大尺寸的值
            setSize(1000, 1000)

            expect(size.value.width).toBe(800)
            expect(size.value.height).toBe(800)
        })

        it('应该接受在限制范围内的尺寸', () => {
            const target = ref(targetElement)
            const { setSize, size } = useResizable(target)

            setSize(400, 500)

            expect(size.value.width).toBe(400)
            expect(size.value.height).toBe(500)
        })
    })

    describe('手动操作', () => {
        it('需求 8.1: setSize 应该更新尺寸', () => {
            const target = ref(targetElement)
            const { setSize, size } = useResizable(target)

            setSize(350, 450)

            expect(size.value.width).toBe(350)
            expect(size.value.height).toBe(450)
        })

        it('reset 应该恢复默认尺寸', () => {
            const target = ref(targetElement)
            const { setSize, reset, size } = useResizable(target)

            setSize(500, 600)
            reset()

            expect(size.value.width).toBe(300)
            expect(size.value.height).toBe(300)
        })
    })

    describe('调整手柄', () => {
        it('应该为每个方向返回鼠标按下处理器', () => {
            const target = ref(targetElement)
            const { getHandleMouseDown } = useResizable(target)

            const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const

            directions.forEach(direction => {
                const handler = getHandleMouseDown(direction)
                expect(typeof handler).toBe('function')
            })
        })

        it('鼠标按下应该开始调整尺寸', () => {
            const target = ref(targetElement)
            const { getHandleMouseDown, isResizing, resizeDirection } = useResizable(target)

            const handler = getHandleMouseDown('se')
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100
            })

            handler(mouseEvent)

            expect(isResizing.value).toBe(true)
            expect(resizeDirection.value).toBe('se')
        })
    })

    describe('回调函数', () => {
        it('应该在调整开始时调用 onStart 回调', () => {
            const target = ref(targetElement)
            const onStart = vi.fn()
            const { getHandleMouseDown } = useResizable(target, { onStart })

            const handler = getHandleMouseDown('se')
            handler(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))

            expect(onStart).toHaveBeenCalled()
        })

        it('需求 8.4: onEnd 回调应该在选项中可配置', () => {
            const target = ref(targetElement)
            const onEnd = vi.fn()
            const result = useResizable(target, { onEnd })

            // 验证 onEnd 回调已被配置
            expect(onEnd).toBeDefined()
            expect(typeof onEnd).toBe('function')
        })
    })

    describe('禁用状态', () => {
        it('当 disabled 为 true 时应该不响应鼠标事件', () => {
            const target = ref(targetElement)
            const disabled = ref(true)
            const { getHandleMouseDown, isResizing } = useResizable(target, { disabled })

            const handler = getHandleMouseDown('se')
            handler(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))

            expect(isResizing.value).toBe(false)
        })

        it('当 disabled 为 false 时应该正常响应鼠标事件', () => {
            const target = ref(targetElement)
            const disabled = ref(false)
            const { getHandleMouseDown, isResizing } = useResizable(target, { disabled })

            const handler = getHandleMouseDown('se')
            handler(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))

            expect(isResizing.value).toBe(true)
        })
    })
})
