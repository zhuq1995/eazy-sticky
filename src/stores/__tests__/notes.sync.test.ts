/**
 * 窗口间数据同步功能测试
 * 需求: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from '../notes'

// Mock Electron API
const mockBroadcast = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()

const mockElectronAPI = {
    multiWindow: {
        broadcast: mockBroadcast,
        create: vi.fn(),
        close: vi.fn(),
        focus: vi.fn(),
        getAllWindows: vi.fn()
    },
    window: {
        close: vi.fn(),
        minimize: vi.fn(),
        maximize: vi.fn(),
        getPosition: vi.fn(),
        setPosition: vi.fn(),
        getSize: vi.fn(),
        setSize: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        isAlwaysOnTop: vi.fn(),
        focus: vi.fn()
    },
    system: {
        platform: 'test',
        getVersion: vi.fn(),
        getVersions: vi.fn(),
        getPath: vi.fn()
    },
    on: mockOn,
    off: mockOff
}

describe('窗口间数据同步', () => {
    beforeEach(() => {
        // 重置 Pinia
        setActivePinia(createPinia())

        // 重置所有 mock
        vi.clearAllMocks()

            // 设置 Electron API mock
            ; (global as any).window = {
                electronAPI: mockElectronAPI
            }
    })

    describe('启用和禁用同步', () => {
        it('应该能够启用窗口间同步', () => {
            const store = useNotesStore()

            expect(store.syncEnabled).toBe(false)

            store.enableSync()

            expect(store.syncEnabled).toBe(true)
            expect(mockOn).toHaveBeenCalledWith(
                'broadcast:data-change',
                expect.any(Function)
            )
        })

        it('应该能够禁用窗口间同步', () => {
            const store = useNotesStore()

            store.enableSync()
            expect(store.syncEnabled).toBe(true)

            store.disableSync()

            expect(store.syncEnabled).toBe(false)
            expect(mockOff).toHaveBeenCalledWith(
                'broadcast:data-change',
                expect.any(Function)
            )
        })

        it('重复启用同步应该只订阅一次', () => {
            const store = useNotesStore()

            store.enableSync()
            store.enableSync()

            // 只应该调用一次
            expect(mockOn).toHaveBeenCalledTimes(1)
        })
    })

    describe('数据变更广播', () => {
        it('添加便签时应该广播变更 - 需求 9.1', async () => {
            const store = useNotesStore()
            store.enableSync()

            const note = store.addNote({ content: '测试便签' })

            expect(mockBroadcast).toHaveBeenCalledWith('data-change', {
                type: 'add',
                note: expect.objectContaining({
                    id: note.id,
                    content: '测试便签'
                })
            })
        })

        it('更新便签时应该广播变更 - 需求 9.1', async () => {
            const store = useNotesStore()
            store.enableSync()

            const note = store.addNote({ content: '原始内容' })
            mockBroadcast.mockClear()

            store.updateNote(note.id, { content: '更新内容' })

            expect(mockBroadcast).toHaveBeenCalledWith('data-change', {
                type: 'update',
                note: expect.objectContaining({
                    id: note.id,
                    content: '更新内容'
                })
            })
        })

        it('删除便签时应该广播变更 - 需求 9.1', async () => {
            const store = useNotesStore()
            store.enableSync()

            const note = store.addNote({ content: '待删除' })
            mockBroadcast.mockClear()

            store.deleteNote(note.id)

            expect(mockBroadcast).toHaveBeenCalledWith('data-change', {
                type: 'delete',
                noteId: note.id
            })
        })

        it('同步未启用时不应该广播 - 需求 9.1', async () => {
            const store = useNotesStore()
            // 不启用同步

            store.addNote({ content: '测试' })

            expect(mockBroadcast).not.toHaveBeenCalled()
        })
    })

    describe('接收数据更新', () => {
        it('应该处理添加便签的通知 - 需求 9.2', async () => {
            const store = useNotesStore()

            const newNote = {
                id: 'test-note-1',
                content: '来自其他窗口的便签',
                position: { x: 100, y: 100 },
                size: { width: 300, height: 300 },
                style: {
                    backgroundColor: '#fef68a',
                    fontSize: 14,
                    fontFamily: 'Arial'
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isPinned: false
            }

            await store.handleDataUpdate({
                type: 'add',
                note: newNote
            })

            expect(store.notes).toHaveLength(1)
            expect(store.notes[0].id).toBe('test-note-1')
            expect(store.notes[0].content).toBe('来自其他窗口的便签')
        })

        it('应该处理更新便签的通知 - 需求 9.2', async () => {
            const store = useNotesStore()

            // 先添加一个便签
            const note = store.addNote({ content: '原始内容' })

            // 模拟接收更新通知
            const updatedNote = {
                ...note,
                content: '更新后的内容',
                updatedAt: Date.now()
            }

            await store.handleDataUpdate({
                type: 'update',
                note: updatedNote
            })

            expect(store.notes[0].content).toBe('更新后的内容')
        })

        it('应该处理删除便签的通知 - 需求 9.2', async () => {
            const store = useNotesStore()

            // 先添加一个便签
            const note = store.addNote({ content: '待删除' })
            expect(store.notes).toHaveLength(1)

            // 模拟接收删除通知
            await store.handleDataUpdate({
                type: 'delete',
                noteId: note.id
            })

            expect(store.notes).toHaveLength(0)
        })

        it('应该处理完全同步的通知 - 需求 9.2', async () => {
            const store = useNotesStore()

            // 添加一些本地便签
            store.addNote({ content: '本地便签1' })
            store.addNote({ content: '本地便签2' })

            // 模拟接收完全同步通知
            const syncedNotes = [
                {
                    id: 'synced-1',
                    content: '同步便签1',
                    position: { x: 0, y: 0 },
                    size: { width: 300, height: 300 },
                    style: {
                        backgroundColor: '#fef68a',
                        fontSize: 14,
                        fontFamily: 'Arial'
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isPinned: false
                },
                {
                    id: 'synced-2',
                    content: '同步便签2',
                    position: { x: 0, y: 0 },
                    size: { width: 300, height: 300 },
                    style: {
                        backgroundColor: '#fef68a',
                        fontSize: 14,
                        fontFamily: 'Arial'
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isPinned: false
                }
            ]

            await store.handleDataUpdate({
                type: 'sync',
                notes: syncedNotes
            })

            expect(store.notes).toHaveLength(2)
            expect(store.notes[0].id).toBe('synced-1')
            expect(store.notes[1].id).toBe('synced-2')
        })

        it('不应该重复添加已存在的便签 - 需求 9.2', async () => {
            const store = useNotesStore()

            const note = store.addNote({ content: '测试便签' })

            // 尝试再次添加相同的便签
            await store.handleDataUpdate({
                type: 'add',
                note: note
            })

            // 应该只有一个便签
            expect(store.notes).toHaveLength(1)
        })
    })

    describe('错误处理', () => {
        it('广播失败时应该记录错误但不抛出 - 需求 9.5', async () => {
            const store = useNotesStore()
            store.enableSync()

            // 模拟广播失败
            mockBroadcast.mockRejectedValueOnce(new Error('网络错误'))

            // 不应该抛出错误
            expect(() => {
                store.addNote({ content: '测试' })
            }).not.toThrow()

            // 等待异步操作完成
            await new Promise(resolve => setTimeout(resolve, 0))

            // 应该记录错误
            expect(store.syncError).toContain('数据广播失败')
        })

        it('处理无效数据时应该优雅处理 - 需求 9.5', async () => {
            const store = useNotesStore()

            // 添加一个便签作为初始状态
            const note = store.addNote({ content: '测试便签' })
            const initialCount = store.notes.length

            // 传入无效数据（note 为 null）
            await store.handleDataUpdate({
                type: 'update',
                note: null as any
            })

            // 应该保持当前状态不变
            expect(store.notes.length).toBe(initialCount)
            // 不应该有错误（因为只是跳过了处理）
            expect(store.syncError).toBeNull()
        })

        it('同步失败后窗口状态应该保持不变 - 需求 9.5', async () => {
            const store = useNotesStore()

            // 添加一个便签
            const note = store.addNote({ content: '原始便签' })
            const originalNotes = [...store.notes]

            // 模拟处理更新失败
            await store.handleDataUpdate({
                type: 'update',
                note: null as any
            })

            // 便签列表应该保持不变
            expect(store.notes).toEqual(originalNotes)
        })
    })

    describe('事件订阅生命周期', () => {
        it('启用同步时应该订阅事件 - 需求 9.3', () => {
            const store = useNotesStore()

            store.enableSync()

            expect(mockOn).toHaveBeenCalledWith(
                'broadcast:data-change',
                expect.any(Function)
            )
        })

        it('禁用同步时应该取消订阅事件 - 需求 9.4', () => {
            const store = useNotesStore()

            store.enableSync()
            store.disableSync()

            expect(mockOff).toHaveBeenCalledWith(
                'broadcast:data-change',
                expect.any(Function)
            )
        })

        it('应该能够订阅自定义事件', () => {
            const store = useNotesStore()
            const handler = vi.fn()

            store.subscribeToDataChanges('custom-event', handler)

            expect(mockOn).toHaveBeenCalledWith(
                'broadcast:custom-event',
                expect.any(Function)
            )
        })

        it('应该能够取消订阅自定义事件', () => {
            const store = useNotesStore()
            const handler = vi.fn()

            store.subscribeToDataChanges('custom-event', handler)
            store.unsubscribeFromDataChanges('custom-event')

            expect(mockOff).toHaveBeenCalledWith(
                'broadcast:custom-event',
                expect.any(Function)
            )
        })
    })
})
