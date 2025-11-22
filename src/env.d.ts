/// <reference types="vite/client" />

// 引用 Electron API 类型定义
/// <reference types="./types/electron" />

// 声明 .vue 文件的类型
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}
