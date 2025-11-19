# 错误处理和日志系统

## 概述

本文档描述了 Electron 主进程中实现的错误处理和日志系统。

## 日志系统

### 日志级别

系统支持四个日志级别：

- **DEBUG (0)**: 调试信息，仅在开发环境输出
- **INFO (1)**: 一般信息
- **WARN (2)**: 警告信息
- **ERROR (3)**: 错误信息

### 日志功能

#### 1. 控制台输出

所有日志都会输出到控制台，格式为：`[级别] 消息`

#### 2. 文件记录（生产环境）

在生产环境中，日志会被写入文件：
- 路径：`{userData}/logs/main.log`
- 格式：JSON Lines（每行一个 JSON 对象）

#### 3. 日志条目结构

```typescript
{
  "level": "ERROR",
  "message": "错误描述",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": {
    "message": "错误消息",
    "name": "错误名称",
    "stack": "错误堆栈"
  },
  "context": {
    "type": "错误类型",
    "timestamp": 1234567890,
    "platform": "win32",
    // 其他上下文信息
  }
}
```

### 使用方法

```typescript
// 调试信息
logger.debug('调试消息', { key: 'value' })

// 一般信息
logger.info('信息消息', { key: 'value' })

// 警告信息
logger.warn('警告消息', { key: 'value' })

// 错误信息（包含错误对象和上下文）
logger.error('错误消息', error, { key: 'value' })
```

## 全局错误处理

### 1. 未捕获的异常 (uncaughtException)

**验证需求**: 9.1, 9.4

当主进程发生未捕获的异常时：
- 记录完整的错误信息（消息、名称、堆栈）
- 记录上下文信息（平台、Node.js 版本、Electron 版本）
- 在开发环境显示详细错误信息
- 应用继续运行，不崩溃

```typescript
process.on('uncaughtException', (error: Error) => {
  logger.error('未捕获的异常', error, {
    type: 'UNCAUGHT_EXCEPTION',
    timestamp: Date.now(),
    platform: process.platform,
    nodeVersion: process.version,
    electronVersion: process.versions.electron
  })
})
```

### 2. 未处理的 Promise 拒绝 (unhandledRejection)

**验证需求**: 9.3, 9.4

当 Promise 被拒绝且未处理时：
- 记录 Promise 拒绝信息
- 包含完整的错误堆栈
- 记录上下文信息
- 在开发环境显示详细信息

```typescript
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  logger.error('未处理的 Promise 拒绝', error, {
    type: 'UNHANDLED_REJECTION',
    timestamp: Date.now(),
    reason: String(reason),
    platform: process.platform
  })
})
```

### 3. 资源加载错误

**验证需求**: 7.4

监听所有 WebContents 的资源加载失败事件：
- 记录错误代码和描述
- 记录失败的 URL
- 在开发环境显示详细的加载失败信息

```typescript
webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
  logger.error('资源加载失败', new Error(errorDescription), {
    type: 'RESOURCE_LOAD_ERROR',
    errorCode,
    url: validatedURL,
    timestamp: Date.now()
  })
})
```

### 4. 渲染进程错误

监听渲染进程的控制台错误消息：
- 捕获渲染进程的错误
- 记录错误消息、行号和源文件
- 统一错误处理

```typescript
webContents.on('console-message', (event, level, message, line, sourceId) => {
  if (level === 3) { // 错误级别
    logger.error('渲染进程错误', new Error(message), {
      type: 'RENDERER_ERROR',
      line,
      sourceId,
      timestamp: Date.now()
    })
  }
})
```

## IPC 错误处理

所有 IPC 处理器都包含 try-catch 错误处理：

```typescript
ipcMain.handle('window:close', async (event) => {
  try {
    logger.debug('IPC: window:close')
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window && !window.isDestroyed()) {
      window.close()
    }
  } catch (error) {
    logger.error('关闭窗口失败', error as Error, { 
      channel: 'window:close' 
    })
    throw error // 重新抛出，让渲染进程处理
  }
})
```

## 开发环境 vs 生产环境

### 开发环境

- 日志级别：DEBUG
- 控制台输出：所有级别
- 文件记录：禁用
- 详细错误：启用
- 开发者工具：自动打开

### 生产环境

- 日志级别：INFO
- 控制台输出：INFO 及以上
- 文件记录：启用
- 详细错误：禁用
- 开发者工具：禁用

## 错误信息完整性

**验证需求**: 9.4

所有记录的错误都包含：

1. **错误对象**
   - message: 错误消息
   - name: 错误名称
   - stack: 错误堆栈

2. **上下文信息**
   - type: 错误类型
   - timestamp: 时间戳
   - platform: 操作系统平台
   - 其他相关信息（如 channel、windowId 等）

3. **时间戳**
   - ISO 8601 格式
   - 用于日志排序和分析

## 日志文件管理

### 日志文件位置

- Windows: `%APPDATA%\sticky-notes-vue\logs\main.log`
- macOS: `~/Library/Application Support/sticky-notes-vue/logs/main.log`
- Linux: `~/.config/sticky-notes-vue/logs/main.log`

### 日志文件格式

JSON Lines 格式，每行一个 JSON 对象，便于解析和分析。

### 获取日志文件路径

```typescript
const logPath = logger.getLogFilePath()
console.log('日志文件路径:', logPath)
```

## 最佳实践

1. **始终提供上下文**：记录错误时提供相关的上下文信息
2. **使用适当的日志级别**：根据信息的重要性选择合适的级别
3. **不要记录敏感信息**：避免在日志中记录密码、令牌等敏感数据
4. **保持日志简洁**：避免记录过多的调试信息到生产环境
5. **定期清理日志**：实现日志轮转机制，避免日志文件过大

## 验证需求映射

- **7.3**: 开发环境中发生错误时显示详细错误信息 ✓
- **7.4**: 开发环境中加载资源失败时显示详细信息 ✓
- **9.1**: 主进程发生未捕获的异常时记录错误信息并继续运行 ✓
- **9.2**: 渲染进程发生未捕获的异常时记录错误信息 ✓
- **9.3**: Promise 被拒绝且未处理时记录 Promise 拒绝信息 ✓
- **9.4**: 错误被记录时包含错误堆栈和上下文信息 ✓
