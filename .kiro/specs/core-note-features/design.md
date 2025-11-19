# 设计文档 - 核心便签功能

## 概述

本设计文档描述了 Vue 3 + Electron 便签应用核心便签功能的技术实现方案。该阶段专注于构建单个便签的基础功能，包括组件结构、内容编辑、样式系统和基础交互。

本阶段的核心目标是创建一个功能完整、视觉美观的便签组件，为后续的数据持久化、窗口管理等高级功能提供坚实基础。

### 技术栈

- **前端框架**: Vue 3.4+ (Composition API + `<script setup>`)
- **类型系统**: TypeScript 5.0+
- **样式方案**: 原生 CSS + CSS 变量 + Scoped Styles
- **构建工具**: Vite 5.0+
- **开发规范**: ESLint + Prettier

## 架构

### 整体架构

```
┌─────────────────────────────────────┐
│         index.html (入口)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      src/main.ts (Vue 应用初始化)    │
│  - 创建 Vue 应用实例                 │
│  - 引入全局样式                      │
│  - 挂载根组件                        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      src/App.vue (根组件)            │
│  - 渲染便签组件                      │
│  - 管理便签显示状态                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  src/components/StickyNote.vue      │
│  - 便签 UI 结构                      │
│  - 内容编辑逻辑                      │
│  - 交互事件处理                      │
└─────────────────────────────────────┘
```

### 组件层次结构

```
App.vue (根组件)
  └── StickyNote.vue (便签组件)
        ├── Toolbar (工具栏区域)
        │     └── CloseButton (关闭按钮)
        ├── ContentEditor (内容编辑区)
        └── StatusBar (状态栏)
```

## 组件和接口

### 1. StickyNote.vue 组件

#### Props 接口

```typescript
interface StickyNoteProps {
  // 便签的唯一标识符
  id?: string
  // 初始内容
  initialContent?: string
  // 初始宽度（像素）
  width?: number
  // 初始高度（像素）
  height?: number
}
```

#### Emits 接口

```typescript
interface StickyNoteEmits {
  // 当用户点击关闭按钮时触发
  (e: 'close', id: string): void
  // 当内容改变时触发
  (e: 'update:content', content: string): void
}
```

#### 组件内部状态

```typescript
interface StickyNoteState {
  // 当前编辑的内容
  content: Ref<string>
  // 内容编辑器的 DOM 引用
  editorRef: Ref<HTMLElement | null>
  // 是否显示占位符
  showPlaceholder: ComputedRef<boolean>
}
```

### 2. App.vue 根组件

#### 组件状态

```typescript
interface AppState {
  // 是否显示便签
  showNote: Ref<boolean>
}
```

#### 方法

```typescript
interface AppMethods {
  // 处理便签关闭事件
  handleNoteClose: (id: string) => void
}
```

### 3. 样式系统接口

#### CSS 变量定义

```typescript
interface CSSVariables {
  // 颜色系统
  '--note-bg-start': string      // 便签背景渐变起始色
  '--note-bg-end': string        // 便签背景渐变结束色
  '--note-text-color': string    // 文字颜色
  '--note-border-color': string  // 边框颜色
  '--note-shadow': string        // 阴影效果
  
  // 尺寸系统
  '--note-width': string         // 默认宽度
  '--note-height': string        // 默认高度
  '--note-padding': string       // 内边距
  '--note-border-radius': string // 圆角
  
  // 字体系统
  '--note-font-size': string     // 字体大小
  '--note-line-height': string   // 行高
  '--note-font-family': string   // 字体族
  
  // 工具栏
  '--toolbar-height': string     // 工具栏高度
  '--toolbar-bg': string         // 工具栏背景色
}
```

## 数据模型

### Note 类型（来自阶段1）

```typescript
interface Note {
  id: string
  content: string
  createdAt: number
  updatedAt: number
  position: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
  isPinned: boolean
  style: {
    backgroundColor: string
    fontSize: number
  }
}
```

注：本阶段暂不使用完整的 Note 类型，仅使用 `content` 字段进行内容管理。完整的数据模型将在阶段3（数据持久化）中使用。

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*


