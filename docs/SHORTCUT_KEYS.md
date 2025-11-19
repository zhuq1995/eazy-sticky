# 快捷键功能实现文档

## 概述

本文档描述了便签应用的全局快捷键功能实现，包括快捷键注册、窗口创建、位置计算和错误处理。

## 功能特性

### 1. 全局快捷键注册

- **Windows/Linux**: `Ctrl+N`
- **macOS**: `Cmd+N`

快捷键在应用启动时自动注册，在应用退出时自动注销。

### 2. 快捷键功能

按下快捷键时，系统会：

1. 检查当前窗口数量是否达到上限（最大20个窗口）
2. 计算新窗口的位置
3. 创建新窗口
4. 自动聚焦新窗口

### 3. 窗口位置计算策略

#### 优先级1：聚焦窗口附近
如果存在聚焦窗口，新窗口将在聚焦窗口附近创建（偏移30像素）。

```typescript
// 示例：聚焦窗口在 (100, 100)
// 新窗口位置：(130, 130)
```

#### 优先级2：鼠标位置附近
如果没有聚焦窗口，新窗口将在鼠标位置附近创建（偏移20像素）。

```typescript
// 示例：鼠标在 (500, 300)
// 新窗口位置：(520, 320)
```

### 4. 边界检查

所有计算出的窗口位置都会经过边界检查，确保：

- 窗口不会超出屏幕范围
- 至少保持50像素的可见区域
- 如果位置无效，自动调整到屏幕内

### 5. 快捷键冲突处理

#### 主快捷键冲突
如果主快捷键（Ctrl+N / Cmd+N）被其他应用占用：

1. 系统会记录警告日志
2. 自动尝试注册备用快捷键（Ctrl+Shift+N / Cmd+Shift+N）
3. 如果备用快捷键也失败，记录错误日志

#### 日志示例

```
[WARN] 快捷键 Ctrl+N 注册失败，可能被其他应用占用
[INFO] 尝试注册备用快捷键: Ctrl+Shift+N
[INFO] 备用快捷键 Ctrl+Shift+N 注册成功
```

## 实现细节

### WindowManager 新增方法

#### getCursorPosition()
获取鼠标当前位置。

```typescript
getCursorPosition(): { x: number; y: number }
```

#### calculateWindowPositionNearCursor()
计算基于鼠标位置的新窗口位置。

```typescript
calculateWindowPositionNearCursor(): { x: number; y: number }
```

#### calculateWindowPositionNearFocused()
计算基于聚焦窗口的新窗口位置。

```typescript
calculateWindowPositionNearFocused(): { x: number; y: number }
```

#### createWindowFromShortcut()
通过快捷键创建新窗口，包含完整的位置计算和聚焦逻辑。

```typescript
createWindowFromShortcut(): BrowserWindow
```

### 全局函数

#### registerGlobalShortcuts(windowManager)
注册全局快捷键，包含冲突处理逻辑。

```typescript
function registerGlobalShortcuts(windowManager: WindowManager): void
```

#### unregisterGlobalShortcuts()
注销所有全局快捷键。

```typescript
function unregisterGlobalShortcuts(): void
```

## 生命周期管理

### 应用启动
```
app.whenReady() 
  → 创建窗口管理器
  → 注册IPC处理器
  → 注册全局快捷键 ✓
  → 创建主窗口
```

### 应用退出
```
app.on('before-quit')
  → 注销全局快捷键 ✓
  → 保存窗口状态

app.on('will-quit')
  → 确保快捷键已注销 ✓
```

## 错误处理

### 窗口数量限制
```typescript
if (currentWindowCount >= maxWindows) {
    logger.warn('已达到窗口数量上限，无法创建新窗口')
    return
}
```

### 快捷键注册失败
```typescript
if (!registered) {
    logger.warn('快捷键注册失败，可能被其他应用占用')
    // 尝试备用快捷键
}
```

### 窗口创建失败
```typescript
try {
    windowManager.createWindowFromShortcut()
} catch (error) {
    logger.error('快捷键创建窗口失败', error)
}
```

## 验证需求映射

| 需求ID | 描述 | 实现位置 |
|--------|------|----------|
| 11.1 | 注册快捷键 | `registerGlobalShortcuts()` |
| 11.2 | 鼠标位置附近创建 | `calculateWindowPositionNearCursor()` |
| 11.3 | 聚焦窗口附近创建 | `calculateWindowPositionNearFocused()` |
| 11.4 | 新窗口自动聚焦 | `createWindowFromShortcut()` |
| 11.5 | 快捷键冲突处理 | `registerGlobalShortcuts()` 备用快捷键逻辑 |

## 使用示例

### 用户操作流程

1. **启动应用**
   - 系统自动注册快捷键 Ctrl+N (或 Cmd+N)

2. **按下快捷键**
   - 如果有聚焦窗口：在聚焦窗口附近创建新窗口
   - 如果没有聚焦窗口：在鼠标位置附近创建新窗口
   - 新窗口自动获得焦点

