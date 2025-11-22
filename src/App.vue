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

    <!-- 根据 URL 参数决定显示哪个组件 -->
    <template v-else>
      <!-- 便利贴窗口 -->
      <NoteWindow v-if="noteId" :noteId="noteId" />
      
      <!-- 主窗口 -->
      <MainWindow v-else />

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainWindow from './components/MainWindow.vue'
import NoteWindow from './components/NoteWindow.vue'
import { useNotesStore } from './stores/notes'

// Store
const notesStore = useNotesStore()

// 便利贴 ID（从 URL 参数获取）
const noteId = ref<string>('')

// 组件挂载时加载数据
onMounted(async () => {
  // 加载数据
  await notesStore.loadFromStorage()

  // 从 URL 参数获取 noteId
  const params = new URLSearchParams(window.location.search)
  noteId.value = params.get('noteId') || ''

  console.log('应用已加载，noteId:', noteId.value || '(主窗口)')
})

// 重试加载
const handleRetry = async () => {
  await notesStore.loadFromStorage()
}
</script>

<style>
/* 根组件样式和布局 */
#app {
  width: 100%;
  height: 100vh;
  position: relative;
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
</style>
