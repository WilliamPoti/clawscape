import { CacheIndex } from '../cache/CacheIndex.ts'
import { IndexType } from '../cache/IndexType.ts'
import { ModelData } from './ModelData.ts'

/**
 * Loads model data from the MODELS cache index.
 */
export class ModelLoader {
  private cache = new Map<number, ModelData>()

  constructor(private readonly modelsIndex: CacheIndex) {}

  // For debugging - count failures
  private static noArchiveCount = 0
  private static noFileCount = 0
  private static decodeFailCount = 0
  private static successCount = 0

  /**
   * Load a model by ID.
   * Returns cached model if already loaded.
   */
  load(modelId: number): ModelData | null {
    if (this.cache.has(modelId)) {
      return this.cache.get(modelId)!
    }

    try {
      const archive = this.modelsIndex.getArchive(modelId)
      if (!archive) {
        ModelLoader.noArchiveCount++
        if (ModelLoader.noArchiveCount <= 3) {
          console.log(`  ModelLoader: no archive for model ${modelId} (modelsIndex has ${this.modelsIndex.archiveCount} archives)`)
        }
        this.cache.set(modelId, null as any)
        return null
      }

      // Models archive has a single file
      const file = archive.files.values().next().value
      if (!file || !file.data) {
        ModelLoader.noFileCount++
        if (ModelLoader.noFileCount <= 3) {
          console.log(`  ModelLoader: no file/data for model ${modelId}`)
        }
        this.cache.set(modelId, null as any)
        return null
      }

      const model = ModelData.decode(file.data)
      ModelLoader.successCount++
      if (ModelLoader.successCount <= 3) {
        console.log(`  ModelLoader: SUCCESS loaded model ${modelId}`)
      }
      this.cache.set(modelId, model)
      return model
    } catch (e) {
      ModelLoader.decodeFailCount++
      if (ModelLoader.decodeFailCount <= 3) {
        console.warn(`Failed to decode model ${modelId}:`, e)
      }
      this.cache.set(modelId, null as any)
      return null
    }
  }

  static printStats(): void {
    console.log(`  ModelLoader stats: ${ModelLoader.successCount} success, ${ModelLoader.noArchiveCount} no archive, ${ModelLoader.noFileCount} no file, ${ModelLoader.decodeFailCount} decode fail`)
    ModelData.printFormatStats()
    ModelLoader.noArchiveCount = 0
    ModelLoader.noFileCount = 0
    ModelLoader.decodeFailCount = 0
    ModelLoader.successCount = 0
  }

  /**
   * Clear the model cache.
   */
  clear(): void {
    this.cache.clear()
  }
}
