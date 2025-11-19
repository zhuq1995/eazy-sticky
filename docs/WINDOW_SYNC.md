# 窗口间数据同步功能

## 概述

窗口间数据同步功能允许多个便签窗口之间实时共享数据变更，确保所有窗口显示一致的内容。

## 功能特性

- **自动广播**: 当一个窗口的数据发生变更时，自动通知其他窗口
- **实时同步**: 其他窗口接收通知后立即刷新显示内容
- **生命周期管理**: 窗口创建时自动订阅事件，关闭时自动取消订阅
- **错误处理**: 同步失败时记录错误但保持窗口当前状态不变

## 使用方法

### 1. 启用窗口间同步

在窗口创建时启用同步：

```typescript
import { useNotesStore } from '@/stores/notes'

const store = useNotesStore()

// 启用窗口间同步
store.enableSync()
```

### 2. 禁用窗口间同步

在窗口关闭时禁用同步：

```typescript
// 禁用窗口间同步
store.disableSync()
```

### 3. 数据变更自动广播

当你使用 store 的方法修改数据时，变更会自动广播到其他窗口：

```typescript
// 添加便签 - 自动广播
const note = store.addNote({ content: '新便签' })

// 更新便签 - 自动广播
store.updateNote(note.id, { content: '更新内容' })

// 删除便签 - 自动广播
store.deleteNote(note.id)
```

### 4. 手动广播自定义事件

如果需要广播自定义事件：

```typescript
// 广播自定义数据变更
await store.broadcastDataChange('custom-event', {
    type: 'custom',
    data: { /* 自定义数据 */ }
})
```

### 5. 订阅自定义事件

订阅和处理自定义事件：

```typescript
// 订阅自定义事件
store.subscribeToDataChanges('custom-event', (data) => {
    console.log('接收到自定义事件:', data)
    // 处理数据
})

// 取消订阅
store.unsubscribeFromDataChanges('custom-event')
```

## 数据同步流程

### 添加便签

```
窗口 A                          主进程                          窗口 B
  │                              │                              │
  │ 1. addNote()                 │                              │
  ├─────────────────────────────>│                              │
  │                              │                              │
  │ 2. broadcast('data-change')  │                              │
  ├─────────────────────────────>│                              │
  │                              │ 3. 转发到所有窗口              │
  │                              ├─────────────────────────────>│
  │                              │                              │
  │                              │ 4. handleDataUpdate()        │
  │                              │                              │ 添加便签到列表
  │                              │                              │
```

### 更新便签

```
窗口 A                          主进程                          窗口 B
  │                              │                              │
  │ 1. updateNote()              │                              │
  ├─────────────────────────────>│                              │
  │                              │                              │
  │ 2. broadcast('data-change')  │                              │
  ├─────────────────────────────>│                              │
  │                              │ 3. 转发到所有窗口              │
  │                              ├─────────────────────────────>│
  │                              │                              │
  │                              │ 4. handleDataUpdate()        │
  │                              │                              │ 更新便签内容
  │                              │                              │
```

### 删除便签

```
窗口 A                          主进程                          窗口 B
  │                              │                              │
  │ 1. deleteNote()              │                              │
  ├─────────────────────────────>│                              │
  │                              │                              │
  │ 2. broadcast('data-change')  │                              │
  ├─────────────────────────────>│                              │
  │                              │ 3. 转发到所有窗口              │
  │                              ├─────────────────────────────>│
  │                              │                              │
  │                              │ 4. handleDataUpdate()        │
  │                              │                              │ 从列表删除便签
  │                              │                              │
```

## 数据更新类型

### add - 添加便签

```typescript
{
    type: 'add',
    note: {
        id: 'note-123',
        content: '新便签',
        // ... 其他字段
    }
}
```

### update - 更新便签

```typescript
{
    type: 'update',
    note: {
        id: 'note-123',
        content: '更新后的内容',
        // ... 其他字段
    }
}
```

### delete - 删除便签

```typescript
{
    type: 'delete',
    noteId: 'note-123'
}
```

### sync - 完全同步

```typescript
{
    type: 'sync',
    notes: [
        { id: 'note-1', /* ... */ },
        { id: 'note-2', /* ... */ }
    ]
}
```

## 错误处理

### 广播失败

当广播失败时，错误会被记录但不会抛出，窗口状态保持不变：

```typescript
// 广播失败时
store.syncError // 包含错误信息
store.notes     // 保持当前状态不变
```

### 处理更新失败

当处理接收到的更新失败时，同样会记录错误但保持状态：

```typescript
// 处理更新失败时
store.syncError // 包含错误信息
store.notes     // 保持当前状态不变
```

## 最佳实践

### 1. 在应用初始化时启用同步

```typescript
// App.vue 或主组件
import { onMounted, onUnmounted } from 'vue'
import { useNotesStore } from '@/stores/notes'

const store = useNotesStore()

onMounted(() => {
    // 启用窗口间同步
    store.enableSync()
})

onUnmounted(() => {
    // 清理：禁用同步
    store.disableSync()
})
```

### 2. 监控同步错误

```typescript
import { watch } from 'vue'

// 监控同步错误
watch(() => store.syncError, (error) => {
    if (error) {
        console.error('同步错误:', error)
        // 可以显示用户提示
    }
})
```

### 3. 检查同步状态

```typescript
// 检查同步是否已启用
if (store.syncEnabled) {
    console.log('窗口间同步已启用')
}

// 检查是否有同步错误
if (store.syncError) {
    console.error('同步错误:', store.syncError)
}
```

## 技术实现

### IPC 通信

窗口间同步使用 Electron 的 IPC（进程间通信）机制：

- **渲染进程 → 主进程**: 使用 `ipcRenderer.invoke()` 发送广播请求
- **主进程 → 渲染进程**: 使用 `webContents.send()` 转发消息到所有窗口
- **事件监听**: 使用 `ipcRenderer.on()` 监听广播事件

### 事件管理

- 使用 `Map` 存储事件处理器引用
- 支持订阅和取消订阅
- 自动包装处理器添加错误处理

### 防重复

- 添加便签时检查 ID 是否已存在
- 避免重复添加相同的便签

## 性能考虑

- **异步广播**: 广播操作是异步的，不会阻塞 UI
- **错误隔离**: 广播失败不影响本地操作
- **最小化数据**: 只传输必要的数据字段
- **防抖保存**: 配合自动保存的防抖机制，避免频繁 I/O

## 相关需求

- **需求 9.1**: 一个窗口的数据改变时通知其他窗口
- **需求 9.2**: 窗口接收到数据更新通知时刷新显示内容
- **需求 9.3**: 窗口创建时订阅全局数据变更事件
- **需求 9.4**: 窗口关闭时取消订阅全局数据变更事件
- **需求 9.5**: 数据同步失败时记录错误并保持窗口当前状态

## 测试

完整的测试套件位于 `src/stores/__tests__/notes.sync.test.ts`，包括：

- 启用和禁用同步
- 数据变更广播
- 接收数据更新
- 错误处理
- 事件订阅生命周期

运行测试：

```bash
npm run test -- src/stores/__tests__/notes.sync.test.ts
```
