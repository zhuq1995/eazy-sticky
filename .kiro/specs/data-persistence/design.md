# 设计文档 - 数据持久化

## 概述

数据持久化模块是便签应用的核心基础设施，负责应用状态的集中管理、数据的本地存储、自动保存机制以及数据版本迁移。本模块基于Pinia状态管理库实现，提供响应式的数据访问接口，并通过localStorage实现数据持久化。

### 设计目标

1. **集中式状态管理**：使用Pinia提供统一的状态管理接口
2. **数据持久化**：自动保存用户数据到本地存储
3. **性能优化**：通过防抖机制减少磁盘写入频率
4. **数据安全**：提供数据备份和迁移机制
5. **类型安全**：完整的TypeScript类型定义

### 技术选型

- **状态管理**：Pinia 2.1+ (Vue 3官方推荐)
- **持久化存储**：localStorage (浏览器原生API)
- **工具库**：VueUse (@vueuse/core)
- **类型系统**：TypeScript 5.6+

## 架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Vue Components                        │
│                    (StickyNote, App, etc.)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ 读取/修改状态
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Pinia Store (notes)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    State     │  │   Actions    │  │     Getters      │  │
│  │  - notes[]   │  │  - addNote   │  │  - sortedNotes   │  │
│  │  - settings  │  │  - updateNote│  │  - pinnedCount   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ 监听变更
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Auto-save Mechanism                        │
│              (watchDebounced + useStorage)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ 序列化/反序列化
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Local Storage                           │
│                  (Browser/Electron API)                      │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

1. **读取流程**：localStorage → 反序列化 → Pinia Store → Vue组件
2. **写入流程**：Vue组件 → Pinia Store → 防抖 → 序列化 → localStorage
3. **初始化流程**：检查版本 → 数据迁移 → 加载数据 → 初始化Store

## 组件和接口

### 1. Pinia Store (stores/notes.ts)

#### 状态定义

```typescript
interface NotesState {
  notes: Note[]           // 便签列表
  settings: AppSettings   // 应用设置
  version: number         // 数据版本号
  lastSaved: number       // 最后保存时间戳
  isLoading: boolean      // 加载状态
  error: string | null    // 错误信息
}
```

#### Actions方法

```typescript
// 便签CRUD操作
addNote(note?: Partial<Note>): Note
updateNote(id: string, updates: Partial<Note>): void
deleteNote(id: string): void
togglePin(id: string): void

// 数据管理
loadFromStorage(): Promise<void>
saveToStorage(): Promise<void>
clearAllNotes(): void

// 设置管理
updateSettings(settings: Partial<AppSettings>): void
```

#### Getters

```typescript
// 排序后的便签列表（置顶在前）
sortedNotes: Note[]

// 统计信息
totalNotes: number
pinnedCount: number

// 查询方法
getNoteById(id: string): Note | undefined
```

### 2. 存储Composable (composables/useStorage.ts)

```typescript
interface UseStorageOptions {
  key: string                    // 存储键名
  defaultValue: any              // 默认值
  serializer?: {                 // 自定义序列化器
    read: (raw: string) => any
    write: (value: any) => string
  }
  onError?: (error: Error) => void  // 错误处理回调
}

function useStorage<T>(options: UseStorageOptions): {
  data: Ref<T>                   // 响应式数据
  isLoading: Ref<boolean>        // 加载状态
  error: Ref<Error | null>       // 错误信息
  save: () => Promise<void>      // 手动保存
  load: () => Promise<void>      // 手动加载
  clear: () => void              // 清除数据
}
```

### 3. 数据迁移模块 (stores/migrations.ts)

```typescript
interface Migration {
  version: number                // 目标版本号
  migrate: (data: any) => any    // 迁移函数
  description: string            // 迁移描述
}

interface MigrationResult {
  success: boolean
  fromVersion: number
  toVersion: number
  backup?: any
  error?: Error
}

function runMigrations(data: any, targetVersion: number): MigrationResult
```

## 数据模型

### 存储数据结构

```typescript
interface StoredData {
  version: number              // 数据版本号
  timestamp: number            // 保存时间戳
  notes: Note[]               // 便签数据
  settings: AppSettings       // 应用设置
}
```

### 默认值

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  defaultNoteSize: { width: 300, height: 300 },
  defaultNotePosition: { x: 100, y: 100 },
  autoSave: true,
  saveInterval: 500  // 防抖延迟（毫秒）
}

