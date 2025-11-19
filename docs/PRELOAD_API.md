# Electron 预加载脚本 API 文档

## 概述

预加载脚本（`electron/preload.ts`）在渲染进程和主进程之间建立安全的通信桥梁，通过 `contextBridge` 暴露受限的 Electron API 给渲染进程。

## 安全特性

- ✅ **上下文隔离**：启用 `contextIsolation: true`
- ✅ **禁用 Node.js 集成**：`nodeIntegration: false`
- ✅ **沙箱模式**：`sandbox: true`
- ✅ **最小权限原则**：只暴露必需的 API

## API 接口

### window - 窗口操作 API

#### `window.close()`
关闭当前窗口

```typescript
await window.electronAPI.window.close()
```

#### `window.minimize()`
最小化当前窗口

```typescript
await window.electronAPI.window.minimize()
```

#### `window.maximize()`
最大化/恢复当前窗口

```typescript
await window.electronAPI.window.maximize()
```

#### `window.getPosition()`
获取窗口位置

```typescript
const { x, y } = await window.electronAPI.window.getPosition()
console.log(`窗口位置: (${x}, ${y})`)
```

#### `window.setPosition(x, y)`
设置窗口位置

```typescript
await window.electronAPI.window.setPosition(100, 100)
```

#### `window.getSize()`
获取窗口尺寸

```typescript
const { width, height } = await window.electronAPI.window.getSize()
console.log(`窗口尺寸: ${width}x${height}`)
```

#### `window.setSize(width, height)`
设置窗口尺寸

```typescript
await window.electronAPI.window.setSize(400, 400)
```

### system - 系统信息 API

#### `system.platform`
当前操作系统平台（同步属性）

```typescript
const platform = window.electronAPI.system.platform
// 可能的值: 'win32' | 'darwin' | 'linux'
```

#### `system.getVersion()`
获取应用版本号

```typescript
const version = await window.electronAPI.system.getVersion()
console.log(`应用版本: ${version}`)
```

#### `system.getVersions()`
获取 Electron、Node.js 和 Chrome 的版本信息

```typescript
const versions = await window.electronAPI.system.getVersions()
console.log('Electron:', versions.electron)
console.log('Node.js:', versions.node)
console.log('Chrome:', versions.chrome)
```

#### `system.getPath(name)`
获取应用路径

```typescript
const userDataPath = await window.electronAPI.system.getPath('userData')
const homePath = await window.electronAPI.system.getPath('home')
```

支持的路径名称：
- `home` - 用户主目录
- `appData` - 应用数据目录
- `userData` - 用户数据目录
- `temp` - 临时目录
- `desktop` - 桌面目录
- `documents` - 文档目录
- `downloads` - 下载目录

### 事件监听 API

#### `on(channel, callback)`
监听主进程发送的事件

```typescript
window.electronAPI.on('custom-event', (data) => {
    console.log('收到事件:', data)
})
```

#### `off(channel, callback)`
取消监听事件

```typescript
const handler = (data) => {
    console.log('收到事件:', data)
}

// 注册监听
window.electronAPI.on('custom-event', handler)

// 取消监听
window.electronAPI.off('custom-event', handler)
```

## 使用示例

### 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const platform = ref('')
const windowPosition = ref({ x: 0, y: 0 })

onMounted(async () => {
    // 检查是否在 Electron 环境
    if (window.electronAPI) {
        // 获取平台信息
        platform.value = window.electronAPI.system.platform
        
        // 获取窗口位置
        windowPosition.value = await window.electronAPI.window.getPosition()
    }
})

// 关闭窗口
const closeWindow = async () => {
    await window.electronAPI.window.close()
}

// 移动窗口
const moveWindow = async (x: number, y: number) => {
    await window.electronAPI.window.setPosition(x, y)
}
</script>
```

### 在 Composable 中使用

```typescript
// composables/useElectron.ts
import { ref, computed, onMounted } from 'vue'

export function useElectron() {
    const isElectron = computed(() => {
        return typeof window !== 'undefined' && 'electronAPI' in window
    })
    
    const platform = ref<string>('')
    
    onMounted(async () => {
        if (!isElectron.value) return
        
        platform.value = window.electronAPI.system.platform
    })
    
    const closeWindow = async () => {
        if (!isElectron.value) return
        await window.electronAPI.window.close()
    }
    
    return {
        isElectron,
        platform,
        closeWindow
    }
}
```

## 类型定义

所有 API 的类型定义位于 `src/types/index.ts` 中的 `ElectronAPI` 接口。

```typescript
interface ElectronAPI {
    window: {
        close: () => Promise<void>
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        getPosition: () => Promise<{ x: number; y: number }>
        setPosition: (x: number, y: number) => Promise<void>
        getSize: () => Promise<{ width: number; height: number }>
        setSize: (width: number, height: number) => Promise<void>
    }
    
    system: {
        platform: string
        getVersion: () => Promise<string>
        getVersions: () => Promise<NodeJS.ProcessVersions>
        getPath: (name: string) => Promise<string>
    }
    
    on: (channel: string, callback: (...args: any[]) => void) => void
    off: (channel: string, callback: (...args: any[]) => void) => void
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
```

## 安全注意事项

1. **只暴露必需的 API**：预加载脚本只暴露了应用需要的最小 API 集合
2. **输入验证**：主进程中的 IPC 处理器会验证所有输入参数
3. **错误处理**：所有 API 调用都有完善的错误处理机制
4. **上下文隔离**：渲染进程无法直接访问 Node.js 或 Electron 的内部 API

## 调试

在开发环境中，预加载脚本会输出日志信息：

```
[Preload] Electron 预加载脚本已加载
[Preload] Electron API 已成功暴露到渲染进程
```

可以在开发者工具的控制台中查看这些日志。

## 相关文件

- `electron/preload.ts` - 预加载脚本源代码
- `electron/main.ts` - 主进程和 IPC 处理器
- `src/types/index.ts` - TypeScript 类型定义
- `electron/IPC_HANDLERS.md` - IPC 处理器文档
