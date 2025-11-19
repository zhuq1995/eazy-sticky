# StickyNote 拖拽功能集成文档

## 概述

本文档记录了 StickyNote 组件集成拖拽功能的实现细节。

## 实现的需求

### 核心拖拽功能
- **需求 1.1**: 鼠标按下开始拖拽操作
- **需求 1.2**: 鼠标移动时实时更新窗口位置
- **需求 1.3**: 鼠标释放结束拖拽操作并保存位置
- **需求 1.4**: 拖拽状态的视觉反馈
- **需求 1.5**: 可编辑区域不触发拖拽

### 窗口状态持久化
- **需求 7.1**: 拖拽结束后保存窗口位置
- **需求 7.2**: 应用重启时恢复窗口位置
- **需求 7.3**: 使用保存的位置创建窗口

## 实现细节

### 1. 集成的 Composables

#### useDraggable
提供拖拽功能的核心逻辑：
- 拖拽状态管理
- 边界限制
- 性能优化（requestAnimationFrame）
- 防抖保存

#### useWindow
提供窗口状态管理：
- 窗口位置和尺寸管理
- 状态持久化
- 边界检查

### 2. 拖拽句柄

工具栏（`.toolbar`）被设置为拖拽句柄：
```vue
<div ref="toolbarRef" class="toolbar">
    <button class="close-btn" @click="handleClose">×</button>
</div>
```

### 3. 可编辑区域保护

内容编辑区（`.content-editor`）不会触发拖拽：
```vue
<div ref="editorRef" class="content-editor" contenteditable="true">
    <!-- 内容 -->
</div>
```

### 4. 视觉反馈

拖拽时添加 `.dragging` CSS 类：
```css
.sticky-note.dragging {
    cursor: move;
    box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.3);
    opacity: 0.95;
    z-index: 1000;
}
```

### 5. 样式组合

组合基础样式和拖拽样式：
```typescript
const combinedStyle = computed(() => ({
    ...noteStyle.value,
    ...dragStyle.value
}))
```

## 使用方式

### 在浏览器环境中

1. 鼠标悬停在工具栏上，光标变为 `move`
2. 按住鼠标左键并拖动
3. 释放鼠标完成拖拽

### 在 Electron 环境中

1. 与浏览器环境相同的拖拽操作
2. 拖拽结束后自动保存窗口位置
3. 下次启动时恢复到上次的位置

## 测试覆盖

### 单元测试
- `StickyNote.electron.test.ts`: Electron 集成测试（5个测试）
- `StickyNote.drag.test.ts`: 拖拽功能测试（5个测试）

### 测试场景
1. 工具栏作为拖拽句柄
2. 拖拽时的视觉反馈
3. 可编辑区域不触发拖拽
4. 样式正确应用
5. 浏览器环境兼容性

## 性能优化

1. **requestAnimationFrame**: 使用 RAF 优化拖拽渲染性能
2. **防抖保存**: 拖拽结束后延迟 500ms 保存位置
3. **CSS Transform**: 使用 `transform` 而非 `top/left` 进行位置变换
4. **过渡动画控制**: 拖拽时禁用过渡，结束后恢复

## 边界限制

- 左边界: x >= 0
- 上边界: y >= 0
- 右边界: x <= screenWidth - 50px
- 下边界: y <= screenHeight - 50px

最小可见区域保证为 50 像素。

## 已知限制

1. 在测试环境中无法验证 scoped CSS 样式
2. 拖拽功能依赖于 DOM 事件，需要在挂载后才能使用

## 后续改进

1. 添加拖拽动画效果
2. 支持触摸设备的拖拽
3. 添加拖拽吸附功能
4. 支持多窗口拖拽协调

## 相关文件

- `src/components/StickyNote.vue`: 主组件
- `src/composables/useDraggable.ts`: 拖拽 composable
- `src/composables/useWindow.ts`: 窗口操作 composable
- `src/components/__tests__/StickyNote.drag.test.ts`: 拖拽测试
- `src/components/__tests__/StickyNote.electron.test.ts`: Electron 集成测试
