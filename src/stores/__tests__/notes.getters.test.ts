/**
 * Store Getters 测试
 * 验证需求: 6.3, 8.1, 8.2, 8.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from '../notes'
import type { Note } from '../../types'

describe('Store Getters', () => {
    beforeEach(() => {
        // 为每个测试创建新的 Pinia 实例
        setActivePinia(createPinia())
    })

    describe('sortedNotes - 需求 6.3', () => {
        it('应该将置顶便签排在前面', () => {
            const store = useNotesStore()

            // 创建测试数据：混合置顶和非置顶便签
            const note1 = store.addNote({ content: '普通便签1', isPinned: false })
            const note2 = store.addNote({ content: '置顶便签1', isPinned: true })
            const note3 = store.addNote({ content: '普通便签2', isPinned: false })
            const note4 = store.addNote({ content: '置顶便签2', isPinned: true })

            const sorted = store.sortedNotes

            // 验证：前两个应该是置顶便签
            expect(sorted[0].isPinned).toBe(true)
            expect(sorted[1].isPinned).toBe(true)
            // 后两个应该是非置顶便签
            expect(sorted[2].isPinned).toBe(false)
            expect(sorted[3].isPinned).toBe(false)
        })

        it('相同置顶状态下应该按更新时间降序排列', () => {
            const store = useNotesStore()

            // 创建三个非置顶便签
            const note1 = store.addNote({ content: '便签1', isPinned: false })
            const note2 = store.addNote({ content: '便签2', isPinned: false })
            const note3 = store.addNote({ content: '便签3', isPinned: false })

            // 手动更新时间戳以确保有明确的顺序
            store.updateNote(note1.id, { content: '便签1' })
            const time1 = store.getNoteById(note1.id)!.updatedAt

            store.updateNote(note2.id, { content: '便签2' })
            const time2 = store.getNoteById(note2.id)!.updatedAt

            store.updateNote(note3.id, { content: '便签3' })
            const time3 = store.getNoteById(note3.id)!.updatedAt

            const sorted = store.sortedNotes

            // 验证：最新更新的应该在前面
            expect(sorted[0].updatedAt).toBeGreaterThanOrEqual(sorted[1].updatedAt)
            expect(sorted[1].updatedAt).toBeGreaterThanOrEqual(sorted[2].updatedAt)

            // 验证时间戳确实不同
            expect(time3).toBeGreaterThanOrEqual(time2)
            expect(time2).toBeGreaterThanOrEqual(time1)
        })

        it('空列表应该返回空数组', () => {
            const store = useNotesStore()
            expect(store.sortedNotes).toEqual([])
        })
    })

    describe('totalNotes - 需求 8.1', () => {
        it('应该返回便签总数', () => {
            const store = useNotesStore()

            expect(store.totalNotes).toBe(0)

            store.addNote({ content: '便签1' })
            expect(store.totalNotes).toBe(1)

            store.addNote({ content: '便签2' })
            expect(store.totalNotes).toBe(2)

            store.addNote({ content: '便签3' })
            expect(store.totalNotes).toBe(3)
        })

        it('删除便签后应该减少总数', () => {
            const store = useNotesStore()

            const note1 = store.addNote({ content: '便签1' })
            const note2 = store.addNote({ content: '便签2' })

            expect(store.totalNotes).toBe(2)

            store.deleteNote(note1.id)
            expect(store.totalNotes).toBe(1)

            store.deleteNote(note2.id)
            expect(store.totalNotes).toBe(0)
        })
    })

    describe('pinnedCount - 需求 8.2', () => {
        it('应该返回置顶便签数量', () => {
            const store = useNotesStore()

            expect(store.pinnedCount).toBe(0)

            store.addNote({ content: '普通便签', isPinned: false })
            expect(store.pinnedCount).toBe(0)

            store.addNote({ content: '置顶便签1', isPinned: true })
            expect(store.pinnedCount).toBe(1)

            store.addNote({ content: '置顶便签2', isPinned: true })
            expect(store.pinnedCount).toBe(2)
        })

        it('切换置顶状态应该更新计数', () => {
            const store = useNotesStore()

            const note1 = store.addNote({ content: '便签1', isPinned: false })
            const note2 = store.addNote({ content: '便签2', isPinned: false })

            expect(store.pinnedCount).toBe(0)

            store.togglePin(note1.id)
            expect(store.pinnedCount).toBe(1)

            store.togglePin(note2.id)
            expect(store.pinnedCount).toBe(2)

            store.togglePin(note1.id)
            expect(store.pinnedCount).toBe(1)
        })
    })

    describe('getNoteById - 需求 8.3', () => {
        it('应该根据 ID 返回对应的便签', () => {
            const store = useNotesStore()

            const note1 = store.addNote({ content: '便签1' })
            const note2 = store.addNote({ content: '便签2' })
            const note3 = store.addNote({ content: '便签3' })

            const found1 = store.getNoteById(note1.id)
            expect(found1).toBeDefined()
            expect(found1?.id).toBe(note1.id)
            expect(found1?.content).toBe('便签1')

            const found2 = store.getNoteById(note2.id)
            expect(found2).toBeDefined()
            expect(found2?.id).toBe(note2.id)
            expect(found2?.content).toBe('便签2')
        })

        it('不存在的 ID 应该返回 undefined', () => {
            const store = useNotesStore()

            store.addNote({ content: '便签1' })

            const found = store.getNoteById('non-existent-id')
            expect(found).toBeUndefined()
        })

        it('空列表中查询应该返回 undefined', () => {
            const store = useNotesStore()

            const found = store.getNoteById('any-id')
            expect(found).toBeUndefined()
        })
    })
})
