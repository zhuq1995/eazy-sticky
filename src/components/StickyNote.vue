<template>
    <div ref="noteElement" class="sticky-note draggable" :style="combinedStyle" :class="{
        'dragging': isDragging,
        'resizing': isResizing,
        'always-on-top': windowOps.windowState.value.isAlwaysOnTop
    }">
        <!-- 胶带装饰 -->
        <div class="tape"></div>

        <!-- 工具栏（拖拽句柄） -->
        <div ref="toolbarRef" class="toolbar drag-handle">
            <!-- 置顶按钮 -->
            <button v-if="isElectron" class="pin-btn pin-button"
                :class="{ 'pinned': windowOps.windowState.value.isAlwaysOnTop, 'active': windowOps.windowState.value.isAlwaysOnTop }"
                @click.stop="handleTogglePin" @mousedown.stop :aria-label="windowOps.windowState.value.isAlwaysOnTop ? '取消置顶' : '置顶窗口'">
                📌
            </button>
            <button class="close-btn" @click.stop="handleClose" @mousedown.stop aria-label="关闭便签">
                ×
            </button>
        </div>

        <!-- 内容编辑区 -->
        <div ref="editorRef" class="content-editor" contenteditable="true" @input="handleInput" @focus="handleFocus"
            @blur="handleBlur" :data-placeholder="showPlaceholder ? '在这里输入...' : ''" role="textbox"
            aria-multiline="true"></div>

        <!-- 状态栏 -->
        <div class="status-bar">
            <span class="char-count">{{ content.length }} 字符</span>
        </div>

        <!-- 尺寸调整手柄 -->
        <!-- 需求: 8.1 - 拖拽边缘/角落调整尺寸 -->
        <div class="resize-handle resize-handle-n" @mousedown="getHandleMouseDown('n')"></div>
        <div class="resize-handle resize-handle-s" @mousedown="getHandleMouseDown('s')"></div>
        <div class="resize-handle resize-handle-e" @mousedown="getHandleMouseDown('e')"></div>
        <div class="resize-handle resize-handle-w" @mousedown="getHandleMouseDown('w')"></div>
        <div class="resize-handle resize-handle-ne" @mousedown="getHandleMouseDown('ne')"></div>
        <div class="resize-handle resize-handle-nw" @mousedown="getHandleMouseDown('nw')"></div>
        <div class="resize-handle resize-handle-se" @mousedown="getHandleMouseDown('se')"></div>
        <div class="resize-handle resize-handle-sw" @mousedown="getHandleMouseDown('sw')"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useElectron } from '../composables/useElectron'
import { useDraggable } from '../composables/useDraggable'
import { useWindow } from '../composables/useWindow'
import { useResizable } from '../composables/useResizable'

// Props 接口定义
interface Props {
    // 便签的唯一标识符
    id?: string
    // 初始内容
    initialContent?: string
    // 初始宽度（像素）
    width?: number
    // 初始高度（像素）
    height?: number
}

// 使用默认值定义 props
const props = withDefaults(defineProps<Props>(), {
    id: () => `note-${Date.now()}`,
    initialContent: '',
    width: 300,
    height: 300
})

// Emits 接口定义
interface Emits {
    // 当用户点击关闭按钮时触发
    (e: 'close', id: string): void
    // 当内容改变时触发
    (e: 'update:content', content: string): void
}

const emit = defineEmits<Emits>()

// ==================== Electron 集成 ====================
// 需求: 1.3 - 浏览器窗口加载 Vue 应用
// 需求: 3.5 - 渲染进程访问 Electron API
const { isElectron, closeWindow } = useElectron()

// ==================== DOM 引用 ====================
// 便签元素的 DOM 引用
const noteElement = ref<HTMLElement | null>(null)
// 工具栏元素的 DOM 引用（拖拽句柄）
const toolbarRef = ref<HTMLElement | null>(null)
// 内容编辑器的 DOM 引用
const editorRef = ref<HTMLElement | null>(null)

// ==================== 组件内部状态 ====================
// 当前编辑的内容
const content = ref(props.initialContent)

// ==================== 拖拽功能集成 ====================
// 需求: 1.1, 1.2, 1.3, 1.4, 1.5 - 拖拽功能
// 需求: 7.1 - 拖拽结束后保存位置
const { position, isDragging, style: dragStyle, setPosition } = useDraggable(noteElement, {
    // 设置拖拽句柄为工具栏
    handle: toolbarRef,
    // 最小可见区域
    minVisibleArea: 50,
    // 拖拽结束回调 - 保存位置
    onEnd: async (pos) => {
        console.log('拖拽结束，位置:', pos)
        // 在 Electron 环境中，位置已经通过 updateWindowPosition 更新
        // 这里可以添加额外的保存逻辑
        if (isElectron.value) {
            await windowOps.saveState()
        }
    }
})

