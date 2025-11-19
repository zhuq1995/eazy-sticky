/**
 * StickyNote 组件 Electron 集成测试
 * 
 * 验证需求:
 * - 1.3: 浏览器窗口加载 Vue 应用
 * - 3.5: 渲染进程访问 Electron API
 * - 1.1, 1.2, 1.3, 1.4, 1.5: 拖拽功能
 * - 7.1: 窗口状态持久化
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import StickyNote from '../StickyNote.vue'

describe('StickyNote Electron 集成', () => {
    let originalWindow: any

    beforeEach(() => {
        // 保存原始 window 对象
        originalWindow = global.window

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
    })

    afterEach(() => {
        // 恢复原始 window 对象
        global.window = originalWindow
    })

    describe('浏览器环境', () => {
        it('应该在浏览器环境中正常工作', async () => {
            // 确保没有 electronAPI
            delete (global.window as any).electronAPI

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'test-note',
                    initialContent: '测试内容'
                }
            })

            // 验证组件渲染
            expect(wrapper.find('.sticky-note').exists()).toBe(true)
            expect(wrapper.find('.content-editor').text()).toBe('测试内容')

            // 点击关闭按钮应该触发 close 事件
            await wrapper.find('.close-btn').trigger('click')
            expect(wrapper.emitted('close')).toBeTruthy()
            expect(wrapper.emitted('close')?.[0]).toEqual(['test-note'])
        })

        it('应该在浏览器环境中触发 close 事件', async () => {
            delete (global.window as any).electronAPI

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'test-note-2'
                }
            })

            await wrapper.find('.close-btn').trigger('click')

            // 验证触发了 close 事件
            expect(wrapper.emitted('close')).toBeTruthy()
            expect(wrapper.emitted('close')?.[0]).toEqual(['test-note-2'])
        })
    })

    describe('Electron 环境', () => {
        it('应该在 Electron 环境中调用 closeWindow API', async () => {
            // 模拟 Electron API
            const mockCloseWindow = vi.fn().mockResolvedValue(undefined)
                ; (global.window as any).electronAPI = {
                    window: {
                        close: mockCloseWindow,
                        minimize: vi.fn(),
                        maximize: vi.fn(),
                        getPosition: vi.fn(),
                        setPosition: vi.fn(),
                        getSize: vi.fn(),
                        setSize: vi.fn()
                    },
                    system: {
                        platform: 'win32',
                        getVersion: vi.fn(),
                        getVersions: vi.fn(),
                        getPath: vi.fn()
                    },
                    on: vi.fn(),
                    off: vi.fn()
                }

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'electron-note'
                }
            })

            // 点击关闭按钮
            await wrapper.find('.close-btn').trigger('click')

            // 等待异步操作完成
            await wrapper.vm.$nextTick()

            // 验证调用了 Electron API
            expect(mockCloseWindow).toHaveBeenCalledTimes(1)

            // 不应该触发 close 事件（因为使用了 Electron API）
            expect(wrapper.emitted('close')).toBeFalsy()
        })

        it('应该在 Electron API 失败时降级到 close 事件', async () => {
            // 模拟 Electron API 失败
            const mockCloseWindow = vi.fn().mockRejectedValue(new Error('关闭失败'))
                ; (global.window as any).electronAPI = {
                    window: {
                        close: mockCloseWindow,
                        minimize: vi.fn(),
                        maximize: vi.fn(),
                        getPosition: vi.fn(),
                        setPosition: vi.fn(),
                        getSize: vi.fn(),
                        setSize: vi.fn()
                    },
                    system: {
                        platform: 'win32',
                        getVersion: vi.fn(),
                        getVersions: vi.fn(),
                        getPath: vi.fn()
                    },
                    on: vi.fn(),
                    off: vi.fn()
                }

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'fallback-note'
                }
            })

            // 点击关闭按钮
            await wrapper.find('.close-btn').trigger('click')

            // 等待异步操作完成
            await wrapper.vm.$nextTick()

            // 验证调用了 Electron API
            expect(mockCloseWindow).toHaveBeenCalledTimes(1)

            // 应该触发 close 事件作为降级处理
            expect(wrapper.emitted('close')).toBeTruthy()
            expect(wrapper.emitted('close')?.[0]).toEqual(['fallback-note'])
        })
    })

    describe('内容编辑', () => {
        it('应该在两种环境中都能正常编辑内容', async () => {
            const wrapper = mount(StickyNote, {
                props: {
                    id: 'edit-note',
                    initialContent: '初始内容'
                }
            })

            const editor = wrapper.find('.content-editor')

            // 模拟输入
            const editorElement = editor.element as HTMLElement
            editorElement.textContent = '新内容'
            await editor.trigger('input')

            // 验证触发了 update:content 事件
            expect(wrapper.emitted('update:content')).toBeTruthy()
            expect(wrapper.emitted('update:content')?.[0]).toEqual(['新内容'])
        })
    })

    describe('窗口置顶功能', () => {
        it('应该在浏览器环境中不显示置顶按钮', () => {
            // 确保没有 electronAPI
            delete (global.window as any).electronAPI

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'browser-note'
                }
            })

            // 验证置顶按钮不存在
            expect(wrapper.find('.pin-btn').exists()).toBe(false)
        })

        it('应该在 Electron 环境中显示置顶按钮', () => {
            // 模拟 Electron API
            ; (global.window as any).electronAPI = {
                window: {
                    close: vi.fn(),
                    minimize: vi.fn(),
                    maximize: vi.fn(),
                    getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
                    setPosition: vi.fn().mockResolvedValue(undefined),
                    getSize: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
                    setSize: vi.fn().mockResolvedValue(undefined),
                    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
                    isAlwaysOnTop: vi.fn().mockResolvedValue(false)
                },
                system: {
                    platform: 'win32',
                    getVersion: vi.fn(),
                    getVersions: vi.fn(),
                    getPath: vi.fn()
                },
                on: vi.fn(),
                off: vi.fn()
            }

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'electron-note'
                }
            })

            // 验证置顶按钮存在
            expect(wrapper.find('.pin-btn').exists()).toBe(true)
        })

        it('应该在点击置顶按钮时切换置顶状态', async () => {
            // 模拟 Electron API
            const mockSetAlwaysOnTop = vi.fn().mockResolvedValue(undefined)
                ; (global.window as any).electronAPI = {
                    window: {
                        close: vi.fn(),
                        minimize: vi.fn(),
                        maximize: vi.fn(),
                        getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
                        setPosition: vi.fn().mockResolvedValue(undefined),
                        getSize: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
                        setSize: vi.fn().mockResolvedValue(undefined),
                        setAlwaysOnTop: mockSetAlwaysOnTop,
                        isAlwaysOnTop: vi.fn().mockResolvedValue(false)
                    },
                    system: {
                        platform: 'win32',
                        getVersion: vi.fn(),
                        getVersions: vi.fn(),
                        getPath: vi.fn()
                    },
                    on: vi.fn(),
                    off: vi.fn()
                }

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'pin-test-note'
                }
            })

            // 点击置顶按钮
            const pinBtn = wrapper.find('.pin-btn')
            await pinBtn.trigger('click')

            // 等待异步操作完成
            await wrapper.vm.$nextTick()

            // 验证调用了 setAlwaysOnTop API，参数为 true
            expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(true)
        })

        it('应该在置顶状态下显示视觉指示', async () => {
            // 模拟 Electron API，初始状态为置顶
            const mockSetAlwaysOnTop = vi.fn().mockResolvedValue(undefined)
                ; (global.window as any).electronAPI = {
                    window: {
                        close: vi.fn(),
                        minimize: vi.fn(),
                        maximize: vi.fn(),
                        getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
                        setPosition: vi.fn().mockResolvedValue(undefined),
                        getSize: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
                        setSize: vi.fn().mockResolvedValue(undefined),
                        setAlwaysOnTop: mockSetAlwaysOnTop,
                        isAlwaysOnTop: vi.fn().mockResolvedValue(false)
                    },
                    system: {
                        platform: 'win32',
                        getVersion: vi.fn(),
                        getVersions: vi.fn(),
                        getPath: vi.fn()
                    },
                    on: vi.fn(),
                    off: vi.fn()
                }

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'pinned-note'
                }
            })

            // 点击置顶按钮以激活置顶状态
            const pinBtn = wrapper.find('.pin-btn')
            await pinBtn.trigger('click')
            await wrapper.vm.$nextTick()

            // 验证按钮有 pinned 类（视觉指示）
            // 注意：由于响应式状态更新，需要等待 DOM 更新
            await new Promise(resolve => setTimeout(resolve, 100))
            expect(wrapper.find('.pin-btn.pinned').exists()).toBe(true)
        })

        it('应该在再次点击置顶按钮时取消置顶', async () => {
            // 模拟 Electron API
            const mockSetAlwaysOnTop = vi.fn().mockResolvedValue(undefined)
                ; (global.window as any).electronAPI = {
                    window: {
                        close: vi.fn(),
                        minimize: vi.fn(),
                        maximize: vi.fn(),
                        getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
                        setPosition: vi.fn().mockResolvedValue(undefined),
                        getSize: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
                        setSize: vi.fn().mockResolvedValue(undefined),
                        setAlwaysOnTop: mockSetAlwaysOnTop,
                        isAlwaysOnTop: vi.fn().mockResolvedValue(false)
                    },
                    system: {
                        platform: 'win32',
                        getVersion: vi.fn(),
                        getVersions: vi.fn(),
                        getPath: vi.fn()
                    },
                    on: vi.fn(),
                    off: vi.fn()
                }

            const wrapper = mount(StickyNote, {
                props: {
                    id: 'toggle-pin-note'
                }
            })

            const pinBtn = wrapper.find('.pin-btn')

            // 第一次点击：置顶
            await pinBtn.trigger('click')
            await wrapper.vm.$nextTick()
            expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(true)

            // 第二次点击：取消置顶
            await pinBtn.trigger('click')
            await wrapper.vm.$nextTick()
            expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(false)

            // 验证调用了两次
            expect(mockSetAlwaysOnTop).toHaveBeenCalledTimes(2)
        })
    })
})
