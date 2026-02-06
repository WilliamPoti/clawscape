import * as THREE from 'three'
import { CacheSystem } from '../rs/cache/CacheSystem.ts'
import { CacheIndex } from '../rs/cache/CacheIndex.ts'
import { IndexType, ConfigType } from '../rs/cache/IndexType.ts'
import { loadCacheFromOpenRS2 } from './Caches.ts'
import { MapFileIndex } from '../rs/map/MapFileIndex.ts'
import { MapFileLoader } from '../rs/map/MapFileLoader.ts'
import { SceneBuilder } from '../rs/scene/SceneBuilder.ts'
import { LocBuilder } from '../rs/scene/LocBuilder.ts'
import { TypeLoader } from '../rs/config/TypeLoader.ts'
import { UnderlayFloorType } from '../rs/config/floortype/UnderlayFloorType.ts'
import { OverlayFloorType } from '../rs/config/floortype/OverlayFloorType.ts'
import { LocType } from '../rs/config/loctype/LocType.ts'
import { ModelLoader } from '../rs/model/ModelLoader.ts'
import { buildTerrainGeometry } from '../renderer/geometry/TerrainGeometryBuilder.ts'
import { mergeModelGeometries } from '../renderer/geometry/ModelGeometryBuilder.ts'

export class MapViewer {
  canvas: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  running = false
  animFrameId = 0

  // Cache state
  cacheSystem: CacheSystem | null = null
  xteas: Map<number, number[]> = new Map()
  cacheLoaded = false

  // Mouse controls
  private isDragging = false
  private lastMouseX = 0
  private lastMouseY = 0
  private cameraYaw = 0
  private cameraPitch = 0.5

  // FPS tracking
  private frameCount = 0
  private lastFpsUpdate = 0
  fps = 0
  onFpsUpdate?: (fps: number) => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setClearColor(0x000000) // Black void like osrs.world

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(75, 1, 1, 10000)
    this.camera.position.set(32, 20, 32)
    this.camera.lookAt(32, 0, 32)

    // Placeholder grid
    const grid = new THREE.GridHelper(128, 128, 0x444444, 0x222222)
    this.scene.add(grid)

    this.resize()
    window.addEventListener('resize', this.resize)

