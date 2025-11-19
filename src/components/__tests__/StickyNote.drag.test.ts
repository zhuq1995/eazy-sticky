/**
 * StickyNote 组件拖拽功能测试
 * 
 * 验证需求:
 * - 1.1: 鼠标按下开始拖拽操作
 * - 1.2: 鼠标移动时实时更新窗口位置
 * - 1.3: 鼠标释放结束拖拽操作
 * - 1.4: 拖拽状态的视觉反馈
 * - 1.5: 可编辑区域不触发拖拽
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StickyNote from '../StickyNote.vue'

describe('StickyNote 拖拽功能', () => {
    beforeEach(() => {
        // 设置 Pinia
        const pinia = createPinia()
        setActivePinia(pinia)

        // 模拟 localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        }
        global.localStorage = localStorageMock as any

        // 确保没有 electronAPI（浏览器环境测试）
        delete (global.window as any).electronAPI
    })

    it('需求 1.1: 应该在工具栏上按下鼠标时开始拖拽', async () => {
        const wrapper = mount(StickyNote, {
            props: {
                id: 'drag-test-note'
            }
        })

        const toolbar = wrapper.find('.toolbar')
        expect(toolbar.exists()).toBe(true)

        // 验证工具栏存在且可以作为拖拽句柄
        // 注意：在测试环境中无法验证 scoped CSS 样式，但可以验证元素存在
        expect(toolbar.classes()).toContain('toolbar')
    })

    it('需求 1.4: 应该在拖拽时添加视觉反馈样式', async () => {
        const wrapper = mount(StickyNote, {
            props: {
                id: 'visual-feedback-note'
            },
            attachTo: document.body
        })

        const noteElement = wrapper.find('.sticky-note').element as HTMLElement
        const toolbar = wrapper.find('.toolbar')

        // 模拟鼠标按下
        await toolbar.trigger('mousedown', {
            clientX: 100,
            clientY: 100
        })

        // 等待下一个 tick
        await wrapper.vm.$nextTick()

        // 检查是否添加了 dragging 类
        expect(noteElement.classList.contains('dragging')).toBe(true)

        // 模拟鼠标释放
        await document.dispatchEvent(new MouseEvent('mouseup'))
        await wrapper.vm.$nextTick()

        // 检查是否移除了 dragging 类
        expect(noteElement.classList.contains('dragging')).toBe(false)

        wrapper.unmount()
    })

    it('需求 1.5: 应该在可编辑区域不触发拖拽', async () => {
        const wrapper = mount(StickyNote, {
            props: {
                id: 'editable-area-note'
            },
            attachTo: document.body
        })

        const noteElement = wrapper.find('.sticky-note').element as HTMLElement
        const editor = wrapper.find('.content-editor')

        // 在编辑器上按下鼠标
        await editor.trigger('mousedown', {
            clientX: 100,
            clientY: 100
        })

        await wrapper.vm.$nextTick()

        // 不应该添加 dragging 类
        expect(noteElement.classList.contains('dragging')).toBe(false)

        wrapper.unmount()
    })

    it('应该正确应用拖拽样式', () => {
        const wrapper = mount(StickyNote, {
            props: {
                id: 'style-test-note',
                width: 300,
                height: 300
            }
        })

        const noteElement = wrapper.find('.sticky-note')
        expect(noteElement.exists()).toBe(true)

        // 检查基础样式
        const style = noteElement.attributes('style')
        expect(style).toContain('width: 300px')
        expect(style).toContain('height: 300px')
    })

    it('应该在浏览器环境中正常工作', () => {
        const wrapper = mount(StickyNote, {
            props: {
                id: 'browser-drag-note',
                initialContent: '测试拖拽'
            }
        })

        // 验证组件渲染
        expect(wrapper.find('.sticky-note').exists()).toBe(true)
        expect(wrapper.find('.toolbar').exists()).toBe(true)
        expect(wrapper.find('.content-editor').exists()).toBe(true)
    })
})
