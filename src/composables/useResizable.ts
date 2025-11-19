/**
 * 窗口尺寸调整 Composable
 * 提供拖拽边缘/角落调整窗口尺寸的功能
 * 需求: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 调整尺寸的方向
 */
export type ResizeDirection =
    | 'n'  // 北（上）
    | 's'  // 南（下）
    | 'e'  // 东（右）
    | 'w'  // 西（左）
    | 'ne' // 东北（右上）
    | 'nw' // 西北（左上）
    | 'se' // 东南（右下）
    | 'sw' // 西南（左下）

/**
 * 尺寸调整选项接口
 */
export interface UseResizableOptions {
    // 最小宽度（像素）
    minWidth?: number

    // 最小高度（像素）
    minHeight?: number

    // 最大宽度（像素）
    maxWidth?: number

    // 最大高度（像素）
    maxHeight?: number

    // 调整尺寸开始回调
    onStart?: (size: { width: number; height: number }) => void

    // 调整尺寸中回调
    onResize?: (size: { width: number; height: number }) => void

    // 调整尺寸结束回调
    onEnd?: (size: { width: number; height: number }) => void

    // 是否禁用尺寸调整
    disabled?: Ref<boolean>
}

/**
 * 尺寸调整返回值接口
 */
export interface UseResizableReturn {
    // 当前尺寸
    size: Ref<{ width: number; height: number }>

    // 是否正在调整尺寸
    isResizing: Ref<boolean>

    // 当前调整方向
    resizeDirection: Ref<ResizeDirection | null>

    // 手动设置尺寸
    setSize: (width: number, height: number) => void

    // 重置尺寸
    reset: () => void

    // 获取调整手柄的鼠标按下处理器
    getHandleMouseDown: (direction: ResizeDirection) => (e: MouseEvent) => void
}

/**
 * 尺寸限制常量
 * 需求: 8.2, 8.3 - 最小和最大尺寸限制
 */
const DEFAULT_SIZE_CONSTRAINTS = {
    MIN_WIDTH: 200,
    MIN_HEIGHT: 200,
    MAX_WIDTH: 800,
    MAX_HEIGHT: 800
} as const

/**
 * 调整手柄的尺寸（像素）
 */
const HANDLE_SIZE = 8

/**
 * 窗口尺寸调整 Composable
 * 
 * 提供拖拽边缘/角落调整窗口尺寸的功能：
 * - 支持8个方向的尺寸调整（上下左右和四个角）
 * - 最小/最大尺寸限制
 * - 实时尺寸更新
 * - 调整状态管理
 * 
 * @param target - 目标元素引用
 * @param options - 尺寸调整选项
 * @returns 尺寸调整接口
 * 
 * @example
 * ```ts
 * const { size, isResizing, getHandleMouseDown, setSize } = useResizable(noteElement, {
 *   minWidth: 200,
 *   minHeight: 200,
 *   maxWidth: 800,
 *   maxHeight: 800,
 *   onEnd: (size) => {
 *     console.log('调整完成:', size)
 *   }
 * })
 * ```
 */
