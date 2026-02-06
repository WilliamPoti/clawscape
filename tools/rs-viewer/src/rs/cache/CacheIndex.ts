import { ByteBuffer } from '../io/ByteBuffer.ts'
import { Archive } from './Archive.ts'
import { decodeContainer } from './Container.ts'
import { ReferenceTable, type ArchiveRef } from './ReferenceTable.ts'
import { Store } from './Store.ts'

/**
 * A cache index provides access to archives within a specific index (e.g., models, maps, configs).
 * It reads raw data from the Store and decodes it using the reference table metadata.
 */
export class CacheIndex {
  readonly id: number
  readonly store: Store
  readonly referenceTable: ReferenceTable

  // Cache of decoded archives
  private archiveCache = new Map<number, Archive>()

  constructor(id: number, store: Store, referenceTable: ReferenceTable) {
    this.id = id
    this.store = store
    this.referenceTable = referenceTable
  }

  getArchiveIds(): number[] {
    return Array.from(this.referenceTable.archives.keys())
  }

  get archiveCount(): number {
    return this.referenceTable.archives.size
  }

  getArchiveRef(archiveId: number): ArchiveRef | undefined {
    return this.referenceTable.archives.get(archiveId)
  }

  archiveExists(archiveId: number): boolean {
    return this.referenceTable.archives.has(archiveId)
  }

  /**
   * Read and decode an archive.
   */
  getArchive(archiveId: number, key?: number[]): Archive | null {
    const cached = this.archiveCache.get(archiveId)
    if (cached) return cached

    const ref = this.referenceTable.archives.get(archiveId)
    if (!ref) return null

    const rawData = this.store.read(this.id, archiveId)
    if (!rawData) return null

    try {
      const container = decodeContainer(new ByteBuffer(rawData), key)
      const archive = Archive.decode(container.data, ref.fileIds)
      this.archiveCache.set(archiveId, archive)
      return archive
    } catch (e) {
      console.warn(`Failed to decode archive ${this.id}/${archiveId}:`, e)
      return null
    }
  }

  /**
   * Read a single file from an archive.
   */
  getFile(archiveId: number, fileId: number, key?: number[]): Int8Array | undefined {
    const archive = this.getArchive(archiveId, key)
    return archive?.getFileData(fileId)
  }

  /**
   * Create a CacheIndex from store data.
   */
  static fromStore(id: number, store: Store): CacheIndex | null {
    const refData = store.readReferenceTable(id)
    if (!refData) return null

    try {
      const container = decodeContainer(new ByteBuffer(refData))
      const refTable = ReferenceTable.decode(container.data)
      return new CacheIndex(id, store, refTable)
    } catch (e) {
      console.warn(`Failed to decode reference table for index ${id}:`, e)
      return null
    }
  }
}
