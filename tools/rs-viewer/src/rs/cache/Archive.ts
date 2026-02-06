import { ByteBuffer } from '../io/ByteBuffer.ts'

export interface ArchiveFile {
  id: number
  data: Int8Array
}

/**
 * An archive contains one or more files.
 * Archives are the unit of storage within cache indexes.
 */
export class Archive {
  files: Map<number, ArchiveFile>
  private nameToId: Map<number, number> = new Map()

  constructor(files: Map<number, ArchiveFile>) {
    this.files = files
  }

  getFile(id: number): ArchiveFile | undefined {
    return this.files.get(id)
  }

  getFileData(id: number): Int8Array | undefined {
    return this.files.get(id)?.data
  }

  /**
   * Decode a modern archive (dat2 format).
   * Archives can contain multiple files, stored as interleaved chunks.
   *
   * Single file: data is the archive data directly.
   * Multi-file: data ends with [chunkCount:1], then chunk size deltas,
   *             then interleaved chunk data.
   */
  static decode(data: Int8Array, fileIds: number[]): Archive {
    const buf = new ByteBuffer(data)

    if (fileIds.length === 1) {
      // Single file archive - data is the file
      const files = new Map<number, ArchiveFile>()
      files.set(fileIds[0], { id: fileIds[0], data })
      return new Archive(files)
    }

    // Multi-file archive
    // Read chunk count from end of buffer
    buf.seek(data.length - 1)
    const chunkCount = buf.readUByte()

    // Read chunk size table
    // Table is at: end - 1 - (chunkCount * fileCount * 4)
    const tableSize = chunkCount * fileIds.length * 4
    buf.seek(data.length - 1 - tableSize)

    // chunk sizes: [chunk][file] = size
    const chunkSizes = new Array<Int32Array>(chunkCount)
    const fileSizes = new Int32Array(fileIds.length)

    for (let chunk = 0; chunk < chunkCount; chunk++) {
      chunkSizes[chunk] = new Int32Array(fileIds.length)
      let accum = 0
      for (let file = 0; file < fileIds.length; file++) {
        accum += buf.readInt()
        chunkSizes[chunk][file] = accum
        fileSizes[file] += accum
      }
    }

    // Allocate file buffers
    const fileBuffers = new Array<Int8Array>(fileIds.length)
    const fileOffsets = new Int32Array(fileIds.length)
    for (let i = 0; i < fileIds.length; i++) {
      fileBuffers[i] = new Int8Array(fileSizes[i])
    }

    // Read interleaved chunk data
    buf.seek(0)
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      for (let file = 0; file < fileIds.length; file++) {
        const size = chunkSizes[chunk][file]
        const dest = fileBuffers[file]
        buf.readBytes(dest, fileOffsets[file], size)
        fileOffsets[file] += size
      }
    }

    // Build file map
    const files = new Map<number, ArchiveFile>()
    for (let i = 0; i < fileIds.length; i++) {
      files.set(fileIds[i], { id: fileIds[i], data: fileBuffers[i] })
    }

    return new Archive(files)
  }

  /**
   * Create a simple single-file archive.
   */
  static single(id: number, data: Int8Array): Archive {
    const files = new Map<number, ArchiveFile>()
    files.set(id, { id, data })
    return new Archive(files)
  }
}
