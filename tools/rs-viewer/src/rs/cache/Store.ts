import { ByteBuffer } from '../io/ByteBuffer.ts'

/**
 * Sector cluster: 6 bytes in the index file per archive.
 * Points to the start of a chain of sectors in the data file.
 */
interface SectorCluster {
  size: number    // uncompressed data size (3 bytes / medium)
  sector: number  // first sector number (3 bytes / medium)
}

const SECTOR_CLUSTER_SIZE = 6

// Sector format constants
const SECTOR_HEADER_SIZE = 8       // standard: archiveId(2) + chunk(2) + nextSector(3) + indexId(1)
const SECTOR_HEADER_SIZE_EXT = 10  // extended (archiveId >= 65536): archiveId(4) + chunk(2) + nextSector(3) + indexId(1)
const SECTOR_DATA_SIZE = 512
const SECTOR_SIZE = SECTOR_HEADER_SIZE + SECTOR_DATA_SIZE       // 520
const SECTOR_SIZE_EXT = SECTOR_HEADER_SIZE_EXT + SECTOR_DATA_SIZE // 522

/**
 * In-memory cache store backed by .dat2/.idx file data.
 * Reads data by following sector chains from index files.
 */
export class Store {
  constructor(
    readonly dataFile: Uint8Array,
    readonly indexFiles: Map<number, Uint8Array>,
    readonly metaFile: Uint8Array | null,
  ) {}

  get indexCount(): number {
    return this.indexFiles.size
  }

  hasIndex(indexId: number): boolean {
    return this.indexFiles.has(indexId)
  }

  /**
   * Read an archive from the store.
   * Follows the sector chain in the data file starting from the index entry.
   */
  read(indexId: number, archiveId: number): Int8Array | null {
    // Use meta index (255) for reading reference tables, regular index otherwise
    const indexData = indexId === 255 ? this.metaFile : this.indexFiles.get(indexId) ?? null
    if (!indexData) return null

    // Read the sector cluster from the index file
    const clusterOffset = archiveId * SECTOR_CLUSTER_SIZE
    if (clusterOffset + SECTOR_CLUSTER_SIZE > indexData.length) return null

    const idxBuf = new ByteBuffer(indexData)
    idxBuf.seek(clusterOffset)
    const cluster: SectorCluster = {
      size: idxBuf.readUMedium(),
      sector: idxBuf.readUMedium(),
    }

    if (cluster.size <= 0 || cluster.sector <= 0) return null

    const result = new Int8Array(cluster.size)
    let bytesRead = 0
    let currentSector = cluster.sector
    let chunk = 0

    // Extended format for archives with ID >= 65536
    const extended = archiveId >= 65536

    while (bytesRead < cluster.size) {
      const sectorOffset = currentSector * SECTOR_SIZE
      if (sectorOffset + SECTOR_SIZE > this.dataFile.length) return null

      const dataBuf = new ByteBuffer(this.dataFile)
      dataBuf.seek(sectorOffset)

      // Read sector header
      let sectorArchiveId: number
      if (extended) {
        sectorArchiveId = dataBuf.readInt()
      } else {
        sectorArchiveId = dataBuf.readUShort()
      }

      const sectorChunk = dataBuf.readUShort()
      const nextSector = dataBuf.readUMedium()
      const sectorIndexId = dataBuf.readUByte()

      // Validate sector metadata
      if (sectorArchiveId !== archiveId || sectorChunk !== chunk || sectorIndexId !== indexId) {
        return null
      }

      // Read sector data
      const dataSize = extended
        ? SECTOR_SIZE_EXT - SECTOR_HEADER_SIZE_EXT
        : SECTOR_DATA_SIZE
      const bytesToRead = Math.min(dataSize, cluster.size - bytesRead)

      const sectorData = new Int8Array(bytesToRead)
      dataBuf.readBytes(sectorData, 0, bytesToRead)
      result.set(new Uint8Array(sectorData.buffer, sectorData.byteOffset, sectorData.byteLength), bytesRead)

      bytesRead += bytesToRead
      currentSector = nextSector
      chunk++
    }

    return result
  }

  /**
   * Read the reference table (archive 255) data for a given index.
   */
  readReferenceTable(indexId: number): Int8Array | null {
    return this.read(255, indexId)
  }

  /**
   * Create a Store from raw file data (as loaded from a .zip or fetched individually).
   */
  static fromFiles(files: Map<string, Uint8Array>): Store {
    const dataFile = files.get('main_file_cache.dat2') ?? new Uint8Array(0)
    const metaFile = files.get('main_file_cache.idx255') ?? null

    const indexFiles = new Map<number, Uint8Array>()
    for (const [name, data] of files) {
      const match = name.match(/main_file_cache\.idx(\d+)$/)
      if (match) {
        const id = parseInt(match[1])
        if (id !== 255) {
          indexFiles.set(id, data)
        }
      }
    }

    return new Store(dataFile, indexFiles, metaFile)
  }
}
