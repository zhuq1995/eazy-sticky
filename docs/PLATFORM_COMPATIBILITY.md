# 跨平台兼容性文档

## 概述

本文档描述了 Electron 应用的跨平台兼容性实现，包括 Windows、macOS 和 Linux 平台的特定配置和行为。

## 平台检测

### 支持的平台

- **Windows** (`win32`)
- **macOS** (`darwin`)
- **Linux** (`linux`)

### 检测函数

```typescript
// 获取当前平台
getCurrentPlatform(): Platform

// 平台检测
isWindows(): boolean
isMacOS(): boolean
isLinux(): boolean
```

## 平台特定配置

### Windows 配置

**验证需求**: 5.1

#### AppUserModelId

设置应用的用户模型 ID，用于：
- 任务栏分组
- 通知系统识别
- 跳转列表功能

```typescript
app.setAppUserModelId('com.example.sticky-notes')
```

#### 窗口行为

- 所有窗口关闭时，应用退出
- 不支持 activate 事件

### macOS 配置

**验证需求**: 5.2, 5.3

#### 应用生命周期

- 所有窗口关闭时，应用保持运行（符合 macOS 标准）
- 点击 Dock 图标时，如果没有窗口则创建新窗口

#### Activate 事件

```typescript
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createWindow()
    }
})
```

#### Dock 图标

可以自定义 Dock 图标（可选）：

```typescript
app.dock.setIcon(iconPath)
```

### Linux 配置

**验证需求**: 5.3

#### 透明窗口支持

某些 Linux 桌面环境需要特殊配置来支持透明窗口：

```typescript
app.commandLine.appendSwitch('enable-transparent-visuals')
app.commandLine.appendSwitch('disable-gpu')
```

**注意**：
- `enable-transparent-visuals`: 启用透明视觉效果
- `disable-gpu`: 禁用 GPU 加速以提高兼容性（可能影响性能）

#### 窗口行为

- 所有窗口关闭时，应用退出
- 不支持 activate 事件

## 应用生命周期事件

### window-all-closed

**验证需求**: 5.1, 5.2

所有窗口关闭时的行为：

| 平台 | 行为 |
|------|------|
| Windows | 应用退出 |
| macOS | 应用保持运行 |
| Linux | 应用退出 |

```typescript
app.on('window-all-closed', () => {
    if (isMacOS()) {
        // macOS: 保持运行
    } else {
        // Windows/Linux: 退出应用
        app.quit()
    }
})
```

### activate (macOS 专用)

**验证需求**: 5.2, 5.3

当用户点击 Dock 图标时触发：

```typescript
app.on('activate', () => {
    if (isMacOS() && BrowserWindow.getAllWindows().length === 0) {
        windowManager.createWindow()
    }
})
```

### before-quit

**验证需求**: 5.4

应用退出前保存所有窗口状态：

```typescript
app.on('before-quit', () => {
    // 保存所有窗口的最终状态
    windows.forEach(window => {
        windowManager.saveWindowState(window.id)
    })
})
```

## 测试指南

### 手动测试

#### Windows 测试

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **测试窗口关闭行为**
   - 关闭所有窗口
   - 验证：应用应该退出

3. **测试 AppUserModelId**
   - 打开任务管理器
   - 验证：应用显示正确的名称和图标

#### macOS 测试

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **测试窗口关闭行为**
   - 关闭所有窗口
   - 验证：应用应该保持运行（菜单栏仍显示）

3. **测试 Activate 事件**
   - 关闭所有窗口
   - 点击 Dock 图标
   - 验证：应该创建新窗口

4. **测试退出**
   - Cmd+Q 退出应用
   - 验证：应用完全退出

#### Linux 测试

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **测试透明窗口**
   - 验证：窗口背景应该是透明的
   - 如果不透明，检查桌面环境是否支持透明效果

3. **测试窗口关闭行为**
   - 关闭所有窗口
   - 验证：应用应该退出

### 自动化测试

由于 Electron 主进程测试需要特殊的测试环境，建议使用以下方法：

1. **单元测试**：测试平台检测函数
2. **集成测试**：使用 Spectron 或 Playwright 测试完整流程
3. **E2E 测试**：在实际平台上测试应用行为

## 已知问题和解决方案

### Linux 透明窗口问题

**问题**：某些 Linux 桌面环境不支持透明窗口

**解决方案**：
1. 确保使用支持合成的窗口管理器（如 Compiz、KWin）
2. 检查是否启用了桌面特效
3. 尝试不同的命令行参数组合

### macOS Dock 图标问题

**问题**：自定义 Dock 图标不显示

**解决方案**：
1. 确保图标文件存在且格式正确（PNG 或 ICNS）
2. 检查图标路径是否正确
3. 重启应用以应用更改

### Windows 任务栏分组问题

**问题**：多个实例在任务栏中分组不正确

**解决方案**：
1. 确保设置了正确的 AppUserModelId
2. 使用唯一的 AppUserModelId
3. 在应用启动早期设置 AppUserModelId

## 平台特定的最佳实践

### Windows

- 设置 AppUserModelId
- 提供高质量的应用图标（多种尺寸）
- 支持 Windows 通知
- 考虑添加跳转列表功能

### macOS

- 遵循 macOS 应用生命周期标准
- 提供 Retina 显示屏优化的图标
- 实现 Dock 菜单
- 支持 macOS 通知中心

### Linux

- 测试多种桌面环境（GNOME、KDE、XFCE 等）
- 提供多种尺寸的图标
- 考虑不同的窗口管理器
- 提供 .desktop 文件

## 参考资料

- [Electron 官方文档 - 平台特定代码](https://www.electronjs.org/docs/latest/tutorial/platform-specific-code)
- [Electron 官方文档 - 应用生命周期](https://www.electronjs.org/docs/latest/api/app)
- [macOS 人机界面指南](https://developer.apple.com/design/human-interface-guidelines/macos)
- [Windows 应用设计指南](https://docs.microsoft.com/en-us/windows/apps/design/)

## 更新日志

### 2024-01-XX

- ✅ 实现平台检测函数
- ✅ 添加 Windows 特定配置（AppUserModelId）
- ✅ 添加 macOS 特定配置（activate 事件处理）
- ✅ 添加 Linux 特定配置（透明窗口支持）
- ✅ 更新应用生命周期事件处理
- ✅ 添加详细的日志记录

### 待实现功能

- [ ] macOS Dock 图标自定义
- [ ] Windows 跳转列表
- [ ] Linux .desktop 文件生成
- [ ] 平台特定的通知系统
