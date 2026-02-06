import { TILE_SIZE } from '../MathConstants.ts'
import { adjustOverlayLight, adjustUnderlayLight } from '../util/ColorUtil.ts'

const HALF_TILE = TILE_SIZE / 2
const QUARTER_TILE = TILE_SIZE / 4
const THREE_QTR_TILE = (TILE_SIZE * 3) / 4

/**
 * Vertex IDs used by each tile shape.
 * Index into the 16-vertex system (1-based vertex IDs).
 */
const SHAPE_VERTICES: number[][] = [
  [1, 3, 5, 7],          // 0: full square
  [1, 3, 5, 7],          // 1
  [1, 3, 5, 7],          // 2
  [1, 3, 5, 7, 6],       // 3
  [1, 3, 5, 7, 6],       // 4
  [1, 3, 5, 7, 6],       // 5
  [1, 3, 5, 7, 6],       // 6
  [1, 3, 5, 7, 2, 6],    // 7
  [1, 3, 5, 7, 2, 8],    // 8
  [1, 3, 5, 7, 2, 8],    // 9
  [1, 3, 5, 7, 11, 12],  // 10
  [1, 3, 5, 7, 11, 12],  // 11
  [1, 3, 5, 7, 13, 14],  // 12
]

/**
 * Face definitions for each shape: flat array of [isOverlay, a, b, c] groups.
 * a, b, c are indices into the shape's vertex array (0-based).
 */
const SHAPE_FACES: number[][] = [
  // 0: 2 faces
  [0, 1, 2, 3, 0, 0, 1, 3],
  // 1: 2 faces (overlay)
  [1, 1, 2, 3, 1, 0, 1, 3],
  // 2: 2 faces (mixed)
  [0, 1, 2, 3, 1, 0, 1, 3],
  // 3: 3 faces
  [0, 0, 1, 2, 0, 0, 2, 4, 1, 0, 4, 3],
  // 4: 3 faces
  [0, 0, 1, 4, 0, 0, 4, 3, 1, 1, 2, 4],
  // 5: 3 faces
  [0, 0, 4, 3, 1, 0, 1, 2, 1, 0, 2, 4],
  // 6: 3 faces
  [0, 1, 2, 4, 1, 0, 1, 4, 1, 0, 4, 3],
  // 7: 4 faces
  [0, 4, 1, 2, 0, 4, 2, 5, 1, 0, 4, 5, 1, 0, 5, 3],
  // 8: 4 faces
  [0, 4, 1, 2, 0, 4, 2, 3, 0, 4, 3, 5, 1, 0, 4, 5],
  // 9: 4 faces
  [0, 0, 4, 5, 1, 4, 1, 2, 1, 4, 2, 3, 1, 4, 3, 5],
  // 10: 6 faces
  [0, 0, 1, 5, 0, 1, 4, 5, 0, 1, 2, 4, 1, 0, 5, 3, 1, 5, 4, 3, 1, 4, 2, 3],
  // 11: 6 faces
  [1, 0, 1, 5, 1, 1, 4, 5, 1, 1, 2, 4, 0, 0, 5, 3, 0, 5, 4, 3, 0, 4, 2, 3],
  // 12: 6 faces
  [1, 0, 5, 4, 1, 0, 1, 5, 0, 0, 4, 3, 0, 4, 5, 3, 0, 5, 2, 3, 0, 1, 2, 5],
]

export interface TileFace {
  a: number // vertex index A
  b: number // vertex index B
  c: number // vertex index C
  hslA: number
  hslB: number
  hslC: number
  textureId: number
  isFlat: boolean
}

/**
 * Triangulated tile geometry with per-vertex HSL colors.
 * Supports 13 tile shapes with rotation.
 */
export class SceneTileModel {
  vertexX: Int32Array
  vertexY: Int32Array // height (negative = higher)
  vertexZ: Int32Array
  vertexCount: number

  faces: TileFace[]
  faceCount: number

  // For minimap
  underlayRgb: number
  overlayRgb: number
  isFlat: boolean