const DEFAULT_NOTE_STYLE: NoteStyle = {
  backgroundColor: '#fef68a',
  fontSize: 14,
  fontFamily: 'Arial, sans-serif'
}
```

### 存储键名

```typescript
const STORAGE_KEYS = {
  NOTES_DATA: 'sticky-notes-data',      // 主数据
  BACKUP_DATA: 'sticky-notes-backup',   // 备份数据
  VERSION: 'sticky-notes-version'       // 版本信息
}
```


## 正确性属性

*属性是指在系统的所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 响应式状态更新

*对于任何*状态变更，所有订阅该状态的组件都应该收到更新通知并重新渲染
**验证需求: 1.3, 1.4**

### 属性 2: 创建便签生成唯一ID

*对于任何*创建便签操作，系统应该生成唯一的ID，且该ID不与现有便签ID冲突
**验证需求: 2.1**

### 属性 3: 更新操作的正确性

*对于任何*有效的便签ID和更新数据，更新操作应该只修改指定的字段，其他字段保持不变
**验证需求: 2.2, 2.3**

### 属性 4: 删除操作减少列表长度

*对于任何*存在的便签ID，删除操作后列表长度应该减1，且该ID不再存在于列表中
**验证需求: 2.4**

### 属性 5: 无效操作保持状态不变

*对于任何*不存在的便签ID，执行更新或删除操作应该返回错误，且状态存储保持不变
**验证需求: 2.5**

### 属性 6: 序列化往返一致性

*对于任何*有效的状态对象，序列化后再反序列化应该得到等价的对象
**验证需求: 3.1, 3.4**

### 属性 7: 数据保存后可恢复

*对于任何*保存到本地存储的数据，重新加载后应该能够完全恢复原始状态
**验证需求: 3.2, 3.4**

### 属性 8: 防抖机制减少保存次数

*对于任何*在短时间内（小于防抖延迟）的多次状态变更，应该只触发一次保存操作
**验证需求: 4.1**

### 属性 9: 保存操作的互斥性

*对于任何*正在进行的保存操作，新的保存请求应该被忽略或排队，直到当前操作完成
**验证需求: 4.3**

### 属性 10: 保存失败后的重试

*对于任何*保存失败的情况，系统应该记录错误并在下次状态变更时重新尝试保存
**验证需求: 4.4**

### 属性 11: 版本检查的一致性

*对于任何*从存储加载的数据，系统都应该检查版本号并决定是否需要迁移
**验证需求: 5.1, 5.2**

### 属性 12: 迁移前创建备份

*对于任何*需要迁移的数据，系统应该先创建备份副本，然后再执行迁移
**验证需求: 5.3**

### 属性 13: 迁移成功更新版本

*对于任何*成功完成的数据迁移，数据版本号应该更新为当前应用版本
**验证需求: 5.4**

### 属性 14: 迁移失败回滚数据

*对于任何*迁移失败的情况，系统应该恢复备份数据并记录错误信息
**验证需求: 5.5**

### 属性 15: 置顶操作的幂等性

*对于任何*便签，连续两次执行相同的置顶/取消置顶操作，结果应该与执行一次相同
**验证需求: 6.1, 6.2**

### 属性 16: 排序保持置顶在前

*对于任何*便签列表，排序后所有置顶便签应该出现在非置顶便签之前
**验证需求: 6.3**

### 属性 17: 序列化失败保持状态

*对于任何*导致序列化失败的数据，原始状态应该保持不变且错误被记录
**验证需求: 7.1**

### 属性 18: 存储失败保留内存数据

*对于任何*本地存储写入失败的情况，数据应该继续保留在内存中且错误被记录
**验证需求: 7.3**

### 属性 19: 读取失败尝试备份

*对于任何*本地存储读取失败的情况，系统应该尝试从备份位置读取数据
**验证需求: 7.4**

### 属性 20: 统计信息的一致性

*对于任何*便签列表，统计信息（总数、置顶数量）应该与实际列表状态一致
**验证需求: 8.1, 8.2**

### 属性 21: 时间排序的正确性

*对于任何*便签列表，按创建时间排序后，相邻便签的时间戳应该满足降序关系
**验证需求: 8.3**

## 错误处理

### 错误类型

```typescript
enum StorageErrorType {
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  STORAGE_WRITE_ERROR = 'STORAGE_WRITE_ERROR',
  STORAGE_READ_ERROR = 'STORAGE_READ_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

interface StorageError {
  type: StorageErrorType
  message: string
  originalError?: Error
  timestamp: number
  context?: any
}
```

### 错误处理策略

1. **序列化错误**
   - 记录详细错误信息（包括导致错误的数据）
   - 保持原始状态不变
   - 通知用户数据未保存

2. **反序列化错误**
   - 尝试读取备份数据
   - 如果备份也失败，使用默认空状态
   - 记录错误并通知用户

3. **存储写入错误**
   - 保留数据在内存中
   - 记录错误信息
   - 在下次变更时重试

4. **存储读取错误**
   - 尝试读取备份数据
   - 检查存储配额是否已满
   - 提供清除数据选项

5. **迁移错误**
   - 立即停止迁移过程
   - 恢复备份数据
   - 记录详细错误信息
   - 通知用户并提供手动迁移选项

### 错误恢复机制

```typescript
interface RecoveryStrategy {
  // 尝试从备份恢复
  recoverFromBackup(): Promise<boolean>
  