3. **达到窗口上限**
   - 按下快捷键时，系统记录警告，不创建新窗口

4. **退出应用**
   - 系统自动注销快捷键

## 测试建议

### 手动测试

1. **基本功能测试**
   - 启动应用
   - 按下 Ctrl+N (或 Cmd+N)
   - 验证新窗口在正确位置创建
   - 验证新窗口自动获得焦点

2. **聚焦窗口测试**
   - 创建一个窗口并聚焦
   - 按下快捷键
   - 验证新窗口在聚焦窗口附近（偏移30像素）

3. **鼠标位置测试**
   - 关闭所有窗口（macOS保持应用运行）
   - 移动鼠标到屏幕特定位置
   - 按下快捷键
   - 验证新窗口在鼠标附近（偏移20像素）

4. **边界测试**
   - 将鼠标移到屏幕边缘
   - 按下快捷键
   - 验证新窗口位置被调整到屏幕内

5. **窗口上限测试**
   - 创建20个窗口
   - 按下快捷键
   - 验证不创建新窗口，控制台显示警告

6. **快捷键冲突测试**
   - 使用其他应用占用 Ctrl+N
   - 启动便签应用
   - 验证备用快捷键 Ctrl+Shift+N 被注册
   - 按下备用快捷键验证功能正常

### 自动化测试

由于快捷键功能涉及系统级操作，建议使用集成测试：

```typescript
// 示例测试用例
describe('快捷键功能', () => {
  it('应该注册全局快捷键', () => {
    // 验证快捷键已注册
  })

  it('应该在聚焦窗口附近创建新窗口', () => {
    // 创建并聚焦窗口
    // 触发快捷键
    // 验证新窗口位置
  })

  it('应该在鼠标位置附近创建新窗口', () => {
    // 设置鼠标位置
    // 触发快捷键
    // 验证新窗口位置
  })

  it('应该自动聚焦新窗口', () => {
    // 触发快捷键
    // 验证新窗口获得焦点
  })

  it('应该处理窗口数量上限', () => {
    // 创建20个窗口
    // 触发快捷键
    // 验证不创建新窗口
  })
})
```

## 日志输出示例

### 成功场景
```
[INFO] 注册全局快捷键
[INFO] 注册快捷键: Ctrl+N
[INFO] 快捷键 Ctrl+N 注册成功
[INFO] 快捷键 Ctrl+N 被触发
[INFO] 通过快捷键创建新窗口
[DEBUG] 计算基于聚焦窗口的新窗口位置
[DEBUG] 基于聚焦窗口的新窗口位置 { x: 130, y: 130 }
[INFO] 创建新窗口 { windowId: 'window-1234567890', position: { x: 130, y: 130 } }
[INFO] 新窗口已聚焦 { windowId: 'window-1234567890' }
```

### 冲突场景
```
[INFO] 注册全局快捷键
[INFO] 注册快捷键: Ctrl+N
[WARN] 快捷键 Ctrl+N 注册失败，可能被其他应用占用
[INFO] 尝试注册备用快捷键: Ctrl+Shift+N
[INFO] 备用快捷键 Ctrl+Shift+N 注册成功
```

### 窗口上限场景
```
[INFO] 快捷键 Ctrl+N 被触发
[WARN] 已达到窗口数量上限，无法创建新窗口 { current: 20, max: 20 }
```

## 平台差异

### Windows
- 快捷键：`Ctrl+N`
- 备用快捷键：`Ctrl+Shift+N`
- 窗口关闭行为：所有窗口关闭时应用退出

### macOS
- 快捷键：`Cmd+N`
- 备用快捷键：`Cmd+Shift+N`
- 窗口关闭行为：所有窗口关闭后应用保持运行
- 特殊处理：支持 activate 事件重新创建窗口

### Linux
- 快捷键：`Ctrl+N`
- 备用快捷键：`Ctrl+Shift+N`
- 窗口关闭行为：所有窗口关闭时应用退出

## 性能考虑

1. **快捷键响应时间**：< 100ms
2. **窗口创建时间**：< 500ms
3. **位置计算时间**：< 10ms
4. **内存占用**：快捷键监听器占用可忽略不计

## 安全考虑

1. **窗口数量限制**：防止恶意创建大量窗口
2. **位置验证**：确保窗口位置在屏幕范围内
3. **快捷键注销**：应用退出时确保快捷键被释放

## 未来改进

1. **自定义快捷键**：允许用户自定义快捷键
2. **快捷键配置界面**：提供UI界面管理快捷键
3. **多快捷键支持**：支持多个快捷键触发不同操作
4. **快捷键提示**：在UI中显示当前可用的快捷键

## 相关文件

- `electron/main.ts` - 主进程实现
- `.kiro/specs/advanced-window-features/requirements.md` - 需求文档
- `.kiro/specs/advanced-window-features/design.md` - 设计文档
- `.kiro/specs/advanced-window-features/tasks.md` - 任务列表