    // Camera controls
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mouseup', this.onMouseUp)
    canvas.addEventListener('wheel', this.onWheel)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    // Keyboard
    this.keys = new Set()
    window.addEventListener('keydown', (e) => this.keys.add(e.code))
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  private keys = new Set<string>()

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return
    const dx = e.clientX - this.lastMouseX
    const dy = e.clientY - this.lastMouseY
    this.cameraYaw += dx * 0.005
    this.cameraPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraPitch + dy * 0.005))
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  private onMouseUp = () => {
    this.isDragging = false
  }

  private onWheel = (e: WheelEvent) => {
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    this.camera.position.addScaledVector(dir, -e.deltaY * 0.05)
  }

  resize = () => {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
  }

  start() {
    this.running = true
    this.tick()
  }

  tick = () => {
    if (!this.running) return
    this.animFrameId = requestAnimationFrame(this.tick)

    // FPS calculation
    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsUpdate = now
      this.onFpsUpdate?.(this.fps)
    }

    this.updateCamera()
    this.resize()
    this.renderer.render(this.scene, this.camera)
  }

  private updateCamera() {
    const speed = this.keys.has('ShiftLeft') ? 2.0 : 0.5

    const forward = new THREE.Vector3(
      Math.sin(this.cameraYaw),
      0,
      Math.cos(this.cameraYaw),
    )
    const right = new THREE.Vector3(
      Math.cos(this.cameraYaw),
      0,
      -Math.sin(this.cameraYaw),
    )

    if (this.keys.has('KeyW')) this.camera.position.addScaledVector(forward, speed)
    if (this.keys.has('KeyS')) this.camera.position.addScaledVector(forward, -speed)
    if (this.keys.has('KeyA')) this.camera.position.addScaledVector(right, -speed)
    if (this.keys.has('KeyD')) this.camera.position.addScaledVector(right, speed)
    if (this.keys.has('Space')) this.camera.position.y += speed
    if (this.keys.has('KeyC')) this.camera.position.y -= speed

    // Look direction from yaw/pitch
    const lookDir = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      -Math.sin(this.cameraPitch),
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch),
    )
    const target = this.camera.position.clone().add(lookDir)
    this.camera.lookAt(target)
  }

  async loadCache(scope: string, id: number, onProgress?: (receivedMB: number, totalMB: number) => void) {
    console.log(`Loading cache: ${scope}/${id}`)

    const { cache, xteas } = await loadCacheFromOpenRS2(scope, id, onProgress)
    this.cacheSystem = cache
    this.xteas = xteas
    this.cacheLoaded = true

    console.log(`Cache loaded: ${cache.indexCount} indexes, ${xteas.size} XTEA keys`)
    console.log(`Index IDs: ${cache.getIndexIds().join(', ')}`)

    // Now load terrain for Lumbridge area
    this.loadTerrain(cache, xteas)
  }

  private loadTerrain(cache: CacheSystem, xteas: Map<number, number[]>) {
    try {
      const configsIndex = cache.getIndex(IndexType.CONFIGS)
      const mapsIndex = cache.getIndex(IndexType.MAPS)
      const modelsIndex = cache.getIndex(IndexType.MODELS)

      // Create type loaders
      const underlayLoader = new TypeLoader(
        configsIndex, ConfigType.UNDERLAY,
        (id) => new UnderlayFloorType(id),
      )
      const overlayLoader = new TypeLoader(
        configsIndex, ConfigType.OVERLAY,
        (id) => new OverlayFloorType(id),
      )
      const locTypeLoader = new TypeLoader(
        configsIndex, ConfigType.LOC,
        (id) => new LocType(id),
      )

      // Create loaders
      const mapFileIndex = MapFileIndex.create(mapsIndex)
      const mapFileLoader = new MapFileLoader(mapsIndex, mapFileIndex, xteas)
      const modelLoader = new ModelLoader(modelsIndex)
      const sceneBuilder = new SceneBuilder(underlayLoader, overlayLoader)
      const locBuilder = new LocBuilder(locTypeLoader, modelLoader)

      // Debug: Log index info
      console.log(`Models index: ${modelsIndex.archiveCount} archives, first IDs: ${modelsIndex.getArchiveIds().slice(0, 10).join(', ')}`)
      console.log(`LocTypes in config index (archive ${ConfigType.LOC}): checking...`)

      // Load a region around Lumbridge (map squares 50,50)
      const regions = [
        [49, 49], [50, 49], [51, 49],
        [49, 50], [50, 50], [51, 50],
        [49, 51], [50, 51], [51, 51],
      ]

      // Remove placeholder grid
      const grid = this.scene.children.find(c => c instanceof THREE.GridHelper)
      if (grid) this.scene.remove(grid)

      for (const [mapX, mapY] of regions) {
        console.log(`Loading map square ${mapX},${mapY}...`)

        const terrainData = mapFileLoader.getTerrainData(mapX, mapY)
        if (!terrainData) {
          console.log(`  No terrain data for ${mapX},${mapY}`)
          continue
        }

        const baseX = mapX * 64
        const baseY = mapY * 64

        const rsScene = sceneBuilder.buildScene(terrainData, baseX, baseY)

        // Build terrain geometry for level 0 (ground level)
        const terrainGeometry = buildTerrainGeometry(rsScene, 0)
        if (terrainGeometry) {
          const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
          })
          const mesh = new THREE.Mesh(terrainGeometry, material)
          // Offset mesh to world position (geometry uses local 0-63 tile coords)
          mesh.position.set(baseX, 0, baseY)
          this.scene.add(mesh)
          console.log(`  Added terrain mesh for ${mapX},${mapY}`)
        }

        // Load and render location models
        const locData = mapFileLoader.getLocData(mapX, mapY)
        if (locData) {
          try {
            const placements = locBuilder.decodeLocPlacements(locData)
            console.log(`  Decoded ${placements.length} location placements for ${mapX},${mapY}`)

            const models = locBuilder.buildModels(placements, rsScene)
            console.log(`  Built ${models.length} models for ${mapX},${mapY}`)

            if (models.length > 0) {
              const modelGeometry = mergeModelGeometries(models)
              if (modelGeometry) {
                const modelMaterial = new THREE.MeshBasicMaterial({
                  vertexColors: true,
                  side: THREE.DoubleSide,
                })
                const modelMesh = new THREE.Mesh(modelGeometry, modelMaterial)
                // Model positions are already in RS units, convert to tiles
                // Model geometry is already in tile units (scaled in mergeModelGeometries)
                // No additional scale needed - just position at map square origin
                modelMesh.position.set(baseX, 0, baseY)
                this.scene.add(modelMesh)
                console.log(`  Added model mesh for ${mapX},${mapY}`)
              }
            }
          } catch (e) {
            console.warn(`  Failed to load locations for ${mapX},${mapY}:`, e)
          }
        } else {
          console.log(`  No location data (or missing XTEA key) for ${mapX},${mapY}`)
        }
      }

      // Position camera to look at center of Lumbridge
      const centerX = 50 * 64 + 32
      const centerZ = 50 * 64 + 32
      this.camera.position.set(centerX, 30, centerZ + 30)
      this.camera.lookAt(centerX, 0, centerZ)
      console.log(`Camera at (${centerX}, 30, ${centerZ + 30}), looking at (${centerX}, 0, ${centerZ})`)
      console.log(`Scene children: ${this.scene.children.length}`)

    } catch (e) {
      console.error('Failed to load terrain:', e)
    }
  }

  getCameraPosition() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      yaw: this.cameraYaw,
    }
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.animFrameId)
    window.removeEventListener('resize', this.resize)
    this.renderer.dispose()
  }
}
