import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    // 主进程配置
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            outDir: 'dist/main',
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'electron/main.ts')
                }
            }
        }
    },

    // 预加载脚本配置
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            outDir: 'dist/preload',
            rollupOptions: {
                input: {
                    preload: resolve(__dirname, 'electron/preload.ts')
                },
                output: {
                    // 确保输出文件名为 preload.js
                    entryFileNames: 'preload.js',
                    format: 'cjs'
                }
            }
        }
    },

    // 渲染进程配置
    renderer: {
        root: '.',

        // Vue 3 插件配置
        plugins: [vue()],

        // 路径别名配置（与 tsconfig.json 保持一致）
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src')
            }
        },

        // 开发服务器配置
        server: {
            port: 5173,
            strictPort: false,
            host: true
        },

        // 构建配置
        build: {
            outDir: 'dist/renderer',
            rollupOptions: {
                input: resolve(__dirname, 'index.html')
            }
        }
    }
})
