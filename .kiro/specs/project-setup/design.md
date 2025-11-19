# 设计文档 - 项目基础架构

## 概述

本文档描述了 Vue 3 + Electron 便签应用项目基础架构的设计方案。这是整个项目的第一阶段，将建立一个完整的、类型安全的、支持热重载的开发环境。

### 设计目标

1. **标准化项目结构**：建立清晰的目录组织，便于后续开发
2. **类型安全**：通过 TypeScript 提供完整的类型检查和智能提示
3. **高效构建**：使用 Vite 和 electron-vite 实现快速构建和热重载
4. **可扩展性**：为后续阶段的功能开发预留良好的架构基础

### 技术选型

- **前端框架**：Vue 3.4+ (Composition API)
- **构建工具**：Vite 5.0+ 和 electron-vite 2.0+
- **桌面框架**：Electron 28.0+
- **类型系统**：TypeScript 5.3+
- **状态管理**：Pinia 2.1+
- **工具库**：VueUse 10.0+
- **包管理器**：npm 或 pnpm

## 架构

### 项目目录结构

```
sticky-notes-vue/
├── .vscode/                    # VS Code 配置
│   └── settings.json          # 编辑器设置
├── electron/                   # Electron 主进程代码
│   ├── main.ts                # 主进程入口（占位符）
│   └── preload.ts             # 预加载脚本（占位符）
├── src/                        # Vue 渲染进程代码
│   ├── main.ts                # Vue 应用入口（占位符）
│   ├── App.vue                # 根组件（占位符）
│   ├── components/            # Vue 组件目录
│   │   └── README.md          # 组件说明
│   ├── stores/                # Pinia 状态管理
│   │   └── README.md          # Store 说明
│   ├── composables/           # 组合式函数
│   │   └── README.md          # Composables 说明
│   ├── types/                 # TypeScript 类型定义
│   │   └── index.ts           # 核心类型定义
│   └── styles/                # 样式文件
│       ├── variables.css      # CSS 变量（占位符）
│       └── main.css           # 全局样式（占位符）
├── docs/                       # 项目文档
│   ├── 初版设计文档.md
│   └── 开发阶段规划.md
├── .editorconfig              # 编辑器配置
├── .gitignore                 # Git 忽略文件
├── .env.example               # 环境变量模板
├── package.json               # 项目配置和依赖
├── vite.config.ts             # Vite 构建配置
├── tsconfig.json              # TypeScript 配置（渲染进程）
├── tsconfig.node.json         # TypeScript 配置（主进程）
└── README.md                  # 项目说明文档
```

### 构建流程

```
开发模式 (npm run dev):
  ┌─────────────────┐
  │  Vite Dev Server│
  │  (渲染进程)     │
  └────────┬────────┘
           │
           ├─> 热模块替换 (HMR)
           │
  ┌────────▼────────┐
  │ Electron Main   │
  │  (主进程)       │
  └─────────────────┘

生产构建 (npm run build):
  ┌─────────────────┐
  │  Vite Build     │
  │  (渲染进程)     │
  └────────┬────────┘
           │
           ├─> dist/renderer/
           │
  ┌────────▼────────┐
  │ Electron Build  │
  │  (主进程)       │
  └────────┬────────┘
           │
           └─> dist/main/
```

## 组件和接口

### 配置文件组件

#### 1. package.json

**职责**：定义项目元数据、依赖和脚本命令

**关键配置**：
```json
{
  "name": "sticky-notes-vue",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "@vueuse/core": "^10.0.0",
    "@vueuse/electron": "^10.0.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-vite": "^2.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "@vue/tsconfig": "^0.5.0"
  }
}
```

#### 2. vite.config.ts

**职责**：配置 Vite 构建系统和插件

**关键配置**：
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  }
})
```

#### 3. tsconfig.json

**职责**：配置 TypeScript 编译选项

**关键配置**：
```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 4. tsconfig.node.json

**职责**：配置 Electron 主进程的 TypeScript 编译选项

**关键配置**：
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "types": ["node", "electron"]
  },
  "include": ["electron/**/*"]
}
```

### 类型定义组件

#### types/index.ts

**职责**：定义应用的核心数据类型

**接口定义**：

```typescript
// 位置坐标
export interface Position {
  x: number
  y: number
}

