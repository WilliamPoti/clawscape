import pako from 'pako'

export class Gzip {
  static decompress(data: Uint8Array): Int8Array {
    const result = pako.ungzip(data)
    return new Int8Array(result.buffer, result.byteOffset, result.byteLength)
  }
}
