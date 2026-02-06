import type { SceneTileModel } from './SceneTileModel.ts'

/**
 * Data for a single tile in the scene.
 */
export interface SceneTile {
  level: number
  x: number
  y: number
  tileModel: SceneTileModel | null
  // Will add wall, loc, floorDecoration, etc. in Phase 6
}
