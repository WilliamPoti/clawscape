import * as THREE from 'three'
import { Model } from '../../rs/model/Model.ts'

/**
 * Converts an RS Model to Three.js BufferGeometry.
 */
export function buildModelGeometry(model: Model): THREE.BufferGeometry {
  const faceCount = model.faceCount
  const vertexCount = faceCount * 3  // 3 vertices per face (unindexed for per-vertex colors)

  // Allocate typed arrays
  const positions = new Float32Array(vertexCount * 3)
  const colors = new Float32Array(vertexCount * 3)

  // Scale factor: RS units -> world units (128 RS units = 1 tile = 1 world unit)
  const scale = 1 / 128

  // Fill arrays
  let vi = 0  // vertex index
  for (let f = 0; f < faceCount; f++) {
    const a = model.faceVertexA[f]
    const b = model.faceVertexB[f]
    const c = model.faceVertexC[f]

    // Vertex A
    positions[vi * 3 + 0] = model.vertexX[a] * scale
    positions[vi * 3 + 1] = -model.vertexY[a] * scale  // RS Y is down, Three.js Y is up
    positions[vi * 3 + 2] = model.vertexZ[a] * scale
    unpackRgbToArray(model.faceColorsA[f], colors, vi * 3)
    vi++

    // Vertex B
    positions[vi * 3 + 0] = model.vertexX[b] * scale
    positions[vi * 3 + 1] = -model.vertexY[b] * scale
    positions[vi * 3 + 2] = model.vertexZ[b] * scale
    unpackRgbToArray(model.faceColorsB[f], colors, vi * 3)
    vi++

    // Vertex C
    positions[vi * 3 + 0] = model.vertexX[c] * scale
    positions[vi * 3 + 1] = -model.vertexY[c] * scale
    positions[vi * 3 + 2] = model.vertexZ[c] * scale
    unpackRgbToArray(model.faceColorsC[f], colors, vi * 3)
    vi++
  }

  // Create geometry
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // Compute bounding box
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/**
 * Unpack packed RGB (0xRRGGBB) to normalized float array.
 */
function unpackRgbToArray(rgb: number, arr: Float32Array, offset: number): void {
  arr[offset + 0] = ((rgb >> 16) & 0xFF) / 255
  arr[offset + 1] = ((rgb >> 8) & 0xFF) / 255
  arr[offset + 2] = (rgb & 0xFF) / 255
}

/**
 * Merge multiple models into a single BufferGeometry.
 * Used to batch static location models per map square.
 */
export function mergeModelGeometries(models: Model[]): THREE.BufferGeometry | null {
  if (models.length === 0) return null

  // Calculate total vertex count
  let totalFaces = 0
  for (const model of models) {
    totalFaces += model.faceCount
  }

  if (totalFaces === 0) return null

  const totalVertices = totalFaces * 3
  const positions = new Float32Array(totalVertices * 3)
  const colors = new Float32Array(totalVertices * 3)

  const scale = 1 / 128
  let vi = 0

  for (const model of models) {
    for (let f = 0; f < model.faceCount; f++) {
      const a = model.faceVertexA[f]
      const b = model.faceVertexB[f]
      const c = model.faceVertexC[f]

      // Vertex A
      positions[vi * 3 + 0] = model.vertexX[a] * scale
      positions[vi * 3 + 1] = -model.vertexY[a] * scale
      positions[vi * 3 + 2] = model.vertexZ[a] * scale
      unpackRgbToArray(model.faceColorsA[f], colors, vi * 3)
      vi++

      // Vertex B
      positions[vi * 3 + 0] = model.vertexX[b] * scale
      positions[vi * 3 + 1] = -model.vertexY[b] * scale
      positions[vi * 3 + 2] = model.vertexZ[b] * scale
      unpackRgbToArray(model.faceColorsB[f], colors, vi * 3)
      vi++

      // Vertex C
      positions[vi * 3 + 0] = model.vertexX[c] * scale
      positions[vi * 3 + 1] = -model.vertexY[c] * scale
      positions[vi * 3 + 2] = model.vertexZ[c] * scale
      unpackRgbToArray(model.faceColorsC[f], colors, vi * 3)
      vi++
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}
