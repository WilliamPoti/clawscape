// ClawScape Terrain Geometry Builder
// Builds Three.js BufferGeometry from a MapSquare using the tile shape system.
// Produces per-vertex colors with lighting and optional texture coordinates.

import * as THREE from 'three';
import {
  MapSquare,
  MapTile,
  UnderlayConfig,
  OverlayConfig,
} from '@clawscape/shared';
import {
  SHAPE_VERTICES,
  SHAPE_FACES,
  computeTileVertices,
  rotateVertexId,
} from './TileShapes.js';

const TILE_SIZE = 128;
const MAP_SIZE = 64;
const BLEND_RADIUS = 3; // Radius for underlay color blending

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RgbColor {
  const n = parseInt(hex.replace('#', ''), 16);
  return {
    r: ((n >> 16) & 0xFF) / 255,
    g: ((n >> 8) & 0xFF) / 255,
    b: (n & 0xFF) / 255,
  };
}

function lerpColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Compute per-tile lighting from height gradients.
 * Returns a light value per corner [SW, SE, NE, NW] in range [0, 1].
 */
function computeTileLighting(
  tiles: MapTile[][],
  x: number,
  y: number,
  sunDir: THREE.Vector3
): [number, number, number, number] {
  // Compute height gradient at each corner using surrounding tiles
  const getH = (tx: number, ty: number): number => {
    if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) return 0;
    const t = tiles[ty][tx];
    return (t.heights.sw + t.heights.se + t.heights.ne + t.heights.nw) / 4;
  };

  const centerH = getH(x, y);
  const gradX = getH(x - 1, y) - getH(x + 1, y);
  const gradY = getH(x, y - 1) - getH(x, y + 1);

  // Build normal from gradients
  const nx = gradX;
  const ny = 256; // strong upward component
  const nz = gradY;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

  // Dot product with sun direction
  const dot = (nx / len) * sunDir.x + (ny / len) * sunDir.y + (nz / len) * sunDir.z;

  // Convert to light value: ambient + directional
  const ambient = 0.35;
  const directional = Math.max(0, dot) * 0.65;
  const light = Math.min(1, ambient + directional);

  // Same light for all corners (can be refined per-corner later)
  return [light, light, light, light];
}

/**
 * Compute blended underlay colors by averaging over a radius.
 * Prevents harsh color transitions between different ground types.
 */
function computeBlendedColors(
  tiles: MapTile[][],
  underlayMap: Map<number, RgbColor>
): RgbColor[][] {
  const blended: RgbColor[][] = [];
  const defaultColor: RgbColor = { r: 0.3, g: 0.5, b: 0.2 }; // fallback green

  for (let y = 0; y < MAP_SIZE; y++) {
    blended[y] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      let rSum = 0, gSum = 0, bSum = 0;
      let count = 0;

      for (let dy = -BLEND_RADIUS; dy <= BLEND_RADIUS; dy++) {
        for (let dx = -BLEND_RADIUS; dx <= BLEND_RADIUS; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
            const tile = tiles[ny][nx];
            const color = underlayMap.get(tile.underlayId) ?? defaultColor;
            rSum += color.r;
            gSum += color.g;
            bSum += color.b;
            count++;
          }
        }
      }

      blended[y][x] = {
        r: rSum / count,
        g: gSum / count,
        b: bSum / count,
      };
    }
  }

  return blended;
}

export interface TerrainBuildResult {
  geometry: THREE.BufferGeometry;
  /** Bounding box in world coordinates */
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
}

/**
 * Build terrain geometry for a map square on a given level.
 */
