/**
 * 窗口状态管理测试
 * 测试 notes store 的窗口状态保存和加载功能
 * 
 * 需求: 7.1, 7.2, 7.3, 7.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from '../notes'

describe('窗口状态管理', () => {
    beforeEach(() => {
        // 创建新的 Pinia 实例
        setActivePinia(createPinia())

        // 清除 localStorage
        localStorage.clear()

        // Mock window.screen
        Object.defineProperty(window, 'screen', {
            writable: true,
            configurable: true,
            value: {
                width: 1920,
                height: 1080
            }
        })
    })

    describe('saveWindowState', () => {
        it('应该保存窗口状态', async () => {
            const store = useNotesStore()

            const windowState = {
                position: { x: 100, y: 200 },
                size: { width: 400, height: 500 },
                isAlwaysOnTop: true,
                isMinimized: false,
                isFocused: true
            }

            await store.saveWindowState('window-1', windowState)

            // 验证状态已保存到内存
            expect(store.windowStates['window-1']).toBeDefined()
            expect(store.windowStates['window-1'].position).toEqual({ x: 100, y: 200 })
            expect(store.windowStates['window-1'].size).toEqual({ width: 400, height: 500 })
            expect(store.windowStates['window-1'].isAlwaysOnTop).toBe(true)
        })

        it('应该为新窗口创建完整的状态对象', async () => {
            const store = useNotesStore()

            await store.saveWindowState('window-1', {
                position: { x: 100, y: 200 }
            })

            const state = store.windowStates['window-1']
            expect(state).toBeDefined()
            expect(state.windowId).toBe('window-1')
            expect(state.position).toEqual({ x: 100, y: 200 })
            expect(state.size).toBeDefined()
            expect(state.createdAt).toBeDefined()
            expect(state.updatedAt).toBeDefined()
        })

        it('应该更新现有窗口的状态', async () => {
            const store = useNotesStore()

            // 首次保存
            await store.saveWindowState('window-1', {
                position: { x: 100, y: 200 },
                size: { width: 300, height: 300 }
            })

            const firstState = store.windowStates['window-1']
            const firstUpdatedAt = firstState.updatedAt

            // 等待一小段时间确保时间戳不同
            await new Promise(resolve => setTimeout(resolve, 10))

            // 更新状态
            await store.saveWindowState('window-1', {
                position: { x: 150, y: 250 }
            })

            const updatedState = store.windowStates['window-1']
            expect(updatedState.position).toEqual({ x: 150, y: 250 })
            expect(updatedState.size).toEqual({ width: 300, height: 300 }) // 尺寸保持不变
            expect(updatedState.updatedAt).toBeGreaterThan(firstUpdatedAt)
            expect(updatedState.createdAt).toBe(firstState.createdAt) // 创建时间不变
        })

        it('应该拒绝无效的窗口ID', async () => {
            const store = useNotesStore()

            await expect(
                store.saveWindowState('', { position: { x: 0, y: 0 } })
            ).rejects.toThrow('无效的窗口ID')
        })

        it('应该支持多个窗口的独立状态', async () => {
            const store = useNotesStore()

            // 保存多个窗口状态
            await store.saveWindowState('window-1', {
                position: { x: 100, y: 100 },
                noteId: 'note-1'
            })

            await store.saveWindowState('window-2', {
                position: { x: 200, y: 200 },
                noteId: 'note-2'
            })

            await store.saveWindowState('window-3', {
                position: { x: 300, y: 300 },
                noteId: 'note-3'
            })

            // 验证所有窗口状态都已保存
            expect(Object.keys(store.windowStates)).toHaveLength(3)
            expect(store.windowStates['window-1'].position).toEqual({ x: 100, y: 100 })
            expect(store.windowStates['window-2'].position).toEqual({ x: 200, y: 200 })
            expect(store.windowStates['window-3'].position).toEqual({ x: 300, y: 300 })
        })
    })

    describe('loadWindowState', () => {
        it('应该加载已保存的窗口状态', async () => {
            const store = useNotesStore()

            // 先保存状态
            const originalState = {
                position: { x: 100, y: 200 },
                size: { width: 400, height: 500 },
                isAlwaysOnTop: true,
                isMinimized: false,
                isFocused: true
            }

            await store.saveWindowState('window-1', originalState)

            // 加载状态
            const loadedState = await store.loadWindowState('window-1')

            expect(loadedState).toBeDefined()
            expect(loadedState?.position).toEqual({ x: 100, y: 200 })
            expect(loadedState?.size).toEqual({ width: 400, height: 500 })
            expect(loadedState?.isAlwaysOnTop).toBe(true)
        })

        it('应该在窗口不存在时返回 null', async () => {
            const store = useNotesStore()

            const loadedState = await store.loadWindowState('non-existent-window')

            expect(loadedState).toBeNull()
        })

        it('应该调整超出屏幕范围的位置', async () => {
            const store = useNotesStore()

            // 保存超出屏幕范围的位置
            await store.saveWindowState('window-1', {
                position: { x: 2000, y: 1500 }, // 超出 1920x1080 屏幕
                size: { width: 300, height: 300 }
            })

            // 加载状态
            const loadedState = await store.loadWindowState('window-1')

            expect(loadedState).toBeDefined()
            // 位置应该被调整到屏幕范围内
            expect(loadedState!.position.x).toBeLessThanOrEqual(1920 - 50) // 保留 50px 可见区域
            expect(loadedState!.position.y).toBeLessThanOrEqual(1080 - 50)
        })

        it('应该调整负数位置到屏幕内', async () => {
            const store = useNotesStore()

            // 保存负数位置
            await store.saveWindowState('window-1', {
                position: { x: -100, y: -200 },
                size: { width: 300, height: 300 }
            })

            // 加载状态
            const loadedState = await store.loadWindowState('window-1')

            expect(loadedState).toBeDefined()
            // 位置应该被调整为非负数
            expect(loadedState!.position.x).toBeGreaterThanOrEqual(0)
            expect(loadedState!.position.y).toBeGreaterThanOrEqual(0)
        })

        it('应该拒绝无效的窗口ID', async () => {
            const store = useNotesStore()

            const result = await store.loadWindowState('')

            expect(result).toBeNull()
        })
    })

    describe('deleteWindowState', () => {
        it('应该删除窗口状态', async () => {
            const store = useNotesStore()

            // 先保存状态
            await store.saveWindowState('window-1', {
                position: { x: 100, y: 200 }
            })

            expect(store.windowStates['window-1']).toBeDefined()

            // 删除状态
            await store.deleteWindowState('window-1')

            expect(store.windowStates['window-1']).toBeUndefined()
        })

        it('应该在窗口不存在时不抛出错误', async () => {
            const store = useNotesStore()

            // 删除不存在的窗口状态不应该抛出错误
            await expect(
                store.deleteWindowState('non-existent-window')
            ).resolves.not.toThrow()
        })

        it('应该拒绝无效的窗口ID', async () => {
            const store = useNotesStore()

            await expect(
                store.deleteWindowState('')
            ).rejects.toThrow('无效的窗口ID')
        })
    })

    describe('getAllWindowStates', () => {
        it('应该返回所有窗口状态', async () => {
            const store = useNotesStore()

            // 保存多个窗口状态
            await store.saveWindowState('window-1', { position: { x: 100, y: 100 } })
            await store.saveWindowState('window-2', { position: { x: 200, y: 200 } })
            await store.saveWindowState('window-3', { position: { x: 300, y: 300 } })

            const allStates = store.getAllWindowStates()

            expect(Object.keys(allStates)).toHaveLength(3)
            expect(allStates['window-1']).toBeDefined()
            expect(allStates['window-2']).toBeDefined()
            expect(allStates['window-3']).toBeDefined()
        })

        it('应该返回空对象当没有窗口状态时', () => {
            const store = useNotesStore()

            const allStates = store.getAllWindowStates()

            expect(allStates).toEqual({})
        })
    })

    describe('clearAllWindowStates', () => {
        it('应该清除所有窗口状态', async () => {
            const store = useNotesStore()

            // 保存多个窗口状态
            await store.saveWindowState('window-1', { position: { x: 100, y: 100 } })
            await store.saveWindowState('window-2', { position: { x: 200, y: 200 } })

            expect(Object.keys(store.windowStates)).toHaveLength(2)

            // 清除所有状态
            await store.clearAllWindowStates()

            expect(Object.keys(store.windowStates)).toHaveLength(0)
        })
    })

    describe('持久化集成', () => {
        it('应该在保存便签数据时同时保存窗口状态', async () => {
            const store = useNotesStore()

            // 添加便签
            store.addNote({ content: '测试便签' })

            // 保存窗口状态
            await store.saveWindowState('window-1', {
                position: { x: 100, y: 200 }
            })

            // 手动保存到存储
            await store.saveToStorage()

            // 从 localStorage 读取数据
            const savedData = JSON.parse(localStorage.getItem('sticky-notes-data') || '{}')

            expect(savedData.windowStates).toBeDefined()
            expect(savedData.windowStates['window-1']).toBeDefined()
            expect(savedData.windowStates['window-1'].position).toEqual({ x: 100, y: 200 })
        })

        it('应该在加载便签数据时同时加载窗口状态', async () => {
            // 准备测试数据
            const testData = {
                version: 1,
                timestamp: Date.now(),
                notes: [],
                settings: {
                    theme: 'auto',
                    defaultNoteSize: { width: 300, height: 300 },
                    defaultNotePosition: { x: 100, y: 100 },
                    autoSave: true,
                    saveInterval: 500
                },
                windowStates: {
                    'window-1': {
                        windowId: 'window-1',
                        position: { x: 100, y: 200 },
                        size: { width: 400, height: 500 },
                        isAlwaysOnTop: false,
                        isMinimized: false,
                        isFocused: true,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }
                }
            }

            localStorage.setItem('sticky-notes-data', JSON.stringify(testData))

            const store = useNotesStore()
            await store.loadFromStorage()

            expect(store.windowStates['window-1']).toBeDefined()
            expect(store.windowStates['window-1'].position).toEqual({ x: 100, y: 200 })
        })

        it('应该在没有窗口状态数据时使用空对象', async () => {
            // 准备没有 windowStates 的旧数据
            const testData = {
                version: 1,
                timestamp: Date.now(),
                notes: [],
                settings: {
                    theme: 'auto',
                    defaultNoteSize: { width: 300, height: 300 },
                    defaultNotePosition: { x: 100, y: 100 },
                    autoSave: true,
                    saveInterval: 500
                }
            }

            localStorage.setItem('sticky-notes-data', JSON.stringify(testData))

            const store = useNotesStore()
            await store.loadFromStorage()

            expect(store.windowStates).toEqual({})
        })
    })
})
