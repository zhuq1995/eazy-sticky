/**
 * Electron 属性测试数据生成器
 * 使用 fast-check 生成用于属性测试的随机数据
 */

import * as fc from 'fast-check'
import type { WindowConfig, WindowState, IPCMessage, IPCResponse } from '../src/types'

// ==================== 窗口配置生成器 ====================

/**
 * 生成有效的窗口尺寸（宽度或高度）
 * 范围：200-2000 像素
 */
export const arbWindowDimension = fc.integer({ min: 200, max: 2000 })

/**
 * 生成有效的窗口位置坐标
 * 范围：-1000 到 3000（支持多显示器场景）
 */
export const arbWindowPosition = fc.integer({ min: -1000, max: 3000 })

/**
 * 生成窗口背景颜色
 * 支持透明和半透明颜色
 */
export const arbBackgroundColor = fc.oneof(
    fc.constant('#00000000'), // 完全透明
    fc.constant('#FFFFFF'),   // 白色
    fc.constant('#000000'),   // 黑色
    fc.integer({ min: 0, max: 0xFFFFFF }).map(num =>
        `#${num.toString(16).padStart(6, '0').toUpperCase()}`
    ) // 随机颜色（6位十六进制）
)

/**
 * 生成预加载脚本路径
 */
export const arbPreloadPath = fc.oneof(
    fc.constant('../preload/preload.js'),
    fc.constant('./preload.js'),
    fc.constant('/path/to/preload.js')
)

/**
 * 生成完整的窗口配置
 * 确保配置符合 Electron 窗口的约束条件
 */
export const arbWindowConfig: fc.Arbitrary<WindowConfig> = fc.record({
    // 基础配置
    width: arbWindowDimension,
    height: arbWindowDimension,
    minWidth: fc.integer({ min: 100, max: 500 }),
    minHeight: fc.integer({ min: 100, max: 500 }),
    maxWidth: fc.option(fc.integer({ min: 500, max: 3000 }), { nil: undefined }),
    maxHeight: fc.option(fc.integer({ min: 500, max: 3000 }), { nil: undefined }),

    // 外观配置
    frame: fc.boolean(),
    transparent: fc.boolean(),
    backgroundColor: arbBackgroundColor,

    // 行为配置
    resizable: fc.boolean(),
    movable: fc.boolean(),
    minimizable: fc.boolean(),
    maximizable: fc.boolean(),
    closable: fc.boolean(),
    alwaysOnTop: fc.boolean(),

    // 安全配置
    webPreferences: fc.record({
        preload: arbPreloadPath,
        nodeIntegration: fc.boolean(),
        contextIsolation: fc.boolean(),
        sandbox: fc.boolean(),
        webSecurity: fc.boolean()
    })
}).filter(config => {
    // 确保最小尺寸不大于实际尺寸
    const widthValid = config.width >= config.minWidth
    const heightValid = config.height >= config.minHeight

    // 确保最大尺寸（如果存在）不小于最小尺寸
    const maxWidthValid = !config.maxWidth || config.maxWidth >= config.minWidth
    const maxHeightValid = !config.maxHeight || config.maxHeight >= config.minHeight

    return widthValid && heightValid && maxWidthValid && maxHeightValid
})

/**
 * 生成符合安全最佳实践的窗口配置
 * contextIsolation=true, nodeIntegration=false
 */
export const arbSecureWindowConfig: fc.Arbitrary<WindowConfig> = arbWindowConfig.map(config => ({
    ...config,
    webPreferences: {
        ...config.webPreferences,
        contextIsolation: true,
        nodeIntegration: false
    }
}))

/**
 * 生成无边框透明窗口配置（便签应用的典型配置）
 */
export const arbFramelessWindowConfig: fc.Arbitrary<WindowConfig> = arbWindowConfig.map(config => ({
    ...config,
    frame: false,
    transparent: true,
    maximizable: false
}))

// ==================== 窗口状态生成器 ====================

/**
 * 生成窗口状态
 * 包含位置、尺寸和最大化状态
 */
export const arbWindowState: fc.Arbitrary<WindowState> = fc.record({
    x: arbWindowPosition,
    y: arbWindowPosition,
    width: arbWindowDimension,
    height: arbWindowDimension,
    isMaximized: fc.boolean()
})

/**
 * 生成有效的窗口状态（在屏幕范围内）
 * 假设屏幕尺寸为 1920x1080
 */
export const arbValidWindowState: fc.Arbitrary<WindowState> = fc.record({
    x: fc.integer({ min: 0, max: 1920 }),
    y: fc.integer({ min: 0, max: 1080 }),
    width: fc.integer({ min: 200, max: 1920 }),
    height: fc.integer({ min: 200, max: 1080 }),
    isMaximized: fc.boolean()
})

