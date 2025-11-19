# 窗口功能属性测试生成器实现文档

## 概述

本文档描述了为高级窗口功能创建的属性测试数据生成器的实现。这些生成器使用 fast-check 库为窗口拖拽、置顶、多窗口管理等功能提供随机测试数据。

## 实现内容

### 1. 核心文件

#### tests/window-generators.ts
主要的生成器文件，包含以下类别的生成器：

**基础数据生成器**
- 窗口坐标生成器（X: 0-3840, Y: 0-2160）
- 窗口尺寸生成器（宽度/高度: 200-800）
- 窗口ID和便签ID生成器
- 时间戳生成器

**位置和尺寸生成器**
- `arbPosition` - 有效的窗口位置
- `arbAnyPosition` - 任意位置（包括屏幕外，用于测试边界限制）
- `arbSize` - 有效的窗口尺寸
- `arbAnySize` - 任意尺寸（包括无效值，用于测试尺寸限制）
- `arbWindowBounds` - 窗口边界
- `arbScreenBounds` - 屏幕边界（支持多种分辨率）

**拖拽相关生成器**
- `arbDragBoundary` - 拖拽边界
- `arbDragConstraints` - 拖拽约束
- `arbDragState` - 拖拽状态
- `arbDraggingState` - 正在拖拽的状态
- `arbNotDraggingState` - 未拖拽的状态

**窗口状态生成器**
- `arbWindowState` - 完整的窗口状态
- `arbAlwaysOnTopWindowState` - 置顶的窗口状态
- `arbNotAlwaysOnTopWindowState` - 非置顶的窗口状态
- `arbFocusedWindowState` - 聚焦的窗口状态
- `arbMinimizedWindowState` - 最小化的窗口状态

**窗口信息生成器**
- `arbWindowInfo` - 单个窗口信息
- `arbWindowInfoList(min, max)` - 窗口信息列表（确保ID唯一）
- `arbNonEmptyWindowList` - 非空窗口列表
- `arbNearMaxWindowList` - 接近上限的窗口列表

**窗口创建选项生成器**
- `arbWindowCreateOptions` - 窗口创建选项
- `arbFullWindowCreateOptions` - 完整的窗口创建选项
- `arbMinimalWindowCreateOptions` - 最小窗口创建选项

**多窗口配置生成器**
- `arbMultiWindowConfig` - 多窗口配置
- `arbDefaultMultiWindowConfig` - 默认的多窗口配置（符合设计文档）

**边界情况生成器**
- `arbBoundaryPosition` - 边界位置（屏幕边缘）
- `arbOutOfBoundsPosition` - 超出边界的位置
- `arbMinSize` - 最小尺寸 (200x200)
- `arbMaxSize` - 最大尺寸 (800x800)
- `arbBelowMinSize` - 小于最小尺寸
- `arbAboveMaxSize` - 大于最大尺寸

**序列生成器**
- `arbPositionSequence(length)` - 位置变化序列
- `arbSizeSequence(length)` - 尺寸变化序列
- `arbWindowStateSequence(length)` - 窗口状态变化序列

**辅助函数**
- `generateSamples<T>` - 生成指定数量的样本
- `printSamples<T>` - 打印生成器样本（调试用）
- `isPositionInBounds` - 验证位置是否在边界内
- `isSizeInRange` - 验证尺寸是否在限制范围内
- `calculateDistance` - 计算两个位置之间的距离
- `areWindowIdsUnique` - 检查窗口ID列表是否唯一
- `generateWindowListWithProperty` - 生成带有特定属性的窗口列表

#### tests/window-generators.test.ts
生成器的验证测试文件，包含40个测试用例，验证所有生成器的正确性。

测试覆盖：
- ✅ 基础生成器（6个测试）
- ✅ 位置和尺寸生成器（4个测试）
- ✅ 拖拽相关生成器（5个测试）
- ✅ 窗口状态生成器（5个测试）
- ✅ 窗口信息生成器（4个测试）
- ✅ 窗口创建选项生成器（3个测试）
- ✅ 多窗口配置生成器（2个测试）
- ✅ 边界情况生成器（6个测试）
- ✅ 辅助函数（5个测试）

所有测试均通过（40/40）。

#### tests/README.md
更新的测试文档，包含：
- 生成器使用方法
- 可用生成器列表
- 属性测试最佳实践
- 调试技巧
- 参考资料

## 设计考虑

### 1. 符合设计文档规范

所有生成器都严格遵循设计文档中定义的约束：
- 窗口尺寸：200-800像素
- 最小可见区域：50像素
- 最大窗口数量：20个
- 默认窗口尺寸：300x300
- 位置偏移：30x30

### 2. 支持边界测试

提供了专门的生成器用于测试边界情况：
- `arbAnyPosition` - 包括屏幕外的位置
- `arbOutOfBoundsPosition` - 明确超出边界的位置
- `arbBelowMinSize` / `arbAboveMaxSize` - 无效尺寸