export function buildTerrainGeometry(
  mapSquare: MapSquare,
  level: number,
  underlays: UnderlayConfig[],
  overlays: OverlayConfig[],
  sunDirection?: THREE.Vector3
): TerrainBuildResult {
  const tiles = mapSquare.tiles[level];
  if (!tiles) {
    return {
      geometry: new THREE.BufferGeometry(),
      bounds: { minX: 0, minZ: 0, maxX: 0, maxZ: 0 },
    };
  }

  const sun = sunDirection ?? new THREE.Vector3(-0.5, 0.8, -0.3).normalize();

  // Build lookup maps
  const underlayMap = new Map<number, RgbColor>();
  for (const u of underlays) {
    underlayMap.set(u.id, hexToRgb(u.color));
  }
  const overlayMap = new Map<number, { color: RgbColor; hideUnderlay: boolean }>();
  for (const o of overlays) {
    overlayMap.set(o.id, { color: hexToRgb(o.color), hideUnderlay: o.hideUnderlay ?? false });
  }

  // Compute blended underlay colors
  const blendedColors = computeBlendedColors(tiles, underlayMap);

  // Count total faces for pre-allocation
  let totalFaces = 0;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = tiles[y][x];
      if (tile.underlayId === 0 && tile.overlayId === 0) continue;
      const shape = tile.overlayId > 0 ? tile.overlayShape : 0;
      const shapeFaces = SHAPE_FACES[shape] ?? SHAPE_FACES[0];
      totalFaces += shapeFaces.length / 4;
    }
  }

  // Pre-allocate arrays (3 vertices per face, 3 components per vertex)
  const positions = new Float32Array(totalFaces * 9);
  const colors = new Float32Array(totalFaces * 9);
  const normals = new Float32Array(totalFaces * 9);
  let vertIdx = 0;

  const defaultColor: RgbColor = { r: 0.3, g: 0.5, b: 0.2 };

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = tiles[y][x];
      if (tile.underlayId === 0 && tile.overlayId === 0) continue;

      const { heights } = tile;
      const shape = tile.overlayId > 0 ? tile.overlayShape : 0;
      const rotation = tile.overlayId > 0 ? tile.overlayRotation : 0;

      // Compute vertex positions
      const allVerts = computeTileVertices(x, y, heights.sw, heights.se, heights.ne, heights.nw);

      // Per-corner underlay colors (blended)
      const ulSw = blendedColors[y][x];
      const ulSe = x + 1 < MAP_SIZE ? blendedColors[y][x + 1] : ulSw;
      const ulNe = (x + 1 < MAP_SIZE && y + 1 < MAP_SIZE) ? blendedColors[y + 1][x + 1] : ulSw;
      const ulNw = y + 1 < MAP_SIZE ? blendedColors[y + 1][x] : ulSw;

      // Overlay color
      const overlayInfo = overlayMap.get(tile.overlayId);
      const olColor = overlayInfo?.color ?? defaultColor;

      // Lighting
      const [lSw, lSe, lNe, lNw] = computeTileLighting(tiles, x, y, sun);

      // Lit underlay corner colors
      const ulLitSw: RgbColor = { r: ulSw.r * lSw, g: ulSw.g * lSw, b: ulSw.b * lSw };
      const ulLitSe: RgbColor = { r: ulSe.r * lSe, g: ulSe.g * lSe, b: ulSe.b * lSe };
      const ulLitNe: RgbColor = { r: ulNe.r * lNe, g: ulNe.g * lNe, b: ulNe.b * lNe };
      const ulLitNw: RgbColor = { r: ulNw.r * lNw, g: ulNw.g * lNw, b: ulNw.b * lNw };

      // Lit overlay corner colors
      const olLitSw: RgbColor = { r: olColor.r * lSw, g: olColor.g * lSw, b: olColor.b * lSw };
      const olLitSe: RgbColor = { r: olColor.r * lSe, g: olColor.g * lSe, b: olColor.b * lSe };
      const olLitNe: RgbColor = { r: olColor.r * lNe, g: olColor.g * lNe, b: olColor.b * lNe };
      const olLitNw: RgbColor = { r: olColor.r * lNw, g: olColor.g * lNw, b: olColor.b * lNw };

      // Build per-vertex color arrays (16 entries each, for underlay and overlay)
      const ulVertColors = buildVertexColors(ulLitSw, ulLitSe, ulLitNe, ulLitNw);
      const olVertColors = buildVertexColors(olLitSw, olLitSe, olLitNe, olLitNw);

      // Get shape vertex IDs
      const shapeVerts = SHAPE_VERTICES[shape] ?? SHAPE_VERTICES[0];
      const shapeFaces = SHAPE_FACES[shape] ?? SHAPE_FACES[0];

      // Build vertex index mapping (shape vertex index -> rotated vertex position)
      const vertexPositions: { x: number; y: number; z: number }[] = [];
      for (let i = 0; i < shapeVerts.length; i++) {
        const vid = rotateVertexId(shapeVerts[i], rotation);
        vertexPositions.push(allVerts[vid - 1]);
      }

      // Build faces
      for (let f = 0; f < shapeFaces.length; f += 4) {
        const isOverlay = shapeFaces[f];
        let a = shapeFaces[f + 1];
        let b = shapeFaces[f + 2];
        let c = shapeFaces[f + 3];

        // Rotate face corner indices (0-3 only)
        if (a < 4) a = (a - rotation + 4) & 3;
        if (b < 4) b = (b - rotation + 4) & 3;
        if (c < 4) c = (c - rotation + 4) & 3;

        const pa = vertexPositions[a];
        const pb = vertexPositions[b];
        const pc = vertexPositions[c];

        if (!pa || !pb || !pc) continue;

        // Get colors (use rotated vertex ID for color lookup)
        const vidA = rotateVertexId(shapeVerts[a], rotation);
        const vidB = rotateVertexId(shapeVerts[b], rotation);
        const vidC = rotateVertexId(shapeVerts[c], rotation);
        const colorArr = isOverlay ? olVertColors : ulVertColors;
        const ca = colorArr[vidA - 1];
        const cb = colorArr[vidB - 1];
        const cc = colorArr[vidC - 1];

        // Compute face normal
        const e1x = pb.x - pa.x, e1y = pb.y - pa.y, e1z = pb.z - pa.z;
        const e2x = pc.x - pa.x, e2y = pc.y - pa.y, e2z = pc.z - pa.z;
        let fnx = e1y * e2z - e1z * e2y;
        let fny = e1z * e2x - e1x * e2z;
        let fnz = e1x * e2y - e1y * e2x;
        const fnLen = Math.sqrt(fnx * fnx + fny * fny + fnz * fnz) || 1;
        fnx /= fnLen;
        fny /= fnLen;
        fnz /= fnLen;

        // Write vertices
        const base = vertIdx * 3;
        // Vertex A
        positions[base] = pa.x;
        positions[base + 1] = pa.y;
        positions[base + 2] = pa.z;
        colors[base] = ca.r;
        colors[base + 1] = ca.g;
        colors[base + 2] = ca.b;
        normals[base] = fnx;
        normals[base + 1] = fny;
        normals[base + 2] = fnz;
        // Vertex B
        positions[base + 3] = pb.x;
        positions[base + 4] = pb.y;
        positions[base + 5] = pb.z;
        colors[base + 3] = cb.r;
        colors[base + 4] = cb.g;
        colors[base + 5] = cb.b;
        normals[base + 3] = fnx;
        normals[base + 4] = fny;
        normals[base + 5] = fnz;
        // Vertex C
        positions[base + 6] = pc.x;
        positions[base + 7] = pc.y;
        positions[base + 8] = pc.z;
        colors[base + 6] = cc.r;
        colors[base + 7] = cc.g;
        colors[base + 8] = cc.b;
        normals[base + 6] = fnx;
        normals[base + 7] = fny;
        normals[base + 8] = fnz;

        vertIdx += 3;
      }
    }
  }

  // Trim arrays to actual size (some tiles may have been skipped)
  const actualSize = vertIdx * 3;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, actualSize), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, actualSize), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals.slice(0, actualSize), 3));

  return {
    geometry,
    bounds: {
      minX: 0,
      minZ: 0,
      maxX: MAP_SIZE * TILE_SIZE,
      maxZ: MAP_SIZE * TILE_SIZE,
    },
  };
}

/** Build 16-entry per-vertex color array from 4 corner colors */
function buildVertexColors(sw: RgbColor, se: RgbColor, ne: RgbColor, nw: RgbColor): RgbColor[] {
  const sMid = lerpColor(sw, se, 0.5);
  const eMid = lerpColor(se, ne, 0.5);
  const nMid = lerpColor(ne, nw, 0.5);
  const wMid = lerpColor(nw, sw, 0.5);

  return [
    sw,     // 1: SW
    sMid,   // 2: S mid
    se,     // 3: SE
    eMid,   // 4: E mid
    ne,     // 5: NE
    nMid,   // 6: N mid
    nw,     // 7: NW
    wMid,   // 8: W mid
    sMid,   // 9: inner S
    eMid,   // 10: inner E
    nMid,   // 11: inner N
    wMid,   // 12: inner W
    sw,     // 13: inner SW
    se,     // 14: inner SE
    ne,     // 15: inner NE
    nw,     // 16: inner NW
  ];
}
