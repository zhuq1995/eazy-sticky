# 拖拽和窗口样式文档

## 概述

本文档描述了便签应用中拖拽和窗口功能相关的CSS样式类及其使用方法。

## 拖拽相关样式

### `.dragging`
**用途**: 应用于正在被拖拽的元素
**效果**:
- 光标变为移动图标
- 禁用文本选择
- 透明度降至95%
- 禁用过渡动画以提高性能
- 增强阴影效果

**使用示例**:
```vue
<div :class="{ dragging: isDragging }">
  <!-- 内容 -->
</div>
```

**验证需求**: 1.4, 12.1, 12.2, 12.4

### `.draggable`
**用途**: 应用于可拖拽的元素
**效果**:
- 启用GPU加速（will-change: transform）
- 默认启用平滑过渡动画
- 使用transform而非top/left定位

**使用示例**:
```vue
<div class="draggable" :style="{ transform: `translate(${x}px, ${y}px)` }">
  <!-- 内容 -->
</div>
```

**验证需求**: 12.3, 12.5

### `.drag-handle`
**用途**: 应用于拖拽句柄元素（如标题栏）
**效果**:
- 光标显示为移动图标
- 禁用文本选择
- 激活时光标变为抓取状态

**使用示例**:
```vue
<div class="drag-handle">
  <span>拖拽此处移动窗口</span>
</div>
```

## 窗口置顶样式

### `.always-on-top`
**用途**: 应用于置顶状态的窗口
**效果**:
- 蓝色边框指示置顶状态
- 特殊阴影效果

**使用示例**:
```vue
<div :class="{ 'always-on-top': isAlwaysOnTop }">
  <!-- 窗口内容 -->
</div>
```

**验证需求**: 3.4

### `.pin-button`
**用途**: 应用于置顶按钮
**效果**:
- 默认半透明
- 悬停时完全不透明并放大
- 激活状态显示蓝色

**使用示例**:
```vue
<button 
  class="pin-button" 
  :class="{ active: isAlwaysOnTop }"
  @click="toggleAlwaysOnTop"
>
  📌
</button>
```

## 窗口尺寸调整样式

### 调整句柄类

提供8个调整句柄位置：

- `.resize-handle-top` - 上边缘
- `.resize-handle-right` - 右边缘
- `.resize-handle-bottom` - 下边缘
- `.resize-handle-left` - 左边缘
- `.resize-handle-top-left` - 左上角
- `.resize-handle-top-right` - 右上角
- `.resize-handle-bottom-left` - 左下角
- `.resize-handle-bottom-right` - 右下角

**效果**: 每个句柄显示相应的调整光标

**使用示例**:
```vue
<div class="resize-handle resize-handle-bottom-right"></div>
```

**验证需求**: 8.1

### `.resizing`
**用途**: 应用于正在调整尺寸的窗口
**效果**:
- 禁用文本选择
- 禁用过渡动画

**使用示例**:
```vue
<div :class="{ resizing: isResizing }">
  <!-- 内容 -->
</div>
```

## 窗口动画

### `.window-appear`
**用途**: 窗口创建时的进入动画
**效果**: 从95%缩放到100%，同时淡入

### `.window-disappear`
**用途**: 窗口关闭时的退出动画
**效果**: 从100%缩放到95%，同时淡出

### `.window-minimizing`
**用途**: 窗口最小化动画
**效果**: 缩小到10%并淡出

**使用示例**:
```vue
<Transition name="window">
  <div v-if="visible" class="window-appear">
    <!-- 窗口内容 -->
  </div>
</Transition>
```

## 性能优化样式

### GPU加速
`.draggable` 和 `.resizable` 类自动启用GPU加速：
- `transform: translateZ(0)`
- `backface-visibility: hidden`
- `perspective: 1000px`

**验证需求**: 10.1, 10.2

### 减少重绘
拖拽和调整尺寸时，子元素的指针事件被禁用以减少重绘：
```css
.dragging *, .resizing * {
    pointer-events: none;
}
```

## 辅助样式

### `.no-select`
**用途**: 禁用文本选择
**使用场景**: 拖拽操作期间

### `.window-focused` / `.window-unfocused`
**用途**: 区分聚焦和未聚焦的窗口
**效果**:
- 聚焦窗口: z-index 1000
- 未聚焦窗口: z-index 999, 透明度 90%

## 使用建议

### 1. 拖拽实现
```vue
<template>
  <div 
    class="draggable"
    :class="{ dragging: isDragging }"
    :style="dragStyle"
    @mousedown="startDrag"
  >
    <div class="drag-handle">
      <!-- 标题栏 -->
    </div>
    <!-- 内容 -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const isDragging = ref(false)
const position = ref({ x: 0, y: 0 })

const dragStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`
}))
</script>
```

### 2. 置顶功能
```vue
<template>
  <div :class="{ 'always-on-top': isAlwaysOnTop }">
    <button 
      class="pin-button"
      :class="{ active: isAlwaysOnTop }"
      @click="togglePin"
    >
      📌
    </button>
  </div>
</template>
```

### 3. 尺寸调整
```vue
<template>
  <div :class="{ resizing: isResizing }">
    <!-- 内容 -->
    <div class="resize-handle resize-handle-bottom-right" @mousedown="startResize"></div>
  </div>
</template>
```

## 性能考虑

1. **使用transform**: 所有位置变化都应使用`transform`而非`top/left`
2. **禁用动画**: 拖拽和调整尺寸时禁用过渡动画
3. **GPU加速**: 可拖拽元素自动启用GPU加速
4. **减少重绘**: 操作期间禁用子元素的指针事件

## 浏览器兼容性

所有样式都使用标准CSS属性，兼容现代浏览器：
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

对于旧版浏览器，提供了供应商前缀：
- `-webkit-user-select`
- `-moz-user-select`
- `-ms-user-select`

## 相关文档

- [拖拽功能文档](./DRAG_INTEGRATION.md)
- [窗口功能文档](./ALWAYS_ON_TOP_FEATURE.md)
- [性能优化文档](./PLATFORM_COMPATIBILITY.md)
