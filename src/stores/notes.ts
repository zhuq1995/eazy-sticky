/**
 * Pinia Store - 便签状态管理
 * 
 * 职责：
 * - 集中管理便签数据和应用设置
 * - 提供便签 CRUD 操作
 * - 提供数据持久化接口
 * - 提供响应式的状态访问
 * 
 * 需求: 1.1, 1.2
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { Note, AppSettings, WindowState } from '../types'
import { useStorage } from '../composables/useStorage'
import { runMigrations, STORAGE_KEYS, CURRENT_VERSION as MIGRATION_VERSION } from './migrations'

/**
 * 当前数据版本号
 * 用于数据迁移和版本控制
 */
export const CURRENT_VERSION = 1

/**
 * 默认应用设置
 */
export const DEFAULT_SETTINGS: AppSettings = {
    theme: 'auto',
    defaultNoteSize: { width: 300, height: 300 },
    defaultNotePosition: { x: 100, y: 100 },
    autoSave: true,
    saveInterval: 500  // 防抖延迟（毫秒）
}

/**
 * 默认便签样式
 */
export const DEFAULT_NOTE_STYLE = {
    backgroundColor: '#fef68a',
    fontSize: 14,
    fontFamily: 'Arial, sans-serif'
}

/**
 * Store 状态接口
 */
export interface NotesState {
    notes: Note[]           // 便签列表
    settings: AppSettings   // 应用设置
    version: number         // 数据版本号
    lastSaved: number       // 最后保存时间戳
    isLoading: boolean      // 加载状态
    error: string | null    // 错误信息
}

/**
 * 窗口状态存储结构
 * 需求: 7.1, 7.2, 7.3, 7.5
 */
export interface StoredWindowState {
    windowId: string
    noteId?: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    isAlwaysOnTop: boolean
    isMinimized: boolean
    isFocused: boolean
    createdAt: number
    updatedAt: number
}

/**
 * 窗口状态集合
 * 键为窗口ID，值为窗口状态
 */
export interface WindowStatesMap {
    [windowId: string]: StoredWindowState
}

/**
 * 存储数据结构
 * 用于序列化到 localStorage
 */
export interface StoredData {
    version: number
    timestamp: number
    notes: Note[]
    settings: AppSettings
    windowStates?: WindowStatesMap  // 窗口状态（可选，用于向后兼容）
}

/**
 * 便签 Store
 * 使用 Composition API 风格定义
 */
