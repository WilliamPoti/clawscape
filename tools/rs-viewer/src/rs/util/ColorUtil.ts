/**
 * RS uses packed 16-bit HSL colors: 6 bits hue, 3 bits saturation, 7 bits lightness.
 * This module provides the HSL→RGB palette and color manipulation functions.
 */

/**
 * Build the 65536-entry HSL→RGB lookup table.
 * Each entry is a packed 0xRRGGBB integer.
 */
function buildPalette(): Int32Array {
  const palette = new Int32Array(65536)
  const brightness = 0.8

  let index = 0
  for (let i = 0; i < 512; i++) {
    const h = (i >> 3) / 64.0 + 0.0078125       // hue from i/8 (6 bits)
    const s = (i & 7) / 8.0 + 0.0625             // saturation from i%8 (3 bits)
    for (let j = 0; j < 128; j++) {
      const l = j / 128.0 + 0.00390625           // lightness from full inner loop (7 bits)

      // HSL to RGB conversion
      let q: number
      if (l <= 0.5) {
        q = l * (1.0 + s)
      } else {
        q = l + s - l * s
      }
      const p = 2.0 * l - q

      let r = hueToRgb(p, q, h + 1.0 / 3.0)
      let g = hueToRgb(p, q, h)
      let b = hueToRgb(p, q, h - 1.0 / 3.0)

      // Apply brightness/gamma correction
      r = Math.pow(r, brightness)
      g = Math.pow(g, brightness)
      b = Math.pow(b, brightness)

      const ri = Math.min(255, (r * 256.0) | 0)
      const gi = Math.min(255, (g * 256.0) | 0)
      const bi = Math.min(255, (b * 256.0) | 0)

      palette[index++] = (ri << 16) | (gi << 8) | bi
    }
  }

  return palette
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1.0
  if (t > 1) t -= 1.0
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t
  if (t < 0.5) return q
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0
  return p
}

/** Pre-computed HSL→RGB palette (65536 entries) */
export const HSL_RGB_MAP = buildPalette()

/**
 * Pack HSL components into a 16-bit value.
 * hue: 0-63, saturation: 0-7, lightness: 0-127
 */
export function packHsl(hue: number, saturation: number, lightness: number): number {
  if (lightness > 179) saturation = (saturation / 2) | 0
  if (lightness > 192) saturation = (saturation / 2) | 0
  if (lightness > 217) saturation = (saturation / 2) | 0
  if (lightness > 243) saturation = (saturation / 2) | 0
  return ((hue / 4) << 10) + ((saturation / 32) << 7) + ((lightness / 2) | 0)
}

/**
 * Adjust an underlay HSL color's lightness by a factor.
 * Returns -1 if input is -1 (transparent).
 */
export function adjustUnderlayLight(hsl: number, light: number): number {
  if (hsl === -1) return 0xBCBE // default gray
  light = ((hsl & 0x7F) * light / 128) | 0
  if (light < 2) light = 2
  else if (light > 126) light = 126
  return (hsl & 0xFF80) + light
}

/**
 * Adjust an overlay HSL color's lightness by a factor.
 * Returns -2 for no overlay, -1 for transparent.
 */
export function adjustOverlayLight(hsl: number, light: number): number {
  if (hsl === -2) return 0xBCBE
  if (hsl === -1) return 0xBCBE
  light = ((hsl & 0x7F) * light / 128) | 0
  if (light < 2) light = 2
  else if (light > 126) light = 126
  return (hsl & 0xFF80) + light
}

/**
 * Blend a lightness factor with an HSL color.
 */
export function blendLight(hsl: number, light: number): number {
  light = ((hsl & 0x7F) * light / 128) | 0
  if (light < 2) light = 2
  else if (light > 126) light = 126
  return (hsl & 0xFF80) + light
}

/**
 * Convert a packed HSL value to 0xRRGGBB.
 */
export function hslToRgb(hsl: number): number {
  return HSL_RGB_MAP[hsl & 0xFFFF]
}
