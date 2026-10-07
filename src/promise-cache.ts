type CacheEntry<TResult> = {
    promise: Promise<TResult>
    expiresAt: number | null
}

export type PromiseCacheOptions<TArgs extends unknown[]> = {
    ttl?: number
    key?: (...args: TArgs) => string
}

export type CachedFunction<
    TArgs extends unknown[],
    TResult
> = {
    (...args: TArgs): Promise<TResult>
    clear(): void
    delete(...args: TArgs): boolean
    has(...args: TArgs): boolean
}

export function promiseCache<
    TArgs extends unknown[],
    TResult
>(
    fn: (...args: TArgs) => Promise<TResult>,
    options: PromiseCacheOptions<TArgs> = {}
): CachedFunction<TArgs, TResult> {
    const cache = new Map<string, CacheEntry<TResult>>()

    const ttl = options.ttl
    const key =
        options.key ?? ((...args: TArgs) => JSON.stringify(args))

    const cached = async (...args: TArgs): Promise<TResult> => {
        const cacheKey = key(...args)
        const existing = cache.get(cacheKey)

        if (existing) {
            if (
                existing.expiresAt === null ||
                existing.expiresAt > Date.now()
            ) {
                return existing.promise
            }

            cache.delete(cacheKey)
        }

        const promise = fn(...args)

        const entry: CacheEntry<TResult> = {
            promise,
            expiresAt: null,
        }

        cache.set(cacheKey, entry)

        promise.then(
            () => {
                if (ttl !== undefined) {
                    entry.expiresAt = Date.now() + ttl
                }
            },
            () => {
                cache.delete(cacheKey)
            }
        )

        return promise
    }

    const result = Object.assign(cached, {
        clear() {
            cache.clear()
        },

        delete(...args: TArgs) {
            return cache.delete(key(...args))
        },

        has(...args: TArgs) {
            const cacheKey = key(...args)
            const entry = cache.get(cacheKey)

            if (!entry) {
                return false
            }

            if (
                entry.expiresAt !== null &&
                entry.expiresAt <= Date.now()
            ) {
                cache.delete(cacheKey)
                return false
            }

            return true
        },
    })

    return result
}