/**
 * Binary buffer reader/writer for parsing RuneScape cache data.
 * Supports all RS-specific integer types (byte, short, medium, int, smart, string).
 */
export class ByteBuffer {
  data: DataView
  bytes: Uint8Array
  pos: number

  constructor(data: ArrayBuffer | Uint8Array | Int8Array) {
    if (data instanceof ArrayBuffer) {
      this.bytes = new Uint8Array(data)
    } else if (data instanceof Int8Array) {
      this.bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    } else {
      this.bytes = data
    }
    this.data = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength)
    this.pos = 0
  }

  get length(): number {
    return this.bytes.length
  }

  get remaining(): number {
    return this.bytes.length - this.pos
  }

  hasRemaining(n = 1): boolean {
    return this.pos + n <= this.bytes.length
  }

  // === Unsigned reads ===

  readUByte(): number {
    if (!this.hasRemaining(1)) {
      throw new RangeError(`Buffer underflow: need 1 byte at pos ${this.pos}, have ${this.remaining}`)
    }
    return this.data.getUint8(this.pos++)
  }

  readUShort(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError(`Buffer underflow: need 2 bytes at pos ${this.pos}, have ${this.remaining}`)
    }
    const v = this.data.getUint16(this.pos)
    this.pos += 2
    return v
  }

  readUMedium(): number {
    if (!this.hasRemaining(3)) {
      throw new RangeError(`Buffer underflow: need 3 bytes at pos ${this.pos}, have ${this.remaining}`)
    }
    const a = this.data.getUint8(this.pos++)
    const b = this.data.getUint8(this.pos++)
    const c = this.data.getUint8(this.pos++)
    return (a << 16) | (b << 8) | c
  }

  readInt(): number {
    if (!this.hasRemaining(4)) {
      throw new RangeError(`Buffer underflow: need 4 bytes at pos ${this.pos}, have ${this.remaining}`)
    }
    const v = this.data.getInt32(this.pos)
    this.pos += 4
    return v
  }

  // === Signed reads ===

  readByte(): number {
    if (!this.hasRemaining(1)) {
      throw new RangeError(`Buffer underflow: need 1 byte at pos ${this.pos}, have ${this.remaining}`)
    }
    return this.data.getInt8(this.pos++)
  }

  readShort(): number {
    if (!this.hasRemaining(2)) {
      throw new RangeError(`Buffer underflow: need 2 bytes at pos ${this.pos}, have ${this.remaining}`)
    }
    const v = this.data.getInt16(this.pos)
    this.pos += 2
    return v
  }

  // === RS-specific types ===

  readUSmart(): number {
    const peek = this.data.getUint8(this.pos)
    if (peek < 128) {
      return this.readUByte()
    } else {
      return this.readUShort() - 0x8000
    }
  }

  readSmart(): number {
    const peek = this.data.getUint8(this.pos)
    if (peek < 128) {
      return this.readUByte() - 64
    } else {
      return this.readUShort() - 0xC000
    }
  }

  /**
   * Read signed smart (new format) - uses different range.
   * Values -64 to 63 = 1 byte, -16384 to 16383 = 2 bytes
   */
  readSmart2(): number {
    // Check if byte is positive (< 128 when unsigned)
    if (this.data.getInt8(this.pos) >= 0) {
      return this.readUByte() - 64
    } else {
      return this.readUShort() - 49152
    }
  }

  /**
   * Read unsigned extended smart (for big model indices).
   */
  readExtendedSmart(): number {
    let total = 0
    let cur = this.readUSmart()
    while (cur === 0x7FFF) {
      total += 0x7FFF
      cur = this.readUSmart()
    }
    return total + cur
  }

  readBigUSmart(): number {
    const peek = this.data.getUint8(this.pos)
    if (peek >= 128) {
      return this.readInt() & 0x7FFFFFFF
    }
    const value = this.readUShort()
    return value === 0x7FFF ? -1 : value
  }

  readUSmartAdd(): number {
    let total = 0
    let cur = this.readUSmart()
    while (cur === 0x7FFF) {
      total += 0x7FFF
      cur = this.readUSmart()
    }
    return total + cur
  }

  readString(): string {
    const start = this.pos
    while (this.bytes[this.pos++] !== 0) { /* skip */ }
    const decoder = new TextDecoder('latin1')
    return decoder.decode(this.bytes.subarray(start, this.pos - 1))
  }

  readVersionedString(): string {
    const version = this.readByte()
    if (version !== 0) {
      throw new Error(`Invalid string version: ${version}`)
    }
    return this.readString()
  }

  // === Bulk reads ===

  readBytes(dest: Uint8Array | Int8Array, offset: number, length: number): void {
    const src = this.bytes.subarray(this.pos, this.pos + length)
    if (dest instanceof Int8Array) {
      new Int8Array(dest.buffer, dest.byteOffset + offset, length).set(new Int8Array(src.buffer, src.byteOffset, src.byteLength))
    } else {
      dest.set(src, offset)
    }
    this.pos += length
  }

  readUByteArray(length: number): Uint8Array {
    const arr = this.bytes.slice(this.pos, this.pos + length)
    this.pos += length
    return arr
  }

  readIntArray(length: number): Int32Array {
    const arr = new Int32Array(length)
    for (let i = 0; i < length; i++) {
      arr[i] = this.readInt()
    }
    return arr
  }

  // === Position control ===

  seek(pos: number): void {
    this.pos = pos
  }

  skip(n: number): void {
    this.pos += n
  }

  // === Write operations ===

  writeByte(v: number): void {
    this.data.setUint8(this.pos++, v)
  }

  writeShort(v: number): void {
    this.data.setUint16(this.pos, v)
    this.pos += 2
  }

  writeMedium(v: number): void {
    this.data.setUint8(this.pos++, (v >> 16) & 0xFF)
    this.data.setUint8(this.pos++, (v >> 8) & 0xFF)
    this.data.setUint8(this.pos++, v & 0xFF)
  }

  writeInt(v: number): void {
    this.data.setInt32(this.pos, v)
    this.pos += 4
  }

  // === Factory ===

  static alloc(size: number): ByteBuffer {
    return new ByteBuffer(new Uint8Array(size))
  }

  static wrap(data: ArrayBuffer | Uint8Array | Int8Array): ByteBuffer {
    return new ByteBuffer(data)
  }

  subBuffer(offset: number, length: number): ByteBuffer {
    return new ByteBuffer(this.bytes.subarray(offset, offset + length))
  }
}
