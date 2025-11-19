/**
 * Vue 应用入口文件
 * 
 * 职责：
 * - 创建 Vue 应用实例
 * - 注册 Pinia 状态管理
 * - 引入全局样式文件
 * - 加载持久化数据
 * - 挂载应用到 DOM
 * - 处理挂载错误
 * 
 * 需求: 1.1, 1.3, 1.4, 4.1, 4.2, 4.3
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useNotesStore } from './stores/notes'
import './styles/main.css'

// 创建 Vue 应用实例
const app = createApp(App)

// 需求 1.1: 创建 Pinia 实例并注册到 Vue 应用
const pinia = createPinia()
app.use(pinia)

/**
 * 初始化应用
 * 需求 1.3, 1.4: 在应用启动时加载持久化数据
 */
async function initializeApp() {
  // 获取挂载点
  const mountPoint = document.getElementById('app')

  if (!mountPoint) {
    // 挂载点不存在时的错误处理
    console.error('错误: 挂载点 #app 不存在，无法启动应用')

    // 在页面上显示友好的错误提示
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: 'Segoe UI', sans-serif;
        color: #333;
        background: #f0f0f0;
      ">
        <div style="
          text-align: center;
          padding: 32px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
          <h1 style="color: #e74c3c; margin-bottom: 16px;">应用启动失败</h1>
          <p style="color: #666;">挂载点 #app 不存在，请检查 index.html 文件</p>
        </div>
      </div>
    `
    return
  }

  try {
    // 挂载应用到 DOM
    app.mount(mountPoint)
    console.log('Vue 应用已成功挂载')

    // 需求 1.3, 1.4: 在应用启动时调用 loadFromStorage
    // 获取 store 实例并加载数据
    const notesStore = useNotesStore()

    console.log('正在加载持久化数据...')
    await notesStore.loadFromStorage()

    // 需求 1.4: 加载状态处理
    if (notesStore.error) {
      console.warn('数据加载时出现错误，使用默认状态:', notesStore.error)
      // 错误已经在 store 中处理，应用可以继续运行
    } else {
      console.log('数据加载完成，应用已就绪')
    }

  } catch (error) {
    // 挂载或初始化过程中的错误处理
    console.error('错误: 应用初始化失败', error)

    // 显示错误信息
    mountPoint.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: 'Segoe UI', sans-serif;
        color: #333;
        background: #f0f0f0;
      ">
        <div style="
          text-align: center;
          padding: 32px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
          <h1 style="color: #e74c3c; margin-bottom: 16px;">应用初始化失败</h1>
          <p style="color: #666;">请查看控制台获取详细错误信息</p>
          <p style="color: #999; margin-top: 8px; font-size: 14px;">${error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    `
  }
}

// 启动应用
initializeApp()
