import { ModelData } from './ModelData.ts'
import { packHsl, HSL_RGB_MAP } from '../util/ColorUtil.ts'

// RS lighting direction (fixed)
const LIGHT_X = -50
const LIGHT_Y = -10
const LIGHT_Z = -50
const LIGHT_MAG = Math.sqrt(LIGHT_X * LIGHT_X + LIGHT_Y * LIGHT_Y + LIGHT_Z * LIGHT_Z)
const LIGHT_NX = LIGHT_X / LIGHT_MAG
const LIGHT_NY = LIGHT_Y / LIGHT_MAG
const LIGHT_NZ = LIGHT_Z / LIGHT_MAG

// Default ambient and contrast
const DEFAULT_AMBIENT = 64
const DEFAULT_CONTRAST = 768

/**
 * A lit model with pre-computed vertex colors.
 * Created from ModelData by computing face normals and applying lighting.
 */
export class Model {
  vertexCount: number
  faceCount: number

  // Vertices
  vertexX: Int32Array
  vertexY: Int32Array
  vertexZ: Int32Array

  // Faces
  faceVertexA: Uint16Array
  faceVertexB: Uint16Array
  faceVertexC: Uint16Array

  // Lit colors (per face corner = 3 per face)
  faceColorsA: Int32Array  // RGB for vertex A of each face
  faceColorsB: Int32Array  // RGB for vertex B of each face
  faceColorsC: Int32Array  // RGB for vertex C of each face

  // Face properties
  faceAlphas: Int8Array | null
  faceTextures: Int16Array | null
  facePriorities: Int8Array | null
  priority: number

  constructor(data: ModelData, ambient = DEFAULT_AMBIENT, contrast = DEFAULT_CONTRAST) {
    this.vertexCount = data.vertexCount
    this.faceCount = data.faceCount

    // Copy vertex positions
    this.vertexX = data.vertexX.slice()
    this.vertexY = data.vertexY.slice()
    this.vertexZ = data.vertexZ.slice()

    // Copy face indices
    this.faceVertexA = data.faceVertexA.slice()
    this.faceVertexB = data.faceVertexB.slice()
    this.faceVertexC = data.faceVertexC.slice()

    // Copy other properties
    this.faceAlphas = data.faceAlphas ? data.faceAlphas.slice() : null
    this.faceTextures = data.faceTextures ? data.faceTextures.slice() : null
    this.facePriorities = data.facePriorities ? data.facePriorities.slice() : null
    this.priority = data.priority

    // Allocate lit colors
    this.faceColorsA = new Int32Array(data.faceCount)
    this.faceColorsB = new Int32Array(data.faceCount)
    this.faceColorsC = new Int32Array(data.faceCount)

    // Compute lighting
    this.computeLighting(data, ambient, contrast)
  }

  /**
   * Apply lighting to compute per-vertex colors.
   */
  private computeLighting(data: ModelData, ambient: number, contrast: number): void {
    // Compute vertex normals by accumulating face normals
    const vertexNormalsX = new Float32Array(this.vertexCount)
    const vertexNormalsY = new Float32Array(this.vertexCount)
    const vertexNormalsZ = new Float32Array(this.vertexCount)
    const vertexFaceCount = new Uint16Array(this.vertexCount)

    // First pass: accumulate face normals to vertices
    for (let f = 0; f < this.faceCount; f++) {
      const a = this.faceVertexA[f]
      const b = this.faceVertexB[f]
      const c = this.faceVertexC[f]

      // Get vertex positions
      const ax = this.vertexX[a]
      const ay = this.vertexY[a]
      const az = this.vertexZ[a]
      const bx = this.vertexX[b]
      const by = this.vertexY[b]
      const bz = this.vertexZ[b]
      const cx = this.vertexX[c]
      const cy = this.vertexY[c]
      const cz = this.vertexZ[c]

      // Edge vectors
      const e1x = bx - ax
      const e1y = by - ay
      const e1z = bz - az
      const e2x = cx - ax
      const e2y = cy - ay
      const e2z = cz - az

      // Cross product = face normal (unnormalized)
      let nx = e1y * e2z - e1z * e2y
      let ny = e1z * e2x - e1x * e2z
      let nz = e1x * e2y - e1y * e2x

      // Normalize face normal
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      if (len > 0.0001) {
        nx /= len
        ny /= len
        nz /= len
      }

      // Accumulate to vertices
      vertexNormalsX[a] += nx
      vertexNormalsY[a] += ny
      vertexNormalsZ[a] += nz
      vertexFaceCount[a]++

      vertexNormalsX[b] += nx
      vertexNormalsY[b] += ny
      vertexNormalsZ[b] += nz
      vertexFaceCount[b]++

      vertexNormalsX[c] += nx
      vertexNormalsY[c] += ny
      vertexNormalsZ[c] += nz
      vertexFaceCount[c]++
    }

    // Normalize vertex normals
    for (let v = 0; v < this.vertexCount; v++) {
      const count = vertexFaceCount[v]
      if (count > 0) {
        const nx = vertexNormalsX[v] / count
        const ny = vertexNormalsY[v] / count
        const nz = vertexNormalsZ[v] / count
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        if (len > 0.0001) {
          vertexNormalsX[v] = nx / len
          vertexNormalsY[v] = ny / len
          vertexNormalsZ[v] = nz / len
        }
      }
    }

    // Second pass: compute lit colors per face corner
    for (let f = 0; f < this.faceCount; f++) {
      const hsl = data.faceColors[f]

      // Get base color (unlit)
      if (hsl === -1) {
        // Flat shaded (e.g., textured face without color)
        this.faceColorsA[f] = 0x808080
        this.faceColorsB[f] = 0x808080
        this.faceColorsC[f] = 0x808080
        continue
      }

      if (hsl === -2) {
        // Invisible face
        this.faceColorsA[f] = 0
        this.faceColorsB[f] = 0
        this.faceColorsC[f] = 0
        continue
      }

      // Calculate light intensity per vertex
      const a = this.faceVertexA[f]
      const b = this.faceVertexB[f]
      const c = this.faceVertexC[f]

      const lightA = this.calculateLight(vertexNormalsX[a], vertexNormalsY[a], vertexNormalsZ[a], ambient, contrast)
      const lightB = this.calculateLight(vertexNormalsX[b], vertexNormalsY[b], vertexNormalsZ[b], ambient, contrast)
      const lightC = this.calculateLight(vertexNormalsX[c], vertexNormalsY[c], vertexNormalsZ[c], ambient, contrast)

      // Apply lighting to HSL and convert to RGB
      this.faceColorsA[f] = this.applyLightToHsl(hsl, lightA)
      this.faceColorsB[f] = this.applyLightToHsl(hsl, lightB)
      this.faceColorsC[f] = this.applyLightToHsl(hsl, lightC)
    }
  }

