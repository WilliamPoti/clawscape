import { ByteBuffer } from '../io/ByteBuffer.ts'
import { packHsl, adjustUnderlayLight, adjustOverlayLight, HSL_RGB_MAP } from '../util/ColorUtil.ts'
import { generateHeight } from '../util/HeightCalc.ts'
import { UnderlayFloorType } from '../config/floortype/UnderlayFloorType.ts'
import { OverlayFloorType } from '../config/floortype/OverlayFloorType.ts'
import { TypeLoader } from '../config/TypeLoader.ts'
import { Scene, LEVELS, MAP_SIZE } from './Scene.ts'
import { SceneTileModel } from './SceneTileModel.ts'
import type { SceneTile } from './SceneTile.ts'

const UNITS_TILE_HEIGHT_BASIS = 8
const UNITS_LEVEL_HEIGHT = 240
const BLEND_RADIUS = 5

// Directional light vector (RS uses fixed lighting)
const LIGHT_X = -50
const LIGHT_Y = -10
const LIGHT_Z = -50

/**
 * Builds a Scene from raw terrain data.
 * Decodes tile heights, underlays/overlays, blends colors, computes lighting,
 * and creates SceneTileModel instances for rendering.
 */
export class SceneBuilder {
  private underlayLoader: TypeLoader<UnderlayFloorType>
  private overlayLoader: TypeLoader<OverlayFloorType>

  constructor(
    underlayLoader: TypeLoader<UnderlayFloorType>,
    overlayLoader: TypeLoader<OverlayFloorType>,
  ) {
    this.underlayLoader = underlayLoader
    this.overlayLoader = overlayLoader
  }

  /**
   * Build a scene for a single map square.
   */
  buildScene(
    terrainData: Int8Array | null,
    baseX: number, // world tile X of SW corner
    baseY: number, // world tile Y of SW corner
  ): Scene {
    const scene = new Scene(MAP_SIZE, MAP_SIZE)

    // Decode terrain or generate heights
    if (terrainData) {
      // Log first 32 bytes of terrain data for debugging
      const sample = new Uint8Array(terrainData.buffer, terrainData.byteOffset, Math.min(32, terrainData.byteLength))
      console.log(`  Terrain data: ${terrainData.byteLength} bytes, first 32: [${Array.from(sample).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`)

      this.decodeTerrain(scene, new ByteBuffer(terrainData), baseX, baseY)
    } else {
      this.generateEmptyTerrain(scene, baseX, baseY)
    }

    // Compute lighting
    const lightMap = this.computeLighting(scene)

    // Blend underlay colors
    const blendedUnderlays = this.blendUnderlays(scene)

    // Create tile models
    this.addTileModels(scene, lightMap, blendedUnderlays, baseX, baseY)

    return scene
  }

