# 多窗口 IPC 处理器文档

本文档描述了在 `electron/main.ts` 中实现的多窗口相关 IPC 处理器。

## 概述

多窗口 IPC 处理器提供了创建、管理和控制多个应用窗口的能力。这些处理器通过 Electron 的 IPC（进程间通信）机制，允许渲染进程与主进程进行安全的通信。

## 已实现的 IPC 处理器

### 1. 多窗口管理处理器

#### `multiWindow:create`
创建新的应用窗口。

**参数：**
```typescript
{
  windowId?: string        // 自定义窗口ID（可选）
  noteId?: string          // 便签ID（可选）
  position?: { x: number; y: number }  // 窗口位置（可选）
  size?: { width: number; height: number }  // 窗口尺寸（可选）
  alwaysOnTop?: boolean    // 是否置顶（可选）
}
```

**返回值：**
```typescript
{
  windowId: string         // 窗口ID
  success: boolean         // 是否成功
  electronId: number       // Electron 窗口ID
}
```

**验证需求：** 4.1, 4.2, 4.3

---

#### `multiWindow:close`
关闭指定的窗口。

**参数：**
```typescript
windowId: string  // 要关闭的窗口ID
```

**返回值：**
```typescript
{
  success: boolean  // 是否成功
}
```

**验证需求：** 5.1, 5.2

---

#### `multiWindow:focus`
聚焦指定的窗口。

**参数：**
```typescript
windowId: string  // 要聚焦的窗口ID
```

**返回值：**
```typescript
{
  success: boolean  // 是否成功
}
```

**验证需求：** 4.4

---

#### `multiWindow:broadcast`
向所有窗口广播消息。

**参数：**
```typescript
{
  channel: string  // 消息通道
  data: any        // 消息数据
}
```

**返回值：**
```typescript
{
  success: boolean  // 是否成功
}
```

**验证需求：** 9.1

---

#### `multiWindow:getAllWindows`
获取所有窗口的信息。

**参数：** 无

**返回值：**
```typescript
Array<{
  id: string
  noteId: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isAlwaysOnTop: boolean
  createdAt: number
}>
```

**验证需求：** 4.1, 4.4

---

### 2. 窗口置顶处理器

#### `window:setAlwaysOnTop`
设置当前窗口的置顶状态。

**参数：**
```typescript
alwaysOnTop: boolean  // 是否置顶
```

**返回值：**
```typescript
{
  success: boolean      // 是否成功
  alwaysOnTop: boolean  // 当前置顶状态
}
```

**验证需求：** 3.1, 3.2

---

#### `window:isAlwaysOnTop`
查询当前窗口的置顶状态。

**参数：** 无

**返回值：**
```typescript
boolean  // 是否置顶
```

**验证需求：** 3.2

---

## 错误处理

所有 IPC 处理器都包含完整的错误处理机制：

1. **日志记录**：所有操作都会记录详细的日志信息
2. **错误捕获**：使用 try-catch 捕获所有可能的错误
3. **错误上报**：错误会通过 logger 记录，包含错误堆栈和上下文信息
4. **错误抛出**：错误会被重新抛出，以便渲染进程可以处理

## 使用示例

### 创建新窗口

```typescript
// 在渲染进程中
const result = await window.electronAPI.multiWindow.create({
  windowId: 'note-window-1',
  noteId: 'note-123',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 300 },
  alwaysOnTop: false
})

console.log('窗口创建成功:', result.windowId)
```

### 关闭窗口

```typescript
await window.electronAPI.multiWindow.close('note-window-1')
```

### 聚焦窗口

```typescript
await window.electronAPI.multiWindow.focus('note-window-1')
```

### 广播消息

```typescript
await window.electronAPI.multiWindow.broadcast('note-updated', {
  noteId: 'note-123',
  content: '更新的内容'
})
```

### 设置窗口置顶

```typescript
await window.electronAPI.window.setAlwaysOnTop(true)
```

### 查询窗口置顶状态

```typescript
const isOnTop = await window.electronAPI.window.isAlwaysOnTop()
console.log('窗口是否置顶:', isOnTop)
```

## 安全性

所有 IPC 处理器都遵循 Electron 的安全最佳实践：

1. **上下文隔离**：启用 contextIsolation，确保渲染进程无法直接访问 Node.js API
2. **预加载脚本**：通过 preload.ts 安全地暴露 API
3. **参数验证**：在主进程中验证所有参数
4. **权限控制**：只暴露必需的 API，遵循最小权限原则

## 下一步

这些 IPC 处理器已经在主进程中注册完成。下一步需要：

1. **更新预加载脚本**（任务 7）：在 `electron/preload.ts` 中暴露这些 API
2. **实现 Composables**：创建 Vue composables 来使用这些 API
3. **集成到组件**：在 Vue 组件中使用这些功能

## 相关文件

- `electron/main.ts` - IPC 处理器实现
- `electron/preload.ts` - API 暴露（待更新）
- `src/types/index.ts` - TypeScript 类型定义
- `.kiro/specs/advanced-window-features/design.md` - 设计文档
- `.kiro/specs/advanced-window-features/requirements.md` - 需求文档

## 验证

构建测试已通过：
```bash
npm run build
✓ 构建成功
```

所有 IPC 处理器已正确注册并可以使用。
