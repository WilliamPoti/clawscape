import { ByteBuffer } from '../io/ByteBuffer.ts'
import { Bzip2 } from '../compression/Bzip2.ts'
import { Gzip } from '../compression/Gzip.ts'
import { Xtea } from '../crypto/Xtea.ts'

export const enum CompressionType {
  NONE = 0,
  BZIP2 = 1,
  GZIP = 2,
}

export interface Container {
  data: Int8Array
  version: number
}

/**
 * Decode a cache container.
 * Containers wrap compressed (and optionally encrypted) data in the cache.
 * Format: [compression:1][compressedSize:4][data...][version:2?]
 */
export function decodeContainer(buf: ByteBuffer, key?: number[]): Container {
  const compression: CompressionType = buf.readUByte()
  const compressedSize = buf.readInt()

  if (compressedSize < 0) {
    throw new Error(`Invalid compressed size: ${compressedSize}`)
  }

  // Decrypt if XTEA key provided
  if (Xtea.isValidKey(key)) {
    Xtea.decrypt(buf, buf.pos, buf.pos + compressedSize + (compression === CompressionType.NONE ? 0 : 4), key)
  }

  let data: Int8Array

  if (compression === CompressionType.NONE) {
    data = new Int8Array(compressedSize)
    buf.readBytes(data, 0, compressedSize)
  } else {
    const uncompressedSize = buf.readInt()
    const compressed = buf.readUByteArray(compressedSize)

    let decompressed: Int8Array
    if (compression === CompressionType.BZIP2) {
      decompressed = Bzip2.decompress(compressed, uncompressedSize)
    } else if (compression === CompressionType.GZIP) {
      decompressed = Gzip.decompress(compressed)
    } else {
      throw new Error(`Unknown compression type: ${compression}`)
    }

    if (decompressed.length !== uncompressedSize) {
      throw new Error(`Size mismatch: expected ${uncompressedSize}, got ${decompressed.length}`)
    }

    data = decompressed
  }

  // Read optional 2-byte version trailer
  let version = -1
  if (buf.remaining >= 2) {
    version = buf.readShort()
  }

  return { data, version }
}