  // 清除损坏的数据
  clearCorruptedData(): Promise<void>
  
  // 导出数据用于手动恢复
  exportDataForManualRecovery(): Promise<string>
  
  // 重置为默认状态
  resetToDefault(): void
}
```

## 测试策略

### 单元测试

使用Vitest进行单元测试，覆盖以下场景：

1. **Store Actions测试**
   - 测试addNote创建便签并生成唯一ID
   - 测试updateNote正确更新指定字段
   - 测试deleteNote移除便签
   - 测试togglePin切换置顶状态

2. **Getters测试**
   - 测试sortedNotes返回正确排序的列表
   - 测试统计信息的准确性
   - 测试getNoteById查询功能

3. **存储Composable测试**
   - 测试数据序列化和反序列化
   - 测试localStorage读写操作
   - 测试错误处理逻辑

4. **迁移模块测试**
   - 测试版本检查逻辑
   - 测试迁移函数的正确性
   - 测试备份和恢复机制

### 属性测试

使用fast-check进行属性测试，验证正确性属性：

**配置要求**：
- 每个属性测试至少运行100次迭代
- 每个测试必须使用注释标记对应的设计文档属性
- 标记格式：`// Feature: data-persistence, Property X: [属性描述]`

**测试库**：fast-check (JavaScript/TypeScript的属性测试库)

**关键属性测试**：

1. **属性 6: 序列化往返一致性**
   - 生成随机的状态对象
   - 验证序列化后反序列化得到等价对象

2. **属性 7: 数据保存后可恢复**
   - 生成随机的便签列表
   - 保存后重新加载，验证数据完整性

3. **属性 8: 防抖机制减少保存次数**
   - 生成随机的快速变更序列
   - 验证只触发一次保存

4. **属性 15: 置顶操作的幂等性**
   - 生成随机便签
   - 验证连续两次置顶操作结果相同

5. **属性 16: 排序保持置顶在前**
   - 生成随机的混合便签列表
   - 验证排序后置顶便签在前

6. **属性 20: 统计信息的一致性**
   - 生成随机便签列表
   - 验证统计数据与实际状态匹配

### 集成测试

1. **完整数据流测试**
   - 创建便签 → 自动保存 → 重启应用 → 数据恢复

2. **迁移流程测试**
   - 加载旧版本数据 → 执行迁移 → 验证数据正确性

3. **错误恢复测试**
   - 模拟存储失败 → 验证备份恢复
   - 模拟迁移失败 → 验证回滚机制

### 测试数据生成器

```typescript
// 用于属性测试的数据生成器
import * as fc from 'fast-check'

// 生成随机便签
const noteArbitrary = fc.record({
  id: fc.uuid(),
  content: fc.string({ minLength: 0, maxLength: 1000 }),
  position: fc.record({
    x: fc.integer({ min: 0, max: 2000 }),
    y: fc.integer({ min: 0, max: 2000 })
  }),
  size: fc.record({
    width: fc.integer({ min: 200, max: 800 }),
    height: fc.integer({ min: 200, max: 800 })
  }),
  style: fc.record({
    backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
    fontSize: fc.integer({ min: 10, max: 24 }),
    fontFamily: fc.constantFrom('Arial', 'Helvetica', 'Times New Roman')
  }),
  createdAt: fc.date().map(d => d.getTime()),
  updatedAt: fc.date().map(d => d.getTime()),
  isPinned: fc.boolean()
})

// 生成随机便签列表
const notesArrayArbitrary = fc.array(noteArbitrary, { minLength: 0, maxLength: 50 })
```

## 实现细节

### 自动保存实现

```typescript
import { watchDebounced } from '@vueuse/core'

// 在store中设置自动保存
export const useNotesStore = defineStore('notes', () => {
  const state = reactive<NotesState>({
    notes: [],
    settings: DEFAULT_SETTINGS,
    version: CURRENT_VERSION,
    lastSaved: 0,
    isLoading: false,
    error: null
  })

  // 监听状态变化，防抖保存
  watchDebounced(
    () => state.notes,
    async () => {
      await saveToStorage()
    },
    { debounce: state.settings.saveInterval, deep: true }
  )

  return { state, ...actions, ...getters }
})
```

### 数据迁移实现

```typescript
// 定义迁移规则
const migrations: Migration[] = [
  {
    version: 2,
    description: '添加updatedAt字段',
    migrate: (data) => {
      return {
        ...data,
        notes: data.notes.map(note => ({
          ...note,
          updatedAt: note.createdAt
        }))
      }
    }
  },
  // 更多迁移规则...
]

// 执行迁移
function runMigrations(data: any, targetVersion: number): MigrationResult {
  const currentVersion = data.version || 1
  
  if (currentVersion >= targetVersion) {
    return { success: true, fromVersion: currentVersion, toVersion: targetVersion }
  }

  // 创建备份
  const backup = JSON.parse(JSON.stringify(data))

  try {
    let migratedData = data
    
    // 按顺序执行所有需要的迁移
    for (const migration of migrations) {
      if (migration.version > currentVersion && migration.version <= targetVersion) {
        migratedData = migration.migrate(migratedData)
        migratedData.version = migration.version
      }
    }

    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      backup
    }
  } catch (error) {
    return {
      success: false,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      backup,
      error: error as Error
    }
  }
}
```

### 存储封装

```typescript
export function useStorage<T>(options: UseStorageOptions) {
  const data = ref<T>(options.defaultValue)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const save = async () => {
    try {
      const serialized = options.serializer?.write(data.value) 
        ?? JSON.stringify(data.value)
      localStorage.setItem(options.key, serialized)
    } catch (err) {
      error.value = err as Error
      options.onError?.(err as Error)
    }
  }

  const load = async () => {
    isLoading.value = true
    try {
      const raw = localStorage.getItem(options.key)
      if (raw) {
        data.value = options.serializer?.read(raw) 
          ?? JSON.parse(raw)
      }
    } catch (err) {
      error.value = err as Error
      options.onError?.(err as Error)
      data.value = options.defaultValue
    } finally {
      isLoading.value = false
    }
  }

  const clear = () => {
    localStorage.removeItem(options.key)
    data.value = options.defaultValue
  }

  return { data, isLoading, error, save, load, clear }
}
```

## 性能考虑

### 优化策略

1. **防抖保存**
   - 默认500ms延迟
   - 避免频繁的磁盘写入
   - 可配置的延迟时间

2. **增量更新**
   - 只序列化变更的数据
   - 使用浅比较检测变化
   - 减少不必要的序列化操作

3. **懒加载**
   - 应用启动时异步加载数据
   - 不阻塞UI渲染
   - 显示加载状态

4. **内存管理**
   - 限制便签数量上限
   - 定期清理过期数据
   - 监控存储空间使用

### 性能指标

- 保存操作应在50ms内完成
- 加载操作应在100ms内完成
- 内存占用应小于50MB（1000个便签）
- 防抖延迟默认500ms，可配置

## 安全考虑

1. **数据验证**
   - 加载数据前验证结构
   - 检查必需字段
   - 过滤无效数据

2. **存储配额**
   - 检查localStorage可用空间
   - 处理配额超限错误
   - 提供数据清理选项

3. **备份策略**
   - 定期创建备份
   - 保留最近3个备份
   - 提供手动备份功能

4. **数据隔离**
   - 使用唯一的存储键名
   - 避免与其他应用冲突
   - 支持多用户配置

## 未来扩展

1. **云同步支持**
   - 设计支持远程存储的接口
   - 冲突解决策略
   - 离线优先架构

2. **加密存储**
   - 敏感数据加密
   - 密钥管理
   - 安全的序列化

3. **导入导出**
   - JSON格式导出
   - 批量导入功能
   - 数据格式转换

4. **撤销/重做**
   - 操作历史记录
   - 状态快照
   - 时间旅行调试
