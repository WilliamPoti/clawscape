import { CacheIndex } from './CacheIndex.ts'
import { Store } from './Store.ts'

/**
 * Top-level cache accessor.
 * Holds all cache indexes and provides access by index ID.
 */
export class CacheSystem {
  private indexes: Map<number, CacheIndex> = new Map()

  constructor(
    readonly store: Store,
    indexes: Map<number, CacheIndex>,
  ) {
    this.indexes = indexes
  }

  indexExists(id: number): boolean {
    return this.indexes.has(id)
  }

  getIndex(id: number): CacheIndex {
    const index = this.indexes.get(id)
    if (!index) {
      throw new Error(`Cache index ${id} not found`)
    }
    return index
  }

  getIndexOrNull(id: number): CacheIndex | null {
    return this.indexes.get(id) ?? null
  }

  get indexCount(): number {
    return this.indexes.size
  }

  getIndexIds(): number[] {
    return Array.from(this.indexes.keys())
  }

  /**
   * Create a CacheSystem from a Store (dat2 format).
   * Reads all reference tables and creates indexes.
   */
  static fromStore(store: Store): CacheSystem {
    const indexes = new Map<number, CacheIndex>()

    for (const indexId of store.indexFiles.keys()) {
      const index = CacheIndex.fromStore(indexId, store)
      if (index) {
        indexes.set(indexId, index)
      }
    }

    console.log(`CacheSystem: loaded ${indexes.size} indexes`)
    return new CacheSystem(store, indexes)
  }

  /**
   * Create from raw file data (e.g., extracted from a ZIP).
   */
  static fromFiles(files: Map<string, Uint8Array>): CacheSystem {
    const store = Store.fromFiles(files)
    return CacheSystem.fromStore(store)
  }
}
