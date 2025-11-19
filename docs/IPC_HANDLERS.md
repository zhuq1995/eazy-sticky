# IPC 处理器实现文档

## 概述

本文档记录了 Electron 主进程中实现的所有 IPC 处理器。

## 已实现的 IPC 处理器

### 窗口操作处理器

#### 1. window:close
- **功能**: 关闭当前窗口
- **参数**: 无
- **返回**: Promise<void>
- **错误处理**: 捕获并记录错误，抛出异常

#### 2. window:minimize
- **功能**: 最小化当前窗口
- **参数**: 无
- **返回**: Promise<void>
- **错误处理**: 捕获并记录错误，抛出异常

#### 3. window:maximize
- **功能**: 最大化/还原当前窗口（切换状态）
- **参数**: 无
- **返回**: Promise<void>
- **错误处理**: 捕获并记录错误，抛出异常

#### 4. window:getPosition
- **功能**: 获取当前窗口位置
- **参数**: 无
- **返回**: Promise<{ x: number, y: number }>
- **错误处理**: 捕获并记录错误，抛出异常

#### 5. window:setPosition
- **功能**: 设置当前窗口位置
- **参数**: x: number, y: number
- **返回**: Promise<void>
- **错误处理**: 捕获并记录错误，抛出异常

#### 6. window:getSize
- **功能**: 获取当前窗口尺寸
- **参数**: 无
- **返回**: Promise<{ width: number, height: number }>
- **错误处理**: 捕获并记录错误，抛出异常

#### 7. window:setSize
- **功能**: 设置当前窗口尺寸
- **参数**: width: number, height: number
- **返回**: Promise<void>
- **错误处理**: 捕获并记录错误，抛出异常

### 系统信息处理器

#### 8. system:getPlatform
- **功能**: 获取操作系统平台标识符
- **参数**: 无
- **返回**: Promise<string> (win32 | darwin | linux)
- **错误处理**: 捕获并记录错误，抛出异常

#### 9. system:getVersion
- **功能**: 获取应用版本号
- **参数**: 无
- **返回**: Promise<string>
- **错误处理**: 捕获并记录错误，抛出异常

#### 10. system:getVersions
- **功能**: 获取 Electron、Node.js、Chrome 等版本信息
- **参数**: 无
- **返回**: Promise<NodeJS.ProcessVersions>
- **错误处理**: 捕获并记录错误，抛出异常

#### 11. system:getPath
- **功能**: 获取应用相关路径
- **参数**: name: string (如 'userData', 'appData', 'temp' 等)
- **返回**: Promise<string>
- **错误处理**: 捕获并记录错误，抛出异常

## 日志系统

### Logger 类

实现了完整的日志系统，支持以下日志级别：

- **DEBUG**: 调试信息（仅开发环境）
- **INFO**: 一般信息
- **WARN**: 警告信息
- **ERROR**: 错误信息

### 日志方法

- `logger.debug(message, context?)`: 记录调试信息
- `logger.info(message, context?)`: 记录一般信息
- `logger.warn(message, context?)`: 记录警告信息
- `logger.error(message, error?, context?)`: 记录错误信息

## 主进程到渲染进程通信

### sendToRenderer 函数

- **功能**: 向渲染进程发送消息
- **参数**: 
  - window: BrowserWindow - 目标窗口
  - channel: string - 消息通道
  - data?: any - 消息数据
- **错误处理**: 捕获并记录错误

## 错误处理

### 全局错误处理

1. **未捕获的异常** (uncaughtException)
   - 记录错误信息和堆栈
   - 包含错误类型和时间戳

2. **未处理的 Promise 拒绝** (unhandledRejection)
   - 记录拒绝原因
   - 包含 Promise 引用和时间戳

### IPC 错误处理

所有 IPC 处理器都包含 try-catch 错误处理：
- 捕获异常
- 记录详细错误信息（包括通道名称和参数）
- 抛出异常给调用方

## 验证需求

本实现满足以下需求：

- ✅ 需求 4.1: 渲染进程发送 IPC 消息，主进程接收并处理
- ✅ 需求 4.2: 主进程处理完 IPC 请求后返回响应
- ✅ 需求 4.3: IPC 通信发生错误时记录错误信息并返回错误响应
- ✅ 需求 4.4: 渲染进程调用异步 IPC 方法返回 Promise 对象
- ✅ 需求 4.5: 主进程能够主动发送消息到渲染进程
- ✅ 需求 6.1: 渲染进程请求关闭窗口
- ✅ 需求 6.2: 渲染进程请求最小化窗口
- ✅ 需求 6.3: 渲染进程请求获取窗口位置
- ✅ 需求 6.4: 渲染进程请求设置窗口位置
- ✅ 需求 6.5: 渲染进程请求获取窗口尺寸
- ✅ 需求 8.1: 渲染进程请求操作系统平台信息
- ✅ 需求 8.2: 渲染进程请求应用版本信息
- ✅ 需求 8.3: 渲染进程请求 Electron 版本信息
- ✅ 需求 8.4: 渲染进程请求应用路径信息

## 使用示例

### 在渲染进程中调用（需要预加载脚本支持）

```typescript
// 关闭窗口
await window.electronAPI.window.close()

// 获取窗口位置
const position = await window.electronAPI.window.getPosition()
console.log(position) // { x: 100, y: 200 }

// 设置窗口位置
await window.electronAPI.window.setPosition(300, 400)

// 获取平台信息
const platform = await window.electronAPI.system.getPlatform()
console.log(platform) // 'win32' | 'darwin' | 'linux'
```

### 主进程向渲染进程发送消息

```typescript
// 在主进程中
const window = BrowserWindow.getFocusedWindow()
if (window) {
    sendToRenderer(window, 'custom-event', { message: 'Hello from main process' })
}
```

## 下一步

- 任务 4: 实现预加载脚本，暴露这些 IPC 处理器给渲染进程
- 任务 8: 创建 useElectron composable，在 Vue 组件中使用这些 API
