import { CacheIndex } from '../cache/CacheIndex.ts'
import { MapFileIndex } from './MapFileIndex.ts'

/**
 * Loads map terrain and location data from the cache.
 * Terrain data is unencrypted; location data requires XTEA keys.
 */
export class MapFileLoader {
  constructor(
    private readonly mapsIndex: CacheIndex,
    private readonly mapFileIndex: MapFileIndex,
    private readonly xteas: Map<number, number[]>,
  ) {}

  /**
   * Get terrain data for a map square.
   * Returns raw bytes or null if not found.
   */
  getTerrainData(mapX: number, mapY: number): Int8Array | null {
    const archiveId = this.mapFileIndex.getTerrainArchiveId(mapX, mapY)
    if (archiveId === -1) return null

    const archive = this.mapsIndex.getArchive(archiveId)
    if (!archive) return null

    const file = archive.files.values().next().value
    return file?.data ?? null
  }

  /**
   * Get location data for a map square.
   * Requires XTEA decryption key for the region.
   */
  getLocData(mapX: number, mapY: number): Int8Array | null {
    const archiveId = this.mapFileIndex.getLocArchiveId(mapX, mapY)
    if (archiveId === -1) return null

    const regionId = (mapX << 8) | mapY
    const key = this.xteas.get(regionId)

    const archive = this.mapsIndex.getArchive(archiveId, key)
    if (!archive) return null

    const file = archive.files.values().next().value
    return file?.data ?? null
  }
}