// 尺寸
export interface Size {
  width: number
  height: number
}

// 便签样式
export interface NoteStyle {
  backgroundColor: string
  fontSize: number
  fontFamily: string
}

// 便签数据
export interface Note {
  id: string
  content: string
  position: Position
  size: Size
  style: NoteStyle
  createdAt: number
  updatedAt: number
  isPinned: boolean
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto'
  defaultNoteSize: Size
  defaultNotePosition: Position
  autoSave: boolean
  saveInterval: number
}

// Electron API 类型（基础）
export interface ElectronAPI {
  // 占位符，后续阶段实现
}

// 环境变量类型
export interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
}

export interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 占位符文件

以下文件在本阶段创建为占位符，在后续阶段实现：

#### electron/main.ts
```typescript
// Electron 主进程入口
// 将在阶段 4 实现
console.log('Electron main process placeholder')
```

#### electron/preload.ts
```typescript
// Electron 预加载脚本
// 将在阶段 4 实现
console.log('Electron preload script placeholder')
```

#### src/main.ts
```typescript
// Vue 应用入口
// 将在阶段 2 实现
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

#### src/App.vue
```vue
<!-- Vue 根组件 -->
<!-- 将在阶段 2 实现 -->
<template>
  <div>Placeholder</div>
</template>
```

## 数据模型

### 核心类型关系

```
AppSettings
    │
    ├─> defaultNoteSize: Size
    └─> defaultNotePosition: Position

Note
    │
    ├─> position: Position
    ├─> size: Size
    └─> style: NoteStyle
```

### 类型约束

1. **Position**：x 和 y 必须为非负整数
2. **Size**：width 和 height 必须大于 0
3. **Note.id**：必须为唯一的 UUID 字符串
4. **Note.createdAt/updatedAt**：Unix 时间戳（毫秒）
5. **NoteStyle.fontSize**：范围 12-32
6. **AppSettings.saveInterval**：范围 1000-60000（毫秒）

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

由于本阶段主要是配置和结构搭建，大部分验收标准是具体的示例测试而非通用属性。以下是少数可以表达为属性的正确性要求：

### 属性反思

在分析所有验收标准后，我发现本阶段的需求主要是：
1. **文件存在性检查** - 这些是具体的示例，不是通用属性
2. **配置内容验证** - 这些是具体的配置值检查，不是通用规则
3. **构建过程验证** - 这些是集成测试，不是可泛化的属性

因此，本阶段**没有需要通过属性测试验证的通用属性**。所有验收标准都将通过单元测试和集成测试来验证。

## 错误处理

### 配置错误

1. **依赖安装失败**
   - 检查网络连接
   - 验证 package.json 语法
   - 提供清晰的错误消息

2. **TypeScript 编译错误**
   - 显示详细的类型错误位置
   - 提供修复建议
   - 支持增量编译

3. **Vite 构建错误**
   - 捕获插件错误
   - 显示文件路径和行号
   - 提供堆栈跟踪

### 环境错误

1. **Node.js 版本不兼容**
   - 检查 Node.js 版本（需要 18.0+）
   - 提示升级指南

2. **端口占用**
   - 自动尝试其他端口
   - 提示用户手动指定端口

3. **文件权限错误**
   - 检查写入权限
   - 提供权限修复建议

## 测试策略

### 单元测试

本阶段的测试主要是验证配置文件的正确性：

1. **配置文件验证测试**
   - 验证 package.json 包含所有必需依赖
   - 验证 tsconfig.json 配置正确
   - 验证 vite.config.ts 插件配置

2. **类型定义测试**
   - 验证所有接口定义存在
   - 验证类型导出正确
   - 验证类型约束有效

3. **文件结构测试**
   - 验证所有必需目录存在
   - 验证占位符文件存在
   - 验证 README 文件存在

### 集成测试

1. **依赖安装测试**
   - 运行 `npm install` 并验证成功
   - 检查 node_modules 目录

2. **构建系统测试**
   - 运行 `npm run build` 并验证成功
   - 检查 dist 目录结构
   - 验证构建产物完整性

3. **开发服务器测试**
   - 启动 `npm run dev`
   - 验证服务器正常运行
   - 验证端口监听

### 测试工具

- **测试框架**：Vitest（与 Vite 集成良好）
- **断言库**：Vitest 内置
- **文件系统测试**：Node.js fs 模块
- **JSON 解析**：Node.js 内置 JSON

### 测试配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
```

