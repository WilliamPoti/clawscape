import { ByteBuffer } from '../../io/ByteBuffer.ts'
import { Type } from '../Type.ts'

/**
 * Underlay floor type: the base ground color for tiles.
 * Decoded from the CONFIGS index, UNDERLAY archive.
 */
export class UnderlayFloorType extends Type {
  rgbColor = 0
  textureId = -1
  textureSize = 128
  blockShadow = true

  // Computed in postDecode
  hue = 0
  saturation = 0
  lightness = 0
  hueMultiplier = 0

  protected decodeOpcode(opcode: number, buf: ByteBuffer): void {
    switch (opcode) {
      case 1:
        this.rgbColor = buf.readUMedium()
        break
      case 2:
        this.textureId = buf.readUShort()
        if (this.textureId === 0xFFFF) this.textureId = -1
        break
      case 3:
        this.textureSize = buf.readUShort()
        break
      case 4:
        this.blockShadow = false
        break
      default:
        // Unknown opcode, skip
        break
    }
  }

  protected postDecode(): void {
    // Convert RGB to HSL components
    const r = (this.rgbColor >> 16) & 0xFF
    const g = (this.rgbColor >> 8) & 0xFF
    const b = this.rgbColor & 0xFF

    const rf = r / 256.0
    const gf = g / 256.0
    const bf = b / 256.0

    const min = Math.min(rf, gf, bf)
    const max = Math.max(rf, gf, bf)
    const lightness = (min + max) / 2.0

    let saturation = 0.0
    let hue = 0.0
    if (min !== max) {
      if (lightness < 0.5) {
        saturation = (max - min) / (max + min)
      } else {
        saturation = (max - min) / (2.0 - max - min)
      }

      if (rf === max) {
        hue = (gf - bf) / (max - min)
      } else if (gf === max) {
        hue = 2.0 + (bf - rf) / (max - min)
      } else {
        hue = 4.0 + (rf - gf) / (max - min)
      }
    }

    hue /= 6.0
    this.hue = (hue * 256.0) | 0
    this.saturation = (saturation * 256.0) | 0
    this.lightness = (lightness * 256.0) | 0

    if (this.saturation < 0) this.saturation = 0
    else if (this.saturation > 255) this.saturation = 255

    if (this.lightness < 0) this.lightness = 0
    else if (this.lightness > 255) this.lightness = 255

    if (lightness > 0.5) {
      this.hueMultiplier = ((1.0 - lightness) * saturation * 512.0) | 0
    } else {
      this.hueMultiplier = (lightness * saturation * 512.0) | 0
    }

    if (this.hueMultiplier < 1) this.hueMultiplier = 1
  }
}