### 可测试属性

Property 1: 内容编辑响应式同步
*对于任意* 输入的文本内容，当用户在内容编辑器中输入或修改时，组件的内部状态应该立即更新，并且视图应该实时反映这些变化
**验证需求: 2.2, 7.2, 7.3**

Property 2: 文本编辑操作支持
*对于任意* 文本编辑操作（输入、删除、换行），内容编辑器都应该正确处理并保持文本格式的完整性
**验证需求: 2.3, 2.4**

Property 3: 焦点管理
*对于任意* 便签实例，当用户点击内容区域时，该区域应该获得焦点并允许文本输入
**验证需求: 2.1**

Property 4: 关闭事件流程
*对于任意* 便签实例，当用户点击关闭按钮时，组件应该触发关闭事件，并且在事件处理后从视图中移除
**验证需求: 5.1, 5.2**

Property 5: Props 初始化
*对于任意* 传入的 props（初始内容、宽度、高度），组件应该正确接收并使用这些值初始化内部状态和视图
**验证需求: 7.4, 7.1**

Property 6: 内容溢出处理
*对于任意* 超出可视区域的内容，内容编辑器应该显示滚动条以允许用户查看和编辑所有内容
**验证需求: 6.2**

### 示例测试用例

以下验收标准适合作为具体的示例测试，而非属性测试：

Example 1: 组件结构完整性
验证便签组件渲染后包含工具栏、内容区域和状态栏三个主要区域
**验证需求: 1.1, 1.2**

Example 2: 样式系统应用
验证便签组件应用了正确的视觉样式（黄色渐变背景、阴影效果、胶带装饰）
**验证需求: 3.1, 3.2, 3.3**

Example 3: Vue 应用初始化
验证应用启动时正确创建 Vue 实例、挂载根组件并渲染至少一个便签
**验证需求: 4.1, 4.2, 4.4**

Example 4: 默认尺寸设置
验证便签组件使用预定义的默认宽度和高度
**验证需求: 6.1**

Example 5: 悬停视觉反馈
验证鼠标悬停在关闭按钮上时显示视觉反馈
**验证需求: 5.3**

Example 6: 空状态占位符
验证当内容为空时显示占位符文字
**验证需求: 2.5** (边缘情况)

## 错误处理

### 1. 内容编辑错误

**场景**: 用户输入特殊字符或超长内容

**处理策略**:
- 使用 `contenteditable` 的原生能力处理大部分输入
- 对于超长内容，依赖 CSS `overflow` 属性显示滚动条
- 不对输入内容进行限制，保持用户输入的自由度

### 2. 组件挂载错误

**场景**: DOM 挂载点不存在或已被占用

**处理策略**:
- 在 `main.ts` 中检查挂载点是否存在
- 如果挂载失败，在控制台输出错误信息
- 提供友好的错误提示

```typescript
const app = createApp(App)
const mountPoint = document.getElementById('app')

if (!mountPoint) {
  console.error('挂载点 #app 不存在')
} else {
  app.mount(mountPoint)
}
```

### 3. Props 验证错误

**场景**: 传入的 props 类型不正确

**处理策略**:
- 使用 TypeScript 类型系统在编译时捕获类型错误
- 在组件中提供合理的默认值
- 使用 Vue 的 props 验证功能

```typescript
const props = withDefaults(defineProps<StickyNoteProps>(), {
  id: () => `note-${Date.now()}`,
  initialContent: '',
  width: 300,
  height: 300
})
```

## 测试策略

### 单元测试

本阶段的单元测试主要关注组件的基础功能和交互逻辑。

**测试框架**: Vitest + Vue Test Utils

**测试范围**:

1. **组件渲染测试**
   - 验证组件结构完整性（Example 1）
   - 验证样式系统应用（Example 2）
   - 验证默认尺寸设置（Example 4）

2. **交互测试**
   - 验证焦点管理（Property 3）
   - 验证关闭按钮功能（Property 4）
   - 验证悬停视觉反馈（Example 5）

3. **Props 测试**
   - 验证 props 初始化（Property 5）
   - 验证默认值处理

