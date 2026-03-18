const DB_NAME = 'if-script-ide'
const STORE_NAME = 'kv'
const DB_VERSION = 1
const FALLBACK_PREFIX = 'if-script-ide:'
const memoryFallback = new Map<string, string>()
const OPEN_TIMEOUT_MS = 1200
let indexedDbDisabled = false

function toFallbackRaw<T>(value: T): string {
  return JSON.stringify(value)
}

function fromFallbackRaw<T>(raw: string | null): T | null {
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function fallbackSet<T>(key: string, value: T): void {
  const raw = toFallbackRaw(value)
  try {
    window.localStorage.setItem(`${FALLBACK_PREFIX}${key}`, raw)
    memoryFallback.delete(key)
    return
  } catch {
    memoryFallback.set(key, raw)
  }
}

function fallbackGet<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(`${FALLBACK_PREFIX}${key}`)
    if (raw != null) return fromFallbackRaw<T>(raw)
  } catch {
    // ignore and use in-memory fallback
  }
  return fromFallbackRaw<T>(memoryFallback.get(key) ?? null)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (indexedDbDisabled) {
      reject(new Error('IndexedDB disabled'))
      return
    }

    if (!('indexedDB' in window)) {
      indexedDbDisabled = true
      reject(new Error('IndexedDB not available'))
      return
    }

    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (error) {
      indexedDbDisabled = true
      reject(error)
      return
    }

    let settled = false
    const finalize = (fn: () => void): void => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      fn()
    }

    const timer = window.setTimeout(() => {
      indexedDbDisabled = true
      finalize(() => reject(new Error('IndexedDB open request timed out')))
    }, OPEN_TIMEOUT_MS)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    req.onblocked = () => {
      indexedDbDisabled = true
      finalize(() => reject(new Error('IndexedDB open request blocked')))
    }
    req.onsuccess = () => finalize(() => resolve(req.result))
    req.onerror = () => {
      indexedDbDisabled = true
      finalize(() => reject(req.error))
    }
  })
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  let db: IDBDatabase | null = null
  try {
    db = await openDb()
    const conn = db
    await new Promise<void>((resolve, reject) => {
      const tx = conn.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } catch {
    indexedDbDisabled = true
    fallbackSet(key, value)
  } finally {
    db?.close()
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  let db: IDBDatabase | null = null
  try {
    db = await openDb()
    const conn = db
    const result = await new Promise<T | null>((resolve, reject) => {
      const tx = conn.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
      req.onerror = () => reject(req.error)
      tx.onabort = () => reject(tx.error)
    })
    return result
  } catch {
    indexedDbDisabled = true
    return fallbackGet<T>(key)
  } finally {
    db?.close()
  }
}
