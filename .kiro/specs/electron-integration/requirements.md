# 需求文档 - Electron 集成

## 简介

本文档定义了便签应用的Electron桌面应用集成需求。该功能负责将Vue Web应用封装为原生桌面应用，实现窗口管理、进程间通信、应用生命周期管理等桌面应用特有的功能。

## 术语表

- **应用系统 (Application System)**: 指整个便签桌面应用
- **主进程 (Main Process)**: Electron的主进程，负责窗口管理和系统级操作
- **渲染进程 (Renderer Process)**: Electron的渲染进程，运行Vue应用的Web环境
- **预加载脚本 (Preload Script)**: 在渲染进程加载前执行的脚本，用于安全地暴露API
- **IPC通信 (IPC Communication)**: 进程间通信，主进程和渲染进程之间的消息传递机制
- **上下文隔离 (Context Isolation)**: Electron的安全特性，隔离预加载脚本和网页内容
- **浏览器窗口 (Browser Window)**: Electron创建的应用窗口实例
- **无边框窗口 (Frameless Window)**: 没有操作系统默认标题栏和边框的窗口

## 需求

### 需求 1

**用户故事：** 作为用户，我希望应用能够作为独立的桌面程序运行，以便像使用其他桌面软件一样使用便签应用。

#### 验收标准

1. WHEN 用户启动应用 THEN 应用系统 SHALL 创建Electron主进程并初始化应用
2. WHEN 主进程初始化完成 THEN 应用系统 SHALL 创建至少一个浏览器窗口
3. WHEN 浏览器窗口创建时 THEN 应用系统 SHALL 加载Vue应用的渲染内容
4. WHEN 应用在开发环境运行 THEN 应用系统 SHALL 连接到Vite开发服务器
5. WHEN 应用在生产环境运行 THEN 应用系统 SHALL 加载构建后的静态文件

### 需求 2

**用户故事：** 作为用户，我希望便签窗口具有简洁的外观，以便获得更好的视觉体验。

#### 验收标准

1. WHEN 创建便签窗口 THEN 应用系统 SHALL 创建无边框窗口
2. WHEN 窗口显示时 THEN 应用系统 SHALL 设置窗口背景为透明
3. WHEN 窗口创建时 THEN 应用系统 SHALL 设置默认窗口尺寸为300x300像素
4. WHEN 窗口创建时 THEN 应用系统 SHALL 设置窗口可调整大小
5. WHEN 窗口创建时 THEN 应用系统 SHALL 禁用窗口最大化按钮

### 需求 3

**用户故事：** 作为开发者，我希望渲染进程能够安全地访问Electron API，以便实现桌面应用功能而不损害安全性。

#### 验收标准

1. WHEN 渲染进程启动 THEN 应用系统 SHALL 加载预加载脚本
2. WHEN 预加载脚本执行时 THEN 应用系统 SHALL 启用上下文隔离
3. WHEN 预加载脚本执行时 THEN 应用系统 SHALL 禁用Node.js集成
4. WHEN 预加载脚本执行时 THEN 应用系统 SHALL 通过contextBridge暴露安全的API
5. WHEN 渲染进程访问Electron API THEN 应用系统 SHALL 只允许访问预加载脚本暴露的API

### 需求 4

**用户故事：** 作为开发者，我希望主进程和渲染进程能够相互通信，以便实现复杂的桌面应用功能。

#### 验收标准

1. WHEN 渲染进程发送IPC消息 THEN 主进程 SHALL 接收并处理该消息
2. WHEN 主进程处理完IPC请求 THEN 主进程 SHALL 返回响应给渲染进程
3. WHEN IPC通信发生错误 THEN 应用系统 SHALL 记录错误信息并返回错误响应
4. WHEN 渲染进程调用异步IPC方法 THEN 应用系统 SHALL 返回Promise对象
5. WHEN 主进程需要通知渲染进程 THEN 主进程 SHALL 能够主动发送消息到渲染进程

### 需求 5

