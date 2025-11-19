# 需求文档 - 项目基础架构

## 简介

本文档定义了 Vue 3 + Electron 便签应用的项目基础架构需求。这是整个项目的第一阶段，目标是建立一个完整的、可运行的开发环境，包括项目结构、TypeScript 配置、构建系统和核心类型定义。

## 术语表

- **项目系统 (Project System)**: 管理项目文件结构、依赖和配置的系统
- **构建系统 (Build System)**: 负责编译、打包和热重载的 Vite 和 electron-vite 工具链
- **类型系统 (Type System)**: TypeScript 类型定义和类型检查配置
- **开发环境 (Development Environment)**: 支持热重载的本地开发服务器环境
- **主进程 (Main Process)**: Electron 应用的后端进程，运行 Node.js 环境
- **渲染进程 (Renderer Process)**: Electron 应用的前端进程，运行浏览器环境
- **便签 (Note)**: 用户创建的单个便签实例
- **应用设置 (AppSettings)**: 全局应用配置和用户偏好设置

## 需求

### 需求 1: 项目结构初始化

**用户故事：** 作为开发者，我希望有一个清晰的项目目录结构，以便组织代码和资源文件。

#### 验收标准

1. WHEN 项目初始化完成 THEN 项目系统 SHALL 创建包含 electron、src、docs 目录的标准项目结构
2. WHEN 项目初始化完成 THEN 项目系统 SHALL 在 src 目录下创建 components、stores、composables、types、styles 子目录
3. WHEN 项目初始化完成 THEN 项目系统 SHALL 在根目录创建 package.json、vite.config.ts、tsconfig.json 配置文件
4. WHEN 项目初始化完成 THEN 项目系统 SHALL 创建 .gitignore 文件以排除 node_modules 和构建产物

### 需求 2: 依赖管理配置

**用户故事：** 作为开发者，我希望所有必要的依赖都已正确配置，以便可以直接开始开发。

#### 验收标准

1. WHEN package.json 被创建 THEN 项目系统 SHALL 包含 Vue 3、Pinia、VueUse 作为生产依赖
2. WHEN package.json 被创建 THEN 项目系统 SHALL 包含 Electron、electron-vite、Vite 作为开发依赖
3. WHEN package.json 被创建 THEN 项目系统 SHALL 包含 TypeScript 和 @vue/tsconfig 作为开发依赖
4. WHEN package.json 被创建 THEN 项目系统 SHALL 定义 dev、build、preview 脚本命令
5. WHEN 执行 npm install THEN 项目系统 SHALL 成功安装所有依赖且无错误

### 需求 3: TypeScript 配置

**用户故事：** 作为开发者，我希望 TypeScript 配置支持 Vue 3 和 Electron 开发，以便获得完整的类型检查和智能提示。

#### 验收标准

1. WHEN tsconfig.json 被创建 THEN 类型系统 SHALL 启用严格模式（strict: true）
2. WHEN tsconfig.json 被创建 THEN 类型系统 SHALL 配置 Vue 3 SFC 支持（包含 @vue/tsconfig/tsconfig.dom.json）
3. WHEN tsconfig.json 被创建 THEN 类型系统 SHALL 配置路径别名（@/ 指向 src 目录）
4. WHEN tsconfig.json 被创建 THEN 类型系统 SHALL 包含 ES2020 和 DOM 类型库
5. WHEN TypeScript 文件被编译 THEN 类型系统 SHALL 检测类型错误并提供准确的错误信息

### 需求 4: Vite 构建配置

**用户故事：** 作为开发者，我希望构建系统支持 Vue 3 和 Electron 的开发和打包，以便快速迭代和部署。

#### 验收标准

1. WHEN vite.config.ts 被创建 THEN 构建系统 SHALL 配置 @vitejs/plugin-vue 插件
2. WHEN vite.config.ts 被创建 THEN 构建系统 SHALL 配置 electron-vite 插件用于 Electron 集成
3. WHEN vite.config.ts 被创建 THEN 构建系统 SHALL 配置路径别名与 tsconfig.json 保持一致
4. WHEN vite.config.ts 被创建 THEN 构建系统 SHALL 配置开发服务器端口和代理设置
5. WHEN 执行 npm run dev THEN 构建系统 SHALL 启动开发服务器并支持热模块替换

### 需求 5: 核心类型定义

**用户故事：** 作为开发者，我希望有完整的 TypeScript 类型定义，以便在编码时获得类型安全和智能提示。

