import { ByteBuffer } from '../io/ByteBuffer.ts'

export interface ArchiveRef {
  id: number
  nameHash: number
  crc: number
  revision: number
  fileIds: number[]
}

/**
 * Reference table: describes the contents of a cache index.
 * Each index has a reference table that lists its archives and the files within them.
 */
export class ReferenceTable {
  archives: Map<number, ArchiveRef> = new Map()

  static decode(data: Int8Array): ReferenceTable {
    const buf = new ByteBuffer(data)
    const table = new ReferenceTable()

    const protocol = buf.readUByte()
    if (protocol < 5 || protocol > 7) {
      throw new Error(`Unsupported reference table protocol: ${protocol}`)
    }

    if (protocol >= 6) {
      buf.readInt() // revision
    }

    const flags = buf.readUByte()
    const hasNames = (flags & 0x1) !== 0
    // const hasWhirlpool = (flags & 0x2) !== 0
    // const hasSizes = (flags & 0x4) !== 0
    // const hasUncompressedCrcs = (flags & 0x8) !== 0

    // Read archive count and IDs (delta-encoded)
    const archiveCount = protocol >= 7 ? buf.readBigUSmart() : buf.readUShort()
    const archiveIds: number[] = []
    let lastArchiveId = 0
    for (let i = 0; i < archiveCount; i++) {
      const delta = protocol >= 7 ? buf.readBigUSmart() : buf.readUShort()
      lastArchiveId += delta
      archiveIds.push(lastArchiveId)
    }

    // Initialize archive refs
    const refs: ArchiveRef[] = archiveIds.map(id => ({
      id,
      nameHash: 0,
      crc: 0,
      revision: 0,
      fileIds: [],
    }))

    // Name hashes (optional)
    if (hasNames) {
      for (let i = 0; i < archiveCount; i++) {
        refs[i].nameHash = buf.readInt()
      }
    }

    // CRCs
    for (let i = 0; i < archiveCount; i++) {
      refs[i].crc = buf.readInt()
    }

    // Skip uncompressed CRCs if present
    if ((flags & 0x8) !== 0) {
      for (let i = 0; i < archiveCount; i++) {
        buf.readInt()
      }
    }

    // Skip whirlpool hashes if present
    if ((flags & 0x2) !== 0) {
      for (let i = 0; i < archiveCount; i++) {
        buf.skip(64)
      }
    }

    // Skip sizes if present
    if ((flags & 0x4) !== 0) {
      for (let i = 0; i < archiveCount; i++) {
        buf.readInt() // compressed
        buf.readInt() // uncompressed
      }
    }

    // Revisions
    for (let i = 0; i < archiveCount; i++) {
      refs[i].revision = buf.readInt()
    }

    // File counts per archive
    const fileCounts = new Int32Array(archiveCount)
    for (let i = 0; i < archiveCount; i++) {
      fileCounts[i] = protocol >= 7 ? buf.readBigUSmart() : buf.readUShort()
    }

    // File IDs per archive (delta-encoded)
    for (let i = 0; i < archiveCount; i++) {
      let lastFileId = 0
      const fileIds: number[] = []
      for (let j = 0; j < fileCounts[i]; j++) {
        const delta = protocol >= 7 ? buf.readBigUSmart() : buf.readUShort()
        lastFileId += delta
        fileIds.push(lastFileId)
      }
      refs[i].fileIds = fileIds
    }

    // File name hashes (optional, skip)
    if (hasNames) {
      for (let i = 0; i < archiveCount; i++) {
        for (let j = 0; j < fileCounts[i]; j++) {
          buf.readInt()
        }
      }
    }

    // Populate map
    for (const ref of refs) {
      table.archives.set(ref.id, ref)
    }

    return table
  }
}
