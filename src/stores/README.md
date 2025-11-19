# Pinia 状态管理

本目录包含所有 Pinia store 定义。

## Store 组织

建议按功能模块组织 store：

```
stores/
├── notes.ts        # 便签数据管理
├── settings.ts     # 应用设置管理
└── ui.ts           # UI 状态管理
```

## 命名规范

- Store 文件使用 camelCase 命名
- Store ID 使用相同的名称
- 使用 `use` 前缀导出：`export const useNotesStore = defineStore('notes', ...)`

## 开发指南

- 使用 Composition API 风格的 setup store
- 明确区分 state、getters 和 actions
- 使用 TypeScript 定义 state 类型
- 避免在 store 中直接操作 DOM
