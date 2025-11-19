/**
 * 拖拽 Composable
 * 提供窗口拖拽功能，支持边界限制、性能优化和状态管理
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { ref, computed, watch, onMounted, onUnmounted, type Ref, type ComputedRef, type CSSProperties } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useElectron } from './useElectron'
import type { Position, UseDraggableOptions, UseDraggableReturn, DragBoundary } from '@/types'

/**
 * 拖拽 Composable
 * 
 * 提供基于鼠标事件的窗口拖拽功能，包括：
 * - 拖拽状态管理（isDragging）
 * - 边界限制（左、上、右、下边界）
 * - 最小可见区域保证（50像素）
 * - 拖拽视觉反馈（CSS类）
 * - 可编辑区域检测，防止误触发
 * - requestAnimationFrame 性能优化
 * - 拖拽结束后的防抖保存
 * 
 * @param target - 拖拽目标元素的引用
 * @param options - 拖拽配置选项
 * @returns 拖拽操作接口
 * 
 * @example
 * ```ts
 * const noteElement = ref<HTMLElement | null>(null)
 * const { position, isDragging, style, setPosition } = useDraggable(noteElement, {
 *   minVisibleArea: 50,
 *   onEnd: (pos) => console.log('拖拽结束:', pos)
 * })
 * ```
 */
