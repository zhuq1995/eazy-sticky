/**
 * App.vue 集成测试
 * 验证 App 组件与 Pinia store 的集成
 * 验证需求: 1.3, 1.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '../stores/notes'

describe('App.vue 与 Store 集成', () => {
    beforeEach(() => {
        // 创建新的 Pinia 实例
        const pinia = createPinia()
        setActivePinia(pinia)

        // 清空 localStorage
        localStorage.clear()

        // 模拟 console 方法以避免测试输出污染
        vi.spyOn(console, 'log').mockImplementation(() => { })
        vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    describe('Store 集成 - 需求 1.3, 1.4', () => {
        it('应该正确导入和使用 useNotesStore', () => {
            const store = useNotesStore()
            expect(store).toBeDefined()
            expect(store.notes).toBeDefined()
            expect(store.addNote).toBeDefined()
            expect(store.deleteNote).toBeDefined()
            expect(store.updateNote).toBeDefined()
        })

        it('应该访问响应式状态数据', () => {
            const store = useNotesStore()

            // 初始状态
            expect(store.totalNotes).toBe(0)
            expect(store.pinnedCount).toBe(0)

            // 添加便签后状态应该更新
            store.addNote({ content: '测试便签' })
            expect(store.totalNotes).toBe(1)
        })

        it('应该使用 store actions 替代本地方法', () => {
            const store = useNotesStore()

            // 测试 addNote action
            const note = store.addNote({ content: '新便签' })
            expect(store.notes.length).toBe(1)
            expect(store.notes[0].content).toBe('新便签')

            // 测试 updateNote action
            store.updateNote(note.id, { content: '更新后的内容' })
            expect(store.notes[0].content).toBe('更新后的内容')

            // 测试 deleteNote action
            store.deleteNote(note.id)
            expect(store.notes.length).toBe(0)
        })

        it('应该正确显示加载状态', async () => {
            const store = useNotesStore()

            // 模拟加载过程
            store.isLoading = true
            expect(store.isLoading).toBe(true)

            await store.loadFromStorage()
            expect(store.isLoading).toBe(false)
        })

        it('应该正确显示错误状态', () => {
            const store = useNotesStore()

            // 设置错误
            store.error = '加载失败'
            expect(store.error).toBe('加载失败')

            // 清除错误
            store.error = null
            expect(store.error).toBeNull()
        })

        it('应该使用 sortedNotes getter 获取排序后的便签', () => {
            const store = useNotesStore()

            // 添加多个便签
            store.addNote({ content: '普通便签 1', isPinned: false })
            store.addNote({ content: '置顶便签', isPinned: true })
            store.addNote({ content: '普通便签 2', isPinned: false })

            const sorted = store.sortedNotes
            expect(sorted.length).toBe(3)
            // 置顶便签应该在前面
            expect(sorted[0].isPinned).toBe(true)
            expect(sorted[0].content).toBe('置顶便签')
        })

        it('应该显示统计信息（totalNotes, pinnedCount）', () => {
            const store = useNotesStore()

            // 添加便签
            store.addNote({ content: '普通便签 1', isPinned: false })
            store.addNote({ content: '置顶便签 1', isPinned: true })
            store.addNote({ content: '普通便签 2', isPinned: false })
            store.addNote({ content: '置顶便签 2', isPinned: true })

            expect(store.totalNotes).toBe(4)
            expect(store.pinnedCount).toBe(2)
        })

        it('应该显示 lastSaved 时间戳', async () => {
            const store = useNotesStore()

            const beforeSave = store.lastSaved

            // 添加便签并保存
            store.addNote({ content: '测试' })
            await store.saveToStorage()

            expect(store.lastSaved).toBeGreaterThan(beforeSave)
            expect(store.lastSaved).toBeGreaterThan(0)
        })
    })
})
