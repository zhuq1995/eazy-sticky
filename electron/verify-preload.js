/**
 * 预加载脚本验证工具
 * 
 * 用途：验证所有系统集成 API 是否已正确暴露到渲染进程
 * 
 * 使用方法：
 * 在渲染进程的控制台中运行此脚本，检查所有 API 是否可用
 */

console.log('=== Electron API 验证 ===\n')

// 检查 electronAPI 是否存在
if (typeof window.electronAPI === 'undefined') {
    console.error('❌ window.electronAPI 未定义！')
    console.log('请确保：')
    console.log('1. preload.ts 已正确加载')
    console.log('2. contextBridge.exposeInMainWorld 已执行')
    console.log('3. 窗口配置中启用了 contextIsolation')
} else {
    console.log('✅ window.electronAPI 已定义\n')

    // 验证各个 API 模块
    const apiModules = [
        { name: 'window', description: '窗口操作 API' },
        { name: 'multiWindow', description: '多窗口管理 API' },
        { name: 'system', description: '系统信息 API' },
        { name: 'tray', description: '托盘管理 API' },
        { name: 'shortcut', description: '快捷键管理 API' },
        { name: 'display', description: '显示器管理 API' },
        { name: 'autoLaunch', description: '自启动管理 API' },
        { name: 'theme', description: '主题管理 API' }
    ]

    console.log('--- API 模块检查 ---\n')

    apiModules.forEach(module => {
        if (window.electronAPI[module.name]) {
            console.log(`✅ ${module.name}: ${module.description}`)

            // 列出该模块下的所有方法
            const methods = Object.keys(window.electronAPI[module.name])
            console.log(`   方法: ${methods.join(', ')}`)
        } else {
            console.error(`❌ ${module.name}: 未找到`)
        }
    })

    // 验证事件监听 API
    console.log('\n--- 事件监听 API 检查 ---\n')

    if (typeof window.electronAPI.on === 'function') {
        console.log('✅ on: 事件监听方法')
    } else {
        console.error('❌ on: 未找到')
    }

    if (typeof window.electronAPI.off === 'function') {
        console.log('✅ off: 取消事件监听方法')
    } else {
        console.error('❌ off: 未找到')
    }

    // 详细的 API 方法检查
    console.log('\n--- 系统集成 API 详细检查 ---\n')

    // 托盘 API
    console.log('托盘 API (tray):')
    const trayMethods = ['showNotification', 'updateMenu', 'setToolTip', 'isCreated']
    trayMethods.forEach(method => {
        const exists = typeof window.electronAPI.tray?.[method] === 'function'
        console.log(`  ${exists ? '✅' : '❌'} ${method}`)
    })

    // 快捷键 API
    console.log('\n快捷键 API (shortcut):')
    const shortcutMethods = ['getAllConfigs', 'updateConfig', 'isRegistered', 'getConfigByAction']
    shortcutMethods.forEach(method => {
        const exists = typeof window.electronAPI.shortcut?.[method] === 'function'
        console.log(`  ${exists ? '✅' : '❌'} ${method}`)
    })

    // 显示器 API
    console.log('\n显示器 API (display):')
    const displayMethods = [
        'getAllDisplays',
        'getPrimaryDisplay',
        'getDisplayNearestPoint',
        'getDisplayForWindow',
        'isPositionInBounds',
        'adjustPositionToBounds',
        'getDisplayCount',
        'isMultiDisplay',
        'getDisplaySummary'
    ]
    displayMethods.forEach(method => {
        const exists = typeof window.electronAPI.display?.[method] === 'function'
        console.log(`  ${exists ? '✅' : '❌'} ${method}`)
    })

    // 自启动 API
    console.log('\n自启动 API (autoLaunch):')
    const autoLaunchMethods = ['enable', 'disable', 'isEnabled', 'getConfig', 'updateConfig']
    autoLaunchMethods.forEach(method => {
        const exists = typeof window.electronAPI.autoLaunch?.[method] === 'function'
        console.log(`  ${exists ? '✅' : '❌'} ${method}`)
    })

    // 主题 API
    console.log('\n主题 API (theme):')
    const themeMethods = ['getCurrent', 'getConfig', 'set', 'toggle', 'getSystem']
    themeMethods.forEach(method => {
        const exists = typeof window.electronAPI.theme?.[method] === 'function'
        console.log(`  ${exists ? '✅' : '❌'} ${method}`)
    })

    console.log('\n=== 验证完成 ===')
    console.log('\n提示：在浏览器控制台中运行以下命令测试 API：')
    console.log('- await window.electronAPI.tray.isCreated()')
    console.log('- await window.electronAPI.display.getAllDisplays()')
    console.log('- await window.electronAPI.theme.getCurrent()')
    console.log('- await window.electronAPI.autoLaunch.isEnabled()')
    console.log('- await window.electronAPI.shortcut.getAllConfigs()')
}
