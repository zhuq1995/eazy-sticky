/**
 * useMultiWindow Composable 测试
 * 验证多窗口管理功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMultiWindow } from '../useMultiWindow'

describe('useMultiWindow Composable', () => {
    beforeEach(() => {
        // 清理全局状态
        vi.clearAllMocks()
    })

    describe('环境检测', () => {
        it('在非 Electron 环境中应该安全返回', () => {
            // 确保不在 Electron 环境
            delete (window as any).electronAPI

            const { windows, canCreateWindow, maxWindows } = useMultiWindow()

            expect(windows.value).toEqual([])
            expect(canCreateWindow.value).toBe(true)
            expect(maxWindows).toBe(20)
        })
    })

    describe('窗口数量限制', () => {
        it('应该正确计算是否可以创建新窗口', () => {
            const { windows, canCreateWindow, maxWindows } = useMultiWindow()

            // 初始状态应该可以创建
            expect(canCreateWindow.value).toBe(true)

            // 模拟添加窗口到上限
            for (let i = 0; i < maxWindows; i++) {
                windows.value.push({
                    id: `window-${i}`,
                    noteId: `note-${i}`,
                    position: { x: 100, y: 100 },
                    size: { width: 300, height: 300 },
                    isAlwaysOnTop: false,
                    createdAt: Date.now()
                })
            }

            // 达到上限后不应该可以创建
            expect(canCreateWindow.value).toBe(false)
        })
    })

    describe('窗口信息管理', () => {
        it('应该能够获取窗口信息', () => {
            const { windows, getWindowInfo } = useMultiWindow()

            const testWindow = {
                id: 'test-window',
                noteId: 'test-note',
                position: { x: 100, y: 100 },
                size: { width: 300, height: 300 },
                isAlwaysOnTop: false,
                createdAt: Date.now()
            }

            windows.value.push(testWindow)

            const info = getWindowInfo('test-window')
            expect(info).toEqual(testWindow)
        })

        it('获取不存在的窗口应该返回 undefined', () => {
            const { getWindowInfo } = useMultiWindow()

            const info = getWindowInfo('non-existent')
            expect(info).toBeUndefined()
        })

        it('应该能够更新窗口信息', () => {
            const { windows, updateWindowInfo, getWindowInfo } = useMultiWindow()

            const testWindow = {
                id: 'test-window',
                noteId: 'test-note',
                position: { x: 100, y: 100 },
                size: { width: 300, height: 300 },
                isAlwaysOnTop: false,
                createdAt: Date.now()
            }

            windows.value.push(testWindow)

            // 更新窗口信息
            updateWindowInfo('test-window', {
                position: { x: 200, y: 200 },
                isAlwaysOnTop: true
            })

            const updatedInfo = getWindowInfo('test-window')
            expect(updatedInfo?.position).toEqual({ x: 200, y: 200 })
            expect(updatedInfo?.isAlwaysOnTop).toBe(true)
        })
    })

    describe('Electron 环境操作', () => {
        beforeEach(() => {
            // 模拟 Electron 环境
            ; (window as any).electronAPI = {
                multiWindow: {
                    create: vi.fn().mockResolvedValue('new-window-id'),
                    close: vi.fn().mockResolvedValue(undefined),
                    focus: vi.fn().mockResolvedValue(undefined),
                    broadcast: vi.fn().mockResolvedValue(undefined)
                },
                on: vi.fn(),
                off: vi.fn()
            }
        })

        it('创建窗口应该调用 Electron API', async () => {
            const { createWindow, windows } = useMultiWindow()

            const windowId = await createWindow('test-note', { x: 100, y: 100 })

            expect(windowId).toBeTruthy()
            expect(window.electronAPI.multiWindow.create).toHaveBeenCalled()
            expect(windows.value.length).toBe(1)
        })

        it('创建窗口时应该生成唯一ID', async () => {
            const { createWindow } = useMultiWindow()

            const id1 = await createWindow()
            const id2 = await createWindow()

            expect(id1).not.toBe(id2)
        })

        it('达到窗口上限时应该抛出错误', async () => {
            const { createWindow, windows, maxWindows } = useMultiWindow()

            // 填充到上限
            for (let i = 0; i < maxWindows; i++) {
                windows.value.push({
                    id: `window-${i}`,
                    noteId: `note-${i}`,
                    position: { x: 100, y: 100 },
                    size: { width: 300, height: 300 },
                    isAlwaysOnTop: false,
                    createdAt: Date.now()
                })
            }

            await expect(createWindow()).rejects.toThrow('已达到窗口数量上限')
        })

        it('关闭窗口应该调用 Electron API 并从列表移除', async () => {
            const { createWindow, closeWindow, windows } = useMultiWindow()

            const windowId = await createWindow()
            expect(windows.value.length).toBe(1)

            await closeWindow(windowId)

            expect(window.electronAPI.multiWindow.close).toHaveBeenCalledWith(windowId)
            expect(windows.value.length).toBe(0)
        })

        it('聚焦窗口应该调用 Electron API', async () => {
            const { createWindow, focusWindow } = useMultiWindow()

            const windowId = await createWindow()
            await focusWindow(windowId)

            expect(window.electronAPI.multiWindow.focus).toHaveBeenCalledWith(windowId)
        })

        it('广播消息应该调用 Electron API', () => {
            const { broadcast } = useMultiWindow()

            broadcast('test-event', { data: 'test' })

            expect(window.electronAPI.multiWindow.broadcast).toHaveBeenCalledWith(
                'test-event',
                { data: 'test' }
            )
        })

        it('监听广播应该注册事件监听器', () => {
            const { onBroadcast } = useMultiWindow()

            const handler = vi.fn()
            onBroadcast('test-event', handler)

            expect(window.electronAPI.on).toHaveBeenCalledWith(
                'broadcast:test-event',
                handler
            )
        })
    })

    describe('位置计算', () => {
        beforeEach(() => {
            // 模拟 Electron 环境
            ; (window as any).electronAPI = {
                multiWindow: {
                    create: vi.fn().mockResolvedValue('new-window-id'),
                    close: vi.fn().mockResolvedValue(undefined),
                    focus: vi.fn().mockResolvedValue(undefined),
                    broadcast: vi.fn().mockResolvedValue(undefined)
                },
                on: vi.fn(),
                off: vi.fn()
            }
        })

        it('第一个窗口应该使用默认位置', async () => {
            const { createWindow, windows } = useMultiWindow()

            await createWindow()

            expect(windows.value[0].position).toEqual({ x: 100, y: 100 })
        })

        it('后续窗口应该有位置偏移', async () => {
            const { createWindow, windows } = useMultiWindow()

            await createWindow()
            await createWindow()

            // 第二个窗口应该有偏移
            expect(windows.value[1].position.x).toBeGreaterThan(windows.value[0].position.x)
            expect(windows.value[1].position.y).toBeGreaterThan(windows.value[0].position.y)
        })

        it('可以指定自定义位置', async () => {
            const { createWindow, windows } = useMultiWindow()

            const customPosition = { x: 500, y: 500 }
            await createWindow('test-note', customPosition)

            expect(windows.value[0].position).toEqual(customPosition)
        })
    })
})
