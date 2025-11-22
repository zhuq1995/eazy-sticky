/**
 * 系统托盘管理器
 * 
 * 职责：
 * - 创建和管理系统托盘图标
 * - 构建和更新托盘菜单
 * - 显示托盘通知
 * - 处理托盘事件
 * 
 * 验证需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4
 */

import { Tray, Menu, nativeImage, Notification, app, BrowserWindow } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

// ==================== 类型定义 ====================

/**
 * 托盘菜单项配置
 */
export interface TrayMenuItem {
    label?: string
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
    click?: () => void
    enabled?: boolean
    visible?: boolean
    checked?: boolean
    submenu?: TrayMenuItem[]
}

/**
 * 托盘通知配置
 */
export interface TrayNotification {
    title: string
    body: string
    icon?: string
    silent?: boolean
}

/**
 * 托盘管理器配置
 */
export interface TrayManagerConfig {
    iconPath?: string
    tooltip?: string
    enableNotifications?: boolean
}

// ==================== TrayManager 类 ====================

/**
 * 系统托盘管理器
 * 验证需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4
 */
export class TrayManager {
    private tray: Tray | null = null
    private config: TrayManagerConfig
    private notificationTimeout: number = 3000 // 通知显示时间（毫秒）

    /**
     * 构造函数
     * @param config 托盘管理器配置
     */
    constructor(config?: TrayManagerConfig) {
        this.config = {
            tooltip: '便签应用',
            enableNotifications: true,
            ...config
        }
    }

    /**
     * 创建托盘图标
     * 验证需求: 1.1
     */
    createTray(): void {
        if (this.tray) {
            console.warn('托盘已存在，跳过创建')
            return
        }

        try {
            // 获取托盘图标路径
            const iconPath = this.getTrayIconPath()

            // 创建托盘图标
            this.tray = new Tray(iconPath)

            // 设置工具提示
            if (this.config.tooltip) {
                this.tray.setToolTip(this.config.tooltip)
            }

            // 设置默认菜单
            this.updateMenu(this.getDefaultMenu())

            // 设置事件监听器
            this.setupEventListeners()

            console.log('托盘图标创建成功')
        } catch (error) {
            console.error('创建托盘图标失败:', error)
            throw error
        }
    }

