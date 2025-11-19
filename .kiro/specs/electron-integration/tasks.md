# 实现计划 - Electron 集成

## 任务列表

- [x] 1. 更新类型定义





  - 在 `src/types/index.ts` 中添加 ElectronAPI 接口定义
  - 定义 WindowConfig、WindowState、IPCMessage 等类型
  - 添加全局 Window 接口扩展，声明 electronAPI
  - 定义 IPC 处理器的类型签名
  - _需求: 3.4, 3.5, 4.1, 4.2_

- [x] 2. 实现主进程窗口管理





  - 更新 `electron/main.ts` 实现 WindowManager 类
  - 实现 createWindow 方法，配置无边框透明窗口
  - 实现窗口状态保存和恢复功能
  - 添加窗口事件监听（moved, resized, closed）
  - 配置开发环境和生产环境的不同加载方式
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 2.1 编写窗口配置的属性测试
  - **属性 2-5: 窗口配置属性**
  - **验证需求: 2.1, 2.2, 2.4, 2.5**

- [ ]* 2.2 编写窗口状态持久化的属性测试
  - **属性 29-30: 窗口状态保存和恢复**
  - **验证需求: 10.1, 10.3**
-

- [x] 3. 实现 IPC 通信处理器




  - 在 `electron/main.ts` 中注册 IPC 处理器
  - 实现窗口操作处理器（close, minimize, maximize, getPosition, setPosition, getSize, setSize）
  - 实现系统信息处理器（getPlatform, getVersion, getVersions, getPath）
  - 添加 IPC 错误处理和日志记录
  - 实现主进程到渲染进程的消息发送
  - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4_

- [ ]* 3.1 编写 IPC 通信的属性测试
  - **属性 11-15: IPC 消息处理和响应**
  - **验证需求: 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ]* 3.2 编写窗口操作的属性测试
  - **属性 18-22: 窗口操作方法**
  - **验证需求: 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 4. 实现预加载脚本





  - 更新 `electron/preload.ts` 实现完整的 API 暴露
  - 使用 contextBridge.exposeInMainWorld 暴露 electronAPI
  - 实现 window 操作 API（close, minimize, maximize, getPosition, setPosition, getSize, setSize）
  - 实现 system 信息 API（platform, getVersion, getVersions, getPath）
  - 实现事件监听 API（on, off）
  - 确保上下文隔离和安全配置
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.1 编写安全配置的属性测试
  - **属性 6-10: 安全配置和 API 访问限制**
  - **验证需求: 3.1, 3.2, 3.3, 3.4, 3.5**
-

- [x] 5. 实现应用生命周期管理




  - 在 `electron/main.ts` 中实现应用生命周期事件处理
  - 实现 app.whenReady 处理器
  - 实现 window-all-closed 事件处理（区分 macOS 和其他平台）
  - 实现 activate 事件处理（macOS 特定）
  - 实现 before-quit 事件处理
  - 添加窗口关闭时的资源清理
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 5.1 编写生命周期事件的属性测试
  - **属性 16-17: 退出事件和资源清理**
  - **验证需求: 5.4, 5.5**
-

- [x] 6. 实现错误处理和日志系统




  - 在 `electron/main.ts` 中添加全局错误处理
  - 实现 uncaughtException 处理器
  - 实现 unhandledRejection 处理器
  - 创建日志记录函数（info, warn, error, debug）
  - 在开发环境启用详细日志
  - 在生产环境记录错误到文件
  - _需求: 7.3, 7.4, 9.1, 9.2, 9.3, 9.4_

- [ ]* 6.1 编写错误处理的属性测试
  - **属性 23, 27-28: 错误日志记录和信息完整性**
  - **验证需求: 9.1, 9.2, 9.3, 9.4**
- [x] 7. 配置开发环境支持




- [ ] 7. 配置开发环境支持

  - 在 `electron/main.ts` 中添加开发环境检测
  - 在开发环境自动打开开发者工具
  - 配置开发服务器 URL 连接
  - 添加热重载支持
  - 配置开发环境的详细错误显示
  - _需求: 1.4, 7.1, 7.2, 7.3, 7.4_

- [x] 8. 创建 Electron Composable




  - 创建 `src/composables/useElectron.ts` 文件
  - 实现 isElectron 检测
  - 实现 platform 信息获取
  - 实现窗口操作方法（closeWindow, minimizeWindow, maximizeWindow）
  - 实现窗口状态管理（windowPosition, windowSize）
  - 实现窗口状态更新方法（updateWindowPosition, updateWindowSize）
  - 添加类型安全的 API 调用
  - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1_

- [ ]* 8.1 编写 useElectron composable 的单元测试
  - 测试环境检测功能
  - 测试窗口操作方法
  - 测试状态管理
  - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_
-

- [x] 9. 更新 Vue 应用集成 Electron




  - 在组件中导入并使用 useElectron
  - 更新 StickyNote.vue 使用 Electron 窗口 API
  - 添加 Electron 环境检测和降级处理
  - 测试在浏览器和 Electron 环境的兼容性
  - _需求: 1.3, 3.5_
-

- [x] 10. 实现跨平台兼容性处理



  - 在 `electron/main.ts` 中添加平台检测
  - 实现 Windows 特定配置（AppUserModelId）
  - 实现 macOS 特定配置（dock icon, activate 事件）
  - 实现 Linux 特定配置（透明窗口支持）
  - 测试不同平台的窗口行为
  - _需求: 5.1, 5.2, 5.3, 8.1_

- [ ]* 10.1 编写平台信息的属性测试
  - **属性 25: 平台信息返回**
  - **验证需求: 8.1**

- [x] 11. 配置 Electron 构建





  - 验证 electron-vite 配置正确
  - 配置主进程和预加载脚本的构建路径
  - 配置渲染进程的构建输出
  - 测试开发环境启动（npm run dev）



  - 测试生产环境构建（npm run build）
  - _需求: 1.4, 1.5_

- [ ] 12. 创建属性测试数据生成器

  - 安装 fast-check（如果尚未安装）



  - 创建 `tests/electron-generators.ts` 文件
  - 实现窗口配置生成器
  - 实现 IPC 消息生成器
  - 实现窗口状态生成器
  - _需求: 所有需求（测试支持）_

- [ ] 13. 最终检查点

  - 确保所有测试通过，如有问题请询问用户
  - 验证应用能在 Electron 环境正常启动
  - 验证窗口操作功能正常
  - 验证 IPC 通信正常工作
