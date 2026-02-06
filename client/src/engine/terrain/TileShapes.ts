// ClawScape Tile Shape System
// 13 shapes (0-12) with 16 vertex positions per tile.
// Ported from RS tile model system for RLHD-quality terrain.

/**
 * 16 vertex positions per tile:
 * IDs 1-8: Corners and edge midpoints (clockwise from SW)
 *   1=SW corner, 2=S edge mid, 3=SE corner, 4=E edge mid,
 *   5=NE corner, 6=N edge mid, 7=NW corner, 8=W edge mid
 * IDs 9-12: Inner crosshatch points
 * IDs 13-16: Inner corner points
 *
 * Even IDs (2,4,6,8) rotate with the tile; odd (1,3,5,7) are fixed corners.
 */

/** Which vertex IDs are used by each shape (1-based). */
export const SHAPE_VERTICES: number[][] = [
  [1, 3, 5, 7],          // 0: full square
  [1, 3, 5, 7],          // 1: full square (overlay)
  [1, 3, 5, 7],          // 2: full square (mixed)
  [1, 3, 5, 7, 6],       // 3: diagonal with edge mid
  [1, 3, 5, 7, 6],       // 4
  [1, 3, 5, 7, 6],       // 5
  [1, 3, 5, 7, 6],       // 6
  [1, 3, 5, 7, 2, 6],    // 7: two edge mids
  [1, 3, 5, 7, 2, 8],    // 8
  [1, 3, 5, 7, 2, 8],    // 9
  [1, 3, 5, 7, 11, 12],  // 10: inner crosshatch
  [1, 3, 5, 7, 11, 12],  // 11
  [1, 3, 5, 7, 13, 14],  // 12: inner corner
];

/**
 * Face definitions per shape: flat array of [isOverlay, a, b, c] groups.
 * a, b, c are indices into the shape's vertex array (0-based).
 * isOverlay: 0 = underlay face, 1 = overlay face.
 */
export const SHAPE_FACES: number[][] = [
  // 0: 2 underlay faces
  [0, 1, 2, 3, 0, 0, 1, 3],
  // 1: 2 overlay faces
  [1, 1, 2, 3, 1, 0, 1, 3],
  // 2: 2 mixed faces (underlay + overlay)
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
];

const TILE_SIZE = 128;
const HALF = TILE_SIZE / 2;
const QUARTER = TILE_SIZE / 4;
const THREE_QTR = (TILE_SIZE * 3) / 4;

export interface TileVertex {
  x: number;
  y: number; // height
  z: number;
}

/**
 * Compute all 16 vertex positions for a tile.
 * tileX, tileZ: world tile coordinates.
 * heights: corner heights (SW, SE, NE, NW) in world units.
 */
export function computeTileVertices(
  tileX: number,
  tileZ: number,
  hSw: number,
  hSe: number,
  hNe: number,
  hNw: number
): TileVertex[] {
  const px = tileX * TILE_SIZE;
  const pz = tileZ * TILE_SIZE;

  return [
    // 1: SW corner
    { x: px, y: hSw, z: pz },
    // 2: S edge mid
    { x: px + HALF, y: (hSw + hSe) / 2, z: pz },
    // 3: SE corner
    { x: px + TILE_SIZE, y: hSe, z: pz },
    // 4: E edge mid
    { x: px + TILE_SIZE, y: (hSe + hNe) / 2, z: pz + HALF },
    // 5: NE corner
    { x: px + TILE_SIZE, y: hNe, z: pz + TILE_SIZE },
    // 6: N edge mid
    { x: px + HALF, y: (hNe + hNw) / 2, z: pz + TILE_SIZE },
    // 7: NW corner
    { x: px, y: hNw, z: pz + TILE_SIZE },
    // 8: W edge mid
    { x: px, y: (hNw + hSw) / 2, z: pz + HALF },
    // 9-12: inner crosshatch
    { x: px + HALF, y: (hSw + hSe) / 2, z: pz + QUARTER },
    { x: px + THREE_QTR, y: (hSe + hNe) / 2, z: pz + HALF },
    { x: px + HALF, y: (hNe + hNw) / 2, z: pz + THREE_QTR },
    { x: px + QUARTER, y: (hNw + hSw) / 2, z: pz + HALF },
    // 13-16: inner corners
    { x: px + QUARTER, y: hSw, z: pz + QUARTER },
    { x: px + THREE_QTR, y: hSe, z: pz + QUARTER },
    { x: px + THREE_QTR, y: hNe, z: pz + THREE_QTR },
    { x: px + QUARTER, y: hNw, z: pz + THREE_QTR },
  ];
}

/**
 * Apply rotation to a vertex ID.
 * Even IDs (2,4,6,8) rotate; odd (1,3,5,7) are fixed corners.
 * IDs 9-12 and 13-16 rotate independently.
 */
export function rotateVertexId(vid: number, rotation: number): number {
  if ((vid & 1) === 0 && vid <= 8) {
    return ((vid - rotation * 2 - 1) & 7) + 1;
  } else if (vid > 8 && vid <= 12) {
    return ((vid - 9 - rotation) & 3) + 9;
  } else if (vid > 12 && vid <= 16) {
    return ((vid - 13 - rotation) & 3) + 13;
  }
  return vid;
}
