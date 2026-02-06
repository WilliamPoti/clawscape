import { ByteBuffer } from '../../io/ByteBuffer.ts'
import { Type } from '../Type.ts'

/**
 * Overlay floor type: overlaid on top of underlays (paths, water, etc.).
 * Can have textures, secondary colors, and water properties.
 */
export class OverlayFloorType extends Type {
  primaryRgb = 0
  secondaryRgb = -1
  textureId = -1
  secondaryTextureId = -1
  hideUnderlay = true
  textureSize = 128
  blockShadow = true
  textureBrightness = 0
  blendTexture = false

  // Computed
  hue = 0
  saturation = 0
  lightness = 0
  hueMultiplier = 0
  hueBlend = 0
  secondaryHue = 0
  secondarySaturation = 0
  secondaryLightness = 0

  protected decodeOpcode(opcode: number, buf: ByteBuffer): void {
    switch (opcode) {
      case 1:
        this.primaryRgb = buf.readUMedium()
        break
      case 2:
        this.textureId = buf.readUShort()
        if (this.textureId === 0xFFFF) this.textureId = -1
        break
      case 3:
        this.secondaryTextureId = buf.readUShort()
        if (this.secondaryTextureId === 0xFFFF) this.secondaryTextureId = -1
        break
      case 5:
        this.hideUnderlay = false
        break
      case 7:
        this.secondaryRgb = buf.readUMedium()
        break
      case 8:
        // unused
        break
      case 9:
        this.textureSize = buf.readUShort()
        break
      case 10:
        this.blockShadow = false
        break
      case 11:
        this.textureBrightness = buf.readUByte()
        break
      case 12:
        this.blendTexture = true
        break
      case 13:
        // water color
        buf.readUMedium()
        break
      case 14:
        // water opacity
        buf.readUByte()
        break
      default:
        break
    }
  }

  protected postDecode(): void {
    if (this.secondaryRgb !== -1) {
      this.computeHsl(this.secondaryRgb, true)
    }
    this.computeHsl(this.primaryRgb, false)
  }

  private computeHsl(rgb: number, isSecondary: boolean): void {
    const r = ((rgb >> 16) & 0xFF) / 256.0
    const g = ((rgb >> 8) & 0xFF) / 256.0
    const b = (rgb & 0xFF) / 256.0

    const min = Math.min(r, g, b)
    const max = Math.max(r, g, b)
    const lightness = (min + max) / 2.0

    let saturation = 0.0
    let hue = 0.0

    if (min !== max) {
      if (lightness < 0.5) {
        saturation = (max - min) / (max + min)
      } else {
        saturation = (max - min) / (2.0 - max - min)
      }
      if (r === max) hue = (g - b) / (max - min)
      else if (g === max) hue = 2.0 + (b - r) / (max - min)
      else hue = 4.0 + (r - g) / (max - min)
    }
    hue /= 6.0

    const h = (hue * 256.0) | 0
    const s = (saturation * 256.0) | 0
    const l = (lightness * 256.0) | 0

    let hm: number
    if (lightness > 0.5) {
      hm = ((1.0 - lightness) * saturation * 512.0) | 0
    } else {
      hm = (lightness * saturation * 512.0) | 0
    }
    if (hm < 1) hm = 1

    if (isSecondary) {
      this.secondaryHue = h
      this.secondarySaturation = s
      this.secondaryLightness = l
    } else {
      this.hue = h
      this.saturation = s
      this.lightness = l
      this.hueBlend = (hue * hm) | 0
      this.hueMultiplier = hm
    }
  }
}