4. **边缘情况测试**
   - 验证空内容占位符（Example 6）
   - 验证超长内容滚动（Property 6）

### 属性测试

本阶段的属性测试使用 fast-check 库验证通用属性。

**测试框架**: Vitest + fast-check

**配置要求**:
- 每个属性测试至少运行 100 次迭代
- 使用明确的注释标记属性编号和描述

**测试范围**:

1. **Property 1: 内容编辑响应式同步**
   ```typescript
   // Feature: core-note-features, Property 1: 内容编辑响应式同步
   ```
   - 生成随机文本内容
   - 模拟用户输入
   - 验证状态和视图同步

2. **Property 2: 文本编辑操作支持**
   ```typescript
   // Feature: core-note-features, Property 2: 文本编辑操作支持
   ```
   - 生成包含换行符、特殊字符的随机文本
   - 模拟各种编辑操作
   - 验证文本格式保持

3. **Property 3: 焦点管理**
   ```typescript
   // Feature: core-note-features, Property 3: 焦点管理
   ```
   - 生成随机便签实例
   - 模拟点击事件
   - 验证焦点状态

4. **Property 4: 关闭事件流程**
   ```typescript
   // Feature: core-note-features, Property 4: 关闭事件流程
   ```
   - 生成随机便签实例
   - 模拟关闭操作
   - 验证事件触发和组件移除

5. **Property 5: Props 初始化**
   ```typescript
   // Feature: core-note-features, Property 5: Props 初始化
   ```
   - 生成随机 props 值
   - 挂载组件
   - 验证状态初始化

6. **Property 6: 内容溢出处理**
   ```typescript
   // Feature: core-note-features, Property 6: 内容溢出处理
   ```
   - 生成超长随机文本
   - 验证滚动条显示

### 测试组织

```
src/
  components/
    StickyNote.vue
    StickyNote.test.ts        # 单元测试
    StickyNote.property.test.ts  # 属性测试
  App.vue
  App.test.ts                 # 单元测试
```

### 测试覆盖率目标

- 组件代码覆盖率: ≥ 80%
- 关键交互逻辑覆盖率: 100%
- 属性测试迭代次数: ≥ 100 次/属性

## 实现细节

### 1. StickyNote.vue 组件实现

#### 模板结构

```vue
<template>
  <div class="sticky-note">
    <!-- 胶带装饰 -->
    <div class="tape"></div>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <button class="close-btn" @click="handleClose" aria-label="关闭便签">
        ×
      </button>
    </div>
    
    <!-- 内容编辑区 -->
    <div
      ref="editorRef"
      class="content-editor"
      contenteditable="true"
      @input="handleInput"
      @focus="handleFocus"
      :data-placeholder="showPlaceholder ? '在这里输入...' : ''"
    >
      {{ content }}
    </div>
    
    <!-- 状态栏 -->
    <div class="status-bar">
      <span class="char-count">{{ content.length }} 字符</span>
    </div>
  </div>
</template>
```

#### 脚本逻辑

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  id?: string
  initialContent?: string
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  id: () => `note-${Date.now()}`,
  initialContent: '',
  width: 300,
  height: 300
})

interface Emits {
  (e: 'close', id: string): void
  (e: 'update:content', content: string): void
}

const emit = defineEmits<Emits>()

// 响应式状态
const content = ref(props.initialContent)
const editorRef = ref<HTMLElement | null>(null)

// 计算属性
const showPlaceholder = computed(() => content.value.trim() === '')

// 事件处理
const handleInput = (e: Event) => {
  const target = e.target as HTMLElement
  content.value = target.textContent || ''
  emit('update:content', content.value)
}

const handleClose = () => {
  emit('close', props.id)
}

const handleFocus = () => {
  // 焦点处理逻辑（如果需要）
}

