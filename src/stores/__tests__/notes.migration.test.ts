/**
 * 数据迁移功能测试
 * 测试版本检查和数据迁移流程
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore, CURRENT_VERSION } from '../notes'

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

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
})

describe('数据迁移功能', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorageMock.clear()
    })

    describe('版本检查', () => {
        it('应该识别当前版本的数据无需迁移', async () => {
            const testData = {
                version: CURRENT_VERSION,
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

            // 版本应该保持不变
            expect(store.version).toBe(CURRENT_VERSION)
        })

        it('应该处理没有版本号的旧数据', async () => {
            const oldData = {
                // 没有 version 字段
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

            localStorage.setItem('sticky-notes-data', JSON.stringify(oldData))

            const store = useNotesStore()
            await store.loadFromStorage()

            // 应该升级到当前版本
            expect(store.version).toBe(CURRENT_VERSION)
        })
    })

    describe('迁移流程', () => {
        it('应该在迁移后保留数据', async () => {
            // 模拟旧版本数据（版本 0，会被视为版本 1）
            const oldData = {
                version: 0,
                timestamp: Date.now(),
                notes: [
                    {
                        id: 'old-note-1',
                        content: '旧版本便签',
                        position: { x: 50, y: 50 },
                        size: { width: 250, height: 250 },
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

            localStorage.setItem('sticky-notes-data', JSON.stringify(oldData))

            const store = useNotesStore()
            await store.loadFromStorage()

            // 数据应该被保留
            expect(store.notes).toHaveLength(1)
            expect(store.notes[0].content).toBe('旧版本便签')

            // 版本应该更新
            expect(store.version).toBe(CURRENT_VERSION)
        })
    })

    describe('备份机制', () => {
        it('保存时应该创建备份', async () => {
            const store = useNotesStore()

            store.addNote({ content: '测试备份' })
            await store.saveToStorage()

            // 检查主存储
            const mainData = localStorage.getItem('sticky-notes-data')
            expect(mainData).toBeTruthy()

            // 检查备份存储
            const backupData = localStorage.getItem('sticky-notes-data-backup')
            expect(backupData).toBeTruthy()

            // 备份应该与主存储相同
            expect(backupData).toBe(mainData)
        })

        it('主存储损坏时应该从备份恢复', async () => {
            const store1 = useNotesStore()
            store1.addNote({ content: '重要数据' })
            await store1.saveToStorage()

            // 损坏主存储
            localStorage.setItem('sticky-notes-data', 'corrupted data')

            // 创建新 store 并加载
            setActivePinia(createPinia())
            const store2 = useNotesStore()
            await store2.loadFromStorage()

            // 应该从备份恢复
            expect(store2.notes).toHaveLength(1)
            expect(store2.notes[0].content).toBe('重要数据')
        })
    })
})
