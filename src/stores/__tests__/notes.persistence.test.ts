/**
 * 便签持久化功能测试
 * 测试数据加载、保存和迁移功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from '../notes'

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

describe('便签持久化功能', () => {
    beforeEach(() => {
        // 每个测试前重置 Pinia 和 localStorage
        setActivePinia(createPinia())
        localStorageMock.clear()
        vi.clearAllMocks()
    })

    describe('loadFromStorage', () => {
        it('应该从空存储加载默认状态', async () => {
            const store = useNotesStore()

            await store.loadFromStorage()

            expect(store.notes).toEqual([])
            expect(store.settings).toBeDefined()
            expect(store.version).toBe(1)
        })

        it('应该从存储加载有效数据', async () => {
            // 准备测试数据
            const testData = {
                version: 1,
                timestamp: Date.now(),
                notes: [
                    {
                        id: 'test-1',
                        content: '测试便签',
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
                ],
                settings: {
                    theme: 'auto',
                    defaultNoteSize: { width: 300, height: 300 },
                    defaultNotePosition: { x: 100, y: 100 },
                    autoSave: true,
                    saveInterval: 500
                }
            }

            // 预先保存数据到 localStorage
            localStorage.setItem('sticky-notes-data', JSON.stringify(testData))

            const store = useNotesStore()
            await store.loadFromStorage()

            expect(store.notes).toHaveLength(1)
            expect(store.notes[0].content).toBe('测试便签')
            expect(store.version).toBe(1)
        })

        it('应该处理无效数据并使用默认值', async () => {
            // 保存无效数据
            localStorage.setItem('sticky-notes-data', 'invalid json')

            const store = useNotesStore()

            // 加载会抛出错误，因为 JSON 解析失败且没有备份
            try {
                await store.loadFromStorage()
            } catch (err) {
                // 预期会抛出错误
            }

            // 应该回退到默认状态（需求 7.2, 7.5）
            expect(store.notes).toEqual([])
            expect(store.error).toBeTruthy()
        })
    })

    describe('saveToStorage', () => {
        it('应该保存数据到 localStorage', async () => {
            const store = useNotesStore()

            // 添加一个便签
            store.addNote({ content: '测试保存' })

            // 保存到存储
            await store.saveToStorage()

            // 验证数据已保存
            const saved = localStorage.getItem('sticky-notes-data')
            expect(saved).toBeTruthy()

            const parsed = JSON.parse(saved!)
            expect(parsed.notes).toHaveLength(1)
            expect(parsed.notes[0].content).toBe('测试保存')
        })

        it('应该更新 lastSaved 时间戳', async () => {
            const store = useNotesStore()
            const beforeSave = store.lastSaved

            store.addNote({ content: '测试' })
            await store.saveToStorage()

            expect(store.lastSaved).toBeGreaterThan(beforeSave)
        })
    })

    describe('数据往返测试', () => {
        it('保存后加载应该恢复相同的数据', async () => {
            const store1 = useNotesStore()

            // 创建一些测试数据
            const note1 = store1.addNote({ content: '便签1', isPinned: true })
            const note2 = store1.addNote({ content: '便签2' })

            // 保存
            await store1.saveToStorage()

            // 创建新的 store 实例并加载
            setActivePinia(createPinia())
            const store2 = useNotesStore()
            await store2.loadFromStorage()

            // 验证数据一致
            expect(store2.notes).toHaveLength(2)
            expect(store2.notes[0].id).toBe(note1.id)
            expect(store2.notes[0].content).toBe('便签1')
            expect(store2.notes[0].isPinned).toBe(true)
            expect(store2.notes[1].id).toBe(note2.id)
            expect(store2.notes[1].content).toBe('便签2')
        })
    })

    describe('数据验证', () => {
        it('应该拒绝缺少必需字段的数据并使用默认值', async () => {
            const invalidData = {
                version: 1,
                // 缺少 notes 和 settings
            }

            localStorage.setItem('sticky-notes-data', JSON.stringify(invalidData))

            const store = useNotesStore()

            // 验证失败时不抛出错误，而是使用默认值（需求 3.5, 7.2）
            await store.loadFromStorage()

            // 应该使用默认状态
            expect(store.notes).toEqual([])
            expect(store.settings).toBeDefined()
        })

        it('应该拒绝包含无效便签的数据并使用默认值', async () => {
            const invalidData = {
                version: 1,
                timestamp: Date.now(),
                notes: [
                    {
                        // 缺少必需字段
                        content: '无效便签'
                    }
                ],
                settings: {}
            }

            localStorage.setItem('sticky-notes-data', JSON.stringify(invalidData))

            const store = useNotesStore()

            // 验证失败时不抛出错误，而是使用默认值（需求 3.5, 7.2）
            await store.loadFromStorage()

            // 应该使用默认状态
            expect(store.notes).toEqual([])
        })
    })
})
