import * as THREE from 'three'
import { Scene, MAP_SIZE } from '../../rs/scene/Scene.ts'
import { TILE_SIZE } from '../../rs/MathConstants.ts'
import { HSL_RGB_MAP } from '../../rs/util/ColorUtil.ts'

/**
 * Converts Scene tile models into Three.js BufferGeometry.
 * Creates one geometry per level containing all visible tile faces.
 */
export function buildTerrainGeometry(scene: Scene, level: number): THREE.BufferGeometry | null {
  // Count total triangles
  let totalFaces = 0
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      const tile = scene.tiles[level][x][y]
      if (tile?.tileModel) {
        totalFaces += tile.tileModel.faceCount
      }
    }
  }

  if (totalFaces === 0) return null

  // Allocate buffers
  const positions = new Float32Array(totalFaces * 3 * 3) // 3 verts * 3 components
  const colors = new Float32Array(totalFaces * 3 * 3)    // RGB per vertex

  let vi = 0
  let nanCount = 0
  let blackCount = 0

  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      const tile = scene.tiles[level][x][y]
      if (!tile?.tileModel) continue

      const model = tile.tileModel

      for (const face of model.faces) {
        // Get vertex positions
        const verts = [face.a, face.b, face.c]
        const hsls = [face.hslA, face.hslB, face.hslC]

        for (let v = 0; v < 3; v++) {
          const idx = verts[v]
          const px = model.vertexX[idx]
          const py = model.vertexY[idx]
          const pz = model.vertexZ[idx]

          if (px === undefined || py === undefined || pz === undefined) {
            nanCount++
          }

          // Convert RS coords to Three.js: divide by tile size, y is up
          positions[vi * 3] = px / TILE_SIZE
          positions[vi * 3 + 1] = -py / TILE_SIZE // RS y is inverted (negative = up)
          positions[vi * 3 + 2] = pz / TILE_SIZE

          // Convert HSL to RGB via palette
          const hsl = hsls[v] & 0xFFFF
          const rgb = HSL_RGB_MAP[hsl]
          const r = ((rgb >> 16) & 0xFF) / 255.0
          const g = ((rgb >> 8) & 0xFF) / 255.0
          const b = (rgb & 0xFF) / 255.0
          if (r === 0 && g === 0 && b === 0) blackCount++

          colors[vi * 3] = r
          colors[vi * 3 + 1] = g
          colors[vi * 3 + 2] = b

          vi++
        }
      }
    }
  }

  if (nanCount > 0) console.warn(`  Geometry: ${nanCount} undefined vertex positions!`)
  if (blackCount > 0) console.log(`  Geometry: ${blackCount}/${vi} vertices are black`)
  console.log(`  Geometry: ${vi} vertices, ${totalFaces} faces`)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingBox()
  if (geometry.boundingBox) {
    const bb = geometry.boundingBox
    console.log(`  BBox: (${bb.min.x.toFixed(0)},${bb.min.y.toFixed(1)},${bb.min.z.toFixed(0)}) → (${bb.max.x.toFixed(0)},${bb.max.y.toFixed(1)},${bb.max.z.toFixed(0)})`)
  }

  return geometry
}