export function useResizable(
    target: Ref<HTMLElement | null>,
    options: UseResizableOptions = {}
): UseResizableReturn {
    // ==================== 选项解构 ====================

    const {
        minWidth = DEFAULT_SIZE_CONSTRAINTS.MIN_WIDTH,
        minHeight = DEFAULT_SIZE_CONSTRAINTS.MIN_HEIGHT,
        maxWidth = DEFAULT_SIZE_CONSTRAINTS.MAX_WIDTH,
        maxHeight = DEFAULT_SIZE_CONSTRAINTS.MAX_HEIGHT,
        onStart,
        onResize,
        onEnd,
        disabled
    } = options

    // ==================== 响应式状态 ====================

    // 当前尺寸
    const size = ref({ width: 300, height: 300 })

    // 是否正在调整尺寸
    const isResizing = ref(false)

    // 当前调整方向
    const resizeDirection = ref<ResizeDirection | null>(null)

    // 调整开始时的状态
    const startState = ref({
        size: { width: 0, height: 0 },
        mousePos: { x: 0, y: 0 }
    })

    // ==================== 尺寸限制 ====================

    /**
     * 应用尺寸限制
     * 需求: 8.2 - 最小尺寸限制（200x200）
     * 需求: 8.3 - 最大尺寸限制（800x800）
     * 
     * @param width - 宽度
     * @param height - 高度
     * @returns 限制后的尺寸
     */
    const constrainSize = (width: number, height: number): { width: number; height: number } => {
        return {
            width: Math.max(minWidth, Math.min(maxWidth, width)),
            height: Math.max(minHeight, Math.min(maxHeight, height))
        }
    }

    // ==================== 尺寸计算 ====================

    /**
     * 根据鼠标移动计算新尺寸
     * 
     * @param direction - 调整方向
     * @param deltaX - 鼠标 X 轴移动距离
     * @param deltaY - 鼠标 Y 轴移动距离
     * @returns 新尺寸
     */
    const calculateNewSize = (
        direction: ResizeDirection,
        deltaX: number,
        deltaY: number
    ): { width: number; height: number } => {
        const { width: startWidth, height: startHeight } = startState.value.size
        let newWidth = startWidth
        let newHeight = startHeight

        // 根据方向计算新尺寸
        switch (direction) {
            case 'e': // 右
                newWidth = startWidth + deltaX
                break
            case 'w': // 左
                newWidth = startWidth - deltaX
                break
            case 's': // 下
                newHeight = startHeight + deltaY
                break
            case 'n': // 上
                newHeight = startHeight - deltaY
                break
            case 'se': // 右下
                newWidth = startWidth + deltaX
                newHeight = startHeight + deltaY
                break
            case 'sw': // 左下
                newWidth = startWidth - deltaX
                newHeight = startHeight + deltaY
                break
            case 'ne': // 右上
                newWidth = startWidth + deltaX
                newHeight = startHeight - deltaY
                break
            case 'nw': // 左上
                newWidth = startWidth - deltaX
                newHeight = startHeight - deltaY
                break
        }

        return constrainSize(newWidth, newHeight)
    }

    // ==================== 事件处理 ====================

    /**
     * 鼠标移动处理器
     */
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.value || !resizeDirection.value) return

        requestAnimationFrame(() => {
            const deltaX = e.clientX - startState.value.mousePos.x
            const deltaY = e.clientY - startState.value.mousePos.y

            // 计算新尺寸
            const newSize = calculateNewSize(resizeDirection.value!, deltaX, deltaY)

            // 需求 8.1: 更新尺寸
            size.value = newSize

            // 需求 8.5: 内容区域自适应（通过响应式尺寸自动实现）
            onResize?.(newSize)
        })
    }

    /**
     * 鼠标释放处理器
     */
    const handleMouseUp = () => {
        if (!isResizing.value) return

        isResizing.value = false
        const direction = resizeDirection.value
        resizeDirection.value = null

        // 移除拖拽CSS类
        target.value?.classList.remove('resizing')
        document.body.style.cursor = ''

        // 需求 8.4: 调整结束回调（用于持久化）
        onEnd?.(size.value)
    }

    /**
     * 获取调整手柄的鼠标按下处理器
     * 
     * @param direction - 调整方向
     * @returns 鼠标按下处理器
     */
    const getHandleMouseDown = (direction: ResizeDirection) => {
        return (e: MouseEvent) => {
            if (disabled?.value) return

            e.preventDefault()
            e.stopPropagation()

            // 开始调整尺寸
            isResizing.value = true
            resizeDirection.value = direction

            // 记录开始状态
            startState.value = {
                size: { ...size.value },
                mousePos: { x: e.clientX, y: e.clientY }
            }

            // 添加调整CSS类
            target.value?.classList.add('resizing')

            // 设置光标样式
            document.body.style.cursor = getCursorStyle(direction)

            onStart?.(size.value)
        }
    }

    /**
     * 根据方向获取光标样式
     * 
     * @param direction - 调整方向
     * @returns CSS 光标样式
     */
    const getCursorStyle = (direction: ResizeDirection): string => {
        const cursorMap: Record<ResizeDirection, string> = {
            n: 'ns-resize',
            s: 'ns-resize',
            e: 'ew-resize',
            w: 'ew-resize',
            ne: 'nesw-resize',
            sw: 'nesw-resize',
            nw: 'nwse-resize',
            se: 'nwse-resize'
        }
        return cursorMap[direction]
    }

    // ==================== 手动操作方法 ====================

    /**
     * 手动设置尺寸
     * 
     * @param width - 宽度
     * @param height - 高度
     */
    const setSize = (width: number, height: number) => {
        size.value = constrainSize(width, height)
    }

    /**
     * 重置尺寸
     */
    const reset = () => {
        size.value = { width: 300, height: 300 }
    }

    // ==================== 生命周期 ====================

    /**
     * 挂载事件监听
     */
    onMounted(() => {
        // 初始化尺寸
        if (target.value) {
            const rect = target.value.getBoundingClientRect()
            size.value = {
                width: rect.width || 300,
                height: rect.height || 300
            }
        }

        // 添加全局事件监听
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    })

    /**
     * 清理事件监听
     */
    onUnmounted(() => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    })

    // ==================== 返回接口 ====================

    return {
        size,
        isResizing,
        resizeDirection,
        setSize,
        reset,
        getHandleMouseDown
    }
}