#### 验收标准

1. WHEN types/index.ts 被创建 THEN 类型系统 SHALL 定义 Note 接口包含 id、content、position、size、style、createdAt、isPinned 属性
2. WHEN types/index.ts 被创建 THEN 类型系统 SHALL 定义 Position 接口包含 x 和 y 坐标属性
3. WHEN types/index.ts 被创建 THEN 类型系统 SHALL 定义 Size 接口包含 width 和 height 属性
4. WHEN types/index.ts 被创建 THEN 类型系统 SHALL 定义 NoteStyle 接口包含 backgroundColor、fontSize、fontFamily 属性
5. WHEN types/index.ts 被创建 THEN 类型系统 SHALL 定义 AppSettings 接口包含 theme、defaultNoteSize、defaultNotePosition 属性
6. WHEN 在代码中使用这些类型 THEN 类型系统 SHALL 提供完整的类型检查和自动补全

### 需求 6: Electron 基础配置

**用户故事：** 作为开发者，我希望 Electron 的基础配置已就绪，以便后续阶段可以直接开发桌面应用功能。

#### 验收标准

1. WHEN electron 目录被创建 THEN 项目系统 SHALL 包含 main.ts 和 preload.ts 文件占位符
2. WHEN package.json 被配置 THEN 项目系统 SHALL 设置 main 字段指向编译后的 Electron 主进程文件
3. WHEN vite.config.ts 被配置 THEN 构建系统 SHALL 包含 Electron 主进程和预加载脚本的构建配置
4. WHEN 类型定义被创建 THEN 类型系统 SHALL 包含 Electron API 的基础类型声明

### 需求 7: 开发工作流配置

**用户故事：** 作为开发者，我希望有完整的开发工作流支持，以便高效地进行开发和调试。

#### 验收标准

1. WHEN package.json 被配置 THEN 项目系统 SHALL 定义 dev 脚本用于启动开发环境
2. WHEN package.json 被配置 THEN 项目系统 SHALL 定义 build 脚本用于生产环境构建
3. WHEN package.json 被配置 THEN 项目系统 SHALL 定义 preview 脚本用于预览构建结果
4. WHEN 执行 npm run dev THEN 开发环境 SHALL 启动并支持代码热重载
5. WHEN 代码文件被修改 THEN 开发环境 SHALL 自动重新编译并刷新应用

### 需求 8: 代码质量工具配置

**用户故事：** 作为开发者，我希望有代码质量工具来保持代码风格一致性，以便提高代码可维护性。

#### 验收标准

1. WHEN .editorconfig 被创建 THEN 项目系统 SHALL 定义统一的编辑器配置（缩进、换行等）
2. WHEN .gitignore 被创建 THEN 项目系统 SHALL 排除 node_modules、dist、.DS_Store 等文件
3. WHEN README.md 被创建 THEN 项目系统 SHALL 包含项目说明、安装步骤和开发命令
4. WHEN 项目结构被创建 THEN 项目系统 SHALL 为每个主要目录提供 README.md 说明文件

### 需求 9: 环境变量配置

**用户故事：** 作为开发者，我希望可以通过环境变量配置不同环境的参数，以便在开发和生产环境使用不同的配置。

#### 验收标准

1. WHEN .env.example 被创建 THEN 项目系统 SHALL 定义环境变量模板
2. WHEN vite.config.ts 被配置 THEN 构建系统 SHALL 支持读取 .env 文件中的环境变量
3. WHEN 应用启动 THEN 项目系统 SHALL 根据当前环境加载对应的环境变量
4. WHEN 环境变量被使用 THEN 类型系统 SHALL 提供环境变量的类型定义

### 需求 10: 构建产物验证

**用户故事：** 作为开发者，我希望构建系统能够正确输出可用的构建产物，以便验证配置的正确性。

#### 验收标准

1. WHEN 执行 npm run build THEN 构建系统 SHALL 在 dist 目录生成编译后的文件
2. WHEN 构建完成 THEN 构建系统 SHALL 生成主进程、渲染进程和预加载脚本的独立产物
3. WHEN 构建完成 THEN 构建系统 SHALL 输出构建统计信息（文件大小、构建时间）
4. WHEN 构建产物被检查 THEN 构建系统 SHALL 确保所有必要的资源文件都已包含
5. WHEN 构建失败 THEN 构建系统 SHALL 提供清晰的错误信息和堆栈跟踪