## 开发工作流

### 初始化流程

1. 克隆或创建项目目录
2. 运行 `npm install` 安装依赖
3. 验证 TypeScript 配置：`npx tsc --noEmit`
4. 启动开发服务器：`npm run dev`

### 开发流程

1. 修改源代码
2. 保存文件触发热重载
3. 浏览器/Electron 自动刷新
4. 查看控制台输出

### 构建流程

1. 运行 `npm run build`
2. 检查 dist 目录
3. 运行 `npm run preview` 预览
4. 验证构建产物

### 代码质量检查

1. TypeScript 类型检查：`npx tsc --noEmit`
2. 运行测试：`npm test`
3. 检查构建：`npm run build`

## 性能考虑

### 构建性能

1. **Vite 优化**
   - 使用 esbuild 进行快速转译
   - 启用依赖预构建
   - 配置合理的 chunk 分割

2. **TypeScript 优化**
   - 使用增量编译
   - 配置合理的 include/exclude
   - 避免过度的类型计算

### 开发体验

1. **快速启动**
   - Vite 冷启动时间 < 2 秒
   - HMR 更新时间 < 100ms

2. **类型检查**
   - IDE 实时类型提示
   - 编译时类型错误检测

## 安全考虑

### 依赖安全

1. 使用 `npm audit` 检查漏洞
2. 定期更新依赖版本
3. 锁定依赖版本（package-lock.json）

### 配置安全

1. 不提交 .env 文件到版本控制
2. 使用 .env.example 作为模板
3. 敏感信息使用环境变量

## 可扩展性

### 架构扩展点

1. **插件系统**：Vite 插件可以轻松添加
2. **类型扩展**：使用 TypeScript 模块扩展
3. **构建配置**：支持多环境配置

### 未来阶段准备

1. **组件目录**：为 Vue 组件预留空间
2. **Store 目录**：为 Pinia 状态管理预留空间
3. **Composables 目录**：为组合式函数预留空间
4. **Electron 目录**：为主进程代码预留空间

## 文档和注释

### 代码注释

1. 所有公共接口必须有 JSDoc 注释
2. 复杂逻辑必须有行内注释
3. 配置文件必须有说明注释

### 项目文档

1. **README.md**：项目概述、安装和使用说明
2. **目录 README**：每个主要目录的说明文件
3. **CHANGELOG.md**：版本变更记录（后续添加）

## 依赖关系

### 核心依赖

- **Vue 3**：前端框架
- **Pinia**：状态管理（本阶段仅安装）
- **VueUse**：工具库（本阶段仅安装）

### 开发依赖

- **Electron**：桌面应用框架
- **Vite**：构建工具
- **electron-vite**：Electron + Vite 集成
- **TypeScript**：类型系统
- **@vitejs/plugin-vue**：Vue 3 支持

### 版本要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

## 交付清单

- [x] 完整的项目目录结构
- [x] package.json 配置文件
- [x] vite.config.ts 构建配置
- [x] tsconfig.json 类型配置
- [x] tsconfig.node.json 主进程类型配置
- [x] types/index.ts 核心类型定义
- [x] .gitignore 文件
- [x] .editorconfig 文件
- [x] .env.example 环境变量模板
- [x] README.md 项目说明
- [x] 各目录 README.md 说明文件
- [x] 占位符文件（main.ts, preload.ts, App.vue 等）
- [x] 可运行的 npm run dev 命令
- [x] 可运行的 npm run build 命令

## 后续阶段接口

本阶段为后续阶段提供以下接口：

1. **类型系统**：完整的 TypeScript 类型定义
2. **构建系统**：可用的 Vite 和 electron-vite 配置
3. **项目结构**：标准化的目录组织
4. **开发环境**：支持热重载的开发服务器

后续阶段可以直接在此基础上：
- 阶段 2：实现 Vue 组件和样式
- 阶段 3：实现 Pinia 状态管理
- 阶段 4：实现 Electron 主进程