// ==================== 窗口操作集成 ====================
// 需求: 7.1 - 窗口状态持久化
const windowOps = useWindow({
    windowId: props.id,
    autoSave: true,
    saveDelay: 500
})

// ==================== 尺寸调整功能集成 ====================
// 需求: 8.1, 8.2, 8.3, 8.4, 8.5 - 窗口尺寸调整
const { size, isResizing, getHandleMouseDown, setSize: setResizableSize } = useResizable(noteElement, {
    minWidth: 200,
    minHeight: 200,
    maxWidth: 800,
    maxHeight: 800,
    // 需求 8.4: 尺寸变更结束后保存
    onEnd: async (newSize) => {
        console.log('尺寸调整结束:', newSize)
        // 在 Electron 环境中更新窗口尺寸
        if (isElectron.value) {
            try {
                await windowOps.setSize(newSize.width, newSize.height)
                await windowOps.saveState()
            } catch (error) {
                console.error('保存窗口尺寸失败:', error)
            }
        }
    }
})

// ==================== 计算属性 ====================
// 是否显示占位符
const showPlaceholder = computed(() => content.value.trim() === '')

// 便签基础样式（应用 width 和 height props 或响应式尺寸）
// 需求: 8.5 - 尺寸变更时的内容区域自适应
const noteStyle = computed(() => ({
    width: `${size.value.width}px`,
    height: `${size.value.height}px`
}))

// 组合样式：基础样式 + 拖拽样式
// 需求: 12.3 - 使用 CSS transform 更新位置
// 需求: 12.4, 12.5 - 拖拽时禁用过渡，结束后恢复
const combinedStyle = computed(() => ({
    ...noteStyle.value,
    ...dragStyle.value
}))

// 事件处理函数
const handleInput = (e: Event) => {
    const target = e.target as HTMLElement
    // 获取文本内容，保留换行符
    content.value = target.textContent || ''
    emit('update:content', content.value)
}

/**
 * 处理置顶按钮点击
 * 需求: 3.1 - 点击置顶按钮时将窗口设置为始终置顶状态
 * 需求: 3.3 - 再次点击置顶按钮时取消窗口的置顶状态
 * 需求: 3.4 - 窗口置顶状态改变时更新置顶按钮的视觉状态
 * 需求: 3.5 - 窗口置顶状态改变时保存新的置顶状态到存储
 */
const handleTogglePin = async () => {
    if (!isElectron.value) {
        console.warn('置顶功能仅在 Electron 环境中可用')
        return
    }

    try {
        // 切换置顶状态
        const newPinState = !windowOps.windowState.value.isAlwaysOnTop
        console.log(`切换置顶状态: ${windowOps.windowState.value.isAlwaysOnTop} -> ${newPinState}`)

        // 需求 3.1, 3.3: 设置窗口置顶状态
        await windowOps.setAlwaysOnTop(newPinState)

        // 需求 3.4: 视觉状态会通过响应式状态自动更新（:class 绑定）
        // 需求 3.5: 状态持久化会通过 useWindow 的自动保存机制完成

        console.log(`置顶状态已更新: ${newPinState}`)
    } catch (error) {
        console.error('切换置顶状态失败:', error)
    }
}

/**
 * 处理关闭按钮点击
 * 
 * 在 Electron 环境中：关闭整个应用窗口
 * 在浏览器环境中：触发 close 事件，由父组件处理
 * 
 * 需求: 1.3 - 浏览器窗口加载 Vue 应用
 * 需求: 3.5 - 渲染进程访问 Electron API
 */
const handleClose = async () => {
    // Electron 环境：关闭窗口
    if (isElectron.value) {
        try {
            await closeWindow()
        } catch (error) {
            console.error('关闭 Electron 窗口失败:', error)
            // 降级处理：如果 Electron API 调用失败，触发普通关闭事件
            emit('close', props.id)
        }
    } else {
        // 浏览器环境：触发关闭事件
        emit('close', props.id)
    }
}

const handleFocus = () => {
    // 当内容编辑区获得焦点时，确保光标可见
    if (editorRef.value) {
        // 如果内容为空，将光标移到开始位置
        if (!content.value) {
            const selection = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(editorRef.value)
            range.collapse(true)
            selection?.removeAllRanges()
            selection?.addRange(range)
        }
    }
}

const handleBlur = () => {
    // 失去焦点时的处理（如果需要）
}

