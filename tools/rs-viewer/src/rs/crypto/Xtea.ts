import { ByteBuffer } from '../io/ByteBuffer.ts'

const GOLDEN_RATIO = 0x9E3779B9
const ROUNDS = 32
const INITIAL_SUM = Math.imul(GOLDEN_RATIO, ROUNDS)

export class Xtea {
  static isValidKey(key: number[] | undefined): key is number[] {
    return (
      key !== undefined &&
      key.length === 4 &&
      (key[0] !== 0 || key[1] !== 0 || key[2] !== 0 || key[3] !== 0)
    )
  }

  static decrypt(buf: ByteBuffer, start: number, end: number, key: number[]): void {
    const blockCount = Math.floor((end - start) / 8)

    for (let i = 0; i < blockCount; i++) {
      const offset = start + i * 8
      let sum = INITIAL_SUM
      let v0 = buf.data.getInt32(offset)
      let v1 = buf.data.getInt32(offset + 4)

      for (let j = 0; j < ROUNDS; j++) {
        v1 -= (((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + key[(sum >>> 11) & 3])
        v1 = v1 | 0 // keep as int32
        sum -= GOLDEN_RATIO
        sum = sum | 0
        v0 -= (((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + key[sum & 3])
        v0 = v0 | 0
      }

      buf.data.setInt32(offset, v0)
      buf.data.setInt32(offset + 4, v1)
    }
  }
}