  constructor(
    shape: number,
    rotation: number,
    textureId: number,
    tileX: number,
    tileZ: number,
    heightSw: number,
    heightSe: number,
    heightNe: number,
    heightNw: number,
    lightSw: number,
    lightSe: number,
    lightNe: number,
    lightNw: number,
    blendUnderlayHslSw: number,
    blendUnderlayHslSe: number,
    blendUnderlayHslNe: number,
    blendUnderlayHslNw: number,
    overlayHsl: number,
    underlayRgb: number,
    overlayRgb: number,
  ) {
    this.underlayRgb = underlayRgb
    this.overlayRgb = overlayRgb
    this.isFlat = heightSw === heightSe && heightSw === heightNe && heightSw === heightNw

    // Compute lit underlay colors per corner
    const ulSw = adjustUnderlayLight(blendUnderlayHslSw, lightSw)
    const ulSe = adjustUnderlayLight(blendUnderlayHslSe, lightSe)
    const ulNe = adjustUnderlayLight(blendUnderlayHslNe, lightNe)
    const ulNw = adjustUnderlayLight(blendUnderlayHslNw, lightNw)

    // Compute lit overlay colors per corner
    const olSw = adjustOverlayLight(overlayHsl, lightSw)
    const olSe = adjustOverlayLight(overlayHsl, lightSe)
    const olNe = adjustOverlayLight(overlayHsl, lightNe)
    const olNw = adjustOverlayLight(overlayHsl, lightNw)

    // All 16 possible vertex positions and their colors
    // Heights at corners: SW=0, SE=1, NE=2, NW=3
    const px = tileX * TILE_SIZE
    const pz = tileZ * TILE_SIZE

    // Vertex positions [id-1] -> {x, y, z}
    // ID 1-8: corners and edge midpoints, ID 9-16: inner points
    const allX = [
      px, px + HALF_TILE, px + TILE_SIZE, px + TILE_SIZE,
      px + TILE_SIZE, px + HALF_TILE, px, px,
      px + HALF_TILE, px + THREE_QTR_TILE, px + HALF_TILE, px + QUARTER_TILE,
      px + QUARTER_TILE, px + THREE_QTR_TILE, px + THREE_QTR_TILE, px + QUARTER_TILE,
    ]
    const allZ = [
      pz, pz, pz, pz + HALF_TILE,
      pz + TILE_SIZE, pz + TILE_SIZE, pz + TILE_SIZE, pz + HALF_TILE,
      pz + QUARTER_TILE, pz + HALF_TILE, pz + THREE_QTR_TILE, pz + HALF_TILE,
      pz + QUARTER_TILE, pz + QUARTER_TILE, pz + THREE_QTR_TILE, pz + THREE_QTR_TILE,
    ]
    const allY = [
      heightSw,
      (heightSw + heightSe) >> 1,
      heightSe,
      (heightSe + heightNe) >> 1,
      heightNe,
      (heightNe + heightNw) >> 1,
      heightNw,
      (heightNw + heightSw) >> 1,
      (heightSw + heightSe) >> 1,
      (heightSe + heightNe) >> 1,
      (heightNe + heightNw) >> 1,
      (heightNw + heightSw) >> 1,
      heightSw,
      heightSe,
      heightNe,
      heightNw,
    ]

    // Underlay colors per vertex (0-based index into allX/allY/allZ)
    const ulColors = [
      ulSw,
      (ulSw + ulSe) >>> 1, // average but keep careful with HSL packing
      ulSe,
      (ulSe + ulNe) >>> 1,
      ulNe,
      (ulNe + ulNw) >>> 1,
      ulNw,
      (ulNw + ulSw) >>> 1,
      (ulSw + ulSe) >>> 1,
      (ulSe + ulNe) >>> 1,
      (ulNe + ulNw) >>> 1,
      (ulNw + ulSw) >>> 1,
      ulSw, ulSe, ulNe, ulNw,
    ]

    // Overlay colors (same for all corners before mixing with light)
    const olColors = [
      olSw,
      (olSw + olSe) >>> 1,
      olSe,
      (olSe + olNe) >>> 1,
      olNe,
      (olNe + olNw) >>> 1,
      olNw,
      (olNw + olSw) >>> 1,
      (olSw + olSe) >>> 1,
      (olSe + olNe) >>> 1,
      (olNe + olNw) >>> 1,
      (olNw + olSw) >>> 1,
      olSw, olSe, olNe, olNw,
    ]

    // Get vertex list for this shape
    const shapeVerts = SHAPE_VERTICES[shape] ?? SHAPE_VERTICES[0]
    this.vertexCount = shapeVerts.length

    this.vertexX = new Int32Array(this.vertexCount)
    this.vertexY = new Int32Array(this.vertexCount)
    this.vertexZ = new Int32Array(this.vertexCount)

    for (let i = 0; i < shapeVerts.length; i++) {
      let vid = shapeVerts[i]

      // Apply rotation to vertex IDs
      if ((vid & 1) === 0 && vid <= 8) {
        vid = ((vid - rotation * 2 - 1) & 7) + 1
      } else if (vid > 8 && vid <= 12) {
        vid = ((vid - 9 - rotation) & 3) + 9
      } else if (vid > 12 && vid <= 16) {
        vid = ((vid - 13 - rotation) & 3) + 13
      }

      const idx = vid - 1 // 0-based
      this.vertexX[i] = allX[idx]
      this.vertexY[i] = allY[idx]
      this.vertexZ[i] = allZ[idx]
    }

    // Build faces
    const shapeFaces = SHAPE_FACES[shape] ?? SHAPE_FACES[0]
    this.faceCount = shapeFaces.length / 4
    this.faces = []

    for (let f = 0; f < shapeFaces.length; f += 4) {
      const isOverlay = shapeFaces[f]
      let a = shapeFaces[f + 1]
      let b = shapeFaces[f + 2]
      let c = shapeFaces[f + 3]

      // Rotate face vertex indices (corner indices 0-3 only)
      if (a < 4) a = (a - rotation) & 3
      if (b < 4) b = (b - rotation) & 3
      if (c < 4) c = (c - rotation) & 3

      // Map face vertex index -> actual vertex ID -> color
      const vidA = shapeVerts[a]
      const vidB = shapeVerts[b]
      const vidC = shapeVerts[c]

      // Apply same rotation to get color index
      let cidA = vidA, cidB = vidB, cidC = vidC
      // Rotate for color lookup
      if ((cidA & 1) === 0 && cidA <= 8) cidA = ((cidA - rotation * 2 - 1) & 7) + 1
      else if (cidA > 8 && cidA <= 12) cidA = ((cidA - 9 - rotation) & 3) + 9
      else if (cidA > 12 && cidA <= 16) cidA = ((cidA - 13 - rotation) & 3) + 13

      if ((cidB & 1) === 0 && cidB <= 8) cidB = ((cidB - rotation * 2 - 1) & 7) + 1
      else if (cidB > 8 && cidB <= 12) cidB = ((cidB - 9 - rotation) & 3) + 9
      else if (cidB > 12 && cidB <= 16) cidB = ((cidB - 13 - rotation) & 3) + 13

      if ((cidC & 1) === 0 && cidC <= 8) cidC = ((cidC - rotation * 2 - 1) & 7) + 1
      else if (cidC > 8 && cidC <= 12) cidC = ((cidC - 9 - rotation) & 3) + 9
      else if (cidC > 12 && cidC <= 16) cidC = ((cidC - 13 - rotation) & 3) + 13

      const colors = isOverlay ? olColors : ulColors
      this.faces.push({
        a,
        b,
        c,
        hslA: colors[cidA - 1],
        hslB: colors[cidB - 1],
        hslC: colors[cidC - 1],
        textureId: isOverlay ? textureId : -1,
        isFlat: this.isFlat,
      })
    }
  }
}
