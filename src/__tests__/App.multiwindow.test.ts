/**
 * App.vue 多窗口功能集成测试
 * 验证 App.vue 中的多窗口创建和管理功能
 * 需求: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'

describe('App.vue 多窗口功能', () => {
    let originalAlert: any

    beforeEach(() => {
        // 创建新的 Pinia 实例
        setActivePinia(createPinia())

        // 清理 localStorage
        localStorage.clear()

        // 保存并模拟 alert
        originalAlert = window.alert
        window.alert = vi.fn()

            // 模拟 Electron API
            ; (window as any).electronAPI = {
                window: {
                    close: vi.fn().mockResolvedValue(undefined),
                    minimize: vi.fn().mockResolvedValue(undefined),
                    maximize: vi.fn().mockResolvedValue(undefined),
                    getPosition: vi.fn().mockResolvedValue({ x: 100, y: 100 }),
                    setPosition: vi.fn().mockResolvedValue(undefined),
                    getSize: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
                    setSize: vi.fn().mockResolvedValue(undefined),
                    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
                    isAlwaysOnTop: vi.fn().mockResolvedValue(false),
                    focus: vi.fn().mockResolvedValue(undefined)
                },
                multiWindow: {
                    create: vi.fn().mockResolvedValue('test-window-id'),
                    close: vi.fn().mockResolvedValue(undefined),
                    focus: vi.fn().mockResolvedValue(undefined),
                    broadcast: vi.fn().mockResolvedValue(undefined),
                    getAllWindows: vi.fn().mockResolvedValue([])
                },
                system: {
                    platform: 'win32',
                    getVersion: vi.fn().mockResolvedValue('1.0.0'),
                    getVersions: vi.fn().mockResolvedValue({}),
                    getPath: vi.fn().mockResolvedValue('/path')
                },
                on: vi.fn(),
                off: vi.fn()
            }
    })

    afterEach(() => {
        // 恢复原始 alert
        if (originalAlert) {
            window.alert = originalAlert
        }
    })

    describe('多窗口按钮显示', () => {
        it('需求 4.1: 在 Electron 环境中应该显示创建窗口按钮', async () => {
            const wrapper = mount(App)

            // 等待组件挂载和数据加载
            await flushPromises()
            await wrapper.vm.$nextTick()

            // 查找创建窗口按钮
            const createWindowBtn = wrapper.find('.create-window-btn')
            expect(createWindowBtn.exists()).toBe(true)
        })

        it('在非 Electron 环境中不应该显示创建窗口按钮', async () => {
            // 移除 Electron API
            delete (window as any).electronAPI

            const wrapper = mount(App)
            await flushPromises()
            await wrapper.vm.$nextTick()

            const createWindowBtn = wrapper.find('.create-window-btn')
            expect(createWindowBtn.exists()).toBe(false)
        })
    })

    describe('窗口创建功能', () => {
        it('需求 4.1, 4.2: 点击按钮应该创建新窗口', async () => {
            const wrapper = mount(App)
            await flushPromises()
            await wrapper.vm.$nextTick()

            const createWindowBtn = wrapper.find('.create-window-btn')
            expect(createWindowBtn.exists()).toBe(true)

            // 点击创建窗口按钮
            await createWindowBtn.trigger('click')
            await flushPromises()

            // 验证调用了 Electron API
            expect(window.electronAPI.multiWindow.create).toHaveBeenCalled()
        })
    })

    describe('窗口列表显示', () => {
        it('需求 4.4: 没有窗口时不应该显示窗口列表', async () => {
            const wrapper = mount(App)
            await flushPromises()
            await wrapper.vm.$nextTick()

            // 初始状态下，窗口列表不应该显示
            const windowList = wrapper.find('.window-list')
            expect(windowList.exists()).toBe(false)
        })

        it('应该显示窗口数量限制信息', async () => {
            const wrapper = mount(App)
            await flushPromises()
            await wrapper.vm.$nextTick()

            // 查找创建窗口按钮
            const createWindowBtn = wrapper.find('.create-window-btn')
            expect(createWindowBtn.exists()).toBe(true)

            // 验证按钮有 title 属性显示窗口数量信息
            const title = createWindowBtn.attributes('title')
            expect(title).toBeDefined()
            expect(title).toContain('窗口')
        })
    })

    describe('错误处理', () => {
        it('创建窗口失败时应该显示错误提示', async () => {
            // 模拟创建窗口失败
            window.electronAPI.multiWindow.create = vi.fn().mockRejectedValue(
                new Error('创建窗口失败')
            )

            const wrapper = mount(App)
            await flushPromises()
            await wrapper.vm.$nextTick()

            const createWindowBtn = wrapper.find('.create-window-btn')
            await createWindowBtn.trigger('click')

            // 等待异步操作完成
            await flushPromises()

            // 验证显示了错误提示
            expect(window.alert).toHaveBeenCalled()
            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('创建窗口失败')
            )
        })
    })
})