export function useDraggable(
    target: Ref<HTMLElement | null>,
    options: UseDraggableOptions = {}
): UseDraggableReturn {
    // ==================== 依赖注入 ====================

    const { isElectron, updateWindowPosition } = useElectron()

    // ==================== 响应式状态 ====================

    /**
     * 当前位置
     * 需求: 1.2 - 实时更新窗口位置跟随鼠标
     */
    const position = ref<Position>({ x: 0, y: 0 })

    /**
     * 是否正在拖拽
     * 需求: 1.1, 1.3 - 拖拽状态管理
     */
    const isDragging = ref<boolean>(false)

    /**
     * 拖拽开始位置（鼠标坐标）
     */
    const startPos = ref<Position>({ x: 0, y: 0 })

    /**
     * 拖拽开始时的窗口位置偏移
     */
    const offset = ref<Position>({ x: 0, y: 0 })

    /**
     * requestAnimationFrame ID，用于取消动画帧
     */
    let rafId: number | null = null

    // ==================== 边界计算 ====================

    /**
     * 计算拖拽边界
     * 需求: 2.1, 2.2, 2.3, 2.4 - 边界限制功能
     */
    const boundary = computed<DragBoundary>(() => {
        if (options.boundary) {
            return options.boundary
        }

        // 默认使用屏幕边界
        return {
            left: 0,
            top: 0,
            right: window.screen.width,
            bottom: window.screen.height
        }
    })

    /**
     * 最小可见区域（像素）
     * 需求: 2.5 - 保持至少50像素的窗口可见区域
     */
    const minVisibleArea = options.minVisibleArea ?? 50

    // ==================== 边界检查 ====================

    /**
     * 边界检查函数
     * 确保窗口位置在边界内，并保持最小可见区域
     * 
     * 需求: 2.1, 2.2, 2.3, 2.4, 2.5 - 边界限制和最小可见区域
     * 
     * @param pos - 待检查的位置
     * @returns 调整后的位置
     */
    const checkBoundary = (pos: Position): Position => {
        const windowWidth = target.value?.offsetWidth || 300
        const windowHeight = target.value?.offsetHeight || 300

        let { x, y } = pos

        // 需求 2.1: 限制窗口x坐标不小于0
        x = Math.max(boundary.value.left, x)

        // 需求 2.2: 限制窗口y坐标不小于0
        y = Math.max(boundary.value.top, y)

        // 需求 2.3: 限制窗口不超出屏幕右侧（保持最小可见区域）
        x = Math.min(boundary.value.right - minVisibleArea, x)

        // 需求 2.4: 限制窗口不超出屏幕底部（保持最小可见区域）
        y = Math.min(boundary.value.bottom - minVisibleArea, y)

        return { x, y }
    }

    // ==================== 可编辑区域检测 ====================

    /**
     * 检查目标元素是否为可编辑区域
     * 需求: 1.5 - 在可编辑区域拖拽不触发窗口拖拽操作
     * 
     * @param element - 待检查的元素
     * @returns 是否为可编辑区域
     */
    const isEditableElement = (element: HTMLElement): boolean => {
        // 检查 contenteditable 属性
        if (element.isContentEditable) {
            return true
        }

        // 检查输入元素
        const tagName = element.tagName.toLowerCase()
        if (tagName === 'input' || tagName === 'textarea') {
            return true
        }

        // 检查父元素是否为可编辑区域
        let parent = element.parentElement
        while (parent) {
            if (parent.isContentEditable) {
                return true
            }
            parent = parent.parentElement
        }

        return false
    }

    // ==================== 拖拽结束保存（防抖） ====================

    /**
     * 拖拽结束后的防抖保存
     * 需求: 10.3 - 使用防抖机制延迟保存位置
     */
    const debouncedSave = useDebounceFn((pos: Position) => {
        // 调用用户提供的 onEnd 回调
        options.onEnd?.(pos)
    }, 500)

    // ==================== 鼠标事件处理 ====================

    /**
     * 鼠标按下事件处理
     * 需求: 1.1 - 开始拖拽操作
     * 需求: 1.4 - 显示拖拽状态的视觉反馈
     * 需求: 1.5 - 可编辑区域不触发拖拽
     * 需求: 12.1 - 添加拖拽状态的CSS类
     */
    const handleMouseDown = (e: MouseEvent) => {
        // 检查是否禁用拖拽
        if (options.disabled?.value) {
            return
        }

        const eventTarget = e.target as HTMLElement

        // 需求 1.5: 检查是否在可编辑区域
        if (isEditableElement(eventTarget)) {
            return
        }

        // 检查是否在拖拽句柄内
        if (options.handle?.value && !options.handle.value.contains(eventTarget)) {
            return
        }

        // 需求 1.1: 开始拖拽操作
        isDragging.value = true
        startPos.value = { x: e.clientX, y: e.clientY }
        offset.value = { x: position.value.x, y: position.value.y }

        // 需求 12.1, 1.4: 添加拖拽CSS类，提供视觉反馈
        target.value?.classList.add('dragging')

        // 调用用户提供的 onStart 回调
        options.onStart?.(position.value)

        // 阻止默认行为
        e.preventDefault()
    }

    /**
     * 鼠标移动事件处理
     * 需求: 1.2 - 实时更新窗口位置跟随鼠标
     * 需求: 10.1, 10.2 - 使用 requestAnimationFrame 优化性能（60fps）
     * 需求: 12.3 - 使用 CSS transform 更新位置
     */
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.value) {
            return
        }

        // 取消之前的动画帧
        if (rafId !== null) {
            cancelAnimationFrame(rafId)
        }

        // 需求 10.2: 使用 requestAnimationFrame 优化渲染
        rafId = requestAnimationFrame(() => {
            // 计算鼠标移动的距离
            const deltaX = e.clientX - startPos.value.x
            const deltaY = e.clientY - startPos.value.y

            // 计算新位置
            const newPos: Position = {
                x: offset.value.x + deltaX,
                y: offset.value.y + deltaY
            }

            // 需求 2.1-2.5: 边界检查
            position.value = checkBoundary(newPos)

            // 如果在 Electron 环境中，更新窗口位置
            if (isElectron.value) {
                updateWindowPosition(position.value.x, position.value.y)
            }

            // 调用用户提供的 onMove 回调
            options.onMove?.(position.value)

            rafId = null
        })
    }

    /**
     * 鼠标释放事件处理
     * 需求: 1.3 - 结束拖拽操作并保存窗口位置
     * 需求: 10.3 - 使用防抖机制延迟保存
     * 需求: 12.2 - 移除拖拽状态的CSS类
     * 需求: 12.5 - 恢复窗口的过渡动画
     */
    const handleMouseUp = () => {
        if (!isDragging.value) {
            return
        }

        // 需求 1.3: 结束拖拽操作
        isDragging.value = false

        // 需求 12.2: 移除拖拽CSS类
        target.value?.classList.remove('dragging')

        // 取消未完成的动画帧
        if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
        }

        // 需求 10.3: 使用防抖机制延迟保存位置
        debouncedSave(position.value)
    }

    // ==================== 生命周期钩子 ====================

    /**
     * 组件挂载时注册事件监听器
     */
    onMounted(() => {
        if (!target.value) {
            return
        }

        // 在目标元素上监听鼠标按下事件
        target.value.addEventListener('mousedown', handleMouseDown)

        // 在文档上监听鼠标移动和释放事件（确保拖拽时鼠标移出元素也能继续）
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    })

    /**
     * 组件卸载时清理事件监听器
     * 需求: 10.5 - 防止内存泄漏
     */
    onUnmounted(() => {
        // 清理事件监听器
        if (target.value) {
            target.value.removeEventListener('mousedown', handleMouseDown)
        }
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)

        // 取消未完成的动画帧
        if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
    })

    // ==================== 计算样式 ====================

    /**
     * 计算拖拽样式
     * 需求: 12.3 - 使用 CSS transform 而非 top/left
     * 需求: 12.4 - 拖拽中禁用过渡动画
     * 需求: 12.5 - 拖拽后恢复过渡动画
     */
    const style = computed<CSSProperties>(() => ({
        transform: `translate(${position.value.x}px, ${position.value.y}px)`,
        // 需求 12.4, 12.5: 拖拽时禁用过渡，结束后恢复
        transition: isDragging.value ? 'none' : 'transform 0.2s ease'
    }))

    // ==================== 手动操作方法 ====================

    /**
     * 手动设置位置
     * 
     * @param x - x 坐标
     * @param y - y 坐标
     */
    const setPosition = (x: number, y: number): void => {
        position.value = checkBoundary({ x, y })
    }

    /**
     * 重置位置到原点
     */
    const reset = (): void => {
        position.value = { x: 0, y: 0 }
    }

    // ==================== 返回接口 ====================

    return {
        position,
        isDragging,
        style,
        setPosition,
        reset
    }
}
