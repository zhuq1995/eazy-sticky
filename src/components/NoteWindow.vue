<template>
    <div class="note-window">
        <!-- 自定义标题栏（可拖拽区域） -->
        <div class="custom-titlebar">
            <div class="titlebar-drag-region"></div>
            <div class="titlebar-buttons">
                <button class="titlebar-btn pin-btn" :class="{ 'pinned': isAlwaysOnTop }" @click="toggleAlwaysOnTop"
                    :title="isAlwaysOnTop ? '取消置顶' : '置顶到最前'">
                    📌
                </button>
                <button class="titlebar-btn close-btn" @click="closeWindow" title="关闭">
                    ×
                </button>
            </div>
        </div>

        <!-- 内容编辑区 -->
        <div ref="editorRef" class="content-editor" contenteditable="true" @input="handleInput" @focus="handleFocus"
            @blur="handleBlur" :data-placeholder="showPlaceholder ? '在这里输入...' : ''" role="textbox"
            aria-multiline="true"></div>

        <!-- 状态栏 -->
        <div class="status-bar">
            <span class="char-count">{{ content.length }} 字符</span>
            <span class="save-status">{{ saveStatus }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNotesStore } from '../stores/notes'
import { useElectron } from '../composables/useElectron'

// Props
interface Props {
    noteId: string
}

const props = defineProps<Props>()

// Store
const notesStore = useNotesStore()
const { isElectron } = useElectron()

// DOM 引用
const editorRef = ref<HTMLElement | null>(null)

// 组件状态
const content = ref('')
const saveStatus = ref('已保存')
const isAlwaysOnTop = ref(false)
let saveTimeout: number | null = null

// 计算属性
const showPlaceholder = computed(() => content.value.trim() === '')

// 从 store 加载便利贴内容
const loadNote = () => {
    const note = notesStore.getNoteById(props.noteId)
    if (note) {
        content.value = note.content || ''
        if (editorRef.value) {
            editorRef.value.textContent = note.content || ''
        }

        // 设置窗口标题
        if (isElectron.value) {
            document.title = note.content ? note.content.substring(0, 30) : '便利贴'
        }
    } else {
        console.error(`便签不存在: ${props.noteId}`)
        content.value = ''
        saveStatus.value = '便签不存在'
        
        // 如果便签不存在，显示错误并关闭窗口
        if (isElectron.value) {
            setTimeout(() => {
                alert('便签不存在，窗口将关闭')
                window.electronAPI.window.close()
            }, 1000)
        }
    }
}

// 处理输入
const handleInput = (e: Event) => {
    const target = e.target as HTMLElement
    content.value = target.textContent || ''

    // 更新保存状态
    saveStatus.value = '未保存'

    // 防抖保存
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }

    saveTimeout = window.setTimeout(() => {
        saveNote()
    }, 500)
}

// 保存便利贴
const saveNote = () => {
    try {
        // 检查便签是否存在
        const note = notesStore.getNoteById(props.noteId)
        if (!note) {
            console.warn(`便签不存在: ${props.noteId}`)
            saveStatus.value = '便签不存在'
            return
        }

        notesStore.updateNoteContent(props.noteId, content.value)
        saveStatus.value = '已保存'
    } catch (error) {
        console.error('保存便签失败:', error)
        saveStatus.value = '保存失败'
    }
}

// 处理焦点
const handleFocus = () => {
    if (editorRef.value && !content.value) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(editorRef.value)
        range.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(range)
    }
}

const handleBlur = () => {
    // 失去焦点时保存
    if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
    }
    saveNote()
}

// 生命周期
onMounted(async () => {
    loadNote()

    if (editorRef.value) {
        editorRef.value.setAttribute('tabindex', '0')
        editorRef.value.focus()
    }

    // 检查当前的置顶状态（默认为普通模式，不置顶）
    if (isElectron.value) {
        try {
            const currentState = await window.electronAPI.window.isAlwaysOnTop()
            isAlwaysOnTop.value = currentState
            console.log('当前置顶状态:', currentState)
        } catch (error) {
            console.error('获取置顶状态失败:', error)
            // 默认假设是不置顶的（普通模式）
            isAlwaysOnTop.value = false
        }
    }
})

// 监听 noteId 变化
watch(() => props.noteId, () => {
    loadNote()
})

// 切换置顶状态
const toggleAlwaysOnTop = async () => {
    if (!isElectron.value) return

    try {
        const newState = !isAlwaysOnTop.value
        await window.electronAPI.window.setAlwaysOnTop(newState)
        isAlwaysOnTop.value = newState
    } catch (error) {
        console.error('切换置顶状态失败:', error)
    }
}

// 关闭窗口
const closeWindow = async () => {
    if (!isElectron.value) return

    try {
        await window.electronAPI.window.close()
    } catch (error) {
        console.error('关闭窗口失败:', error)
    }
}

// 组件卸载时保存
onUnmounted(() => {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }
    saveNote()
})
</script>

<style scoped>
.note-window {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #fef9e7, #fef5d4);
}

/* 自定义标题栏 */
.custom-titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    background: rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    /* 关键：启用系统原生拖拽 */
    -webkit-app-region: drag;
    user-select: none;
}

.titlebar-drag-region {
    flex: 1;
    height: 100%;
}

.titlebar-buttons {
    display: flex;
    gap: 4px;
    padding-right: 8px;
    /* 关键：按钮区域禁用拖拽，允许点击 */
    -webkit-app-region: no-drag;
}

.titlebar-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.2s;
}

.titlebar-btn:hover {
    background: rgba(0, 0, 0, 0.1);
}

.pin-btn {
    opacity: 0.5;
}

.pin-btn:hover {
    opacity: 1;
}

.pin-btn.pinned {
    opacity: 1;
    background: rgba(255, 215, 0, 0.2);
    transform: rotate(45deg);
}

.pin-btn.pinned:hover {
    background: rgba(255, 215, 0, 0.3);
}

.close-btn {
    font-size: 20px;
    color: #666;
}

.close-btn:hover {
    background: #f44336;
    color: white;
}

/* 内容编辑区 */
.content-editor {
    flex: 1;
    overflow-y: auto;
    outline: none;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    white-space: pre-wrap;
    word-wrap: break-word;
    cursor: text;
    user-select: text;
    -webkit-user-select: text;
    padding: 16px;
    /* 确保内容区域不可拖拽 */
    -webkit-app-region: no-drag;
}

.content-editor:empty::before {
    content: attr(data-placeholder);
    color: #999;
}

/* 状态栏 */
.status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    /* 确保状态栏不可拖拽 */
    -webkit-app-region: no-drag;
}

.char-count {
    font-size: 12px;
    color: #999;
}

.save-status {
    font-size: 12px;
    color: #4caf50;
}

/* 滚动条样式 */
.content-editor::-webkit-scrollbar {
    width: 6px;
}

.content-editor::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}

.content-editor::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}
</style>
