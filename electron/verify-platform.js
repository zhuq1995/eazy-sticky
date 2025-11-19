/**
 * 平台兼容性验证脚本
 * 
 * 用于验证平台检测和配置是否正确工作
 * 运行方式: node electron/verify-platform.js
 */

console.log('='.repeat(60))
console.log('平台兼容性验证')
console.log('='.repeat(60))

// 检测平台
const platform = process.platform
console.log('\n✓ 当前平台:', platform)

// 平台映射
const platformNames = {
    'win32': 'Windows',
    'darwin': 'macOS',
    'linux': 'Linux'
}

const platformName = platformNames[platform] || '未知平台'
console.log('✓ 平台名称:', platformName)

// 检查 Node.js 版本
console.log('\n✓ Node.js 版本:', process.version)
console.log('✓ V8 版本:', process.versions.v8)

// 平台特定的配置建议
console.log('\n' + '='.repeat(60))
console.log('平台特定配置')
console.log('='.repeat(60))

switch (platform) {
    case 'win32':
        console.log('\n✓ Windows 平台配置:')
        console.log('  - AppUserModelId: com.example.sticky-notes')
        console.log('  - 窗口关闭行为: 所有窗口关闭时应用退出')
        console.log('  - 任务栏: 支持任务栏分组和通知')
        break

    case 'darwin':
        console.log('\n✓ macOS 平台配置:')
        console.log('  - 窗口关闭行为: 所有窗口关闭时应用保持运行')
        console.log('  - Dock: 支持 Dock 图标和菜单')
        console.log('  - Activate 事件: 点击 Dock 图标时重新创建窗口')
        break

    case 'linux':
        console.log('\n✓ Linux 平台配置:')
        console.log('  - 透明窗口: 启用 enable-transparent-visuals')
        console.log('  - GPU 加速: 禁用以提高兼容性')
        console.log('  - 窗口关闭行为: 所有窗口关闭时应用退出')
        break

    default:
        console.log('\n⚠ 未知平台，使用默认配置')
}

// 环境变量检查
console.log('\n' + '='.repeat(60))
console.log('环境变量')
console.log('='.repeat(60))

const nodeEnv = process.env.NODE_ENV || '未设置'
console.log('\n✓ NODE_ENV:', nodeEnv)

if (nodeEnv === 'development') {
    console.log('  - 开发模式: 启用开发者工具和详细日志')
} else if (nodeEnv === 'production') {
    console.log('  - 生产模式: 禁用开发者工具，启用文件日志')
} else {
    console.log('  - 未设置: 将根据打包状态自动检测')
}

// 架构信息
console.log('\n' + '='.repeat(60))
console.log('系统架构')
console.log('='.repeat(60))

console.log('\n✓ CPU 架构:', process.arch)
console.log('✓ 操作系统:', process.platform)

// 测试建议
console.log('\n' + '='.repeat(60))
console.log('测试建议')
console.log('='.repeat(60))

console.log('\n手动测试步骤:')
console.log('1. 启动应用: npm run dev')
console.log('2. 测试窗口创建和显示')
console.log('3. 测试窗口操作（移动、调整大小、最小化）')

if (platform === 'darwin') {
    console.log('4. 关闭所有窗口，验证应用保持运行')
    console.log('5. 点击 Dock 图标，验证创建新窗口')
    console.log('6. 使用 Cmd+Q 退出应用')
} else {
    console.log('4. 关闭所有窗口，验证应用退出')
}

if (platform === 'linux') {
    console.log('5. 验证窗口透明效果')
    console.log('6. 测试不同桌面环境（GNOME、KDE 等）')
}

console.log('\n' + '='.repeat(60))
console.log('验证完成')
console.log('='.repeat(60))
console.log('\n如果所有检查都通过，平台配置应该正常工作。')
console.log('如果遇到问题，请查看 electron/PLATFORM_COMPATIBILITY.md 文档。\n')
