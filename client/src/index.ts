import * as THREE from 'three';
import { TILE_SIZE, PlayerUpdate, MapSquare, UnderlayConfig, OverlayConfig, EnvironmentConfig, LocConfig } from '@clawscape/shared';
import { Renderer, GameCamera, SceneManager, TerrainRenderer, LightingSystem, AtmosphereSystem, WaterSystem, ModelSystem } from './engine/index.js';
import { PlayerController, OtherPlayersManager, World, Pathfinder } from './game/index.js';
import type { TilePosition, OtherPlayer } from './game/index.js';
import { NetworkClient } from './net/index.js';
import { DemoRunner, DemoRecorder, getDemoScript, DemoGameControls } from './demos/index.js';
import { exportLogoComposition } from './demos/exportLogo.js';

const SERVER_URL = 'ws://localhost:3000';

class Game {
  // Engine
  private sceneManager: SceneManager;
  private gameCamera: GameCamera;
  private gameRenderer: Renderer;
  private terrainRenderer: TerrainRenderer;
  private lighting: LightingSystem;
  private atmosphere: AtmosphereSystem;
  private water: WaterSystem;
  private models: ModelSystem;
  private clock: THREE.Clock;

  // Game
  private player: PlayerController;
  private otherPlayers: OtherPlayersManager;
  private world: World;

  // Network
  private network: NetworkClient;
  private playerId: number = -1;

  // UI
  private clickMarker: THREE.Mesh;
  private statusText: HTMLDivElement;

  // Demo system
  private demoRunner: DemoRunner | null = null;
  private demoRecorder: DemoRecorder | null = null;
  private fakePlayers: Map<number, OtherPlayer> = new Map();
  private recordingLogo: HTMLImageElement | null = null;

  constructor() {
    // Engine setup
    this.sceneManager = new SceneManager();
    this.gameCamera = new GameCamera();
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    this.gameRenderer = new Renderer(canvas, this.sceneManager.scene, this.gameCamera.camera);
    this.clock = new THREE.Clock();

    // Lighting system (shadows + point lights)
    this.lighting = new LightingSystem(this.sceneManager.scene, this.gameRenderer.renderer);

    // Atmosphere system (fog + sky)
    this.atmosphere = new AtmosphereSystem(this.sceneManager.scene);

    // Water system
    this.water = new WaterSystem(this.sceneManager.scene);

    // Model system (glTF loader + placeholders)
    this.models = new ModelSystem(this.sceneManager.scene);

    // Terrain renderer (RLHD-quality)
    this.terrainRenderer = new TerrainRenderer(this.sceneManager.scene);

    // Game setup
    this.player = new PlayerController(this.sceneManager.scene);
    this.otherPlayers = new OtherPlayersManager(this.sceneManager.scene);
    this.world = new World(this.sceneManager.scene);
    this.clickMarker = this.createClickMarker(0xFFEE00);
    this.statusText = this.createStatusUI();

    // Initial tile load (legacy world for demo compat)
    this.world.updateLoadedTiles(this.player.mesh.position.x, this.player.mesh.position.z);

    // Load RLHD terrain
    this.loadTerrain();

    // Network
    this.network = new NetworkClient(SERVER_URL, {
      onAuth: (id) => {
        this.playerId = id;
        console.log('Assigned player ID:', id);
        this.updateStatus();
      },
      onPlayerUpdate: (update) => {
        if (update.id !== this.playerId) {
          this.otherPlayers.updateTarget(update.id, update.position);
        }
      },
      onPlayerJoin: (id, position) => {
        if (id !== this.playerId) {
          this.otherPlayers.add(id, position);
          console.log(`Player ${id} joined`);
          this.updateStatus();
        }
      },
      onPlayerLeave: (id) => {
        this.otherPlayers.remove(id);
        console.log(`Player ${id} left`);
        this.updateStatus();
      },
      onPlayersList: (players) => {
        for (const p of players) {
          if (p.id !== this.playerId) {
            this.otherPlayers.add(p.id, p.position);
          }
        }
      },
      onConnect: () => this.updateStatus(),
      onDisconnect: () => this.updateStatus(),
    });

    // Events
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Connect to server
    this.network.connect();

    // Initialize demo system
    this.initDemoSystem();

    // Start
    this.animate();
    console.log('ClawScape initialized');
  }