  /**
   * Calculate light intensity at a vertex given its normal.
   */
  private calculateLight(nx: number, ny: number, nz: number, ambient: number, contrast: number): number {
    // Dot product with light direction
    const dot = nx * LIGHT_NX + ny * LIGHT_NY + nz * LIGHT_NZ

    // Convert to light intensity
    const light = ambient + Math.round(contrast * -dot)

    return Math.max(2, Math.min(126, light))
  }

  // Debug counter
  private static debugColorCount = 0

  /**
   * Apply light intensity to packed HSL color and return RGB.
   */
  private applyLightToHsl(packedHsl: number, light: number): number {
    // Unpack HSL
    const hue = (packedHsl >> 10) & 63
    const sat = (packedHsl >> 7) & 7
    const lum = packedHsl & 127

    // Apply lighting to lightness
    let litLum = lum
    if (sat === 0) {
      // Greyscale - just use light directly
      litLum = light
    } else {
      // Apply light as multiplier
      litLum = (lum * light) >> 7
      litLum = Math.max(0, Math.min(127, litLum))
    }

    // Repack and lookup RGB
    const litHsl = (hue << 10) | (sat << 7) | litLum
    const rgb = HSL_RGB_MAP[litHsl & 0xFFFF]
    
    // Debug: log first few color conversions
    if (Model.debugColorCount < 10) {
      Model.debugColorCount++
      console.log(`[Model] HSL conversion: packed=${packedHsl} (h=${hue}, s=${sat}, l=${lum}) + light=${light} -> litHsl=${litHsl} -> RGB=0x${(rgb || 0x808080).toString(16)}`)
    }
    
    return rgb || 0x808080
  }

  /**
   * Create a Model from ModelData with custom lighting.
   */
  static light(data: ModelData, ambient?: number, contrast?: number): Model {
    return new Model(data, ambient, contrast)
  }

  /**
   * Transform this model (rotate, translate, scale).
   */
  transform(rotation: number, scale: number, offsetX: number, offsetY: number, offsetZ: number): void {
    if (rotation !== 0) {
      // RS rotation is in 0-2047 range (1024 = 180°)
      const sin = Math.sin(rotation * Math.PI / 1024)
      const cos = Math.cos(rotation * Math.PI / 1024)

      for (let i = 0; i < this.vertexCount; i++) {
        const x = this.vertexX[i]
        const z = this.vertexZ[i]
        this.vertexX[i] = Math.round(x * cos + z * sin)
        this.vertexZ[i] = Math.round(z * cos - x * sin)
      }
    }

    if (scale !== 128) {
      const scaleFactor = scale / 128
      for (let i = 0; i < this.vertexCount; i++) {
        this.vertexX[i] = Math.round(this.vertexX[i] * scaleFactor)
        this.vertexY[i] = Math.round(this.vertexY[i] * scaleFactor)
        this.vertexZ[i] = Math.round(this.vertexZ[i] * scaleFactor)
      }
    }

    if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
      for (let i = 0; i < this.vertexCount; i++) {
        this.vertexX[i] += offsetX
        this.vertexY[i] += offsetY
        this.vertexZ[i] += offsetZ
      }
    }
  }

  /**
   * Get the bounding box of the model.
   */
  getBounds(): { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number } {
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0

    for (let i = 0; i < this.vertexCount; i++) {
      minX = Math.min(minX, this.vertexX[i])
      maxX = Math.max(maxX, this.vertexX[i])
      minY = Math.min(minY, this.vertexY[i])
      maxY = Math.max(maxY, this.vertexY[i])
      minZ = Math.min(minZ, this.vertexZ[i])
      maxZ = Math.max(maxZ, this.vertexZ[i])
    }

    return { minX, maxX, minY, maxY, minZ, maxZ }
  }
}
