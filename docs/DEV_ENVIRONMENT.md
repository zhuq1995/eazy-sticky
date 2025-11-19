# 开发环境配置文档

## 概述

本文档描述了 Electron 应用的开发环境配置，包括环境检测、开发服务器连接、热重载支持和详细错误显示。

## 功能特性

### 1. 环境检测（需求 1.4, 7.1）

应用通过以下方式检测运行环境：

```typescript
function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !app.isPackaged
}
```

- 检查 `NODE_ENV` 环境变量
- 检查应用是否已打包（`app.isPackaged`）
- 开发环境和生产环境使用不同的配置

### 2. 自动打开开发者工具（需求 7.1）

在开发环境中，应用会自动打开开发者工具：

```typescript
if (DEV_CONFIG.devTools) {
    logger.info('开发环境：打开开发者工具')
    window.webContents.openDevTools()
}
```

### 3. 开发服务器连接（需求 7.2）

应用支持连接到 Vite 开发服务器，具有以下特性：

- **自动重试机制**：最多重试 3 次
- **连接超时**：10 秒超时保护
- **详细日志**：记录每次连接尝试
- **错误页面**：连接失败时显示友好的错误页面

```typescript
const DEV_CONFIG = {
    devServerUrl: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173',
    connectionTimeout: 10000,
    maxRetries: 3
}
```

### 4. 热重载支持（需求 7.2）

应用支持热重载功能：

- 监听页面加载失败事件
- 自动重新加载页面
- 处理网络错误（错误代码 -102, -6）

```typescript
window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -102 || errorCode === -6) {
        setTimeout(() => {
            if (!window.isDestroyed()) {
                window.webContents.reload()
            }
        }, 1000)
    }
})
```

### 5. 详细错误显示（需求 7.3, 7.4）

在开发环境中，应用会显示详细的错误信息：

#### 未捕获的异常
```
❌ 未捕获的异常详情:
消息: [错误消息]
名称: [错误名称]
堆栈: [完整堆栈跟踪]
时间: [ISO 时间戳]
平台: [操作系统平台]
Node 版本: [Node.js 版本]
Electron 版本: [Electron 版本]
```

#### 资源加载失败
```
❌ 资源加载失败详情:
错误代码: [错误代码]
错误描述: [错误描述]
URL: [失败的 URL]
时间: [ISO 时间戳]
```

#### 渲染进程错误
```
❌ 渲染进程错误:
消息: [错误消息]
行号: [行号]
源文件: [源文件路径]
时间: [ISO 时间戳]
```

## 配置选项

### 开发环境配置

```typescript
const DEV_CONFIG = {
    devTools: true,              // 自动打开开发者工具
    devServerUrl: 'http://localhost:5173',  // 开发服务器 URL
    hotReload: true,             // 启用热重载
    verboseErrors: true,         // 显示详细错误
    connectionTimeout: 10000,    // 连接超时（毫秒）
    maxRetries: 3                // 最大重试次数
}
```

### 生产环境配置

```typescript
const PROD_CONFIG = {
    devTools: false,             // 不打开开发者工具
    indexPath: join(__dirname, '../renderer/index.html'),  // 构建文件路径
    verboseErrors: false         // 不显示详细错误
}
```

## 使用方法

### 启动开发环境

```bash
# 启动开发服务器和 Electron 应用
npm run dev
```

应用会：
1. 检测到开发环境
2. 连接到 Vite 开发服务器（http://localhost:5173）
3. 自动打开开发者工具
4. 启用热重载
5. 显示详细的错误信息

### 构建生产版本

```bash
# 构建应用
npm run build

# 预览构建结果
npm run preview
```

## 错误处理

### 开发服务器连接失败

如果无法连接到开发服务器，应用会：

1. 尝试重新连接（最多 3 次）
2. 显示友好的错误页面
3. 提供重试按钮
4. 显示可能的原因和解决方法

### 资源加载失败

如果资源加载失败，应用会：

1. 记录详细的错误信息到日志
2. 在开发环境显示详细错误
3. 在生产环境记录到文件

## 日志系统

### 日志级别

- **DEBUG**：开发环境使用，记录详细的调试信息
- **INFO**：记录一般信息
- **WARN**：记录警告信息
- **ERROR**：记录错误信息

### 日志输出

- **开发环境**：输出到控制台
- **生产环境**：输出到文件（`userData/logs/main.log`）

## 环境变量

### VITE_DEV_SERVER_URL

指定开发服务器的 URL：

```bash
# 默认值
VITE_DEV_SERVER_URL=http://localhost:5173

# 自定义端口
VITE_DEV_SERVER_URL=http://localhost:3000
```

### NODE_ENV

指定运行环境：

```bash
# 开发环境
NODE_ENV=development

# 生产环境
NODE_ENV=production
```

## 验证需求

本实现满足以下需求：

- ✅ **需求 1.4**：应用在开发环境和生产环境使用不同的加载方式
- ✅ **需求 7.1**：在开发环境自动打开开发者工具
- ✅ **需求 7.2**：配置开发服务器 URL 连接和热重载支持
- ✅ **需求 7.3**：在开发环境显示详细错误信息
- ✅ **需求 7.4**：显示资源加载失败的详细信息

## 故障排除

### 问题：无法连接到开发服务器

**解决方法**：
1. 确保开发服务器正在运行：`npm run dev`
2. 检查端口是否被占用
3. 检查防火墙设置
4. 验证 `VITE_DEV_SERVER_URL` 环境变量

### 问题：开发者工具未自动打开

**解决方法**：
1. 检查 `DEV_CONFIG.devTools` 是否为 `true`
2. 确认应用运行在开发环境
3. 手动打开：View → Toggle Developer Tools

### 问题：热重载不工作

**解决方法**：
1. 检查 `DEV_CONFIG.hotReload` 是否为 `true`
2. 确认开发服务器支持热重载
3. 检查浏览器控制台是否有错误

## 最佳实践

1. **始终在开发环境使用开发服务器**
2. **定期检查日志文件**
3. **在生产环境禁用开发者工具**
4. **使用环境变量配置不同环境**
5. **及时处理错误和警告**

## 相关文档

- [Electron 文档](https://www.electronjs.org/docs)
- [Vite 文档](https://vitejs.dev/)
- [electron-vite 文档](https://electron-vite.org/)
