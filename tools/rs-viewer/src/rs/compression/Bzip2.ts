// @ts-expect-error - no types for bzip2 package
import bzip2Lib from 'bzip2'

// RS stores bzip2 data without the standard "BZh1" header
const BZIP2_HEADER = new Uint8Array([0x42, 0x5A, 0x68, 0x31]) // "BZh1"

export class Bzip2 {
  static decompress(data: Uint8Array, expectedSize: number): Int8Array {
    // Prepend the bzip2 header that RS strips
    const withHeader = new Uint8Array(BZIP2_HEADER.length + data.length)
    withHeader.set(BZIP2_HEADER)
    withHeader.set(data, BZIP2_HEADER.length)

    const bits = bzip2Lib.array(withHeader)
    const result: Uint8Array = bzip2Lib.simple(bits)
    return new Int8Array(result.buffer, result.byteOffset, result.byteLength)
  }
}
