/**
 * Electron 生成器测试
 * 验证属性测试数据生成器的正确性
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
    arbWindowConfig,
    arbSecureWindowConfig,
    arbFramelessWindowConfig,
    arbWindowState,
    arbValidWindowState,
    arbIPCMessage,
    arbIPCResponse,
    arbSuccessIPCResponse,
    arbErrorIPCResponse,
    arbWindowDimension,
    arbWindowPosition,
    arbPlatform,
    arbVersion,
    generateSamples
} from './electron-generators'

describe('Electron 生成器测试', () => {
    describe('窗口配置生成器', () => {
        it('应该生成有效的窗口尺寸', () => {
            fc.assert(
                fc.property(arbWindowDimension, (dimension) => {
                    expect(dimension).toBeGreaterThanOrEqual(200)
                    expect(dimension).toBeLessThanOrEqual(2000)
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成有效的窗口位置', () => {
            fc.assert(
                fc.property(arbWindowPosition, (position) => {
                    expect(position).toBeGreaterThanOrEqual(-1000)
                    expect(position).toBeLessThanOrEqual(3000)
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成有效的窗口配置', () => {
            fc.assert(
                fc.property(arbWindowConfig, (config) => {
                    // 验证基础配置
                    expect(config.width).toBeGreaterThanOrEqual(config.minWidth)
                    expect(config.height).toBeGreaterThanOrEqual(config.minHeight)

                    // 验证最大尺寸约束
                    if (config.maxWidth) {
                        expect(config.maxWidth).toBeGreaterThanOrEqual(config.minWidth)
                    }
                    if (config.maxHeight) {
                        expect(config.maxHeight).toBeGreaterThanOrEqual(config.minHeight)
                    }

                    // 验证布尔值
                    expect(typeof config.frame).toBe('boolean')
                    expect(typeof config.transparent).toBe('boolean')
                    expect(typeof config.resizable).toBe('boolean')

                    // 验证安全配置存在
                    expect(config.webPreferences).toBeDefined()
                    expect(config.webPreferences.preload).toBeDefined()
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成安全的窗口配置', () => {
            fc.assert(
                fc.property(arbSecureWindowConfig, (config) => {
                    // 验证安全最佳实践
                    expect(config.webPreferences.contextIsolation).toBe(true)
                    expect(config.webPreferences.nodeIntegration).toBe(false)
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成无边框窗口配置', () => {
            fc.assert(
                fc.property(arbFramelessWindowConfig, (config) => {
                    expect(config.frame).toBe(false)
                    expect(config.transparent).toBe(true)
                    expect(config.maximizable).toBe(false)
                }),
                { numRuns: 100 }
            )
        })
    })

    describe('窗口状态生成器', () => {
        it('应该生成有效的窗口状态', () => {
            fc.assert(
                fc.property(arbWindowState, (state) => {
                    expect(typeof state.x).toBe('number')
                    expect(typeof state.y).toBe('number')
                    expect(typeof state.width).toBe('number')
                    expect(typeof state.height).toBe('number')
                    expect(typeof state.isMaximized).toBe('boolean')

                    expect(state.width).toBeGreaterThanOrEqual(200)
                    expect(state.height).toBeGreaterThanOrEqual(200)
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成屏幕范围内的窗口状态', () => {
            fc.assert(
                fc.property(arbValidWindowState, (state) => {
                    expect(state.x).toBeGreaterThanOrEqual(0)
                    expect(state.x).toBeLessThanOrEqual(1920)
                    expect(state.y).toBeGreaterThanOrEqual(0)
                    expect(state.y).toBeLessThanOrEqual(1080)
                    expect(state.width).toBeGreaterThanOrEqual(200)
                    expect(state.width).toBeLessThanOrEqual(1920)
                    expect(state.height).toBeGreaterThanOrEqual(200)
                    expect(state.height).toBeLessThanOrEqual(1080)
                }),
                { numRuns: 100 }
            )
        })
    })

    describe('IPC 消息生成器', () => {
        it('应该生成有效的 IPC 消息', () => {
            fc.assert(
                fc.property(arbIPCMessage, (message) => {
                    expect(message.channel).toBeDefined()
                    expect(typeof message.channel).toBe('string')
                    expect(message.channel.length).toBeGreaterThan(0)
                    expect(typeof message.timestamp).toBe('number')
                    expect(message.timestamp).toBeGreaterThan(0)
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成成功的 IPC 响应', () => {
            fc.assert(
                fc.property(arbSuccessIPCResponse, (response) => {
                    expect(response.success).toBe(true)
                    expect(response.error).toBeUndefined()
                    expect(typeof response.timestamp).toBe('number')
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成失败的 IPC 响应', () => {
            fc.assert(
                fc.property(arbErrorIPCResponse, (response) => {
                    expect(response.success).toBe(false)
                    expect(response.data).toBeUndefined()
                    expect(response.error).toBeDefined()
                    expect(response.error?.message).toBeDefined()
                    expect(response.error?.code).toBeDefined()
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成任意 IPC 响应', () => {
            fc.assert(
                fc.property(arbIPCResponse, (response) => {
                    expect(typeof response.success).toBe('boolean')
                    expect(typeof response.timestamp).toBe('number')

                    if (response.success) {
                        expect(response.error).toBeUndefined()
                    } else {
                        expect(response.error).toBeDefined()
                        expect(response.data).toBeUndefined()
                    }
                }),
                { numRuns: 100 }
            )
        })
    })

    describe('系统信息生成器', () => {
        it('应该生成有效的平台标识符', () => {
            fc.assert(
                fc.property(arbPlatform, (platform) => {
                    expect(['win32', 'darwin', 'linux']).toContain(platform)
                }),
                { numRuns: 100 }
            )
        })

        it('应该生成有效的版本号', () => {
            fc.assert(
                fc.property(arbVersion, (version) => {
                    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
                }),
                { numRuns: 100 }
            )
        })
    })

    describe('辅助函数', () => {
        it('generateSamples 应该生成指定数量的样本', () => {
            const samples = generateSamples(arbWindowDimension, 10)
            expect(samples).toHaveLength(10)
            samples.forEach(sample => {
                expect(sample).toBeGreaterThanOrEqual(200)
                expect(sample).toBeLessThanOrEqual(2000)
            })
        })

        it('generateSamples 应该生成不同的样本', () => {
            const samples = generateSamples(arbWindowDimension, 20)
            const uniqueSamples = new Set(samples)
            // 至少应该有一些不同的值（不要求全部不同，因为可能有重复）
            expect(uniqueSamples.size).toBeGreaterThan(1)
        })
    })
})