    /**
     * 获取托盘图标路径（根据平台选择合适的图标）
     * 验证需求: 1.1
     */
    private getTrayIconPath(): string {
        // 如果配置中指定了图标路径，使用配置的路径
        if (this.config.iconPath && fs.existsSync(this.config.iconPath)) {
            return this.config.iconPath
        }

        // 根据平台选择图标
        const platform = process.platform
        let iconName: string

        if (platform === 'darwin') {
            // macOS: 使用模板图标（支持深色模式）
            iconName = 'tray-icon-template.png'
        } else if (platform === 'win32') {
            // Windows: 使用 ICO 格式或 PNG（16x16）
            iconName = 'tray-icon.ico'
        } else {
            // Linux: 使用 PNG
            iconName = 'tray-icon.png'
        }

        // 尝试从多个可能的位置加载图标
        const possiblePaths = [
            join(__dirname, '../resources', iconName),
            join(__dirname, '../assets', iconName),
            join(process.resourcesPath, iconName),
            join(app.getAppPath(), 'resources', iconName)
        ]

        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                console.log(`使用托盘图标: ${path}`)
                return path
            }
        }

        // 如果找不到图标文件，创建一个简单的默认图标
        console.warn('未找到托盘图标文件，使用默认图标')
        return this.createDefaultIcon()
    }

    /**
     * 创建默认托盘图标（当找不到图标文件时）
     * 验证需求: 1.1
     */
    private createDefaultIcon(): string {
        // 创建一个简单的 16x16 PNG 图标
        const size = 16
        const canvas = Buffer.alloc(size * size * 4)

        // 填充为灰色方块
        for (let i = 0; i < canvas.length; i += 4) {
            canvas[i] = 128     // R
            canvas[i + 1] = 128 // G
            canvas[i + 2] = 128 // B
            canvas[i + 3] = 255 // A
        }

        const image = nativeImage.createFromBuffer(canvas, {
            width: size,
            height: size
        })

        // 保存到临时文件
        const tempPath = join(app.getPath('temp'), 'tray-icon-default.png')
        fs.writeFileSync(tempPath, image.toPNG())

        return tempPath
    }

    /**
     * 设置事件监听器
     * 验证需求: 1.4, 1.5
     */
    private setupEventListeners(): void {
        if (!this.tray) return

        // 双击托盘图标 - 显示所有窗口
        // 验证需求: 1.5
        this.tray.on('double-click', () => {
            console.log('托盘图标被双击')
            this.handleTrayDoubleClick()
        })

        // 单击托盘图标（仅 Windows）
        if (process.platform === 'win32') {
            this.tray.on('click', () => {
                console.log('托盘图标被单击')
                this.handleTrayClick()
            })
        }

        // 右键点击托盘图标
        // 验证需求: 1.2
        this.tray.on('right-click', () => {
            console.log('托盘图标被右键点击')
            this.handleTrayRightClick()
        })
    }

    /**
     * 处理托盘图标单击事件
     * 验证需求: 1.4
     */
    private handleTrayClick(): void {
        // Windows 平台：单击显示菜单
        if (this.tray && process.platform === 'win32') {
            this.tray.popUpContextMenu()
        }
    }

    /**
     * 处理托盘图标双击事件
     * 验证需求: 1.5
     */
    private handleTrayDoubleClick(): void {
        // 显示所有隐藏的窗口
        const windows = BrowserWindow.getAllWindows()

        if (windows.length === 0) {
            console.log('没有窗口，创建新窗口')
            // 触发创建新窗口的事件
            this.tray?.emit('create-window')
        } else {
            console.log(`显示 ${windows.length} 个窗口`)
            windows.forEach(window => {
                if (!window.isDestroyed()) {
                    if (window.isMinimized()) {
                        window.restore()
                    }
                    window.show()
                    window.focus()
                }
            })
        }
    }

    /**
     * 处理托盘图标右键点击事件
     * 验证需求: 1.2
     */
    private handleTrayRightClick(): void {
        // 显示上下文菜单
        if (this.tray) {
            this.tray.popUpContextMenu()
        }
    }

    /**
     * 获取默认托盘菜单
     * 验证需求: 1.2, 1.3, 1.4
     */
    private getDefaultMenu(): TrayMenuItem[] {
        return [
            {
                label: '新建便签',
                type: 'normal',
                click: () => {
                    console.log('菜单：新建便签')
                    this.tray?.emit('create-window')
                }
            },
            {
                type: 'separator'
            },
            {
                label: '显示所有便签',
                type: 'normal',
                click: () => {
                    console.log('菜单：显示所有便签')
                    this.showAllWindows()
                }
            },
            {
                label: '隐藏所有便签',
                type: 'normal',
                click: () => {
                    console.log('菜单：隐藏所有便签')
                    this.hideAllWindows()
                }
            },
            {
                type: 'separator'
            },
            {
                label: '退出',
                type: 'normal',
                click: () => {
                    console.log('菜单：退出应用')
                    this.tray?.emit('quit-app')
                }
            }
        ]
    }

    /**
     * 更新托盘菜单
     * 验证需求: 1.2
     * @param items 菜单项配置数组
     */
    updateMenu(items: TrayMenuItem[]): void {
        if (!this.tray) {
            console.warn('托盘不存在，无法更新菜单')
            return
        }

        try {
            // 将自定义菜单项转换为 Electron Menu
            const menu = this.buildMenu(items)

            // 设置托盘菜单
            this.tray.setContextMenu(menu)

            console.log('托盘菜单已更新')
        } catch (error) {
            console.error('更新托盘菜单失败:', error)
        }
    }

    /**
     * 构建 Electron 菜单
     * @param items 菜单项配置数组
     * @returns Electron Menu 对象
     */
    private buildMenu(items: TrayMenuItem[]): Menu {
        const menuTemplate = items.map(item => {
            const menuItem: Electron.MenuItemConstructorOptions = {
                type: item.type as any,
                enabled: item.enabled !== false,
                visible: item.visible !== false,
                checked: item.checked
            }

            // 添加 label（分隔符不需要）
            if (item.label) {
                menuItem.label = item.label
            }

            // 添加点击事件
            if (item.click) {
                menuItem.click = item.click
            }

            // 处理子菜单
            if (item.submenu && item.submenu.length > 0) {
                menuItem.submenu = this.buildMenu(item.submenu) as any
            }

            return menuItem
        })

        return Menu.buildFromTemplate(menuTemplate)
    }

    /**
     * 显示托盘通知
     * 验证需求: 2.1, 2.2, 2.4
     * @param notification 通知配置
     */
    showNotification(notification: TrayNotification): void {
        if (!this.config.enableNotifications) {
            console.log('通知已禁用')
            return
        }

        try {
            // 创建通知
            const electronNotification = new Notification({
                title: notification.title,
                body: notification.body,
                icon: notification.icon,
                silent: notification.silent || false
            })

            // 监听通知点击事件
            // 验证需求: 2.3
            electronNotification.on('click', () => {
                console.log('通知被点击')
                this.handleNotificationClick(notification)
            })

            // 显示通知
            electronNotification.show()

            // 自动关闭通知（验证需求: 2.4）
            setTimeout(() => {
                electronNotification.close()
            }, this.notificationTimeout)

            console.log('托盘通知已显示:', notification.title)
        } catch (error) {
            console.error('显示托盘通知失败:', error)
        }
    }

    /**
     * 处理通知点击事件
     * 验证需求: 2.3
     * @param notification 通知配置
     */
    private handleNotificationClick(notification: TrayNotification): void {
        // 显示相关窗口
        const windows = BrowserWindow.getAllWindows()

        if (windows.length > 0) {
            // 聚焦第一个窗口
            const window = windows[0]
            if (!window.isDestroyed()) {
                if (window.isMinimized()) {
                    window.restore()
                }
                window.show()
                window.focus()
            }
        } else {
            // 如果没有窗口，创建新窗口
            console.log('没有窗口，触发创建新窗口')
            this.tray?.emit('create-window')
        }
    }

    /**
     * 显示所有窗口
     * 验证需求: 1.3
     */
    private showAllWindows(): void {
        const windows = BrowserWindow.getAllWindows()

        console.log(`显示 ${windows.length} 个窗口`)

        windows.forEach(window => {
            if (!window.isDestroyed()) {
                if (window.isMinimized()) {
                    window.restore()
                }
                window.show()
            }
        })
    }

    /**
     * 隐藏所有窗口
     * 验证需求: 1.3
     */
    private hideAllWindows(): void {
        const windows = BrowserWindow.getAllWindows()

        console.log(`隐藏 ${windows.length} 个窗口`)

        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.hide()
            }
        })
    }

    /**
     * 设置托盘图标
     * @param iconPath 图标路径
     */
    setIcon(iconPath: string): void {
        if (!this.tray) {
            console.warn('托盘不存在，无法设置图标')
            return
        }

        try {
            const image = nativeImage.createFromPath(iconPath)
            this.tray.setImage(image)
            console.log('托盘图标已更新')
        } catch (error) {
            console.error('设置托盘图标失败:', error)
        }
    }

    /**
     * 设置托盘工具提示
     * @param tooltip 工具提示文本
     */
    setToolTip(tooltip: string): void {
        if (!this.tray) {
            console.warn('托盘不存在，无法设置工具提示')
            return
        }

        try {
            this.tray.setToolTip(tooltip)
            console.log('托盘工具提示已更新:', tooltip)
        } catch (error) {
            console.error('设置托盘工具提示失败:', error)
        }
    }

    /**
     * 监听托盘事件
     * @param event 事件名称
     * @param listener 事件监听器
     */
    on(event: string, listener: (...args: any[]) => void): void {
        if (!this.tray) {
            console.warn('托盘不存在，无法监听事件')
            return
        }

        this.tray.on(event as any, listener)
    }

    /**
     * 移除托盘事件监听器
     * @param event 事件名称
     * @param listener 事件监听器
     */
    off(event: string, listener: (...args: any[]) => void): void {
        if (!this.tray) {
            console.warn('托盘不存在，无法移除事件监听器')
            return
        }

        this.tray.off(event as any, listener)
    }

    /**
     * 销毁托盘
     * 验证需求: 1.4
     */
    destroy(): void {
        if (!this.tray) {
            console.warn('托盘不存在，无需销毁')
            return
        }

        try {
            // 移除所有事件监听器
            this.tray.removeAllListeners()

            // 销毁托盘
            this.tray.destroy()
            this.tray = null

            console.log('托盘已销毁')
        } catch (error) {
            console.error('销毁托盘失败:', error)
        }
    }

    /**
     * 检查托盘是否已创建
     * @returns 托盘是否存在
     */
    isCreated(): boolean {
        return this.tray !== null && !this.tray.isDestroyed()
    }

    /**
     * 获取托盘实例
     * @returns 托盘实例或 null
     */
    getTray(): Tray | null {
        return this.tray
    }
}
