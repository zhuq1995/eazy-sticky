<template>
  <div id="app">
    <!-- 加载状态 -->
    <div v-if="notesStore.isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="notesStore.error" class="error-overlay">
      <div class="error-message">
        <h3>⚠️ 加载失败</h3>
        <p>{{ notesStore.error }}</p>
        <button @click="handleRetry" class="retry-btn">重试</button>
      </div>
    </div>

    <!-- 便签列表 -->
    <template v-else>
      <!-- 渲染所有便签 -->
      <StickyNote v-for="note in notesStore.sortedNotes" :key="note.id" :id="note.id" :initial-content="note.content"
        :width="note.size.width" :height="note.size.height" @close="handleNoteClose"
        @update:content="(content) => handleNoteUpdate(note.id, content)" />

      <!-- 添加便签按钮 -->
      <button @click="handleAddNote" class="add-note-btn" aria-label="添加新便签">
        +
      </button>

      <!-- 多窗口创建按钮 (仅在 Electron 环境显示) -->
      <button v-if="isElectron" @click="handleCreateWindow" class="create-window-btn" :disabled="!canCreateWindow"
        :aria-label="canCreateWindow ? '创建新窗口' : '已达到窗口数量上限'" :title="windowLimitMessage">
        <span class="window-icon">🪟</span>
      </button>

      <!-- 窗口列表 (仅在 Electron 环境且有多个窗口时显示) -->
      <div v-if="isElectron && windows.length > 0" class="window-list">
        <div class="window-list-header">
          <span>窗口列表</span>
          <span class="window-count">{{ windowLimitMessage }}</span>
        </div>
        <div class="window-list-items">
          <div v-for="window in windows" :key="window.id" class="window-item" @click="handleFocusWindow(window.id)">
            <div class="window-item-info">
              <span class="window-item-id">{{ window.id.slice(-8) }}</span>
              <span class="window-item-note">便签 #{{ window.noteId.slice(-4) }}</span>
            </div>
            <button @click.stop="handleCloseWindow(window.id)" class="window-item-close" aria-label="关闭窗口">
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 状态栏：显示便签统计 -->
      <div class="status-info">
        <span>总计: {{ notesStore.totalNotes }}</span>
        <span v-if="notesStore.pinnedCount > 0">置顶: {{ notesStore.pinnedCount }}</span>
        <span v-if="notesStore.lastSaved" class="last-saved">
          最后保存: {{ formatTime(notesStore.lastSaved) }}
        </span>
        <!-- Electron 环境指示器 -->
        <span v-if="isElectron" class="electron-badge" :title="`平台: ${platform}`">
          ⚡ Electron
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import StickyNote from './components/StickyNote.vue'
import { useNotesStore } from './stores/notes'
import { useElectron } from './composables/useElectron'
import { useMultiWindow } from './composables/useMultiWindow'

// 使用 Pinia store
const notesStore = useNotesStore()

// ==================== Electron 集成 ====================
// 需求: 1.3 - 浏览器窗口加载 Vue 应用
// 需求: 3.5 - 渲染进程访问 Electron API
const { isElectron, platform } = useElectron()

// ==================== 多窗口管理 ====================
// 需求: 4.1, 4.2, 4.3, 4.4, 4.5 - 多窗口创建和管理
const {
  windows,
  canCreateWindow,
  maxWindows,
  createWindow,
  closeWindow,
  focusWindow
} = useMultiWindow()

// 计算窗口数量限制提示
const windowLimitMessage = computed(() => {
  if (windows.value.length >= maxWindows) {
    return `已达到窗口数量上限 (${maxWindows})`
  }
  return `窗口: ${windows.value.length}/${maxWindows}`
})

// 组件挂载时加载数据
onMounted(async () => {
  await notesStore.loadFromStorage()

  // 在 Electron 环境中记录环境信息
  if (isElectron.value) {
    console.log('应用运行在 Electron 环境中')
    console.log('平台:', platform.value)
  } else {
    console.log('应用运行在浏览器环境中')
  }
})

