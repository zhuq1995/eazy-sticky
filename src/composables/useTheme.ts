/**
 * useTheme Composable
 * 
 * 提供主题管理功能，包括：
 * - 获取和设置主题模式
 * - 监听系统主题变更
 * - 主题切换
 * - 主题配置管理
 * 
 * 验证需求: 9.1, 9.2, 9.3, 9.4
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ThemeMode, ThemeConfig } from '../types'

/**
 * useTheme 返回值接口
 */
export interface UseThemeReturn {
    /** 当前主题模式 */
    currentTheme: import('vue').Ref<ThemeMode>

    /** 系统主题 */
    systemTheme: import('vue').Ref<'light' | 'dark'>

    /** 主题配置 */
    themeConfig: import('vue').Ref<ThemeConfig>

    /** 是否为深色模式 */
    isDark: import('vue').ComputedRef<boolean>

    /** 是否为浅色模式 */
    isLight: import('vue').ComputedRef<boolean>

    /** 是否跟随系统 */
    isFollowingSystem: import('vue').ComputedRef<boolean>

    /** 设置主题 */
    setTheme: (mode: ThemeMode) => Promise<void>

    /** 切换主题（在 light 和 dark 之间切换） */
    toggleTheme: () => Promise<void>

    /** 刷新主题状态 */
    refreshTheme: () => Promise<void>

    /** 应用主题到 DOM */
    applyTheme: (theme: ThemeMode) => void
}

/**
 * 主题管理 Composable
 * 
 * @returns 主题管理相关的状态和方法
 * 
 * @example
 * ```ts
 * const { currentTheme, isDark, setTheme, toggleTheme } = useTheme()
 * 
 * // 设置主题
 * await setTheme('dark')
 * 
 * // 切换主题
 * await toggleTheme()
 * 
 * // 检查是否为深色模式
 * if (isDark.value) {
 *   console.log('当前是深色模式')
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
    // 响应式状态
    const currentTheme = ref<ThemeMode>('system')
    const systemTheme = ref<'light' | 'dark'>('light')
    const themeConfig = ref<ThemeConfig>({
        mode: 'system',
        followSystem: true
    })

    // 计算属性
    const isDark = computed(() => {
        if (currentTheme.value === 'system') {
            return systemTheme.value === 'dark'
        }
        return currentTheme.value === 'dark'
    })

    const isLight = computed(() => !isDark.value)

    const isFollowingSystem = computed(() => themeConfig.value.followSystem)

    /**
     * 应用主题到 DOM
     * 验证需求: 9.3
     */
    const applyTheme = (theme: ThemeMode) => {
        const root = document.documentElement

        // 移除所有主题类
        root.classList.remove('theme-light', 'theme-dark', 'theme-system')

        // 添加当前主题类
        root.classList.add(`theme-${theme}`)

        // 设置 data-theme 属性
        const effectiveTheme = theme === 'system' ? systemTheme.value : theme
        root.setAttribute('data-theme', effectiveTheme)

        console.log('[useTheme] 主题已应用到 DOM', {
            mode: theme,
            effectiveTheme,
            isDark: effectiveTheme === 'dark'
        })
    }

    /**
     * 设置主题
     * 验证需求: 9.3, 9.4
     */
    const setTheme = async (mode: ThemeMode) => {
        try {
            console.log('[useTheme] 设置主题', { mode })

            // 调用 Electron API 设置主题
            const result = await window.electronAPI.theme.set(mode)

            if (result.success) {
                currentTheme.value = mode
                themeConfig.value.mode = mode
                themeConfig.value.followSystem = mode === 'system'

                // 应用主题到 DOM
                applyTheme(mode)

                console.log('[useTheme] 主题设置成功', { mode })
            } else {
                console.error('[useTheme] 主题设置失败')
            }
        } catch (error) {
            console.error('[useTheme] 设置主题失败', error)
            throw error
        }
    }

    /**
     * 切换主题
     * 验证需求: 9.3
     */
    const toggleTheme = async () => {
        try {
            console.log('[useTheme] 切换主题')

            // 调用 Electron API 切换主题
            const newTheme = await window.electronAPI.theme.toggle()

            currentTheme.value = newTheme

            // 应用主题到 DOM
            applyTheme(newTheme)

            console.log('[useTheme] 主题切换成功', { newTheme })
        } catch (error) {
            console.error('[useTheme] 切换主题失败', error)
            throw error
        }
    }

    /**
     * 刷新主题状态
     * 验证需求: 9.1, 9.4
     */
    const refreshTheme = async () => {
        try {
            console.log('[useTheme] 刷新主题状态')

            // 获取当前主题
            const current = await window.electronAPI.theme.getCurrent()
            currentTheme.value = current

            // 获取系统主题
            const system = await window.electronAPI.theme.getSystem()
            systemTheme.value = system

            // 获取主题配置
            const config = await window.electronAPI.theme.getConfig()
            themeConfig.value = config

            // 应用主题到 DOM
            applyTheme(current)

            console.log('[useTheme] 主题状态已刷新', {
                current,
                system,
                config
            })
        } catch (error) {
            console.error('[useTheme] 刷新主题状态失败', error)
            throw error
        }
    }

    /**
     * 处理主题变更事件
     * 验证需求: 9.2, 9.3
     */
    const handleThemeChanged = (theme: ThemeMode) => {
        console.log('[useTheme] 收到主题变更事件', { theme })

        currentTheme.value = theme

        // 应用主题到 DOM
        applyTheme(theme)
    }

    // 组件挂载时初始化
    onMounted(async () => {
        console.log('[useTheme] 初始化主题管理')

        try {
            // 刷新主题状态（验证需求: 9.1）
            await refreshTheme()

            // 监听主题变更事件（验证需求: 9.2）
            window.electronAPI.on('theme-changed', handleThemeChanged)

            console.log('[useTheme] 主题管理初始化完成')
        } catch (error) {
            console.error('[useTheme] 初始化主题管理失败', error)
        }
    })

    // 组件卸载时清理
    onUnmounted(() => {
        console.log('[useTheme] 清理主题管理')

        // 移除事件监听器
        window.electronAPI.off('theme-changed', handleThemeChanged)
    })

    return {
        currentTheme,
        systemTheme,
        themeConfig,
        isDark,
        isLight,
        isFollowingSystem,
        setTheme,
        toggleTheme,
        refreshTheme,
        applyTheme
    }
}
