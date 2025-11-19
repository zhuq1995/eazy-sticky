/**
 * useElectron Composable 测试
 * 验证需求: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useElectron } from '../useElectron'

describe('useElectron Composable', () => {
    // 模拟 Electron API
    const mockElectronAPI = {
        window: {
            close: vi.fn().mockResolvedValue(undefined),
            minimize: vi.fn().mockResolvedValue(undefined),
            maximize: vi.fn().mockResolvedValue(undefined),
            getPosition: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
            setPosition: vi.fn().mockResolvedValue(undefined),
            getSize: vi.fn().mockResolvedValue({ width: 300, height: 300 }),
            setSize: vi.fn().mockResolvedValue(undefined)
        },
        system: {
            platform: 'win32',
            getVersion: vi.fn().mockResolvedValue('1.0.0'),
            getVersions: vi.fn().mockResolvedValue({ node: '18.0.0', chrome: '110.0.0' }),
            getPath: vi.fn().mockResolvedValue('/path/to/app')
        },
        on: vi.fn(),
        off: vi.fn()
    }

    beforeEach(() => {
        // 清除所有 mock 调用记录
        vi.clearAllMocks()
    })

    afterEach(() => {
        // 清理 window 对象
        if ((global as any).window) {
            delete (global as any).window
        }
    })

    describe('环境检测', () => {
        it('在 Electron 环境中应该返回 true - 需求 3.5', () => {
            // 模拟 Electron 环境
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { isElectron } = useElectron()

            expect(isElectron.value).toBe(true)
        })

        it('在非 Electron 环境中应该返回 false', () => {
            // 确保没有 electronAPI
            ; (global as any).window = {}

            const { isElectron } = useElectron()

            expect(isElectron.value).toBe(false)
        })
    })

    describe('平台信息 - 需求 8.1', () => {
        it('应该获取平台信息', () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { platform } = useElectron()

            expect(platform.value).toBe('win32')
        })

        it('在非 Electron 环境中应该返回空字符串', () => {
            ; (global as any).window = {}

            const { platform } = useElectron()

            expect(platform.value).toBe('')
        })
    })

    describe('窗口操作', () => {
        it('应该能够关闭窗口 - 需求 6.1', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { closeWindow } = useElectron()

            await closeWindow()

            expect(mockElectronAPI.window.close).toHaveBeenCalledTimes(1)
        })

        it('应该能够最小化窗口 - 需求 6.2', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { minimizeWindow } = useElectron()

            await minimizeWindow()

            expect(mockElectronAPI.window.minimize).toHaveBeenCalledTimes(1)
        })

        it('应该能够最大化窗口', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { maximizeWindow } = useElectron()

            await maximizeWindow()

            expect(mockElectronAPI.window.maximize).toHaveBeenCalledTimes(1)
        })

        it('在非 Electron 环境中调用窗口操作应该安全返回', async () => {
            ; (global as any).window = {}

            const { closeWindow, minimizeWindow, maximizeWindow } = useElectron()

            // 这些调用不应该抛出错误
            await expect(closeWindow()).resolves.toBeUndefined()
            await expect(minimizeWindow()).resolves.toBeUndefined()
            await expect(maximizeWindow()).resolves.toBeUndefined()
        })
    })

    describe('窗口位置 - 需求 6.3, 6.4', () => {
        it('应该能够刷新窗口位置', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { refreshWindowState, windowPosition } = useElectron()

            await refreshWindowState()

            expect(mockElectronAPI.window.getPosition).toHaveBeenCalled()
            expect(windowPosition.value).toEqual({ x: 100, y: 200 })
        })

        it('应该能够更新窗口位置', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { updateWindowPosition, windowPosition } = useElectron()

            await updateWindowPosition(150, 250)

            expect(mockElectronAPI.window.setPosition).toHaveBeenCalledWith(150, 250)
            expect(windowPosition.value).toEqual({ x: 150, y: 250 })
        })
    })

    describe('窗口尺寸 - 需求 6.5', () => {
        it('应该能够刷新窗口尺寸', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { refreshWindowState, windowSize } = useElectron()

            await refreshWindowState()

            expect(mockElectronAPI.window.getSize).toHaveBeenCalled()
            expect(windowSize.value).toEqual({ width: 300, height: 300 })
        })

        it('应该能够更新窗口尺寸', async () => {
            ; (global as any).window = { electronAPI: mockElectronAPI }

            const { updateWindowSize, windowSize } = useElectron()

            await updateWindowSize(400, 500)

            expect(mockElectronAPI.window.setSize).toHaveBeenCalledWith(400, 500)
            expect(windowSize.value).toEqual({ width: 400, height: 500 })
        })
    })

    describe('错误处理', () => {
        it('窗口操作失败时应该抛出错误', async () => {
            const errorAPI = {
                ...mockElectronAPI,
                window: {
                    ...mockElectronAPI.window,
                    close: vi.fn().mockRejectedValue(new Error('关闭失败'))
                }
            }

                ; (global as any).window = { electronAPI: errorAPI }

            const { closeWindow } = useElectron()

            await expect(closeWindow()).rejects.toThrow('关闭失败')
        })

        it('刷新状态失败时应该抛出错误', async () => {
            const errorAPI = {
                ...mockElectronAPI,
                window: {
                    ...mockElectronAPI.window,
                    getPosition: vi.fn().mockRejectedValue(new Error('获取位置失败'))
                }
            }

                ; (global as any).window = { electronAPI: errorAPI }

            const { refreshWindowState } = useElectron()

            await expect(refreshWindowState()).rejects.toThrow('获取位置失败')
        })

        it('在非 Electron 环境中刷新状态应该安全返回', async () => {
            ; (global as any).window = {}

            const { refreshWindowState } = useElectron()

            await expect(refreshWindowState()).resolves.toBeUndefined()
        })
    })
})
