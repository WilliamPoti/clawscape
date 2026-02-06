import { ByteBuffer } from '../io/ByteBuffer.ts'
import { CacheIndex } from '../cache/CacheIndex.ts'
import type { Type } from './Type.ts'

/**
 * Generic loader for cache config types.
 * Reads types from a specific archive within a cache index.
 */
export class TypeLoader<T extends Type> {
  private cache = new Map<number, T>()
  private failedIds = new Set<number>()

  constructor(
    private readonly index: CacheIndex,
    private readonly archiveId: number,
    private readonly factory: (id: number) => T,
  ) {}

  load(id: number): T | undefined {
    // Don't retry failed IDs
    if (this.failedIds.has(id)) return undefined

    const cached = this.cache.get(id)
    if (cached) return cached

    const data = this.index.getFile(this.archiveId, id)
    if (!data) return undefined

    try {
      const type = this.factory(id)
      type.decode(new ByteBuffer(data))
      this.cache.set(id, type)
      return type
    } catch (e) {
      // Log once and remember failure
      this.failedIds.add(id)
      // Only log first few failures to avoid spam
      if (this.failedIds.size <= 5) {
        console.warn(`Failed to decode type ${id} in archive ${this.archiveId}:`, e)
      } else if (this.failedIds.size === 6) {
        console.warn(`Suppressing further type decode errors...`)
      }
      return undefined
    }
  }

  getCount(): number {
    const ref = this.index.getArchiveRef(this.archiveId)
    if (!ref) return 0
    return ref.fileIds.length
  }
}
