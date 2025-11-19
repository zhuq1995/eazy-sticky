# Electron 集成文档

## 概述

本文档描述了 Vue 应用与 Electron 的集成实现，包括环境检测、窗口操作和降级处理。

## 实现的功能

### 1. 环境检测

应用能够自动检测是否运行在 Electron 环境中：

```typescript
const { isElectron } = useElectron()

if (isElectron.value) {
  // Electron 环境特定逻辑
} else {
  // 浏览器环境特定逻辑
}
```

### 2. 窗口操作集成

在 `StickyNote.vue` 组件中集成了 Electron 窗口操作：

- **Electron 环境**：点击关闭按钮会关闭整个应用窗口
- **浏览器环境**：点击关闭按钮会触发 `close` 事件，由父组件处理

```typescript
const handleClose = async () => {
  if (isElectron.value) {
    try {
      await closeWindow()
    } catch (error) {
      // 降级处理：如果 Electron API 失败，触发普通关闭事件
      emit('close', props.id)
    }
  } else {
    emit('close', props.id)
  }
}
```

### 3. 环境指示器

在 `App.vue` 中添加了环境指示器，显示当前运行环境：

- 在状态栏显示 "⚡ Electron" 徽章（仅在 Electron 环境中）
- 鼠标悬停显示平台信息（win32、darwin、linux）

### 4. 降级处理

实现了完善的降级处理机制：

1. **环境检测降级**：如果 `electronAPI` 不可用，自动切换到浏览器模式
2. **API 调用降级**：如果 Electron API 调用失败，回退到标准的事件触发机制
3. **错误处理**：所有 Electron API 调用都包含 try-catch 错误处理

## 测试覆盖

### 单元测试

创建了 `StickyNote.electron.test.ts` 测试文件，覆盖以下场景：

1. **浏览器环境测试**
   - 组件正常渲染
   - 关闭按钮触发 close 事件

2. **Electron 环境测试**
   - 调用 Electron closeWindow API
   - API 失败时的降级处理

3. **内容编辑测试**
   - 在两种环境中都能正常编辑内容

### 测试结果

所有 60 个测试通过：
- 原有测试：55 个 ✓
- 新增 Electron 集成测试：5 个 ✓

## 兼容性

### 支持的环境

- ✅ Electron 环境（Windows、macOS、Linux）
- ✅ 现代浏览器（Chrome、Firefox、Safari、Edge）
- ✅ 开发环境（Vite dev server）
- ✅ 生产环境（构建后的静态文件）

### 平台支持

- **Windows** (win32)
- **macOS** (darwin)
- **Linux** (linux)

## 使用示例

### 在组件中使用 Electron API

```vue
<script setup lang="ts">
import { useElectron } from '@/composables/useElectron'

const { 
  isElectron, 
  platform, 
  closeWindow,
  minimizeWindow,
  windowPosition,
  windowSize 
} = useElectron()

// 检查环境
if (isElectron.value) {
  console.log('运行在 Electron 环境中')
  console.log('平台:', platform.value)
}

// 窗口操作
const handleClose = async () => {
  if (isElectron.value) {
    await closeWindow()
  }
}
</script>
```

## 验证需求

本实现满足以下需求：

- ✅ **需求 1.3**: 浏览器窗口加载 Vue 应用
- ✅ **需求 3.5**: 渲染进程访问 Electron API

## 后续改进

1. **窗口拖拽**：实现自定义标题栏的窗口拖拽功能
2. **窗口状态持久化**：保存和恢复窗口位置和尺寸
3. **多窗口支持**：支持创建和管理多个便签窗口
4. **系统托盘**：添加系统托盘图标和菜单
5. **全局快捷键**：支持全局快捷键操作

## 相关文件

- `src/composables/useElectron.ts` - Electron composable
- `src/components/StickyNote.vue` - 便签组件（集成 Electron）
- `src/App.vue` - 主应用组件（环境指示器）
- `src/components/__tests__/StickyNote.electron.test.ts` - Electron 集成测试
- `electron/main.ts` - Electron 主进程
- `electron/preload.ts` - 预加载脚本