export const useNotesStore = defineStore('notes', () => {
    // ==================== 状态定义 ====================

    // 便签列表
    const notes = ref<Note[]>([])

    // 应用设置
    const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

    // 数据版本号
    const version = ref<number>(CURRENT_VERSION)

    // 最后保存时间戳
    const lastSaved = ref<number>(0)

    // 加载状态
    const isLoading = ref<boolean>(false)

    // 错误信息
    const error = ref<string | null>(null)

    // 保存操作互斥锁
    // 需求: 4.3 - 防止并发保存操作
    const isSaving = ref<boolean>(false)

    // 保存失败标志，用于重试逻辑
    // 需求: 4.4 - 保存失败后重试
    const needsRetry = ref<boolean>(false)

    // 窗口间同步相关状态
    // 需求: 9.1, 9.2, 9.3, 9.4, 9.5 - 窗口间数据同步
    const syncEnabled = ref<boolean>(false)
    const syncError = ref<string | null>(null)
    const eventHandlers = new Map<string, (...args: any[]) => void>()

    // 窗口状态管理
    // 需求: 7.1, 7.2, 7.3, 7.5 - 窗口状态持久化
    const windowStates = ref<WindowStatesMap>({})

    // ==================== Getters ====================

    /**
     * 获取排序后的便签列表（置顶在前）
     * 需求: 6.3
     */
    const sortedNotes = computed(() => {
        return [...notes.value].sort((a, b) => {
            // 置顶便签排在前面
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1

            // 相同置顶状态下，按更新时间降序排列
            return b.updatedAt - a.updatedAt
        })
    })

    /**
     * 获取便签总数
     * 需求: 8.1
     */
    const totalNotes = computed(() => notes.value.length)

    /**
     * 获取置顶便签数量
     * 需求: 8.2
     */
    const pinnedCount = computed(() => {
        return notes.value.filter(note => note.isPinned).length
    })

    // ==================== 持久化存储 ====================

    /**
     * 初始化存储 composable
     * 用于数据的序列化和持久化
     */
    const storage = useStorage<StoredData>({
        key: STORAGE_KEYS.NOTES_DATA,
        defaultValue: {
            version: CURRENT_VERSION,
            timestamp: Date.now(),
            notes: [],
            settings: { ...DEFAULT_SETTINGS },
            windowStates: {}
        },
        onError: (err) => {
            console.error('存储操作错误:', err)
            error.value = err.message
        }
    })

    // ==================== Actions ====================

    /**
     * 根据 ID 查询便签
     * 需求: 8.3
     */
    const getNoteById = (id: string): Note | undefined => {
        return notes.value.find(note => note.id === id)
    }

    /**
     * 生成唯一的便签 ID
     * 使用时间戳和随机数组合确保唯一性
     */
    const generateUniqueId = (): string => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 9)
        return `note-${timestamp}-${random}`
    }

    /**
     * 添加新便签
     * 需求: 2.1, 9.1
     * 
     * @param note - 可选的部分便签数据，未提供的字段将使用默认值
     * @returns 创建的完整便签对象
     */
    const addNote = (note?: Partial<Note>): Note => {
        try {
            const now = Date.now()

            // 创建完整的便签对象，合并默认值和用户提供的值
            const newNote: Note = {
                id: generateUniqueId(),
                content: note?.content ?? '',
                position: note?.position ?? { ...settings.value.defaultNotePosition },
                size: note?.size ?? { ...settings.value.defaultNoteSize },
                style: note?.style ?? { ...DEFAULT_NOTE_STYLE },
                createdAt: now,
                updatedAt: now,
                isPinned: note?.isPinned ?? false
            }

            // 添加到便签列表
            notes.value.push(newNote)

            // 清除错误状态
            error.value = null

            // 需求: 9.1 - 广播数据变更到其他窗口
            broadcastDataChange('data-change', {
                type: 'add',
                note: newNote
            })

            return newNote
        } catch (err) {
            const errorMessage = `创建便签失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            throw new Error(errorMessage)
        }
    }

    /**
     * 更新便签
     * 需求: 2.2, 2.3, 2.5, 9.1
     * 
     * @param id - 便签 ID
     * @param updates - 要更新的字段（部分更新）
     * @throws 如果便签不存在则抛出错误
     */
    const updateNote = (id: string, updates: Partial<Note>): void => {
        try {
            const index = notes.value.findIndex(note => note.id === id)

            // 验证便签是否存在
            if (index === -1) {
                const errorMessage = `更新失败: 便签 ID "${id}" 不存在`
                error.value = errorMessage
                throw new Error(errorMessage)
            }

            // 不允许修改 id 和 createdAt
            const { id: _, createdAt: __, ...allowedUpdates } = updates

            // 执行部分更新，保留未修改的字段
            notes.value[index] = {
                ...notes.value[index],
                ...allowedUpdates,
                updatedAt: Date.now() // 自动更新时间戳
            }

            // 清除错误状态
            error.value = null

            // 需求: 9.1 - 广播数据变更到其他窗口
            broadcastDataChange('data-change', {
                type: 'update',
                note: notes.value[index]
            })
        } catch (err) {
            // 如果是我们抛出的错误，直接重新抛出
            if (err instanceof Error && err.message.includes('更新失败')) {
                throw err
            }
            // 其他未预期的错误
            const errorMessage = `更新便签失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            throw new Error(errorMessage)
        }
    }

    /**
     * 删除便签
     * 需求: 2.4, 2.5, 9.1
     * 
     * @param id - 便签 ID
     * @throws 如果便签不存在则抛出错误
     */
    const deleteNote = (id: string): void => {
        try {
            const index = notes.value.findIndex(note => note.id === id)

            // 验证便签是否存在
            if (index === -1) {
                const errorMessage = `删除失败: 便签 ID "${id}" 不存在`
                error.value = errorMessage
                throw new Error(errorMessage)
            }

            // 从列表中移除
            notes.value.splice(index, 1)

            // 清除错误状态
            error.value = null

            // 需求: 9.1 - 广播数据变更到其他窗口
            broadcastDataChange('data-change', {
                type: 'delete',
                noteId: id
            })
        } catch (err) {
            // 如果是我们抛出的错误，直接重新抛出
            if (err instanceof Error && err.message.includes('删除失败')) {
                throw err
            }
            // 其他未预期的错误
            const errorMessage = `删除便签失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            throw new Error(errorMessage)
        }
    }

    /**
     * 切换便签的置顶状态
     * 需求: 6.1, 6.2
     * 
     * @param id - 便签 ID
     * @throws 如果便签不存在则抛出错误
     */
    const togglePin = (id: string): void => {
        try {
            const index = notes.value.findIndex(note => note.id === id)

            // 验证便签是否存在
            if (index === -1) {
                const errorMessage = `置顶操作失败: 便签 ID "${id}" 不存在`
                error.value = errorMessage
                throw new Error(errorMessage)
            }

            // 切换置顶状态
            notes.value[index] = {
                ...notes.value[index],
                isPinned: !notes.value[index].isPinned,
                updatedAt: Date.now()
            }

            // 清除错误状态
            error.value = null
        } catch (err) {
            // 如果是我们抛出的错误，直接重新抛出
            if (err instanceof Error && err.message.includes('置顶操作失败')) {
                throw err
            }
            // 其他未预期的错误
            const errorMessage = `切换置顶状态失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            throw new Error(errorMessage)
        }
    }

    /**
     * 验证加载的数据结构
     * 需求: 3.5, 7.2
     * 
     * @param data - 要验证的数据
     * @returns 验证是否通过
     */
    const validateStoredData = (data: any): data is StoredData => {
        try {
            // 检查基本结构
            if (!data || typeof data !== 'object') {
                console.warn('数据验证失败: 数据不是对象')
                return false
            }

            // 检查必需字段
            if (typeof data.version !== 'number') {
                console.warn('数据验证失败: version 字段无效')
                return false
            }

            if (!Array.isArray(data.notes)) {
                console.warn('数据验证失败: notes 不是数组')
                return false
            }

            if (!data.settings || typeof data.settings !== 'object') {
                console.warn('数据验证失败: settings 字段无效')
                return false
            }

            // 验证每个便签的结构
            for (const note of data.notes) {
                if (!note.id || typeof note.id !== 'string') {
                    console.warn('数据验证失败: 便签缺少有效的 id')
                    return false
                }

                if (typeof note.content !== 'string') {
                    console.warn('数据验证失败: 便签 content 无效')
                    return false
                }

                if (!note.position || typeof note.position.x !== 'number' || typeof note.position.y !== 'number') {
                    console.warn('数据验证失败: 便签 position 无效')
                    return false
                }

                if (!note.size || typeof note.size.width !== 'number' || typeof note.size.height !== 'number') {
                    console.warn('数据验证失败: 便签 size 无效')
                    return false
                }

                if (typeof note.createdAt !== 'number' || typeof note.updatedAt !== 'number') {
                    console.warn('数据验证失败: 便签时间戳无效')
                    return false
                }

                if (typeof note.isPinned !== 'boolean') {
                    console.warn('数据验证失败: 便签 isPinned 无效')
                    return false
                }
            }

            return true
        } catch (err) {
            console.error('数据验证过程出错:', err)
            return false
        }
    }

    /**
     * 从本地存储加载数据
     * 需求: 3.3, 3.4, 3.5, 5.1, 5.2
     * 
     * @throws 如果加载失败则抛出错误
     */
    const loadFromStorage = async (): Promise<void> => {
        try {
            isLoading.value = true
            error.value = null

            // 使用 storage composable 加载数据
            await storage.load()

            let loadedData = storage.data.value

            // 验证数据结构
            if (!validateStoredData(loadedData)) {
                console.warn('加载的数据验证失败，使用默认值')
                loadedData = {
                    version: CURRENT_VERSION,
                    timestamp: Date.now(),
                    notes: [],
                    settings: { ...DEFAULT_SETTINGS },
                    windowStates: {}
                }
            }

            // 需求 5.1, 5.2: 检查版本并执行迁移
            if (loadedData.version < MIGRATION_VERSION) {
                console.log(`检测到旧版本数据 (v${loadedData.version})，开始迁移到 v${MIGRATION_VERSION}`)

                const migrationResult = runMigrations(loadedData, MIGRATION_VERSION)

                if (migrationResult.success) {
                    console.log(`数据迁移成功: v${migrationResult.fromVersion} -> v${migrationResult.toVersion}`)
                    // 迁移成功，使用迁移后的数据
                    // 注意：runMigrations 返回的结果中包含了更新后的数据
                    loadedData = {
                        ...loadedData,
                        version: migrationResult.toVersion
                    }
                } else {
                    // 需求 5.5: 迁移失败，恢复备份
                    console.error('数据迁移失败:', migrationResult.error)
                    if (migrationResult.backup) {
                        console.log('恢复备份数据')
                        loadedData = migrationResult.backup
                    }
                    throw new Error(`数据迁移失败: ${migrationResult.error?.message}`)
                }
            }

            // 加载数据到 store 状态
            notes.value = loadedData.notes || []
            settings.value = { ...DEFAULT_SETTINGS, ...loadedData.settings }
            version.value = loadedData.version
            lastSaved.value = loadedData.timestamp || 0

            // 需求: 7.2, 7.5 - 加载窗口状态
            windowStates.value = loadedData.windowStates || {}

            console.log(`成功加载 ${notes.value.length} 个便签和 ${Object.keys(windowStates.value).length} 个窗口状态`)

        } catch (err) {
            const errorMessage = `加载数据失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            console.error(errorMessage)

            // 需求 3.5, 7.5: 加载失败使用默认状态
            notes.value = []
            settings.value = { ...DEFAULT_SETTINGS }
            version.value = CURRENT_VERSION
            lastSaved.value = 0

            throw new Error(errorMessage)
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 保存数据到本地存储
     * 需求: 3.1, 3.2, 3.3, 3.4, 4.3, 4.4
     * 
     * @throws 如果保存失败则抛出错误
     */
    const saveToStorage = async (): Promise<void> => {
        // 需求 4.3: 保存操作的互斥性
        // 如果正在保存，忽略新的保存请求
        if (isSaving.value) {
            console.log('保存操作正在进行中，忽略新的保存请求')
            return
        }

        try {
            isSaving.value = true
            error.value = null

            // 准备要保存的数据
            const dataToSave: StoredData = {
                version: version.value,
                timestamp: Date.now(),
                notes: notes.value,
                settings: settings.value,
                windowStates: windowStates.value  // 需求: 7.1, 7.5 - 保存窗口状态
            }

            // 更新 storage 的数据
            storage.data.value = dataToSave

            // 使用 storage composable 保存数据
            // 需求 3.1: 序列化为 JSON
            // 需求 3.2: 写入本地存储
            await storage.save()

            // 更新最后保存时间
            lastSaved.value = dataToSave.timestamp

            // 需求 4.4: 保存成功，清除重试标志
            needsRetry.value = false

            console.log(`成功保存 ${notes.value.length} 个便签`)

        } catch (err) {
            const errorMessage = `保存数据失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            console.error(errorMessage)

            // 需求 4.4: 保存失败，设置重试标志
            needsRetry.value = true

            // 需求 7.3: 存储失败保留内存数据
            // 数据已经在内存中，不需要额外操作

            throw new Error(errorMessage)
        } finally {
            isSaving.value = false
        }
    }

    /**
     * 清除所有便签
     * 用于测试和重置
     */
    const clearAllNotes = (): void => {
        notes.value = []
        error.value = null
    }

    /**
     * 更新应用设置
     * 
     * @param newSettings - 要更新的设置（部分更新）
     */
    const updateSettings = (newSettings: Partial<AppSettings>): void => {
        settings.value = {
            ...settings.value,
            ...newSettings
        }
    }

    // ==================== 窗口间数据同步 ====================

    /**
     * 广播数据变更到其他窗口
     * 需求: 9.1 - 一个窗口的数据改变时通知其他窗口
     * 
     * @param event - 事件名称
     * @param data - 事件数据
     */
    const broadcastDataChange = async (event: string, data: any): Promise<void> => {
        // 只在 Electron 环境且同步已启用时广播
        if (!syncEnabled.value) {
            return
        }

        try {
            // 检查 Electron API 是否可用
            if (typeof window === 'undefined' || !window.electronAPI) {
                console.warn('broadcastDataChange: Electron API 不可用')
                return
            }

            // 通过 IPC 广播到所有窗口
            await window.electronAPI.multiWindow.broadcast(event, data)

            // 清除同步错误
            syncError.value = null

        } catch (err) {
            // 需求: 9.5 - 同步失败时记录错误
            const errorMessage = `数据广播失败: ${err instanceof Error ? err.message : String(err)}`
            syncError.value = errorMessage
            console.error(errorMessage)

            // 不抛出错误，保持窗口当前状态
        }
    }

    /**
     * 订阅数据变更事件
     * 需求: 9.3 - 窗口创建时订阅全局数据变更事件
     * 
     * @param event - 事件名称
     * @param handler - 事件处理函数
     */
    const subscribeToDataChanges = (event: string, handler: (data: any) => void): void => {
        // 只在 Electron 环境中订阅
        if (typeof window === 'undefined' || !window.electronAPI) {
            console.warn('subscribeToDataChanges: Electron API 不可用')
            return
        }

        try {
            // 包装处理函数以添加错误处理
            const wrappedHandler = (data: any) => {
                try {
                    handler(data)
                    syncError.value = null
                } catch (err) {
                    // 需求: 9.5 - 同步失败时记录错误并保持当前状态
                    const errorMessage = `处理数据变更失败: ${err instanceof Error ? err.message : String(err)}`
                    syncError.value = errorMessage
                    console.error(errorMessage)
                }
            }

            // 注册事件监听器
            window.electronAPI.on(`broadcast:${event}`, wrappedHandler)

            // 保存处理函数引用，用于后续取消订阅
            eventHandlers.set(event, wrappedHandler)

            console.log(`已订阅事件: ${event}`)

        } catch (err) {
            const errorMessage = `订阅事件失败: ${err instanceof Error ? err.message : String(err)}`
            syncError.value = errorMessage
            console.error(errorMessage)
        }
    }

    /**
     * 取消订阅数据变更事件
     * 需求: 9.4 - 窗口关闭时取消订阅全局数据变更事件
     * 
     * @param event - 事件名称
     */
    const unsubscribeFromDataChanges = (event: string): void => {
        // 只在 Electron 环境中取消订阅
        if (typeof window === 'undefined' || !window.electronAPI) {
            return
        }

        try {
            // 获取保存的处理函数
            const handler = eventHandlers.get(event)
            if (!handler) {
                console.warn(`未找到事件处理器: ${event}`)
                return
            }

            // 取消事件监听
            window.electronAPI.off(`broadcast:${event}`, handler)

            // 移除处理函数引用
            eventHandlers.delete(event)

            console.log(`已取消订阅事件: ${event}`)

        } catch (err) {
            const errorMessage = `取消订阅事件失败: ${err instanceof Error ? err.message : String(err)}`
            syncError.value = errorMessage
            console.error(errorMessage)
        }
    }

    /**
     * 处理接收到的数据更新通知
     * 需求: 9.2 - 窗口接收到数据更新通知时刷新显示内容
     * 
     * @param data - 更新的数据
     */
    const handleDataUpdate = async (data: {
        type: 'add' | 'update' | 'delete' | 'sync'
        noteId?: string
        note?: Note
        notes?: Note[]
    }): Promise<void> => {
        try {
            switch (data.type) {
                case 'add':
                    // 添加新便签
                    if (data.note) {
                        // 检查是否已存在，避免重复添加
                        const exists = notes.value.some(n => n.id === data.note!.id)
                        if (!exists) {
                            notes.value.push(data.note)
                            console.log(`同步添加便签: ${data.note.id}`)
                        }
                    }
                    break

                case 'update':
                    // 更新便签
                    if (data.note) {
                        const index = notes.value.findIndex(n => n.id === data.note!.id)
                        if (index !== -1) {
                            notes.value[index] = data.note
                            console.log(`同步更新便签: ${data.note.id}`)
                        }
                    }
                    break

                case 'delete':
                    // 删除便签
                    if (data.noteId) {
                        const index = notes.value.findIndex(n => n.id === data.noteId)
                        if (index !== -1) {
                            notes.value.splice(index, 1)
                            console.log(`同步删除便签: ${data.noteId}`)
                        }
                    }
                    break

                case 'sync':
                    // 完全同步所有便签
                    if (data.notes) {
                        notes.value = data.notes
                        console.log(`完全同步便签列表: ${data.notes.length} 个便签`)
                    }
                    break

                default:
                    console.warn(`未知的数据更新类型: ${data.type}`)
            }

            // 清除同步错误
            syncError.value = null

        } catch (err) {
            // 需求: 9.5 - 同步失败时记录错误并保持当前状态
            const errorMessage = `处理数据更新失败: ${err instanceof Error ? err.message : String(err)}`
            syncError.value = errorMessage
            console.error(errorMessage)
        }
    }

    /**
     * 启用窗口间同步
     * 需求: 9.3 - 窗口创建时订阅事件
     */
    const enableSync = (): void => {
        if (syncEnabled.value) {
            console.warn('窗口间同步已启用')
            return
        }

        // 订阅数据变更事件
        subscribeToDataChanges('data-change', handleDataUpdate)

        syncEnabled.value = true
        console.log('窗口间同步已启用')
    }

    /**
     * 禁用窗口间同步
     * 需求: 9.4 - 窗口关闭时取消订阅事件
     */
    const disableSync = (): void => {
        if (!syncEnabled.value) {
            return
        }

        // 取消订阅所有事件
        unsubscribeFromDataChanges('data-change')

        syncEnabled.value = false
        console.log('窗口间同步已禁用')
    }

    // ==================== 窗口状态管理 ====================

    /**
     * 保存窗口状态
     * 需求: 7.1 - 用户拖拽窗口到新位置时保存新位置到持久化存储
     * 需求: 7.5 - 多个窗口存在时分别保存和恢复每个窗口的位置
     * 
     * @param windowId - 窗口ID
     * @param state - 窗口状态
     */
    const saveWindowState = async (windowId: string, state: Partial<WindowState>): Promise<void> => {
        try {
            // 验证窗口ID
            if (!windowId || typeof windowId !== 'string') {
                throw new Error('无效的窗口ID')
            }

            const now = Date.now()

            // 获取现有状态或创建新状态
            const existingState = windowStates.value[windowId]
            const updatedState: StoredWindowState = {
                windowId,
                noteId: state.noteId ?? existingState?.noteId,
                position: state.position ?? existingState?.position ?? { x: 100, y: 100 },
                size: state.size ?? existingState?.size ?? { width: 300, height: 300 },
                isAlwaysOnTop: state.isAlwaysOnTop ?? existingState?.isAlwaysOnTop ?? false,
                isMinimized: state.isMinimized ?? existingState?.isMinimized ?? false,
                isFocused: state.isFocused ?? existingState?.isFocused ?? true,
                createdAt: existingState?.createdAt ?? now,
                updatedAt: now
            }

            // 更新窗口状态
            windowStates.value[windowId] = updatedState

            // 保存到持久化存储
            await saveToStorage()

            console.log(`窗口状态已保存: ${windowId}`)

        } catch (err) {
            const errorMessage = `保存窗口状态失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            console.error(errorMessage)
            throw new Error(errorMessage)
        }
    }

    /**
     * 加载窗口状态
     * 需求: 7.2 - 应用重启时从存储中读取上次的窗口位置
     * 需求: 7.3 - 存储中存在窗口位置数据时使用保存的位置创建窗口
     * 需求: 7.4 - 保存的位置超出当前屏幕范围时调整位置到屏幕内
     * 需求: 7.5 - 多个窗口存在时分别保存和恢复每个窗口的位置
     * 
     * @param windowId - 窗口ID
     * @returns 窗口状态，如果不存在则返回 null
     */
    const loadWindowState = async (windowId: string): Promise<StoredWindowState | null> => {
        try {
            // 验证窗口ID
            if (!windowId || typeof windowId !== 'string') {
                throw new Error('无效的窗口ID')
            }

            // 从内存中获取窗口状态
            const state = windowStates.value[windowId]

            if (!state) {
                console.log(`未找到窗口状态: ${windowId}`)
                return null
            }

            // 需求: 7.4 - 检查位置是否在屏幕范围内
            const adjustedState = adjustWindowStateToScreen(state)

            console.log(`窗口状态已加载: ${windowId}`)

            return adjustedState

        } catch (err) {
            const errorMessage = `加载窗口状态失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            console.error(errorMessage)
            return null
        }
    }

    /**
     * 调整窗口状态到屏幕范围内
     * 需求: 7.4 - 保存的位置超出当前屏幕范围时调整位置到屏幕内
     * 
     * @param state - 窗口状态
     * @returns 调整后的窗口状态
     */
    const adjustWindowStateToScreen = (state: StoredWindowState): StoredWindowState => {
        // 获取屏幕尺寸
        const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920
        const screenHeight = typeof window !== 'undefined' ? window.screen.height : 1080

        // 最小可见区域
        const minVisible = 50

        // 调整位置
        let { x, y } = state.position
        const { width, height } = state.size

        // 确保窗口不超出屏幕左边界
        x = Math.max(0, x)
        // 确保窗口不超出屏幕上边界
        y = Math.max(0, y)
        // 确保窗口右边至少有 minVisible 像素可见
        x = Math.min(screenWidth - minVisible, x)
        // 确保窗口下边至少有 minVisible 像素可见
        y = Math.min(screenHeight - minVisible, y)

        // 如果位置被调整，记录日志
        if (x !== state.position.x || y !== state.position.y) {
            console.log(`窗口位置已调整: ${state.windowId} 从 (${state.position.x}, ${state.position.y}) 到 (${x}, ${y})`)
        }

        return {
            ...state,
            position: { x, y }
        }
    }

    /**
     * 删除窗口状态
     * 用于窗口关闭时清理状态
     * 
     * @param windowId - 窗口ID
     */
    const deleteWindowState = async (windowId: string): Promise<void> => {
        try {
            // 验证窗口ID
            if (!windowId || typeof windowId !== 'string') {
                throw new Error('无效的窗口ID')
            }

            // 检查窗口状态是否存在
            if (!windowStates.value[windowId]) {
                console.warn(`窗口状态不存在: ${windowId}`)
                return
            }

            // 删除窗口状态
            delete windowStates.value[windowId]

            // 保存到持久化存储
            await saveToStorage()

            console.log(`窗口状态已删除: ${windowId}`)

        } catch (err) {
            const errorMessage = `删除窗口状态失败: ${err instanceof Error ? err.message : String(err)}`
            error.value = errorMessage
            console.error(errorMessage)
            throw new Error(errorMessage)
        }
    }

    /**
     * 获取所有窗口状态
     * 
     * @returns 窗口状态映射
     */
    const getAllWindowStates = (): WindowStatesMap => {
        return { ...windowStates.value }
    }

    /**
     * 清除所有窗口状态
     * 用于测试和重置
     */
    const clearAllWindowStates = async (): Promise<void> => {
        windowStates.value = {}
        await saveToStorage()
        console.log('所有窗口状态已清除')
    }

    // ==================== 自动保存机制 ====================

    /**
     * 自动保存机制
     * 需求: 4.1, 4.2, 4.3, 4.4
     * 
     * 使用 watchDebounced 监听状态变化，在变更停止后自动保存
     * - 需求 4.1: 短时间内多次变更延迟保存
     * - 需求 4.2: 变更停止超过 500ms 后触发保存
     * - 需求 4.3: 通过互斥锁防止并发保存
     * - 需求 4.4: 保存失败后在下次变更时重试
     */
    watchDebounced(
        // 监听 notes 和 settings 的变化
        [notes, settings],
        async () => {
            // 只有在自动保存开启时才执行
            if (!settings.value.autoSave) {
                return
            }

            try {
                // 需求 4.4: 如果之前保存失败，这次变更会触发重试
                if (needsRetry.value) {
                    console.log('检测到之前保存失败，正在重试...')
                }

                // 执行保存操作
                // saveToStorage 内部已经实现了互斥锁（需求 4.3）
                await saveToStorage()

            } catch (err) {
                // 错误已经在 saveToStorage 中处理
                // 这里只需要记录日志
                console.error('自动保存失败:', err)
            }
        },
        {
            // 需求 4.1, 4.2: 防抖延迟，使用配置的保存间隔
            debounce: settings.value.saveInterval,
            // 深度监听，捕获对象内部的变化
            deep: true
        }
    )

    // ==================== 便捷方法 ====================

    /**
     * 创建新便利贴（简化版）
     * 用于主窗口快速创建便利贴
     */
    const createNote = (): Note => {
        return addNote({
            title: '新便利贴',
            content: ''
        })
    }

    /**
     * 更新便利贴标题
     */
    const updateNoteTitle = (id: string, title: string): void => {
        updateNote(id, { title })
    }

    /**
     * 更新便利贴内容
     */
    const updateNoteContent = (id: string, content: string): void => {
        updateNote(id, { content })
    }

    // ==================== 返回 Store 接口 ====================

    return {
        // 状态
        notes,
        settings,
        version,
        lastSaved,
        isLoading,
        error,
        syncEnabled,
        syncError,
        windowStates,

        // Getters
        sortedNotes,
        totalNotes,
        pinnedCount,

        // Actions
        getNoteById,
        addNote,
        updateNote,
        deleteNote,
        togglePin,
        createNote,
        updateNoteTitle,
        updateNoteContent,

        // 持久化操作
        loadFromStorage,
        saveToStorage,
        clearAllNotes,
        updateSettings,

        // 窗口间同步操作
        enableSync,
        disableSync,
        broadcastDataChange,
        subscribeToDataChanges,
        unsubscribeFromDataChanges,
        handleDataUpdate,

        // 窗口状态管理操作
        saveWindowState,
        loadWindowState,
        deleteWindowState,
        getAllWindowStates,
        clearAllWindowStates
    }
})
