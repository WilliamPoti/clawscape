import type { SceneTile } from './SceneTile.ts'

export const LEVELS = 4
export const MAP_SIZE = 64

/**
 * Scene data structure: holds tiles, heights, and overlays for a map square region.
 * Coordinates: tiles[level][x][y], tileHeights[level][x][y]
 */
export class Scene {
  readonly sizeX: number
  readonly sizeY: number

  tiles: (SceneTile | null)[][][]
  tileHeights: Int32Array[][]
  tileUnderlays: Int16Array[][]
  tileOverlays: Int16Array[][]
  tileShapes: Uint8Array[][]
  tileRotations: Uint8Array[][]
  tileRenderFlags: Uint8Array[][]

  constructor(sizeX: number = MAP_SIZE, sizeY: number = MAP_SIZE) {
    this.sizeX = sizeX
    this.sizeY = sizeY

    // Initialize arrays: [level][x][y]
    this.tiles = new Array(LEVELS)
    this.tileHeights = new Array(LEVELS + 1)
    this.tileUnderlays = new Array(LEVELS)
    this.tileOverlays = new Array(LEVELS)
    this.tileShapes = new Array(LEVELS)
    this.tileRotations = new Array(LEVELS)
    this.tileRenderFlags = new Array(LEVELS)

    for (let level = 0; level < LEVELS; level++) {
      this.tiles[level] = new Array(sizeX + 1)
      this.tileUnderlays[level] = new Array(sizeX + 1)
      this.tileOverlays[level] = new Array(sizeX + 1)
      this.tileShapes[level] = new Array(sizeX + 1)
      this.tileRotations[level] = new Array(sizeX + 1)
      this.tileRenderFlags[level] = new Array(sizeX + 1)

      for (let x = 0; x <= sizeX; x++) {
        this.tiles[level][x] = new Array(sizeY + 1).fill(null)
        this.tileUnderlays[level][x] = new Int16Array(sizeY + 1)
        this.tileOverlays[level][x] = new Int16Array(sizeY + 1)
        this.tileShapes[level][x] = new Uint8Array(sizeY + 1)
        this.tileRotations[level][x] = new Uint8Array(sizeY + 1)
        this.tileRenderFlags[level][x] = new Uint8Array(sizeY + 1)
      }
    }

    // Heights have an extra level (for roof/level 4 reference)
    for (let level = 0; level <= LEVELS; level++) {
      this.tileHeights[level] = new Array(sizeX + 1)
      for (let x = 0; x <= sizeX; x++) {
        this.tileHeights[level][x] = new Int32Array(sizeY + 1)
      }
    }
  }
}
