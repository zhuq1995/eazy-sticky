# Vue 组件

本目录包含所有 Vue 3 组件。

## 组件组织

建议按功能模块组织组件：

```
components/
├── note/           # 便签相关组件
├── common/         # 通用组件
└── layout/         # 布局组件
```

## 命名规范

- 组件文件使用 PascalCase 命名：`NoteCard.vue`
- 组件名称应该清晰描述其功能
- 复合词组件名称至少两个单词：`NoteList.vue`

## 开发指南

- 使用 Composition API
- 使用 `<script setup>` 语法
- 为 props 定义 TypeScript 类型
- 使用 `defineEmits` 定义事件