// ==================== IPC 消息生成器 ====================

/**
 * 生成 IPC 通道名称
 */
export const arbIPCChannel = fc.oneof(
    // 窗口操作通道
    fc.constant('window:close'),
    fc.constant('window:minimize'),
    fc.constant('window:maximize'),
    fc.constant('window:getPosition'),
    fc.constant('window:setPosition'),
    fc.constant('window:getSize'),
    fc.constant('window:setSize'),

    // 系统信息通道
    fc.constant('system:getPlatform'),
    fc.constant('system:getVersion'),
    fc.constant('system:getVersions'),
    fc.constant('system:getPath'),

    // 自定义通道
    fc.string({ minLength: 5, maxLength: 30 }).map(s => `custom:${s}`)
)

/**
 * 生成请求 ID
 */
export const arbRequestId = fc.uuid()

/**
 * 生成时间戳
 */
export const arbTimestamp = fc.integer({ min: 1600000000000, max: 2000000000000 })

/**
 * 生成 IPC 消息数据
 */
export const arbIPCData = fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.record({
        x: fc.integer(),
        y: fc.integer()
    }),
    fc.record({
        width: fc.integer(),
        height: fc.integer()
    }),
    fc.array(fc.string())
)

/**
 * 生成完整的 IPC 消息
 */
export const arbIPCMessage: fc.Arbitrary<IPCMessage> = fc.record({
    channel: arbIPCChannel,
    data: fc.option(arbIPCData, { nil: undefined }),
    requestId: fc.option(arbRequestId, { nil: undefined }),
    timestamp: arbTimestamp
})

/**
 * 生成 IPC 错误对象
 */
export const arbIPCError = fc.record({
    message: fc.string({ minLength: 1, maxLength: 100 }),
    code: fc.oneof(
        fc.constant('WINDOW_NOT_FOUND'),
        fc.constant('INVALID_ARGUMENT'),
        fc.constant('PERMISSION_DENIED'),
        fc.constant('INTERNAL_ERROR'),
        fc.string({ minLength: 3, maxLength: 20 }).map(s => s.toUpperCase())
    ),
    stack: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
})

/**
 * 生成成功的 IPC 响应
 */
export const arbSuccessIPCResponse: fc.Arbitrary<IPCResponse> = fc.record({
    success: fc.constant(true),
    data: fc.option(arbIPCData, { nil: undefined }),
    error: fc.constant(undefined),
    requestId: fc.option(arbRequestId, { nil: undefined }),
    timestamp: arbTimestamp
})

/**
 * 生成失败的 IPC 响应
 */
export const arbErrorIPCResponse: fc.Arbitrary<IPCResponse> = fc.record({
    success: fc.constant(false),
    data: fc.constant(undefined),
    error: arbIPCError,
    requestId: fc.option(arbRequestId, { nil: undefined }),
    timestamp: arbTimestamp
})

/**
 * 生成任意 IPC 响应（成功或失败）
 */
export const arbIPCResponse: fc.Arbitrary<IPCResponse> = fc.oneof(
    arbSuccessIPCResponse,
    arbErrorIPCResponse
)

// ==================== 窗口操作参数生成器 ====================

/**
 * 生成窗口位置参数
 */
export const arbSetPositionParams = fc.record({
    x: arbWindowPosition,
    y: arbWindowPosition
})

/**
 * 生成窗口尺寸参数
 */
export const arbSetSizeParams = fc.record({
    width: arbWindowDimension,
    height: arbWindowDimension
})

// ==================== 系统信息生成器 ====================

/**
 * 生成平台标识符
 */
export const arbPlatform = fc.oneof(
    fc.constant('win32'),
    fc.constant('darwin'),
    fc.constant('linux')
)

/**
 * 生成版本号
 */
export const arbVersion = fc.tuple(
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 99 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`)

/**
 * 生成系统路径名称
 */
export const arbPathName = fc.oneof(
    fc.constant('home'),
    fc.constant('appData'),
    fc.constant('userData'),
    fc.constant('temp'),
    fc.constant('desktop'),
    fc.constant('documents'),
    fc.constant('downloads')
)

// ==================== 辅助函数 ====================

/**
 * 生成 N 个样本用于调试
 */
export function generateSamples<T>(arbitrary: fc.Arbitrary<T>, count: number = 10): T[] {
    return fc.sample(arbitrary, count)
}

/**
 * 打印生成器样本（用于调试）
 */
export function printSamples<T>(arbitrary: fc.Arbitrary<T>, count: number = 5): void {
    const samples = generateSamples(arbitrary, count)
    console.log('Generated samples:')
    samples.forEach((sample, index) => {
        console.log(`Sample ${index + 1}:`, JSON.stringify(sample, null, 2))
    })
}
