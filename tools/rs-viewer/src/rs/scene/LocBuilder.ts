import { ByteBuffer } from '../io/ByteBuffer.ts'
import { TypeLoader } from '../config/TypeLoader.ts'
import { LocType } from '../config/loctype/LocType.ts'
import { ModelLoader } from '../model/ModelLoader.ts'
import { ModelData } from '../model/ModelData.ts'
import { Model } from '../model/Model.ts'
import { Scene, MAP_SIZE, LEVELS } from './Scene.ts'

// RS units per tile
const UNITS_PER_TILE = 128

/**
 * Decoded location placement info.
 */
export interface LocPlacement {
  id: number
  type: number        // 0-22: wall, wall decor, floor decor, normal object, etc.
  rotation: number    // 0-3
  level: number       // 0-3
  localX: number      // 0-63
  localY: number      // 0-63
}

/**
 * Decodes location data and creates lit models for rendering.
 */
export class LocBuilder {
  constructor(
    private readonly locTypeLoader: TypeLoader<LocType>,
    private readonly modelLoader: ModelLoader,
  ) {}

  /**
   * Decode location placements from binary data.
   */
  decodeLocPlacements(data: Int8Array): LocPlacement[] {
    const placements: LocPlacement[] = []
    const buf = new ByteBuffer(data)

    let locId = -1
    while (true) {
      const idDelta = buf.readExtendedSmart()
      if (idDelta === 0) break

      locId += idDelta

      let packed = 0
      while (true) {
        const packedDelta = buf.readUSmart()
        if (packedDelta === 0) break

        packed += packedDelta - 1
        const localY = packed & 63
        const localX = (packed >> 6) & 63
        const level = (packed >> 12) & 3

        const attributes = buf.readUByte()
        const type = attributes >> 2
        const rotation = attributes & 3

        placements.push({
          id: locId,
          type,
          rotation,
          level,
          localX,
          localY,
        })
      }
    }

    return placements
  }

  /**
   * Build lit models for all placements in a map square.
   * Returns models positioned in local tile coordinates (0-63).
   */
  buildModels(
    placements: LocPlacement[],
    scene: Scene,
  ): Model[] {
    const models: Model[] = []
    let noLocType = 0
    let noModels = 0
    let noModelId = 0
    let noModelData = 0
    let noZeroFaces = 0
    let success = 0

    for (const loc of placements) {
      // Only render level 0 for now
      if (loc.level !== 0) continue

      // Types 0-22 are all valid object types
      // 0-3: walls, 4-8: wall decoration, 9: diagonal, 10-11: scenery
      // 12-21: ground items/floor decor, 22: ground decoration
      // For now render types 10-11 (normal scenery) and 22 (ground decor)
      if (loc.type < 10 || (loc.type > 11 && loc.type !== 22)) continue

      const locType = this.locTypeLoader.load(loc.id)
      if (!locType) {
        noLocType++
        continue
      }
      if (!locType.models || locType.models.length === 0) {
        noModels++
        continue
      }

      // Get model ID for this type
      const modelId = this.getModelId(locType, loc.type)
      if (modelId === -1) {
        noModelId++
        continue
      }

      const modelData = this.modelLoader.load(modelId)
      if (!modelData) {
        noModelData++
        continue
      }
      if (modelData.faceCount === 0) {
        if (noZeroFaces < 3) {
          console.log(`  Model ${modelId} loaded but has 0 faces (vertexCount=${modelData.vertexCount})`)
        }
        noZeroFaces++
        continue
      }

      success++
      
      // Create lit model
      const model = Model.light(modelData, locType.ambient + 64, locType.contrast + 768)

      // Apply scale
      const scaleX = locType.modelSizeX
      const scaleY = locType.modelSizeHeight
      const scaleZ = locType.modelSizeY

      // Calculate rotation (RS rotation: 0-3 = 0°, 90°, 180°, 270° CW)
      const rsRotation = loc.rotation * 512  // RS units (0-2047, 1024=180°)

      // Calculate position in RS units
      let sizeX = locType.sizeX
      let sizeY = locType.sizeY
      if (loc.rotation === 1 || loc.rotation === 3) {
        // Swap dimensions for 90° and 270° rotations
        const temp = sizeX
        sizeX = sizeY
        sizeY = temp
      }

      const centerX = loc.localX * UNITS_PER_TILE + (sizeX * UNITS_PER_TILE) / 2
      const centerY = loc.localY * UNITS_PER_TILE + (sizeY * UNITS_PER_TILE) / 2

      // Get height at location
      const height = this.getHeight(scene, loc.level, loc.localX, loc.localY)

      // Transform model
      model.transform(rsRotation, 128, 0, 0, 0)

      // Scale if non-default
      if (scaleX !== 128 || scaleY !== 128 || scaleZ !== 128) {
        for (let i = 0; i < model.vertexCount; i++) {
          model.vertexX[i] = (model.vertexX[i] * scaleX) >> 7
          model.vertexY[i] = (model.vertexY[i] * scaleY) >> 7
          model.vertexZ[i] = (model.vertexZ[i] * scaleZ) >> 7
        }
      }

      // Offset to world position
      const offsetX = centerX + locType.offsetX
      const offsetY = height + locType.offsetHeight
      const offsetZ = centerY + locType.offsetY

      for (let i = 0; i < model.vertexCount; i++) {
        model.vertexX[i] += offsetX
        model.vertexY[i] += offsetY
        model.vertexZ[i] += offsetZ
      }

      models.push(model)
    }

    if (placements.length > 0) {
      console.log(`  LocBuilder stats: ${success} models, ${noLocType} no locType, ${noModels} no models array, ${noModelId} no modelId, ${noModelData} no modelData, ${noZeroFaces} zero faces`)
      ModelLoader.printStats()
    }

    return models
  }

  /**
   * Get the model ID for a location type and placement type.
   */
  private getModelId(locType: LocType, placementType: number): number {
    if (!locType.models) return -1

    if (locType.types) {
      // Multiple model types - find matching one
      for (let i = 0; i < locType.types.length; i++) {
        if (locType.types[i] === placementType) {
          return locType.models[i]
        }
      }
      // Fallback to first model
      return locType.models[0]
    }

    // Single model
    return locType.models[0]
  }

  /**
   * Get terrain height at a tile position.
   */
  private getHeight(scene: Scene, level: number, x: number, y: number): number {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return 0
    return scene.tileHeights[level][x]?.[y] ?? 0
  }
}

/**
 * Helper to add readExtendedSmart to ByteBuffer if not present.
 */
declare module '../io/ByteBuffer' {
  interface ByteBuffer {
    readExtendedSmart(): number
  }
}
