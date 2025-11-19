# 测试生成器文档

本目录包含用于属性测试的数据生成器，使用 fast-check 库生成随机测试数据。

## 文件说明

### electron-generators.ts
Electron 相关功能的测试数据生成器，包括：
- 窗口配置生成器
- IPC 消息生成器
- 系统信息生成器

### window-generators.ts
窗口功能的测试数据生成器，包括：
- 窗口位置和尺寸生成器
- 拖拽状态生成器
- 窗口状态生成器
- 多窗口管理生成器

## 使用方法

### 基本用法

```typescript
import * as fc from 'fast-check'
import { arbWindowState, arbPosition } from './window-generators'

// 在属性测试中使用
fc.assert(
  fc.property(arbWindowState, (state) => {
    // 测试窗口状态的某个属性
    expect(state.position.x).toBeGreaterThanOrEqual(0)
  }),
  { numRuns: 100 } // 运行100次测试
)
```

### 组合生成器

```typescript
import * as fc from 'fast-check'
import { arbPosition, arbSize } from './window-generators'

// 组合多个生成器
const arbWindowBounds = fc.record({
  position: arbPosition,
  size: arbSize
})

fc.assert(
  fc.property(arbWindowBounds, (bounds) => {
    // 测试窗口边界
  })
)
```

### 过滤生成的数据

```typescript
import * as fc from 'fast-check'
import { arbWindowState } from './window-generators'

// 只测试置顶的窗口
fc.assert(
  fc.property(
    arbWindowState.filter(state => state.isAlwaysOnTop),
    (state) => {
      // 测试置顶窗口的行为
    }
  )
)
```

## 可用的生成器

### 基础生成器

- `arbWindowX` - 窗口X坐标 (0-3840)
- `arbWindowY` - 窗口Y坐标 (0-2160)
- `arbWindowWidth` - 窗口宽度 (200-800)
- `arbWindowHeight` - 窗口高度 (200-800)
- `arbWindowId` - 窗口ID
- `arbNoteId` - 便签ID
- `arbTimestamp` - 时间戳

### 位置和尺寸生成器

- `arbPosition` - 有效的窗口位置
- `arbAnyPosition` - 任意位置（包括屏幕外）
- `arbSize` - 有效的窗口尺寸
- `arbAnySize` - 任意尺寸（包括无效值）
- `arbWindowBounds` - 窗口边界
- `arbScreenBounds` - 屏幕边界

### 拖拽相关生成器

- `arbDragBoundary` - 拖拽边界
- `arbDragConstraints` - 拖拽约束
- `arbDragState` - 拖拽状态
- `arbDraggingState` - 正在拖拽的状态
- `arbNotDraggingState` - 未拖拽的状态

### 窗口状态生成器

- `arbWindowState` - 完整的窗口状态
- `arbAlwaysOnTopWindowState` - 置顶的窗口状态
- `arbNotAlwaysOnTopWindowState` - 非置顶的窗口状态
- `arbFocusedWindowState` - 聚焦的窗口状态
- `arbMinimizedWindowState` - 最小化的窗口状态

### 窗口信息生成器

- `arbWindowInfo` - 窗口信息
- `arbWindowInfoList(min, max)` - 窗口信息列表
- `arbNonEmptyWindowList` - 非空窗口列表
- `arbNearMaxWindowList` - 接近上限的窗口列表

### 窗口创建选项生成器

- `arbWindowCreateOptions` - 窗口创建选项
- `arbFullWindowCreateOptions` - 完整的窗口创建选项
- `arbMinimalWindowCreateOptions` - 最小窗口创建选项

### 多窗口配置生成器

- `arbMultiWindowConfig` - 多窗口配置
- `arbDefaultMultiWindowConfig` - 默认的多窗口配置

### 边界情况生成器

- `arbBoundaryPosition` - 边界位置（屏幕边缘）
- `arbOutOfBoundsPosition` - 超出边界的位置
- `arbMinSize` - 最小尺寸 (200x200)
- `arbMaxSize` - 最大尺寸 (800x800)
- `arbBelowMinSize` - 小于最小尺寸
- `arbAboveMaxSize` - 大于最大尺寸

### 序列生成器

- `arbPositionSequence(length)` - 位置变化序列
- `arbSizeSequence(length)` - 尺寸变化序列
- `arbWindowStateSequence(length)` - 窗口状态变化序列

## 辅助函数

### generateSamples
生成指定数量的样本用于调试：

