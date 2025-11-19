import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
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
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'index.html')
        }
    }
})
