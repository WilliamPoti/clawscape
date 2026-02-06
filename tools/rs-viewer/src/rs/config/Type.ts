import { ByteBuffer } from '../io/ByteBuffer.ts'

/**
 * Base class for all cache config types (floors, locs, npcs, etc.).
 * Each type has an ID and is decoded from binary data via opcodes.
 */
export abstract class Type {
  readonly id: number

  constructor(id: number) {
    this.id = id
  }

  decode(buf: ByteBuffer): void {
    while (true) {
      const opcode = buf.readUByte()
      if (opcode === 0) break
      this.decodeOpcode(opcode, buf)
    }
    this.postDecode()
  }

  protected abstract decodeOpcode(opcode: number, buf: ByteBuffer): void

  protected postDecode(): void {
    // Override in subclasses
  }
}
