<template>
    <div class="main-window">
        <!-- 头部工具栏 -->
        <div class="toolbar">
            <button class="btn-primary" @click="createNote">
                <span class="icon">+</span>
                新建便利贴
            </button>
            <input type="text" class="search-input" v-model="searchQuery" placeholder="搜索便利贴..." />
            <button class="btn-secondary" @click="openSettings">
                <span class="icon">⚙️</span>
                设置
            </button>
        </div>

        <!-- 便利贴列表 -->
        <div class="notes-grid">
            <div v-for="note in filteredNotes" :key="note.id" class="note-card">
                <div class="note-header">
                    <h3 class="note-title">{{ note.title || note.content.substring(0, 20) || '空便签' }}</h3>
                    <div class="note-actions">
                        <button class="btn-show" @click.stop="openNote(note.id)" title="显示到桌面">
                            📌
                        </button>
                        <button class="btn-delete" @click.stop="deleteNote(note.id)" title="删除">
                            ×
                        </button>
                    </div>
                </div>
                <div class="note-preview" @click="openNote(note.id)">
                    {{ note.content || '(空白便签)' }}
                </div>
                <div class="note-footer">
                    <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-if="filteredNotes.length === 0" class="empty-state">
                <p class="empty-icon">📝</p>
                <p class="empty-text">还没有便利贴</p>
                <button class="btn-primary" @click="createNote">创建第一个便利贴</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useElectron } from '../composables/useElectron'

// Store
const notesStore = useNotesStore()
const { isElectron } = useElectron()

// 搜索查询
const searchQuery = ref('')

// 过滤后的便利贴
const filteredNotes = computed(() => {
    console.log('MainWindow - 便签总数:', notesStore.notes.length)
    if (!searchQuery.value) {
        return notesStore.notes
    }
    const query = searchQuery.value.toLowerCase()
    return notesStore.notes.filter(note =>
        note.title?.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    )
})

// 组件挂载时输出调试信息
import { onMounted } from 'vue'
onMounted(() => {
    console.log('MainWindow 已挂载')
    console.log('当前便签数量:', notesStore.notes.length)
    console.log('便签列表:', notesStore.notes)
})

// 创建新便利贴
const createNote = async () => {
    try {
        // 创建便签
        const note = notesStore.createNote()
        console.log('创建便签:', note.id)

        // 立即保存到 storage
        await notesStore.saveToStorage()
        console.log('便签已保存到 storage')

        // 在 Electron 环境中创建新窗口
        if (isElectron.value) {
            await window.electronAPI.multiWindow.create({
                windowId: `note-${note.id}`,
                noteId: note.id,
                size: { width: 300, height: 300 }
            })
            console.log('便签窗口已创建')
        }
    } catch (error) {
        console.error('创建便利贴失败:', error)
        alert(`创建便利贴失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
}

// 打开便利贴
const openNote = async (noteId: string) => {
    // 检查便签是否存在
    const note = notesStore.getNoteById(noteId)
    if (!note) {
        console.error('便签不存在:', noteId)
        alert('便签不存在')
        return
    }

    // 在 Electron 环境中打开或聚焦窗口
    if (isElectron.value) {
        try {
            const windowId = `note-${noteId}`
            
            // 尝试聚焦已存在的窗口
            try {
                await window.electronAPI.multiWindow.focus(windowId)
                console.log('窗口已聚焦:', windowId)
            } catch (focusError) {
                // 如果窗口不存在，创建新窗口
                console.log('窗口不存在，创建新窗口:', windowId)
                
                // 将响应式对象转换为普通对象，避免 IPC 序列化错误
                const size = note.size ? { width: note.size.width, height: note.size.height } : { width: 300, height: 300 }
                const position = note.position ? { x: note.position.x, y: note.position.y } : undefined
                
                await window.electronAPI.multiWindow.create({
                    windowId: windowId,
                    noteId: noteId,
                    size: size,
                    position: position
                })
                console.log('窗口已创建:', windowId)
            }
        } catch (error) {
            console.error('打开便利贴窗口失败:', error)
            alert(`打开便利贴失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
    }
}

// 删除便利贴
const deleteNote = async (noteId: string) => {
    if (confirm('确定要删除这个便利贴吗？')) {
        // 关闭窗口（如果打开）
        if (isElectron.value) {
            try {
                await window.electronAPI.multiWindow.close(`note-${noteId}`)
            } catch (error) {
                // 窗口可能已经关闭，忽略错误
            }
        }

        // 删除便利贴数据
        notesStore.deleteNote(noteId)
    }
}

// 打开设置
const openSettings = () => {
    // TODO: 实现设置界面
    alert('设置功能即将推出')
}

// 格式化日期
const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 小于1分钟
    if (diff < 60000) {
        return '刚刚'
    }

    // 小于1小时
    if (diff < 3600000) {
        return `${Math.floor(diff / 60000)} 分钟前`
    }

    // 小于1天
    if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)} 小时前`
    }

    // 小于7天
    if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)} 天前`
    }

    // 显示日期
    return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.main-window {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
}

/* 工具栏 */
.toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
}

.btn-primary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

.btn-primary:hover {
    background: #1976d2;
}

.btn-secondary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f5f5f5;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.btn-secondary:hover {
    background: #e0e0e0;
}

.search-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
}

.search-input:focus {
    border-color: #2196f3;
}

.icon {
    font-size: 16px;
}

/* 便利贴网格 */
.notes-grid {
    flex: 1;
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    overflow-y: auto;
    align-content: start;
}

/* 便利贴卡片 */
.note-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    height: 200px;
}

.note-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}

.note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.note-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.note-actions {
    display: flex;
    gap: 4px;
}

.btn-show {
    background: transparent;
    border: none;
    color: #999;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-show:hover {
    background: #e3f2fd;
    color: #2196f3;
    transform: scale(1.1);
}

.btn-delete {
    background: transparent;
    border: none;
    color: #999;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-delete:hover {
    background: #ffebee;
    color: #f44336;
}

.note-preview {
    flex: 1;
    font-size: 14px;
    color: #666;
    line-height: 1.6;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
}

.note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}

.note-date {
    font-size: 12px;
    color: #999;
}

/* 空状态 */
.empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.empty-text {
    font-size: 18px;
    color: #999;
    margin-bottom: 24px;
}

/* 滚动条样式 */
.notes-grid::-webkit-scrollbar {
    width: 8px;
}

.notes-grid::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
}

.notes-grid::-webkit-scrollbar-thumb:hover {
    background: #999;
}
</style>
