/**
 * Electron 预加载脚本
 * 
 * 职责：
 * - 在渲染进程和主进程之间建立安全的通信桥梁
 * - 暴露受限的 Electron API 给渲染进程
 * - 确保上下文隔离的安全性
 * 
 * 安全特性：
 * - 启用上下文隔离 (contextIsolation: true)
 * - 禁用 Node.js 集成 (nodeIntegration: false)
 * - 使用 contextBridge 安全地暴露 API
 * - 只暴露必需的 API，遵循最小权限原则
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../src/types'

// 日志：预加载脚本已加载
console.log('[Preload] Electron 预加载脚本已加载')

/**
 * 创建 Electron API 对象
 * 通过 contextBridge 安全地暴露给渲染进程
 */
const electronAPI: ElectronAPI = {
    // 窗口操作 API
    window: {
        /**
         * 关闭当前窗口
         */
        close: () => ipcRenderer.invoke('window:close'),

        /**
         * 最小化当前窗口
         */
        minimize: () => ipcRenderer.invoke('window:minimize'),

        /**
         * 最大化/恢复当前窗口
         */
        maximize: () => ipcRenderer.invoke('window:maximize'),

        /**
         * 获取窗口位置
         * @returns 窗口的 x 和 y 坐标
         */
        getPosition: () => ipcRenderer.invoke('window:getPosition'),

        /**
         * 设置窗口位置
         * @param x - 窗口的 x 坐标
         * @param y - 窗口的 y 坐标
         */
        setPosition: (x: number, y: number) => ipcRenderer.invoke('window:setPosition', x, y),

        /**
         * 获取窗口尺寸
         * @returns 窗口的宽度和高度
         */
        getSize: () => ipcRenderer.invoke('window:getSize'),

        /**
         * 设置窗口尺寸
         * @param width - 窗口宽度
         * @param height - 窗口高度
         */
        setSize: (width: number, height: number) => ipcRenderer.invoke('window:setSize', width, height),

        /**
         * 设置窗口置顶状态
         * @param alwaysOnTop - 是否置顶
         */
        setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop),

        /**
         * 获取窗口置顶状态
         * @returns 窗口是否置顶
         */
        isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),

        /**
         * 聚焦当前窗口
         */
        focus: () => ipcRenderer.invoke('window:focus')
    },

    // 多窗口管理 API
    multiWindow: {
        /**
         * 创建新窗口
         * @param options - 窗口创建选项
         * @returns 新窗口的ID
         */
        create: (options: {
            windowId?: string
            noteId?: string
            position?: { x: number; y: number }
            size?: { width: number; height: number }
            alwaysOnTop?: boolean
        }) => ipcRenderer.invoke('multiWindow:create', options),

        /**
         * 关闭指定窗口
         * @param windowId - 窗口ID
         */
        close: (windowId: string) => ipcRenderer.invoke('multiWindow:close', windowId),

        /**
         * 聚焦指定窗口
         * @param windowId - 窗口ID
         */
        focus: (windowId: string) => ipcRenderer.invoke('multiWindow:focus', windowId),

        /**
         * 向所有窗口广播消息
         * @param event - 事件名称
         * @param data - 事件数据
         */
        broadcast: (event: string, data: any) => ipcRenderer.invoke('multiWindow:broadcast', { channel: event, data }),

        /**
         * 获取所有窗口信息
         * @returns 所有窗口的信息列表
         */
        getAllWindows: () => ipcRenderer.invoke('multiWindow:getAllWindows')
    },

    // 系统信息 API
    system: {
        /**
         * 当前操作系统平台
         * 可能的值：'win32' | 'darwin' | 'linux'
         */
        platform: process.platform,

        /**
         * 获取应用版本号
         * @returns 应用的版本号
         */
        getVersion: () => ipcRenderer.invoke('system:getVersion'),

        /**
         * 获取 Electron、Node.js 和 Chrome 的版本信息
         * @returns 包含各组件版本的对象
         */
        getVersions: () => ipcRenderer.invoke('system:getVersions'),

        /**
         * 获取应用路径
         * @param name - 路径名称（如 'home', 'appData', 'userData' 等）
         * @returns 对应的路径字符串
         */
        getPath: (name: string) => ipcRenderer.invoke('system:getPath', name)
    },

    // 托盘管理 API
    tray: {
        /**
         * 显示托盘通知
         * @param notification - 通知配置
         */
        showNotification: (notification: {
            title: string
            body: string
            icon?: string
            silent?: boolean
        }) => ipcRenderer.invoke('tray:showNotification', notification),

        /**
         * 更新托盘菜单
         * @param items - 菜单项配置数组
         */
        updateMenu: (items: any[]) => ipcRenderer.invoke('tray:updateMenu', items),

        /**
         * 设置托盘工具提示
         * @param tooltip - 工具提示文本
         */
        setToolTip: (tooltip: string) => ipcRenderer.invoke('tray:setToolTip', tooltip),

        /**
         * 检查托盘是否已创建
         * @returns 托盘是否存在
         */
        isCreated: () => ipcRenderer.invoke('tray:isCreated')
    },

    // 快捷键管理 API
    shortcut: {
        /**
         * 获取所有快捷键配置
         * @returns 快捷键配置数组
         */
        getAllConfigs: () => ipcRenderer.invoke('shortcut:getAllConfigs'),

        /**
         * 更新快捷键配置
         * @param config - 快捷键配置
         */
        updateConfig: (config: {
            key: string
            action: string
            enabled: boolean
        }) => ipcRenderer.invoke('shortcut:updateConfig', config),

        /**
         * 检查快捷键是否已注册
         * @param key - 快捷键
         * @returns 是否已注册
         */
        isRegistered: (key: string) => ipcRenderer.invoke('shortcut:isRegistered', key),

        /**
         * 获取指定动作的快捷键配置
         * @param action - 动作名称
         * @returns 快捷键配置或 null
         */
        getConfigByAction: (action: string) => ipcRenderer.invoke('shortcut:getConfigByAction', action)
    },

    // 显示器管理 API
    display: {
        /**
         * 获取所有显示器信息
         * @returns 显示器信息数组
         */
        getAllDisplays: () => ipcRenderer.invoke('display:getAllDisplays'),

        /**
         * 获取主显示器信息
         * @returns 主显示器信息
         */
        getPrimaryDisplay: () => ipcRenderer.invoke('display:getPrimaryDisplay'),

        /**
         * 获取指定点所在的显示器
         * @param point - 坐标点
         * @returns 显示器信息
         */
        getDisplayNearestPoint: (point: { x: number; y: number }) => ipcRenderer.invoke('display:getDisplayNearestPoint', point),

        /**
         * 获取当前窗口所在的显示器
         * @returns 显示器信息
         */
        getDisplayForWindow: () => ipcRenderer.invoke('display:getDisplayForWindow'),

        /**
         * 检查位置是否在显示器范围内
         * @param position - 位置坐标
         * @returns 是否在范围内
         */
        isPositionInBounds: (position: { x: number; y: number }) => ipcRenderer.invoke('display:isPositionInBounds', position),

        /**
         * 调整位置到显示器内
         * @param position - 原始位置
         * @param windowSize - 窗口尺寸（可选）
         * @returns 调整后的位置
         */
        adjustPositionToBounds: (position: { x: number; y: number }, windowSize?: { width: number; height: number }) =>
            ipcRenderer.invoke('display:adjustPositionToBounds', position, windowSize),

        /**
         * 获取显示器数量
         * @returns 显示器数量
         */
        getDisplayCount: () => ipcRenderer.invoke('display:getDisplayCount'),

        /**
         * 检查是否为多显示器环境
         * @returns 是否为多显示器
         */
        isMultiDisplay: () => ipcRenderer.invoke('display:isMultiDisplay'),

        /**
         * 获取显示器信息摘要
         * @returns 显示器信息摘要字符串
         */
        getDisplaySummary: () => ipcRenderer.invoke('display:getDisplaySummary')
    },

    // 自启动管理 API
    autoLaunch: {
        /**
         * 启用开机自启动
         * @param hidden - 是否隐藏启动（可选，默认false）
         * @returns 操作结果
         */
        enable: (hidden?: boolean) => ipcRenderer.invoke('autoLaunch:enable', hidden),

        /**
         * 禁用开机自启动
         * @returns 操作结果
         */
        disable: () => ipcRenderer.invoke('autoLaunch:disable'),

        /**
         * 检查是否已启用开机自启动
         * @returns 是否已启用
         */
        isEnabled: () => ipcRenderer.invoke('autoLaunch:isEnabled'),

        /**
         * 获取自启动配置
         * @returns 自启动配置
         */
        getConfig: () => ipcRenderer.invoke('autoLaunch:getConfig'),

        /**
         * 更新自启动配置
         * @param config - 配置对象
         * @returns 操作结果
         */
        updateConfig: (config: {
            enabled?: boolean
            hidden?: boolean
        }) => ipcRenderer.invoke('autoLaunch:updateConfig', config)
    },

    // 主题管理 API
    theme: {
        /**
         * 获取当前主题
         * @returns 当前主题模式
         */
        getCurrent: () => ipcRenderer.invoke('theme:get-current'),

        /**
         * 获取主题配置
         * @returns 主题配置
         */
        getConfig: () => ipcRenderer.invoke('theme:get-config'),

        /**
         * 设置主题
         * @param mode - 主题模式（'light' | 'dark' | 'system'）
         * @returns 操作结果
         */
        set: (mode: 'light' | 'dark' | 'system') => ipcRenderer.invoke('theme:set', mode),

        /**
         * 切换主题（在 light 和 dark 之间切换）
         * @returns 切换后的主题
         */
        toggle: () => ipcRenderer.invoke('theme:toggle'),

        /**
         * 获取系统主题
         * @returns 系统主题（'light' | 'dark'）
         */
        getSystem: () => ipcRenderer.invoke('theme:get-system')
    },

    // 事件监听 API
    /**
     * 监听主进程发送的事件
     * @param channel - 事件通道名称
     * @param callback - 事件回调函数
     */
    on: (channel: string, callback: (...args: any[]) => void) => {
        // 创建包装函数，过滤掉 event 对象，只传递数据
        const subscription = (_event: any, ...args: any[]) => callback(...args)
        ipcRenderer.on(channel, subscription)
    },

    /**
     * 取消监听主进程发送的事件
     * @param channel - 事件通道名称
     * @param callback - 要移除的回调函数
     */
    off: (channel: string, callback: (...args: any[]) => void) => {
        ipcRenderer.removeListener(channel, callback)
    }
}

/**
 * 使用 contextBridge 安全地暴露 API 到渲染进程
 * 
 * 安全说明：
 * - contextBridge 确保渲染进程无法直接访问 Node.js 或 Electron 的内部 API
 * - 只有通过 exposeInMainWorld 暴露的 API 才能被渲染进程访问
 * - 这种方式符合 Electron 的安全最佳实践
 */
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

console.log('[Preload] Electron API 已成功暴露到渲染进程')
