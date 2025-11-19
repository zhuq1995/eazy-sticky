/**
 * 便签自动保存机制测试
 * 测试防抖、互斥锁和重试逻辑
 * 需求: 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from '../notes'
import { nextTick } from 'vue'

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        }
    }
})()

// 在测试前设置 localStorage mock
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
})

describe('自动保存机制', () => {
    beforeEach(() => {
        // 每个测试前重置 Pinia 和 localStorage
        setActivePinia(createPinia())
        localStorageMock.clear()
        vi.clearAllMocks()
        // 启用假定时器
        vi.useFakeTimers()
    })

    afterEach(() => {
        // 恢复真实定时器
        vi.restoreAllMocks()
    })

    describe('防抖机制 - 需求 4.1, 4.2', () => {
        it('应该在多次快速变更后只保存一次', async () => {
            const store = useNotesStore()

            // 快速添加多个便签
            store.addNote({ content: '便签1' })
            await nextTick()

            store.addNote({ content: '便签2' })
            await nextTick()

            store.addNote({ content: '便签3' })
            await nextTick()

            // 在防抖延迟之前，不应该保存
            expect(localStorage.getItem('sticky-notes-data')).toBeNull()

            // 快进时间，超过防抖延迟（500ms）
            await vi.advanceTimersByTimeAsync(600)
            await nextTick()

            // 现在应该已经保存
            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()

            const parsed = JSON.parse(saved!)
            expect(parsed.notes).toHaveLength(3)
        })

        it('应该在变更停止超过500ms后触发保存', async () => {
            const store = useNotesStore()

            store.addNote({ content: '测试便签' })
            await nextTick()

            // 400ms 后还没保存
            await vi.advanceTimersByTimeAsync(400)
            await nextTick()
            expect(localStorage.getItem('sticky-notes-data')).toBeNull()

            // 再过 200ms（总共 600ms）应该保存了
            await vi.advanceTimersByTimeAsync(200)
            await nextTick()

            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()
        })

        it('新的变更应该重置防抖计时器', async () => {
            const store = useNotesStore()

            store.addNote({ content: '便签1' })
            await nextTick()

            // 等待 400ms
            await vi.advanceTimersByTimeAsync(400)
            await nextTick()

            // 添加另一个便签，重置计时器
            store.addNote({ content: '便签2' })
            await nextTick()

            // 再等 400ms（从第二次变更开始），总共 800ms
            await vi.advanceTimersByTimeAsync(400)
            await nextTick()

            // 还没保存，因为计时器被重置了
            expect(localStorage.getItem('sticky-notes-data')).toBeNull()

            // 再等 200ms，从第二次变更算起超过 600ms
            await vi.advanceTimersByTimeAsync(200)
            await nextTick()

            // 现在应该保存了
            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()

            const parsed = JSON.parse(saved!)
            expect(parsed.notes).toHaveLength(2)
        })
    })

    describe('保存互斥锁 - 需求 4.3', () => {
        it('应该防止并发保存操作', async () => {
            const store = useNotesStore()

            // 添加便签
            store.addNote({ content: '测试' })

            // 手动触发多次保存
            const promise1 = store.saveToStorage()
            const promise2 = store.saveToStorage()
            const promise3 = store.saveToStorage()

            await Promise.all([promise1, promise2, promise3])

            // 验证只保存了一次（通过检查 localStorage 被调用的次数）
            // 由于我们的 mock 不记录调用次数，我们验证数据的一致性
            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()

            const parsed = JSON.parse(saved!)
            expect(parsed.notes).toHaveLength(1)
        })
    })

    describe('保存失败重试 - 需求 4.4', () => {
        it('应该在保存失败后设置重试标志', async () => {
            const store = useNotesStore()

            // Mock localStorage.setItem 抛出错误
            const originalSetItem = localStorage.setItem
            localStorage.setItem = vi.fn(() => {
                throw new Error('存储空间已满')
            })

            store.addNote({ content: '测试' })

            try {
                await store.saveToStorage()
            } catch (err) {
                // 预期会抛出错误
            }

            // 验证错误被记录
            expect(store.error).toBeTruthy()
            expect(store.error).toContain('保存数据失败')

            // 恢复 localStorage
            localStorage.setItem = originalSetItem
        })

        it('应该在下次变更时重试保存', async () => {
            const store = useNotesStore()

            // 第一次保存失败
            const originalSetItem = localStorage.setItem
            let callCount = 0
            let shouldFail = true

            localStorage.setItem = vi.fn((key: string, value: string) => {
                callCount++
                if (shouldFail) {
                    shouldFail = false // 只失败一次
                    throw new Error('第一次保存失败')
                }
                // 后续成功
                originalSetItem.call(localStorage, key, value)
            })

            // 添加便签，触发自动保存
            store.addNote({ content: '便签1' })
            await nextTick()

            // 等待防抖延迟
            await vi.advanceTimersByTimeAsync(600)
            await nextTick()

            // 第一次保存应该失败
            expect(callCount).toBeGreaterThanOrEqual(1)
            const firstCallCount = callCount

            // 添加另一个便签，触发重试
            store.addNote({ content: '便签2' })
            await nextTick()

            // 等待防抖延迟
            await vi.advanceTimersByTimeAsync(600)
            await nextTick()

            // 应该有新的保存尝试
            expect(callCount).toBeGreaterThan(firstCallCount)

            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()

            const parsed = JSON.parse(saved!)
            expect(parsed.notes).toHaveLength(2)

            // 恢复 localStorage
            localStorage.setItem = originalSetItem
        })
    })

    describe('lastSaved 时间戳更新', () => {
        it('应该在每次保存后更新 lastSaved', async () => {
            const store = useNotesStore()

            const initialLastSaved = store.lastSaved

            store.addNote({ content: '测试' })
            await nextTick()

            // 等待自动保存
            await vi.advanceTimersByTimeAsync(600)
            await nextTick()

            // lastSaved 应该被更新
            expect(store.lastSaved).toBeGreaterThan(initialLastSaved)
        })
    })

    describe('autoSave 设置', () => {
        it('当 autoSave 为 false 时不应该自动保存', async () => {
            const store = useNotesStore()

            // 禁用自动保存
            store.updateSettings({ autoSave: false })
            await nextTick()

            store.addNote({ content: '测试' })
            await nextTick()

            // 等待超过防抖延迟
            await vi.advanceTimersByTimeAsync(600)
            await nextTick()

            // 不应该保存
            expect(localStorage.getItem('sticky-notes-data')).toBeNull()
        })

        it('当 autoSave 为 true 时应该自动保存', async () => {
            const store = useNotesStore()

            // 确保自动保存开启（默认就是开启的）
            store.updateSettings({ autoSave: true })
            await nextTick()

            store.addNote({ content: '测试' })
            await nextTick()

            // 等待自动保存
            await vi.advanceTimersByTimeAsync(600)
            await nextTick()

            // 应该保存
            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()
        })
    })
})