### 3. 确保数据有效性

使用过滤器确保生成的数据满足约束条件：
```typescript
arbDragBoundary.filter(boundary => 
  boundary.right > boundary.left + 200 && 
  boundary.bottom > boundary.top + 200
)
```

### 4. 支持多种屏幕分辨率

`arbScreenBounds` 支持常见的屏幕分辨率：
- 1920x1080 (Full HD)
- 2560x1440 (2K)
- 3840x2160 (4K)
- 1366x768 (常见笔记本)
- 自定义分辨率

### 5. 窗口ID唯一性

`arbWindowInfoList` 确保生成的窗口列表中所有ID都是唯一的：
```typescript
.map(windows => {
  const uniqueWindows: WindowInfo[] = []
  const seenIds = new Set<string>()
  
  for (const window of windows) {
    if (!seenIds.has(window.id)) {
      seenIds.add(window.id)
      uniqueWindows.push(window)
    }
  }
  
  return uniqueWindows
})
```

## 使用示例

### 测试边界限制（属性6-10）

```typescript
// Feature: advanced-window-features, Property 6: 左边界限制
// 验证需求: 2.1
fc.assert(
  fc.property(arbAnyPosition, (position) => {
    const limited = checkBoundary(position)
    expect(limited.x).toBeGreaterThanOrEqual(0)
  }),
  { numRuns: 100 }
)
```

### 测试窗口创建（属性16-19）

```typescript
// Feature: advanced-window-features, Property 17: 窗口ID唯一性
// 验证需求: 4.2
fc.assert(
  fc.property(arbWindowInfoList(5, 10), (windows) => {
    expect(areWindowIdsUnique(windows)).toBe(true)
  }),
  { numRuns: 100 }
)
```

### 测试尺寸限制（属性33-34）

```typescript
// Feature: advanced-window-features, Property 33: 最小尺寸限制
// 验证需求: 8.2
fc.assert(
  fc.property(arbAnySize, (size) => {
    const limited = limitSize(size)
    expect(limited.width).toBeGreaterThanOrEqual(200)
    expect(limited.height).toBeGreaterThanOrEqual(200)
  }),
  { numRuns: 100 }
)
```

### 测试窗口间通信（属性37-41）

```typescript
// Feature: advanced-window-features, Property 37: 数据变更广播
// 验证需求: 9.1
fc.assert(
  fc.property(
    arbNonEmptyWindowList,
    arbWindowState,
    (windows, newState) => {
      // 测试数据变更是否广播到所有窗口
    }
  ),
  { numRuns: 100 }
)
```

## 与现有生成器的关系

本项目现在有两个生成器文件：

1. **electron-generators.ts** - Electron 核心功能
   - 窗口配置
   - IPC 消息
   - 系统信息

2. **window-generators.ts** - 窗口高级功能（本次实现）
   - 窗口拖拽
   - 窗口置顶
   - 多窗口管理

两个文件互补，共同支持整个应用的属性测试需求。

## 测试覆盖

生成器支持测试以下正确性属性（来自设计文档）：

- ✅ 属性 1-5: 拖拽操作基础属性
- ✅ 属性 6-10: 边界限制属性
- ✅ 属性 11-15: 窗口置顶属性
- ✅ 属性 16-19: 窗口创建属性
- ✅ 属性 20-23: 窗口关闭属性
- ✅ 属性 24-28: 窗口状态响应式属性
- ✅ 属性 29-31: 位置持久化属性
- ✅ 属性 32-36: 窗口尺寸属性
- ✅ 属性 37-41: 窗口间通信属性
- ✅ 属性 42-46: 拖拽性能属性
- ✅ 属性 47-50: 快捷键属性
- ✅ 属性 51-55: 拖拽动画属性

## 后续工作

这些生成器将在后续任务中用于实现具体的属性测试：

- 任务 2.1-2.4: 拖拽功能的属性测试
- 任务 3.1-3.3: 窗口操作的属性测试
- 任务 4.1-4.3: 多窗口管理的属性测试

每个属性测试都将：
1. 使用这些生成器生成测试数据
2. 运行至少100次迭代
3. 使用注释标记对应的设计文档属性
4. 验证相应的需求

## 验证结果

✅ 所有生成器编译通过，无类型错误
✅ 所有40个验证测试通过
✅ 生成器能够生成符合约束的有效数据
✅ 边界情况生成器能够生成无效数据用于测试
✅ 窗口列表生成器确保ID唯一性
✅ 辅助函数正常工作

## 总结

成功实现了完整的窗口功能属性测试数据生成器，包括：
- ✅ 安装 fast-check（已存在）
- ✅ 创建 `tests/window-generators.ts` 文件
- ✅ 实现窗口位置生成器
- ✅ 实现窗口尺寸生成器
- ✅ 实现拖拽状态生成器
- ✅ 实现窗口列表生成器
- ✅ 创建验证测试
- ✅ 更新测试文档

生成器已准备好用于后续的属性测试任务。