// 生命周期
onMounted(() => {
  if (editorRef.value && props.initialContent) {
    editorRef.value.textContent = props.initialContent
  }
})
</script>
```

#### 样式实现

```vue
<style scoped>
.sticky-note {
  position: relative;
  width: var(--note-width, 300px);
  height: var(--note-height, 300px);
  background: linear-gradient(
    135deg,
    var(--note-bg-start, #fef9e7),
    var(--note-bg-end, #fef5d4)
  );
  border-radius: var(--note-border-radius, 4px);
  box-shadow: var(--note-shadow, 2px 2px 8px rgba(0, 0, 0, 0.15));
  padding: var(--note-padding, 16px);
  display: flex;
  flex-direction: column;
  font-family: var(--note-font-family, 'Segoe UI', sans-serif);
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

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: flex-end;
  height: var(--toolbar-height, 24px);
  margin-bottom: 8px;
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
</style>
```

### 2. App.vue 根组件实现

```vue
<template>
  <div id="app">
    <StickyNote
      v-if="showNote"
      id="note-1"
      initial-content=""
      @close="handleNoteClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StickyNote from './components/StickyNote.vue'

const showNote = ref(true)

const handleNoteClose = (id: string) => {
  console.log(`关闭便签: ${id}`)
  showNote.value = false
}
</script>

<style>
#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}
</style>
```

### 3. main.ts 应用入口

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)

const mountPoint = document.getElementById('app')
if (!mountPoint) {
  console.error('挂载点 #app 不存在')
} else {
  app.mount(mountPoint)
}
```

### 4. 样式系统文件

#### src/styles/variables.css

```css
:root {
  /* 颜色系统 */
  --note-bg-start: #fef9e7;
  --note-bg-end: #fef5d4;
  --note-text-color: #333;
  --note-border-color: #e0e0e0;
  --note-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);
  
  /* 尺寸系统 */
  --note-width: 300px;
  --note-height: 300px;
  --note-padding: 16px;
  --note-border-radius: 4px;
  
  /* 字体系统 */
  --note-font-size: 14px;
  --note-line-height: 1.6;
  --note-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  
  /* 工具栏 */
  --toolbar-height: 24px;
  --toolbar-bg: transparent;
}
```

#### src/styles/main.css

```css
@import './variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--note-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100vw;
  height: 100vh;
}
```

## 性能考虑

### 1. 响应式更新优化

- 使用 `v-if` 而非 `v-show` 控制便签显示，减少不必要的 DOM 节点
- 内容编辑使用原生 `contenteditable`，避免复杂的虚拟 DOM diff

### 2. 事件处理优化

- 使用事件委托减少事件监听器数量
- 避免在 `@input` 事件中执行复杂计算

### 3. 样式性能

- 使用 CSS 变量实现主题系统，避免运行时样式计算
- 使用 `scoped` CSS 确保样式隔离，提高渲染性能

## 可访问性

### 1. 键盘导航

- 关闭按钮可通过 Tab 键聚焦
- 支持 Enter 键激活关闭按钮
- 内容编辑区支持标准键盘操作

### 2. ARIA 属性

- 关闭按钮添加 `aria-label` 描述
- 内容编辑区添加 `role="textbox"` 语义

### 3. 视觉对比度

- 确保文字和背景的对比度符合 WCAG AA 标准
- 按钮悬停状态有明显的视觉反馈

## 未来扩展

本阶段实现的核心便签功能为后续阶段奠定基础：

1. **阶段3 - 数据持久化**: 集成 Pinia store，实现内容自动保存
2. **阶段4 - Electron 集成**: 将便签渲染为独立窗口
3. **阶段5 - 高级窗口功能**: 添加拖拽、置顶等窗口操作
4. **阶段6 - 系统集成**: 实现系统托盘、快捷键等功能

### 预留接口

- `@update:content` 事件为数据持久化预留
- Props 中的 `width` 和 `height` 为窗口管理预留
- 组件 `id` 为多便签管理预留

## 总结

本设计文档详细描述了核心便签功能的实现方案，包括：

- 清晰的组件架构和接口定义
- 完整的正确性属性和测试策略
- 详细的实现代码和样式系统
- 错误处理和性能优化方案

通过本阶段的实现，我们将获得一个功能完整、视觉美观、可测试的便签组件，为后续阶段的开发提供坚实基础。