  /**
   * Decode terrain from binary map data.
   * Binary format per tile (variable length):
   *   Loop until terminator:
   *     value = readUByte() or readUShort()
   *     0     -> use generated/previous height
   *     1     -> next byte is explicit height
   *     2-49  -> overlay + shape + rotation
   *     50-81 -> render flags
   *     >=82  -> underlay ID
   */
  private decodeTerrain(scene: Scene, buf: ByteBuffer, baseX: number, baseY: number): void {
    const startPos = buf.pos
    for (let level = 0; level < LEVELS; level++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        for (let y = 0; y < MAP_SIZE; y++) {
          this.decodeTile(scene, buf, level, x, y, baseX, baseY)
        }
      }
    }
    console.log(`  Terrain decode: used ${buf.pos - startPos} of ${buf.length} bytes (remaining: ${buf.remaining})`)
  }

  private decodeTile(
    scene: Scene, buf: ByteBuffer, level: number, x: number, y: number,
    baseX: number, baseY: number,
  ): void {
    while (true) {
      const value = buf.readUByte()

      if (value === 0) {
        // Generated height
        if (level === 0) {
          scene.tileHeights[level][x][y] = -generateHeight(baseX + x + 0xe3b7b, baseY + y + 0x87cce) * UNITS_TILE_HEIGHT_BASIS
        } else {
          scene.tileHeights[level][x][y] = scene.tileHeights[level - 1][x][y] - UNITS_LEVEL_HEIGHT
        }
        return
      }

      if (value === 1) {
        // Explicit height
        let height = buf.readUByte()
        if (height === 1) height = 0
        if (level === 0) {
          scene.tileHeights[level][x][y] = -height * UNITS_TILE_HEIGHT_BASIS
        } else {
          scene.tileHeights[level][x][y] = scene.tileHeights[level - 1][x][y] - height * UNITS_TILE_HEIGHT_BASIS
        }
        return
      }

      if (value <= 49) {
        // Overlay
        scene.tileOverlays[level][x][y] = buf.readUByte()
        scene.tileShapes[level][x][y] = ((value - 2) / 4) | 0
        scene.tileRotations[level][x][y] = (value - 2) & 3
      } else if (value <= 81) {
        // Render flags
        scene.tileRenderFlags[level][x][y] = value - 49
      } else {
        // Underlay
        scene.tileUnderlays[level][x][y] = value - 81
      }
    }
  }

  /**
   * Generate heights for empty terrain (no cache data).
   */
  private generateEmptyTerrain(scene: Scene, baseX: number, baseY: number): void {
    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        scene.tileHeights[0][x][y] = -generateHeight(baseX + x + 0xe3b7b, baseY + y + 0x87cce) * UNITS_TILE_HEIGHT_BASIS
        for (let level = 1; level < LEVELS; level++) {
          scene.tileHeights[level][x][y] = scene.tileHeights[level - 1][x][y] - UNITS_LEVEL_HEIGHT
        }
      }
    }
  }

  /**
   * Compute per-tile-corner light values from height gradients.
   * Returns lightMap[level][x][y] with packed corner lights.
   */
  private computeLighting(scene: Scene): Int32Array[][] {
    const lightMap: Int32Array[][] = new Array(LEVELS)

    for (let level = 0; level < LEVELS; level++) {
      lightMap[level] = new Array(MAP_SIZE + 1)
      for (let x = 0; x <= MAP_SIZE; x++) {
        lightMap[level][x] = new Int32Array(MAP_SIZE + 1)
      }

      for (let x = 1; x < MAP_SIZE; x++) {
        for (let y = 1; y < MAP_SIZE; y++) {
          // Height differences (gradient)
          const dx = scene.tileHeights[level][x + 1]?.[y] ?? scene.tileHeights[level][x][y]
          const dxn = scene.tileHeights[level][x - 1]?.[y] ?? scene.tileHeights[level][x][y]
          const dy = scene.tileHeights[level][x]?.[y + 1] ?? scene.tileHeights[level][x][y]
          const dyn = scene.tileHeights[level][x]?.[y - 1] ?? scene.tileHeights[level][x][y]

          const gradX = dxn - dx
          const gradY = dyn - dy
          const gradLen = Math.sqrt(gradX * gradX + 65536 + gradY * gradY)

          const nx = gradX / gradLen
          const ny = 256.0 / gradLen
          const nz = gradY / gradLen

          const brightness = nx * LIGHT_X + ny * LIGHT_Y + nz * LIGHT_Z
          const light = Math.round(brightness * 1.1428571428571428) + 96

          lightMap[level][x][y] = Math.max(2, Math.min(255, light))
        }
      }

      // Fill edges
      for (let x = 0; x <= MAP_SIZE; x++) {
        lightMap[level][x][0] = lightMap[level][x][1] ?? 96
        lightMap[level][x][MAP_SIZE] = lightMap[level][x][MAP_SIZE - 1] ?? 96
      }
      for (let y = 0; y <= MAP_SIZE; y++) {
        lightMap[level][0][y] = lightMap[level][1]?.[y] ?? 96
        lightMap[level][MAP_SIZE][y] = lightMap[level][MAP_SIZE - 1]?.[y] ?? 96
      }
    }

    return lightMap
  }

  /**
   * Blend underlay HSL colors within a radius to smooth transitions.
   * Returns blended[level][x][y] = packed HSL.
   */
  private blendUnderlays(scene: Scene): Int16Array[][] {
    const blended: Int16Array[][] = new Array(LEVELS)

    for (let level = 0; level < LEVELS; level++) {
      blended[level] = new Array(MAP_SIZE)
      for (let x = 0; x < MAP_SIZE; x++) {
        blended[level][x] = new Int16Array(MAP_SIZE)
      }

      for (let x = 0; x < MAP_SIZE; x++) {
        for (let y = 0; y < MAP_SIZE; y++) {
          let hueSum = 0
          let satSum = 0
          let lightSum = 0
          let hueMultSum = 0
          let count = 0

          for (let dx = -BLEND_RADIUS; dx <= BLEND_RADIUS; dx++) {
            for (let dy = -BLEND_RADIUS; dy <= BLEND_RADIUS; dy++) {
              const nx = x + dx
              const ny = y + dy
              if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue

              const underlayId = scene.tileUnderlays[level][nx][ny]
              if (underlayId === 0) continue

              const underlay = this.underlayLoader.load(underlayId - 1)
              if (!underlay) continue

              hueSum += underlay.hue * underlay.hueMultiplier
              satSum += underlay.saturation
              lightSum += underlay.lightness
              hueMultSum += underlay.hueMultiplier
              count++
            }
          }

          if (count > 0 && hueMultSum > 0) {
            const avgHue = (hueSum / hueMultSum) | 0
            const avgSat = (satSum / count) | 0
            const avgLight = (lightSum / count) | 0
            blended[level][x][y] = packHsl(avgHue, avgSat, avgLight)
          } else {
            blended[level][x][y] = -1
          }
        }
      }
    }

    return blended
  }

  /**
   * Create SceneTileModel for each tile.
   */
  private addTileModels(
    scene: Scene,
    lightMap: Int32Array[][],
    blendedUnderlays: Int16Array[][],
    baseX: number,
    baseY: number,
  ): void {
    for (let level = 0; level < LEVELS; level++) {
      let underlayCount = 0
      let overlayCount = 0
      let bothCount = 0
      let emptyCount = 0
      let gapFillCount = 0
      let tileModelCount = 0
      let totalFaces = 0

      for (let x = 0; x < MAP_SIZE; x++) {
        for (let y = 0; y < MAP_SIZE; y++) {
          const underlayId = scene.tileUnderlays[level][x][y]
          const overlayId = scene.tileOverlays[level][x][y]

          if (underlayId > 0 && overlayId > 0) bothCount++
          else if (underlayId > 0) underlayCount++
          else if (overlayId > 0) overlayCount++
          else emptyCount++

          if (underlayId === 0 && overlayId === 0) {
            // At level 0, fill gaps with blended underlay from neighbors
            if (level > 0) continue
            const blendHsl = blendedUnderlays[level][x]?.[y] ?? -1
            if (blendHsl < 0) continue
            gapFillCount++
            // Fall through to create a simple tile with blended underlay color
          }

          // Corner heights
          const heightSw = scene.tileHeights[level][x][y]
          const heightSe = scene.tileHeights[level][x + 1]?.[y] ?? heightSw
          const heightNe = scene.tileHeights[level][x + 1]?.[y + 1] ?? heightSw
          const heightNw = scene.tileHeights[level][x]?.[y + 1] ?? heightSw

          // Corner lights
          const lightSw = lightMap[level][x]?.[y] ?? 96
          const lightSe = lightMap[level][x + 1]?.[y] ?? 96
          const lightNe = lightMap[level][x + 1]?.[y + 1] ?? 96
          const lightNw = lightMap[level][x]?.[y + 1] ?? 96

          // Blended underlay HSL per corner
          const blendSw = blendedUnderlays[level][x]?.[y] ?? -1
          const blendSe = blendedUnderlays[level][x + 1]?.[y] ?? blendSw
          const blendNe = blendedUnderlays[level][x + 1]?.[y + 1] ?? blendSw
          const blendNw = blendedUnderlays[level][x]?.[y + 1] ?? blendSw

          // Overlay properties
          let overlayHsl = -2
          let overlayRgb = 0
          let textureId = -1
          let shape = 0
          let rotation = 0

          if (overlayId > 0) {
            const overlay = this.overlayLoader.load(overlayId - 1)
            if (overlay) {
              overlayHsl = packHsl(overlay.hue, overlay.saturation, overlay.lightness)
              overlayRgb = overlay.primaryRgb
              textureId = overlay.textureId
              if (textureId >= 0) {
                overlayHsl = -1 // textured, use texture color
              }
            }
            shape = scene.tileShapes[level][x][y]
            rotation = scene.tileRotations[level][x][y]
          }

          // Underlay RGB for minimap
          let underlayRgb = 0
          if (underlayId > 0) {
            const underlay = this.underlayLoader.load(underlayId - 1)
            if (underlay) {
              underlayRgb = underlay.rgbColor
            }
          }

          // Determine if we need a tile model
          // Also create models for gap-fill tiles at level 0 (no underlay/overlay but valid blend)
          if (underlayId > 0 || overlayId > 0 || level === 0) {
            const tileModel = new SceneTileModel(
              shape,
              rotation,
              textureId,
              x,
              y,
              heightSw, heightSe, heightNe, heightNw,
              lightSw, lightSe, lightNe, lightNw,
              blendSw, blendSe, blendNe, blendNw,
              overlayHsl,
              underlayRgb,
              overlayRgb,
            )

            scene.tiles[level][x][y] = {
              level,
              x,
              y,
              tileModel,
            }
            tileModelCount++
            totalFaces += tileModel.faceCount
          }
        }
      }

      if (level === 0) {
        console.log(`  Level ${level} tiles: ${underlayCount} underlay, ${overlayCount} overlay, ${bothCount} both, ${emptyCount} empty (${gapFillCount} gap-filled) → ${tileModelCount} models, ${totalFaces} faces`)
      }
    }
  }
}
