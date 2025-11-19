/**
 * 存储 Composable
 * 提供类型安全的 localStorage 封装，支持序列化、错误处理和备份恢复
 */

import { ref, type Ref } from 'vue'

/**
 * 序列化器接口
 */
export interface Serializer<T> {
    read: (raw: string) => T
    write: (value: T) => string
}

/**
 * 存储选项接口
 */
export interface UseStorageOptions<T> {
    key: string                           // 存储键名
    defaultValue: T                       // 默认值
    serializer?: Serializer<T>            // 自定义序列化器
    onError?: (error: Error) => void      // 错误处理回调
}

/**
 * 存储返回值接口
 */
export interface UseStorageReturn<T> {
    data: Ref<T>                          // 响应式数据
    isLoading: Ref<boolean>               // 加载状态
    error: Ref<Error | null>              // 错误信息
    save: () => Promise<void>             // 手动保存
    load: () => Promise<void>             // 手动加载
    clear: () => void                     // 清除数据
}

/**
 * 默认 JSON 序列化器
 */
const defaultSerializer = <T>(): Serializer<T> => ({
    read: (raw: string) => JSON.parse(raw),
    write: (value: T) => JSON.stringify(value)
})

/**
 * 生成备份键名
 */
function getBackupKey(key: string): string {
    return `${key}-backup`
}

/**
 * 存储 Composable
 * 
 * @param options 存储选项
 * @returns 存储操作接口
 * 
 * @example
 * ```ts
 * const { data, save, load } = useStorage({
 *   key: 'my-data',
 *   defaultValue: { count: 0 }
 * })
 * ```
 */
export function useStorage<T>(options: UseStorageOptions<T>): UseStorageReturn<T> {
    const {
        key,
        defaultValue,
        serializer = defaultSerializer<T>(),
        onError
    } = options

    // 响应式状态
    const data = ref<T>(defaultValue) as Ref<T>
    const isLoading = ref(false)
    const error = ref<Error | null>(null)

    /**
     * 保存数据到 localStorage
     * 需求: 3.1, 3.2, 7.1, 7.3
     */
    const save = async (): Promise<void> => {
        try {
            error.value = null

            // 序列化数据
            const serialized = serializer.write(data.value)

            // 写入主存储
            localStorage.setItem(key, serialized)

            // 创建备份副本（需求 5.3, 7.4）
            localStorage.setItem(getBackupKey(key), serialized)

        } catch (err) {
            const storageError = err instanceof Error ? err : new Error(String(err))
            error.value = storageError

            // 调用错误处理回调
            if (onError) {
                onError(storageError)
            }

            // 需求 7.1: 序列化失败保持状态不变
            // 需求 7.3: 存储失败保留内存数据
            // 数据保留在内存中，不做任何修改

            throw storageError
        }
    }

    /**
     * 从 localStorage 加载数据
     * 需求: 3.3, 3.4, 3.5, 7.2, 7.4, 7.5
     */
    const load = async (): Promise<void> => {
        isLoading.value = true
        error.value = null

        try {
            // 尝试从主存储读取
            const raw = localStorage.getItem(key)

            if (raw !== null) {
                // 反序列化数据
                data.value = serializer.read(raw)
            } else {
                // 需求 3.5: 不存在数据时使用默认值
                data.value = defaultValue
            }

        } catch (err) {
            const storageError = err instanceof Error ? err : new Error(String(err))

            // 需求 7.4: 读取失败尝试备份
            try {
                const backupRaw = localStorage.getItem(getBackupKey(key))

                if (backupRaw !== null) {
                    data.value = serializer.read(backupRaw)

                    // 成功从备份恢复，清除错误
                    error.value = null
                } else {
                    // 备份也不存在
                    throw new Error('主存储和备份都不可用')
                }

            } catch (backupErr) {
                // 需求 7.2, 7.5: 反序列化失败使用默认状态
                error.value = backupErr instanceof Error ? backupErr : new Error(String(backupErr))
                data.value = defaultValue

                if (onError) {
                    onError(error.value)
                }
            }

        } finally {
            isLoading.value = false
        }
    }

    /**
     * 清除存储数据
     */
    const clear = (): void => {
        try {
            // 清除主存储
            localStorage.removeItem(key)

            // 清除备份
            localStorage.removeItem(getBackupKey(key))

            // 重置为默认值
            data.value = defaultValue
            error.value = null

        } catch (err) {
            const storageError = err instanceof Error ? err : new Error(String(err))
            error.value = storageError

            if (onError) {
                onError(storageError)
            }
        }
    }

    return {
        data,
        isLoading,
        error,
        save,
        load,
        clear
    }
}