**用户故事：** 作为用户，我希望应用能够正确处理窗口的生命周期事件，以便应用行为符合桌面应用的标准。

#### 验收标准

1. WHEN 所有窗口关闭且操作系统不是macOS THEN 应用系统 SHALL 退出应用
2. WHEN 所有窗口关闭且操作系统是macOS THEN 应用系统 SHALL 保持应用运行
3. WHEN 应用在macOS上被激活且没有窗口 THEN 应用系统 SHALL 创建新窗口
4. WHEN 应用退出前 THEN 应用系统 SHALL 触发退出前事件
5. WHEN 窗口关闭时 THEN 应用系统 SHALL 清理该窗口的相关资源

### 需求 6

**用户故事：** 作为开发者，我希望能够在渲染进程中访问窗口操作API，以便实现窗口控制功能。

#### 验收标准

1. WHEN 渲染进程请求关闭窗口 THEN 主进程 SHALL 关闭对应的浏览器窗口
2. WHEN 渲染进程请求最小化窗口 THEN 主进程 SHALL 最小化对应的浏览器窗口
3. WHEN 渲染进程请求获取窗口位置 THEN 主进程 SHALL 返回窗口的x和y坐标
4. WHEN 渲染进程请求设置窗口位置 THEN 主进程 SHALL 移动窗口到指定坐标
5. WHEN 渲染进程请求获取窗口尺寸 THEN 主进程 SHALL 返回窗口的宽度和高度

### 需求 7

**用户故事：** 作为用户，我希望应用能够在开发环境中提供调试工具，以便开发者能够调试应用。

#### 验收标准

1. WHEN 应用在开发环境启动 THEN 应用系统 SHALL 自动打开开发者工具
2. WHEN 应用在生产环境启动 THEN 应用系统 SHALL 不打开开发者工具
3. WHEN 开发环境中发生错误 THEN 应用系统 SHALL 在控制台显示详细错误信息
4. WHEN 开发环境中加载资源失败 THEN 应用系统 SHALL 显示加载失败的详细信息

### 需求 8

**用户故事：** 作为开发者，我希望能够在渲染进程中获取系统信息，以便根据不同平台提供不同的功能。

#### 验收标准

1. WHEN 渲染进程请求操作系统平台信息 THEN 应用系统 SHALL 返回平台标识符（win32、darwin、linux）
2. WHEN 渲染进程请求应用版本信息 THEN 应用系统 SHALL 返回应用的版本号
3. WHEN 渲染进程请求Electron版本信息 THEN 应用系统 SHALL 返回Electron、Node.js和Chrome的版本号
4. WHEN 渲染进程请求应用路径信息 THEN 应用系统 SHALL 返回应用的安装路径

### 需求 9

**用户故事：** 作为开发者，我希望应用能够处理未捕获的错误，以便应用不会因为错误而崩溃。

#### 验收标准

1. WHEN 主进程发生未捕获的异常 THEN 应用系统 SHALL 记录错误信息并继续运行
2. WHEN 渲染进程发生未捕获的异常 THEN 应用系统 SHALL 记录错误信息并显示错误提示
3. WHEN Promise被拒绝且未处理 THEN 应用系统 SHALL 记录Promise拒绝信息
4. WHEN 错误被记录时 THEN 应用系统 SHALL 包含错误堆栈和上下文信息

### 需求 10

**用户故事：** 作为用户，我希望应用能够记住窗口的位置和尺寸，以便下次打开时恢复到上次的状态。

#### 验收标准

1. WHEN 窗口位置或尺寸改变 THEN 应用系统 SHALL 保存新的窗口状态
2. WHEN 应用启动时 THEN 应用系统 SHALL 从存储中读取上次的窗口状态
3. WHEN 存储中存在窗口状态 THEN 应用系统 SHALL 使用保存的位置和尺寸创建窗口
4. WHEN 存储中不存在窗口状态 THEN 应用系统 SHALL 使用默认位置和尺寸创建窗口
5. WHEN 保存的窗口位置超出屏幕范围 THEN 应用系统 SHALL 使用默认位置创建窗口
