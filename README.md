# promise-cache-lite

Deduplicate concurrent async operations and cache their results.

`promise-cache-lite` prevents duplicate async calls by sharing the same Promise between concurrent requests. It can also cache resolved results for a configurable amount of time.

Zero dependencies. TypeScript-first. Works in Node.js and the browser.

## Installation

```bash
npm install promise-cache-lite
```

## Basic Usage

```ts
import { promiseCache } from "promise-cache-lite"

const getUser = promiseCache(async (id: number) => {
  const response = await fetch(`/api/users/${id}`)

  return response.json()
})

const user = await getUser(1)
```

If multiple calls happen at the same time:

```ts
const [user1, user2, user3] = await Promise.all([
  getUser(1),
  getUser(1),
  getUser(1),
])
```

The underlying function only runs once.

All callers share the same Promise.

## TTL

You can configure how long resolved results should stay in the cache:

```ts
const getUser = promiseCache(
  async (id: number) => {
    const response = await fetch(`/api/users/${id}`)

    return response.json()
  },
  {
    ttl: 10_000,
  }
)
```

The result will remain cached for 10 seconds.

After the TTL expires, the next call executes the function again.

> TTL starts after the Promise resolves successfully.

## Custom Cache Keys

By default, arguments are converted to a cache key using `JSON.stringify()`.

For more control, provide a custom `key` function:

```ts
const getUser = promiseCache(
  async (user: { id: number; name: string }) => {
    return user.name
  },
  {
    key: (user) => String(user.id),
  }
)
```

Now different objects with the same `id` can share the same cached result.

## Cache Management

### Clear the entire cache

```ts
getUser.clear()
```

### Delete a specific entry

```ts
getUser.delete(1)
```

Returns `true` if an entry was removed.

### Check if an entry exists

```ts
getUser.has(1)
```

Returns `true` when the result is currently cached.

## Error Handling

Rejected Promises are never kept in the cache.

```ts
const getUser = promiseCache(async (id: number) => {
  const response = await fetch(`/api/users/${id}`)

  if (!response.ok) {
    throw new Error("Failed to fetch user")
  }

  return response.json()
})
```

If the request fails, the cache entry is removed.

The next call can try the operation again.

## TypeScript

`promise-cache-lite` is written in TypeScript and provides type-safe arguments and return values.

```ts
const getUser = promiseCache(
  async (id: number) => {
    return {
      id,
      name: "Kushyar",
    }
  }
)

const user = await getUser(1)
```

The argument and return types are inferred automatically.

## API

### `promiseCache(fn, options?)`

Creates a cached async function.

### Options

| Option | Type                  | Description                                             |
| ------ | --------------------- | ------------------------------------------------------- |
| `ttl`  | `number`              | How long resolved results remain cached in milliseconds |
| `key`  | `(...args) => string` | Custom function for generating cache keys               |

### Returned function

The returned function has the following methods:

| Method                   | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `cached(...args)`        | Execute the operation or return the cached Promise |
| `cached.clear()`         | Remove all cached entries                          |
| `cached.delete(...args)` | Remove a specific cached entry                     |
| `cached.has(...args)`    | Check whether an entry is cached                   |

## Why promise-cache-lite?

Async operations are often triggered multiple times before the first request finishes.

Without deduplication:

```text
Request A ──→ API
Request B ──→ API
Request C ──→ API
```

With `promise-cache-lite`:

```text
Request A ─┐
Request B ─┼──→ One API request
Request C ─┘
```

The same Promise is shared between callers.

## Features

* Concurrent Promise deduplication
* In-memory caching
* Optional TTL
* Custom cache keys
* Manual cache management
* Rejected Promise cleanup
* Full TypeScript support
* Zero runtime dependencies
* Browser and Node.js compatible
