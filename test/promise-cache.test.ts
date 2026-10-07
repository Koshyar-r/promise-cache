import { describe, expect, it, vi } from "vitest"
import { promiseCache } from "../src/promise-cache"

describe("promiseCache", () => {
  it("should deduplicate concurrent calls", async () => {
    const fn = vi.fn(async (id: number) => {
      return `user-${id}`
    })

    const cached = promiseCache(fn)

    const results = await Promise.all([
      cached(1),
      cached(1),
      cached(1),
    ])

    expect(results).toEqual([
      "user-1",
      "user-1",
      "user-1",
    ])

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("should cache resolved results", async () => {
    const fn = vi.fn(async (id: number) => {
      return `user-${id}`
    })

    const cached = promiseCache(fn)

    const first = await cached(1)
    const second = await cached(1)
    const third = await cached(1)

    expect(first).toBe("user-1")
    expect(second).toBe("user-1")
    expect(third).toBe("user-1")

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("should expire cached results after ttl", async () => {
    vi.useFakeTimers()

    try {
      const fn = vi.fn(async (id: number) => {
        return `user-${id}`
      })

      const cached = promiseCache(fn, {
        ttl: 100,
      })

      await cached(1)
      await cached(1)

      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(101)

      await cached(1)

      expect(fn).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("should clear the entire cache", async () => {
    const fn = vi.fn(async (id: number) => {
      return `user-${id}`
    })

    const cached = promiseCache(fn)

    await cached(1)
    await cached(2)

    expect(fn).toHaveBeenCalledTimes(2)

    cached.clear()

    await cached(1)

    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("should delete a specific cached result", async () => {
    const fn = vi.fn(async (id: number) => {
      return `user-${id}`
    })

    const cached = promiseCache(fn)

    await cached(1)
    await cached(2)

    expect(fn).toHaveBeenCalledTimes(2)

    cached.delete(1)

    await cached(1)
    await cached(2)

    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("should check whether a result is cached", async () => {
    const fn = vi.fn(async (id: number) => {
      return `user-${id}`
    })

    const cached = promiseCache(fn)

    expect(cached.has(1)).toBe(false)

    await cached(1)

    expect(cached.has(1)).toBe(true)

    cached.delete(1)

    expect(cached.has(1)).toBe(false)
  })

  it("should not cache rejected promises", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Request failed"))
      .mockResolvedValueOnce("success")

    const cached = promiseCache(fn)

    await expect(cached()).rejects.toThrow("Request failed")

    expect(fn).toHaveBeenCalledTimes(1)

    const result = await cached()

    expect(result).toBe("success")
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("should support a custom key function", async () => {
    const fn = vi.fn(
      async (user: { id: number; name: string }) => {
        return user.name
      }
    )

    const cached = promiseCache(fn, {
      key: (user) => String(user.id),
    })

    const first = await cached({
      id: 1,
      name: "Kushyar",
    })

    const second = await cached({
      id: 1,
      name: "Kushyar",
    })

    expect(first).toBe("Kushyar")
    expect(second).toBe("Kushyar")

    expect(fn).toHaveBeenCalledTimes(1)
  })
})