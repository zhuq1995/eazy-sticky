/**
 * 数据迁移模块
 * 负责处理应用数据结构的版本升级和迁移
 */

// 迁移接口定义
export interface Migration {
    version: number           // 目标版本号
    migrate: (data: any) => any  // 迁移函数
    description: string       // 迁移描述
}

// 迁移结果接口
export interface MigrationResult {
    success: boolean          // 迁移是否成功
    fromVersion: number       // 原始版本号
    toVersion: number         // 目标版本号
    backup?: any             // 备份数据
    error?: Error            // 错误信息（如果失败）
}

// 当前应用版本
export const CURRENT_VERSION = 1

// 存储键名常量
export const STORAGE_KEYS = {
    NOTES_DATA: 'sticky-notes-data',      // 主数据
    BACKUP_DATA: 'sticky-notes-backup',   // 备份数据
    VERSION: 'sticky-notes-version'       // 版本信息
}

// 迁移规则数组
// 未来版本的迁移规则将添加到这里
const migrations: Migration[] = [
    // 示例迁移规则（当需要从版本1升级到版本2时）
    // {
    //   version: 2,
    //   description: '添加updatedAt字段',
    //   migrate: (data) => {
    //     return {
    //       ...data,
    //       notes: data.notes.map(note => ({
    //         ...note,
    //         updatedAt: note.createdAt
    //       }))
    //     }
    //   }
    // }
]

/**
 * 创建数据备份
 * @param data 要备份的数据
 * @returns 备份的深拷贝
 */
function createBackup(data: any): any {
    try {
        return JSON.parse(JSON.stringify(data))
    } catch (error) {
        console.error('创建备份失败:', error)
        throw new Error('无法创建数据备份')
    }
}

/**
 * 执行数据迁移
 * @param data 原始数据
 * @param targetVersion 目标版本号
 * @returns 迁移结果
 */
export function runMigrations(data: any, targetVersion: number): MigrationResult {
    // 验证输入数据
    if (!data || typeof data !== 'object') {
        return {
            success: false,
            fromVersion: 0,
            toVersion: targetVersion,
            error: new Error('无效的数据格式')
        }
    }

    // 获取当前数据版本，默认为1
    const currentVersion = data.version || 1

    // 如果当前版本已经是目标版本或更高，无需迁移
    if (currentVersion >= targetVersion) {
        return {
            success: true,
            fromVersion: currentVersion,
            toVersion: targetVersion
        }
    }

    // 创建备份
    let backup: any
    try {
        backup = createBackup(data)
    } catch (error) {
        return {
            success: false,
            fromVersion: currentVersion,
            toVersion: targetVersion,
            error: error as Error
        }
    }

    // 执行迁移
    try {
        let migratedData = { ...data }

        // 按顺序执行所有需要的迁移
        for (const migration of migrations) {
            if (migration.version > currentVersion && migration.version <= targetVersion) {
                console.log(`执行迁移: ${migration.description} (v${migration.version})`)
                migratedData = migration.migrate(migratedData)
                migratedData.version = migration.version
            }
        }

        // 确保最终版本号正确
        migratedData.version = targetVersion

        // 迁移成功，返回迁移后的数据
        return {
            success: true,
            fromVersion: currentVersion,
            toVersion: targetVersion,
            backup
        }
    } catch (error) {
        // 迁移失败，返回错误信息和备份
        console.error('数据迁移失败:', error)
        return {
            success: false,
            fromVersion: currentVersion,
            toVersion: targetVersion,
            backup,
            error: error as Error
        }
    }
}

/**
 * 保存备份到本地存储
 * @param data 要备份的数据
 */
export function saveBackup(data: any): void {
    try {
        // 检查localStorage是否可用
        if (typeof localStorage === 'undefined') {
            console.warn('localStorage不可用，跳过备份保存')
            return
        }
        const backup = createBackup(data)
        localStorage.setItem(STORAGE_KEYS.BACKUP_DATA, JSON.stringify(backup))
    } catch (error) {
        console.error('保存备份失败:', error)
    }
}

/**
 * 从本地存储恢复备份
 * @returns 备份数据，如果不存在则返回null
 */
export function restoreBackup(): any | null {
    try {
        // 检查localStorage是否可用
        if (typeof localStorage === 'undefined') {
            console.warn('localStorage不可用，无法恢复备份')
            return null
        }
        const backupStr = localStorage.getItem(STORAGE_KEYS.BACKUP_DATA)
        if (backupStr) {
            return JSON.parse(backupStr)
        }
        return null
    } catch (error) {
        console.error('恢复备份失败:', error)
        return null
    }
}

/**
 * 清除备份数据
 */
export function clearBackup(): void {
    try {
        // 检查localStorage是否可用
        if (typeof localStorage === 'undefined') {
            console.warn('localStorage不可用，跳过清除备份')
            return
        }
        localStorage.removeItem(STORAGE_KEYS.BACKUP_DATA)
    } catch (error) {
        console.error('清除备份失败:', error)
    }
}
