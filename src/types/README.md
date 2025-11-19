# TypeScript 类型定义

本目录包含应用的 TypeScript 类型定义。

## 文件说明

- `index.ts` - 核心类型定义（Note, Position, Size 等）
- 其他类型文件按功能模块组织

## 类型组织

```
types/
├── index.ts        # 核心类型
├── api.ts          # API 相关类型
└── electron.ts     # Electron API 类型
```

## 开发指南

- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型和工具类型
- 导出所有公共类型
- 为复杂类型添加 JSDoc 注释