```typescript
import { generateSamples, arbWindowState } from './window-generators'

const samples = generateSamples(arbWindowState, 10)
console.log(samples)
```

### printSamples
打印生成器样本：

```typescript
import { printSamples, arbPosition } from './window-generators'

printSamples(arbPosition, 5)
// 输出：
// 生成的样本:
// 样本 1: { "x": 123, "y": 456 }
// ...
```

### isPositionInBounds
验证位置是否在边界内：

```typescript
import { isPositionInBounds } from './window-generators'

const bounds = { x: 0, y: 0, width: 1920, height: 1080 }
const position = { x: 100, y: 100 }

if (isPositionInBounds(position, bounds)) {
  console.log('位置在边界内')
}
```

### isSizeInRange
验证尺寸是否在限制范围内：

```typescript
import { isSizeInRange } from './window-generators'

const size = { width: 300, height: 300 }

if (isSizeInRange(size)) {
  console.log('尺寸在有效范围内')
}
```

### calculateDistance
计算两个位置之间的距离：

```typescript
import { calculateDistance } from './window-generators'

const pos1 = { x: 0, y: 0 }
const pos2 = { x: 3, y: 4 }

const distance = calculateDistance(pos1, pos2)
console.log(distance) // 5
```

### areWindowIdsUnique
检查窗口ID列表是否唯一：

```typescript
import { areWindowIdsUnique } from './window-generators'

const windows = [
  { id: 'w1', ... },
  { id: 'w2', ... }
]

if (areWindowIdsUnique(windows)) {
  console.log('所有窗口ID都是唯一的')
}
```

### generateWindowListWithProperty
生成带有特定属性的窗口列表：

```typescript
import { generateWindowListWithProperty } from './window-generators'
import * as fc from 'fast-check'

// 生成5个置顶的窗口
const arbAlwaysOnTopWindows = generateWindowListWithProperty(5, {
  isAlwaysOnTop: true
})

fc.assert(
  fc.property(arbAlwaysOnTopWindows, (windows) => {
    windows.forEach(w => {
      expect(w.isAlwaysOnTop).toBe(true)
    })
  })
)
```

## 属性测试最佳实践

### 1. 运行足够的迭代次数

根据设计文档要求，每个属性测试至少运行100次：

```typescript
fc.assert(
  fc.property(arbWindowState, (state) => {
    // 测试逻辑
  }),
  { numRuns: 100 } // 至少100次
)
```

### 2. 标记测试对应的设计属性

每个属性测试必须使用注释标记对应的设计文档属性：

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

### 3. 使用合适的生成器

选择最适合测试场景的生成器：

```typescript
// ✅ 好：测试边界限制时使用任意位置
fc.property(arbAnyPosition, (pos) => {
  const limited = checkBoundary(pos)
  expect(limited.x).toBeGreaterThanOrEqual(0)
})

// ❌ 差：测试边界限制时只使用有效位置
fc.property(arbPosition, (pos) => {
  // 这样测试不到边界情况
})
```

### 4. 组合生成器测试复杂场景

```typescript
// 测试窗口拖拽到边界的行为
fc.assert(
  fc.property(
    arbWindowState,
    arbOutOfBoundsPosition,
    (state, newPosition) => {
      // 测试将窗口拖拽到边界外的行为
    }
  )
)
```

### 5. 使用过滤器聚焦特定场景

```typescript
// 只测试大窗口的行为
fc.assert(
  fc.property(
    arbWindowState.filter(s => s.size.width > 500),
    (state) => {
      // 测试大窗口的特定行为
    }
  )
)
```

## 调试技巧

### 查看生成的数据

```typescript
import { printSamples, arbWindowState } from './window-generators'

// 打印5个样本查看生成的数据
printSamples(arbWindowState, 5)
```

### 重现失败的测试

fast-check 会在测试失败时输出种子值，可以使用该种子重现失败：

```typescript
fc.assert(
  fc.property(arbWindowState, (state) => {
    // 测试逻辑
  }),
  { 
    numRuns: 100,
    seed: 1234567890 // 使用失败时的种子值
  }
)
```

### 缩小失败案例

fast-check 会自动尝试缩小失败的测试用例，找到最小的反例。

## 参考资料

- [fast-check 官方文档](https://github.com/dubzzz/fast-check)
- [属性测试介绍](https://github.com/dubzzz/fast-check/blob/main/documentation/Arbitraries.md)
- 设计文档：`.kiro/specs/advanced-window-features/design.md`
- 需求文档：`.kiro/specs/advanced-window-features/requirements.md`