// 添加新便签
const handleAddNote = () => {
  notesStore.addNote()
}

// 创建新窗口
// 需求: 4.1 - 创建新的窗口实例
const handleCreateWindow = async () => {
  // 需求: 4.5 - 检查窗口数量限制
  if (!canCreateWindow.value) {
    alert(`已达到窗口数量上限 (${maxWindows})`)
    return
  }

  try {
    // 创建新便签
    const note = notesStore.addNote()

    // 需求: 4.1, 4.2, 4.3 - 创建新窗口并分配唯一ID和位置偏移
    const windowId = await createWindow(note.id)

    console.log(`创建新窗口成功: ${windowId}`)
  } catch (error) {
    console.error('创建窗口失败:', error)
    alert(`创建窗口失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 关闭便签
const handleNoteClose = (id: string) => {
  notesStore.deleteNote(id)
}

// 更新便签内容
const handleNoteUpdate = (id: string, content: string) => {
  notesStore.updateNote(id, { content })
}

// 重试加载
const handleRetry = async () => {
  await notesStore.loadFromStorage()
}

// 聚焦窗口
const handleFocusWindow = async (windowId: string) => {
  try {
    await focusWindow(windowId)
  } catch (error) {
    console.error('聚焦窗口失败:', error)
  }
}

// 关闭窗口
const handleCloseWindow = async (windowId: string) => {
  try {
    await closeWindow(windowId)
  } catch (error) {
    console.error('关闭窗口失败:', error)
  }
}

// 格式化时间显示
const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}
</script>

<style>
/* 根组件样式和布局 */
#app {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: #f0f0f0;
  overflow: hidden;
}

/* 加载状态样式 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e0e0e0;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay p {
  margin-top: 16px;
  color: #666;
  font-size: 14px;
}

/* 错误状态样式 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  z-index: 1000;
}

.error-message {
  background: white;
  padding: 32px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 400px;
}

.error-message h3 {
  margin: 0 0 16px 0;
  color: #d32f2f;
  font-size: 20px;
}

.error-message p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.retry-btn {
  background: #1976d2;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #1565c0;
}

/* 添加便签按钮 */
.add-note-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1976d2;
  color: white;
  border: none;
  font-size: 32px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.add-note-btn:hover {
  background: #1565c0;
  transform: scale(1.1);
}

.add-note-btn:active {
  transform: scale(0.95);
}

/* 状态栏 */
.status-info {
  position: fixed;
  bottom: 16px;
  left: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  z-index: 100;
}

.status-info span {
  display: flex;
  align-items: center;
}

.last-saved {
  color: #999;
}

.electron-badge {
  color: #1976d2;
  font-weight: 500;
  cursor: help;
}

/* 创建窗口按钮 */
.create-window-btn {
  position: fixed;
  bottom: 104px;
  right: 32px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #4caf50;
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.create-window-btn:hover:not(:disabled) {
  background: #45a049;
  transform: scale(1.1);
}

.create-window-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.create-window-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.window-icon {
  font-size: 24px;
}

/* 窗口列表 */
.window-list {
  position: fixed;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 320px;
  max-height: 400px;
  overflow: hidden;
  z-index: 200;
  backdrop-filter: blur(10px);
}

.window-list-header {
  padding: 12px 16px;
  background: #1976d2;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}

.window-count {
  font-size: 12px;
  opacity: 0.9;
}

.window-list-items {
  max-height: 340px;
  overflow-y: auto;
}

.window-item {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;
}

.window-item:hover {
  background: #f5f5f5;
}

.window-item:last-child {
  border-bottom: none;
}

.window-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.window-item-id {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.window-item-note {
  font-size: 13px;
  color: #333;
}

.window-item-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  line-height: 1;
}

.window-item-close:hover {
  background: #f44336;
  color: white;
}

/* 滚动条样式 */
.window-list-items::-webkit-scrollbar {
  width: 6px;
}

.window-list-items::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.window-list-items::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.window-list-items::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