  // ==================
  // Terrain
  // ==================

  private async loadTerrain(): Promise<void> {
    try {
      // Load configs
      const [underlaysResp, overlaysResp, envsResp, locsResp] = await Promise.all([
        fetch('/assets/configs/underlays.json'),
        fetch('/assets/configs/overlays.json'),
        fetch('/assets/configs/environments.json'),
        fetch('/assets/configs/locs.json'),
      ]);
      const underlays: UnderlayConfig[] = await underlaysResp.json();
      const overlays: OverlayConfig[] = await overlaysResp.json();
      const environments: EnvironmentConfig[] = await envsResp.json();
      const locs: LocConfig[] = await locsResp.json();
      this.terrainRenderer.setFloorTypes(underlays, overlays);
      this.models.setLocConfigs(locs);

      // Apply default environment
      const defaultEnv = environments.find(e => e.id === 'overworld_day');
      if (defaultEnv) {
        this.lighting.setEnvironment(defaultEnv);
        this.atmosphere.setEnvironment(defaultEnv);
        this.terrainRenderer.setEnvironment(defaultEnv);
      }

      // Load starter map
      const mapResp = await fetch('/assets/maps/50-50.json');
      const mapSquare: MapSquare = await mapResp.json();
      this.terrainRenderer.loadMapSquare(mapSquare);

      // Create water from map data
      this.createWaterFromMap(mapSquare);

      // Place objects (trees, rocks, etc.)
      await this.models.placeLocsFromMap(mapSquare);

      console.log(`Loaded terrain: region ${mapSquare.regionX},${mapSquare.regionY}`);
    } catch (e) {
      console.warn('Failed to load terrain (assets not found, using legacy tiles):', e);
    }
  }

  private createWaterFromMap(mapSquare: MapSquare): void {
    const tiles = mapSquare.tiles[0]; // ground level
    if (!tiles) return;

    const TILE = 128;
    const offsetX = mapSquare.regionX * 64 * TILE;
    const offsetZ = mapSquare.regionY * 64 * TILE;

    // Find contiguous water regions using flood fill
    const visited = new Set<string>();
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if ((tiles[y][x].flags & 0x02) === 0) continue; // not water

        // Flood fill to find water region bounds
        let minX = x, maxX = x, minY = y, maxY = y;
        const queue: [number, number][] = [[x, y]];
        while (queue.length > 0) {
          const [cx, cy] = queue.pop()!;
          const k = `${cx},${cy}`;
          if (visited.has(k)) continue;
          if (cx < 0 || cx >= 64 || cy < 0 || cy >= 64) continue;
          if ((tiles[cy][cx].flags & 0x02) === 0) continue;

          visited.add(k);
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);
          queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }

        // Create water plane for this region
        const wx = offsetX + minX * TILE;
        const wz = offsetZ + minY * TILE;
        const ww = (maxX - minX + 1) * TILE;
        const wh = (maxY - minY + 1) * TILE;
        this.water.addWaterPlane(wx, wz, ww, wh, -5);
      }
    }
  }

  // ==================
  // Demo System
  // ==================

  private initDemoSystem(): void {
    const controls: DemoGameControls = {
      setPlayerTarget: (x, z) => this.setPlayerTarget(x, z),
      getPlayerTilePosition: () => this.player.getTilePosition(),
      isPlayerMoving: () => this.player.isMoving(),
      setCameraAngle: (angle) => this.gameCamera.setTargetAngle(angle),
      setCameraZoom: (zoom) => this.gameCamera.setTargetZoom(zoom),
      createFakePlayer: (id, x, z, name) => this.createFakePlayer(id, x, z, name),
      moveFakePlayer: (id, x, z) => this.moveFakePlayer(id, x, z),
      removeFakePlayer: (id) => this.removeFakePlayer(id),
      showBlockedFeedback: (_x, _z) => { /* removed */ },
      setRunning: (running) => { this.player.isRunning = running; },
    };

    this.demoRunner = new DemoRunner(controls);
    this.demoRecorder = new DemoRecorder();
    this.checkDemoUrl();
  }

  private checkDemoUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const demoName = params.get('demo');
    const shouldRecord = params.has('record');
    const exportLogo = params.has('export-logo');

    if (exportLogo) {
      document.fonts.ready.then(() => exportLogoComposition());
      return;
    }

    if (demoName) {
      setTimeout(() => {
        this.runDemo(demoName, shouldRecord);
      }, 500);
    }
  }

  runDemo(name: string, record: boolean = false): void {
    const script = getDemoScript(name);
    if (!script) {
      console.error(`Demo not found: ${name}`);
      return;
    }

    console.log(`Running demo: ${name}${record ? ' (recording both formats)' : ''}`);

    if (record && this.demoRecorder) {
      this.recordingLogo = new Image();
      this.recordingLogo.src = '/assets/logo.png';

      this.demoRecorder.startRecording(this.gameRenderer.domElement, 60, {
        logo: this.recordingLogo,
        getHeader: () => this.demoRunner?.getHeader() || '',
        getCaption: () => this.demoRunner?.getCaption() || ''
      });
    }

    this.demoRunner?.start(script, () => {
      if (record && this.demoRecorder) {
        this.demoRecorder.stopAndDownload(name);
        this.recordingLogo = null;
      }
      console.log('Demo complete');
    });
  }

  private setPlayerTarget(x: number, z: number): void {
    const currentTile = this.player.getTilePosition();
    const path = Pathfinder.calculatePath(currentTile, { x, z });
    if (path.length > 0) {
      this.player.setPath(path);
      this.clickMarker.position.x = x * TILE_SIZE;
      this.clickMarker.position.z = z * TILE_SIZE;
      this.clickMarker.visible = true;
    }
  }

  private createFakePlayer(id: number, x: number, z: number, name: string): THREE.Mesh {
    const mesh = PlayerController.createOtherPlayerMesh(this.sceneManager.scene);
    mesh.position.set(x * TILE_SIZE, 60, z * TILE_SIZE);

    const label = PlayerController.createPlayerLabel(name);
    mesh.add(label);

    this.fakePlayers.set(id, {
      id,
      mesh,
      targetPosition: mesh.position.clone(),
      username: name
    });

    return mesh;
  }

  private moveFakePlayer(id: number, x: number, z: number): void {
    const player = this.fakePlayers.get(id);
    if (player) {
      player.targetPosition.set(x * TILE_SIZE, 60, z * TILE_SIZE);
    }
  }

  private removeFakePlayer(id: number): void {
    const player = this.fakePlayers.get(id);
    if (player) {
      this.sceneManager.remove(player.mesh);
      this.fakePlayers.delete(id);
    }
  }

  isInDemoMode(): boolean {
    return this.demoRunner?.isRunning() ?? false;
  }

  // ==================
  // UI
  // ==================

  private createClickMarker(color: number): THREE.Mesh {
    const geometry = new THREE.RingGeometry(20, 35, 4);
    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.rotation.z = Math.PI / 4;
    marker.position.y = 2;
    marker.visible = false;
    this.sceneManager.add(marker);
    return marker;
  }

  private createStatusUI(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 14px;
      background: rgba(0,0,0,0.5);
      padding: 10px;
      border-radius: 5px;
    `;
    div.innerHTML = 'Connecting...';
    document.body.appendChild(div);
    return div;
  }

  private updateStatus(): void {
    const playerCount = this.otherPlayers.size + 1;
    const tile = this.player.getTilePosition();
    this.statusText.innerHTML = `
      ${this.network.isConnected() ? '🟢 Connected' : '🔴 Disconnected'}<br>
      Player ID: ${this.playerId}<br>
      Players online: ${playerCount}<br>
      Position: ${tile.x}, ${tile.z}<br>
      <br>
      <small>Q/E: Rotate | Scroll: Zoom</small><br>
      <small>SHIFT: Run | Click: Move</small>
    `;
  }

  // ==================
  // Input
  // ==================

  private onClick(event: MouseEvent): void {
    if (this.isInDemoMode()) return;

    const rect = this.gameRenderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.gameCamera.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, target);

    if (target) {
      const targetTile: TilePosition = {
        x: Math.round(target.x / TILE_SIZE),
        z: Math.round(target.z / TILE_SIZE)
      };

      const currentTile = this.player.getTilePosition();
      const path = Pathfinder.calculatePath(currentTile, targetTile);

      if (path.length > 0) {
        this.player.setPath(path);
        this.clickMarker.position.x = targetTile.x * TILE_SIZE;
        this.clickMarker.position.z = targetTile.z * TILE_SIZE;
        this.clickMarker.visible = true;
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.isInDemoMode()) return;

    if (event.key === 'Shift') {
      this.player.isRunning = true;
    }
    if (event.key === 'ArrowLeft' || event.key === 'q' || event.key === 'Q') {
      this.gameCamera.setTargetAngle(this.gameCamera.getTargetAngle() + 90);
    }
    if (event.key === 'ArrowRight' || event.key === 'e' || event.key === 'E') {
      this.gameCamera.setTargetAngle(this.gameCamera.getTargetAngle() - 90);
    }
    if (event.key === 'ArrowUp' || event.key === '=' || event.key === '+') {
      this.gameCamera.setTargetZoom(this.gameCamera.getTargetZoom() - 100);
    }
    if (event.key === 'ArrowDown' || event.key === '-' || event.key === '_') {
      this.gameCamera.setTargetZoom(this.gameCamera.getTargetZoom() + 100);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.player.isRunning = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (this.isInDemoMode()) return;
    const zoomDelta = event.deltaY > 0 ? 100 : -100;
    this.gameCamera.setTargetZoom(this.gameCamera.getTargetZoom() + zoomDelta);
  }

  private onResize(): void {
    this.gameCamera.resize(window.innerWidth / window.innerHeight);
    this.gameRenderer.resize(window.innerWidth, window.innerHeight);
  }

  // ==================
  // Game Loop
  // ==================

  private updateFakePlayers(delta: number): void {
    const WALK_SPEED = 2.5;
    for (const [, player] of this.fakePlayers) {
      const dx = player.targetPosition.x - player.mesh.position.x;
      const dz = player.targetPosition.z - player.mesh.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 1) {
        const speed = WALK_SPEED * TILE_SIZE;
        const moveDistance = Math.min(speed * delta, distance);
        player.mesh.position.x += (dx / distance) * moveDistance;
        player.mesh.position.z += (dz / distance) * moveDistance;
        player.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Update demo system
    if (this.demoRunner?.isRunning()) {
      this.demoRunner.update(delta);
    }

    // Update game
    const reachedDest = this.player.update(delta);
    if (reachedDest) {
      this.clickMarker.visible = false;
    }

    // Send position updates while moving
    if (this.player.isMoving()) {
      const tile = this.player.getTilePosition();
      this.network.send('player_move', {
        target: { x: tile.x, y: tile.z, level: 0 }
      });
    }

    this.otherPlayers.update(delta);
    this.updateFakePlayers(delta);
    this.world.updateLoadedTiles(this.player.mesh.position.x, this.player.mesh.position.z);
    this.updateStatus();

    if (this.clickMarker.visible) {
      this.clickMarker.rotation.z += delta * 2;
    }

    // Update camera
    this.gameCamera.update(delta, this.player.mesh.position);

    // Update engine systems
    this.terrainRenderer.updateCamera(this.gameCamera.camera.position);
    this.lighting.updateShadowTarget(this.player.mesh.position);
    this.atmosphere.update(this.gameCamera.camera.position);
    this.water.update(delta, this.gameCamera.camera.position);

    // Render
    this.gameRenderer.render();
  }
}

// Create game instance and expose for console access
const game = new Game();
(window as any).game = game;
