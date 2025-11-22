/**
 * 系统托盘 Composable
 * 提供托盘交互功能，包括通知、菜单更新和状态查询
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4
 */

import { ref, type Ref } from 'vue'
import { useElectron } from './useElectron'

/**
 * 托盘通知配置接口
 */
export interface TrayNotification {
    title: string
    body: string
    icon?: string
    silent?: boolean
}

/**
 * 托盘菜单项接口
 */
export interface TrayMenuItem {
    label: string
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'
    click?: () => void
    enabled?: boolean
    visible?: boolean
    checked?: boolean
    submenu?: TrayMenuItem[]
}

/**
 * useSystemTray 返回值接口
 */
export interface UseSystemTrayReturn {
    /** 托盘是否已创建 */
    isCreated: Ref<boolean>

    /** 显示托盘通知 */
    showNotification: (notification: TrayNotification) => Promise<void>

    /** 更新托盘菜单 */
    updateMenu: (items: TrayMenuItem[]) => Promise<void>

    /** 设置托盘工具提示 */
    setToolTip: (tooltip: string) => Promise<void>

    /** 检查托盘状态 */
    checkTrayStatus: () => Promise<boolean>
}

/**
 * 系统托盘 Composable
 * 
 * 提供与系统托盘交互的功能：
 * - 显示托盘通知
 * - 更新托盘菜单
 * - 设置托盘工具提示
 * - 查询托盘状态
 * 
 * @returns 托盘操作接口
 * 
 * @example
 * ```ts
 * const { showNotification, updateMenu, isCreated } = useSystemTray()
 * 
 * // 显示通知
 * await showNotification({
 *   title: '新便签',
 *   body: '便签已创建'
 * })
 * 
 * // 更新菜单
 * await updateMenu([
 *   { label: '新建便签', click: () => createNote() },
 *   { type: 'separator' },
 *   { label: '退出', click: () => quit() }
 * ])
 * ```
 */
export function useSystemTray(): UseSystemTrayReturn {
    // ==================== 依赖注入 ====================

    const { isElectron } = useElectron()

    // ==================== 响应式状态 ====================

    /**
     * 托盘是否已创建
     * 需求: 1.1 - 应用启动时在系统托盘创建应用图标
     */
    const isCreated = ref<boolean>(false)

    // ==================== 托盘操作方法 ====================

    /**
     * 显示托盘通知
     * 需求: 2.1 - 创建新便签时显示托盘通知
     * 需求: 2.2 - 便签数据保存失败时显示错误通知
     * 需求: 2.4 - 通知显示3秒后自动关闭
     * 
     * @param notification - 通知配置
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const showNotification = async (notification: TrayNotification): Promise<void> => {
        if (!isElectron.value) {
            console.warn('showNotification: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.tray.showNotification(notification)
            console.log('托盘通知已显示:', notification.title)
        } catch (error) {
            console.error('显示托盘通知失败:', error)
            throw error
        }
    }

    /**
     * 更新托盘菜单
     * 需求: 1.2 - 右键点击托盘图标时显示上下文菜单
     * 需求: 1.3 - 点击托盘菜单中的"新建便签"时创建新的便签窗口
     * 需求: 1.4 - 点击托盘菜单中的"退出"时关闭所有窗口并退出应用
     * 
     * @param items - 菜单项配置数组
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const updateMenu = async (items: TrayMenuItem[]): Promise<void> => {
        if (!isElectron.value) {
            console.warn('updateMenu: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.tray.updateMenu(items)
            console.log('托盘菜单已更新')
        } catch (error) {
            console.error('更新托盘菜单失败:', error)
            throw error
        }
    }

    /**
     * 设置托盘工具提示
     * 
     * @param tooltip - 工具提示文本
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const setToolTip = async (tooltip: string): Promise<void> => {
        if (!isElectron.value) {
            console.warn('setToolTip: 不在 Electron 环境中')
            return
        }

        try {
            await window.electronAPI.tray.setToolTip(tooltip)
            console.log('托盘工具提示已设置:', tooltip)
        } catch (error) {
            console.error('设置托盘工具提示失败:', error)
            throw error
        }
    }

    /**
     * 检查托盘状态
     * 需求: 1.1 - 检查托盘是否已创建
     * 
     * @returns 托盘是否已创建
     * @throws 如果不在 Electron 环境中或操作失败
     */
    const checkTrayStatus = async (): Promise<boolean> => {
        if (!isElectron.value) {
            console.warn('checkTrayStatus: 不在 Electron 环境中')
            return false
        }

        try {
            const created = await window.electronAPI.tray.isCreated()
            isCreated.value = created
            return created
        } catch (error) {
            console.error('检查托盘状态失败:', error)
            throw error
        }
    }

    // ==================== 返回接口 ====================

    return {
        isCreated,
        showNotification,
        updateMenu,
        setToolTip,
        checkTrayStatus
    }
}
