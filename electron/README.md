# Electron 主进程

本目录包含 Electron 应用的主进程代码。

## 文件说明

- `main.ts` - Electron 主进程入口文件，负责创建窗口和管理应用生命周期
- `preload.ts` - 预加载脚本，在渲染进程加载前运行，用于安全地暴露 Node.js API

## 开发说明

主进程运行在 Node.js 环境中，可以访问所有 Node.js API 和 Electron API。

预加载脚本运行在独立的上下文中，通过 `contextBridge` 安全地向渲染进程暴露 API。