// ==================== 生命周期 ====================
// 组件挂载后初始化内容和恢复窗口状态
onMounted(async () => {
    if (editorRef.value) {
        // 设置初始内容，保留换行符
        if (props.initialContent) {
            editorRef.value.textContent = props.initialContent
            content.value = props.initialContent
        }

        // 确保编辑器可以接收焦点
        editorRef.value.setAttribute('tabindex', '0')
    }

    // 在 Electron 环境中恢复窗口状态
    if (isElectron.value) {
        console.log('StickyNote 组件在 Electron 环境中运行')

        // 需求: 7.2, 7.3 - 恢复保存的窗口位置和尺寸
        try {
            await windowOps.restoreState()
            // 如果恢复了位置，同步到拖拽状态
            const restoredPos = windowOps.windowState.value.position
            if (restoredPos.x !== 0 || restoredPos.y !== 0) {
                setPosition(restoredPos.x, restoredPos.y)
            }
            // 需求: 8.4 - 恢复保存的窗口尺寸
            const restoredSize = windowOps.windowState.value.size
            if (restoredSize.width && restoredSize.height) {
                setResizableSize(restoredSize.width, restoredSize.height)
            }
        } catch (error) {
            console.error('恢复窗口状态失败:', error)
        }
    } else {
        // 浏览器环境：使用 props 初始化尺寸
        setResizableSize(props.width, props.height)
    }
})

// 监听 props 变化，同步到尺寸状态
watch(() => [props.width, props.height], ([newWidth, newHeight]) => {
    if (!isElectron.value) {
        setResizableSize(newWidth, newHeight)
    }
})
</script>

<style scoped>
.sticky-note {
    position: relative;
    width: var(--note-width, 300px);
    height: var(--note-height, 300px);
    background: linear-gradient(135deg,
            var(--note-bg-start, #fef9e7),
            var(--note-bg-end, #fef5d4));
    border-radius: var(--note-border-radius, 4px);
    box-shadow: var(--note-shadow, 2px 2px 8px rgba(0, 0, 0, 0.15));
    padding: var(--note-padding, 16px);
    display: flex;
    flex-direction: column;
    font-family: var(--note-font-family, 'Segoe UI', sans-serif);
    /* 需求 12.3: 使用 transform 进行位置变换 */
    will-change: transform;
}

/* 需求 1.4, 12.1: 拖拽状态的视觉反馈 */
.sticky-note.dragging {
    cursor: move;
    box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.3);
    opacity: 0.95;
    z-index: 1000;
}

/* 胶带装饰 */
.tape {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 20px;
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 工具栏（拖拽句柄） */
.toolbar {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    height: var(--toolbar-height, 24px);
    margin-bottom: 8px;
    /* 需求 1.1: 工具栏作为拖拽句柄 */
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
}

/* 置顶按钮 */
/* 需求 3.4: 置顶状态的视觉指示 */
.pin-btn {
    background: transparent;
    border: none;
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
    opacity: 0.5;
}

.pin-btn:hover {
    background-color: rgba(0, 0, 0, 0.1);
    opacity: 1;
}

/* 需求 3.4: 置顶状态的视觉指示（图标变化） */
.pin-btn.pinned {
    opacity: 1;
    background-color: rgba(255, 215, 0, 0.2);
    transform: rotate(45deg);
}

.pin-btn.pinned:hover {
    background-color: rgba(255, 215, 0, 0.3);
}

.close-btn {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--note-text-color, #666);
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.close-btn:hover {
    background-color: rgba(0, 0, 0, 0.1);
}

/* 内容编辑区 */
.content-editor {
    flex: 1;
    overflow-y: auto;
    outline: none;
    font-size: var(--note-font-size, 14px);
    line-height: var(--note-line-height, 1.6);
    color: var(--note-text-color, #333);
    white-space: pre-wrap;
    word-wrap: break-word;
    /* 需求 1.5: 可编辑区域使用文本光标，不触发拖拽 */
    cursor: text;
    user-select: text;
    -webkit-user-select: text;
}

.content-editor:empty::before {
    content: attr(data-placeholder);
    color: #999;
}

/* 状态栏 */
.status-bar {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    margin-top: 8px;
}

.char-count {
    font-size: 12px;
    color: #999;
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

/* 尺寸调整手柄样式 */
/* 需求: 8.1 - 拖拽边缘/角落调整尺寸 */
.resize-handle {
    position: absolute;
    z-index: 10;
}

/* 边缘手柄 */
.resize-handle-n {
    top: 0;
    left: 8px;
    right: 8px;
    height: 8px;
    cursor: ns-resize;
}

.resize-handle-s {
    bottom: 0;
    left: 8px;
    right: 8px;
    height: 8px;
    cursor: ns-resize;
}

.resize-handle-e {
    right: 0;
    top: 8px;
    bottom: 8px;
    width: 8px;
    cursor: ew-resize;
}

.resize-handle-w {
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 8px;
    cursor: ew-resize;
}

/* 角落手柄 */
.resize-handle-ne {
    top: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nesw-resize;
}

.resize-handle-nw {
    top: 0;
    left: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
}

.resize-handle-se {
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
}

.resize-handle-sw {
    bottom: 0;
    left: 0;
    width: 16px;
    height: 16px;
    cursor: nesw-resize;
}

/* 调整尺寸时的视觉反馈 */
.sticky-note.resizing {
    user-select: none;
    -webkit-user-select: none;
}

/* 调整尺寸时禁用过渡动画 */
.sticky-note.resizing * {
    transition: none !important;
}
</style>
