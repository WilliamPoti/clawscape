import { CacheIndex } from '../cache/CacheIndex.ts'
import { IndexType } from '../cache/IndexType.ts'

/**
 * Maps (mapX, mapY) coordinates to cache archive IDs for terrain and location data.
 * Uses the MAPS index (5) with naming convention: "m{x}_{y}" for terrain, "l{x}_{y}" for locations.
 */
export class MapFileIndex {
  private terrainArchiveIds = new Map<number, number>()
  private locArchiveIds = new Map<number, number>()

  constructor(private readonly mapsIndex: CacheIndex) {
    this.buildLookup()
  }

  private buildLookup(): void {
    for (const [archiveId, ref] of this.mapsIndex.referenceTable.archives) {
      // We need name hash matching. RS uses djb2 hash for archive names.
      // Instead, we'll try all map squares and check if the archive exists.
      // This is populated on demand via getTerrainArchiveId/getLocArchiveId
    }
  }

  /**
   * Hash a string using the djb2 algorithm (RS's name hashing).
   */
  private static hashName(name: string): number {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
    }
    return hash
  }

  /**
   * Find an archive ID by name in the MAPS index.
   */
  private findArchiveByName(name: string): number {
    const hash = MapFileIndex.hashName(name)
    for (const [archiveId, ref] of this.mapsIndex.referenceTable.archives) {
      if (ref.nameHash === hash) {
        return archiveId
      }
    }
    return -1
  }

  getTerrainArchiveId(mapX: number, mapY: number): number {
    const key = (mapX << 8) | mapY
    let id = this.terrainArchiveIds.get(key)
    if (id !== undefined) return id

    id = this.findArchiveByName(`m${mapX}_${mapY}`)
    this.terrainArchiveIds.set(key, id)
    return id
  }

  getLocArchiveId(mapX: number, mapY: number): number {
    const key = (mapX << 8) | mapY
    let id = this.locArchiveIds.get(key)
    if (id !== undefined) return id

    id = this.findArchiveByName(`l${mapX}_${mapY}`)
    this.locArchiveIds.set(key, id)
    return id
  }

  static create(cacheIndex: CacheIndex): MapFileIndex {
    return new MapFileIndex(cacheIndex)
  }
}
