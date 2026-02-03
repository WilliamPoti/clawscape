import * as THREE from 'three';
import {
  TILE_SIZE,
  CHUNK_SIZE,
  TileTexture,
  TILE_BLOCKED,
  WorldMap,
  PlayerUpdate,
  NetworkMessage
} from '@clawscape/shared';
import { DemoRunner, DemoRecorder, getDemoScript, DemoGameControls } from './demos/index.js';

// ============================================
// ClawScape Client - Phase 1: World Map System
// ============================================

const WALK_SPEED = 2.5;
const RUN_SPEED = 5;
const SERVER_URL = 'ws://localhost:3000';
const RENDER_DISTANCE = 2; // chunks

// Tile colors
const TILE_COLORS: Record<TileTexture, number> = {
  [TileTexture.GRASS_LIGHT]: 0x4a7c4e,
  [TileTexture.GRASS_DARK]: 0x3d6b40,
  [TileTexture.DIRT]: 0x8b6914,
  [TileTexture.STONE]: 0x707070,
  [TileTexture.WATER]: 0x3498db,
  [TileTexture.SAND]: 0xc2b280,
  [TileTexture.WOOD]: 0x8b4513,
};

interface TilePosition {
  x: number;
  z: number;
}

interface OtherPlayer {
  id: number;
  mesh: THREE.Mesh;
  targetPosition: THREE.Vector3;
  username: string;
}

interface TileMesh {
  mesh: THREE.Mesh;
  obstacle?: THREE.Mesh;
}

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // World map
  private worldMap: WorldMap;
  private loadedTiles: Map<string, TileMesh> = new Map();

  // Network
  private socket: WebSocket | null = null;
  private playerId: number = -1;
  private connected: boolean = false;

  // Player
  private player: THREE.Mesh;
  private path: TilePosition[] = [];
  private currentTarget: TilePosition | null = null;
  private isRunning: boolean = false;

  // Other players
  private otherPlayers: Map<number, OtherPlayer> = new Map();

  // UI
  private clickMarker: THREE.Mesh;
  private blockedMarker: THREE.Mesh;
  private statusText: HTMLDivElement;

  // Camera
  private cameraAngle: number = 0;
  private cameraZoom: number = 800;
  private targetCameraAngle: number = 0;
  private targetCameraZoom: number = 800;
  private readonly MIN_ZOOM = 400;
  private readonly MAX_ZOOM = 1500;

  // Demo system
  private demoRunner: DemoRunner | null = null;
  private demoRecorder: DemoRecorder | null = null;
  private fakePlayers: Map<number, OtherPlayer> = new Map();

  // Recording canvas (composites game + captions + logo)
  private recordingCanvas: HTMLCanvasElement | null = null;
  private recordingCtx: CanvasRenderingContext2D | null = null;
  private recordingLogo: HTMLImageElement | null = null;

  constructor() {
    this.worldMap = new WorldMap();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 800, 800);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Clock
    this.clock = new THREE.Clock();

    // Create world
    this.player = this.createPlayer(0xff6b6b);
    this.clickMarker = this.createClickMarker(0xffff00);
    this.blockedMarker = this.createClickMarker(0xff0000);
    this.blockedMarker.visible = false;
    this.setupLighting();
    this.statusText = this.createStatusUI();

    // Initial tile load
    this.updateLoadedTiles();

    // Events
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Connect to server
    this.connect();

    // Initialize demo system
    this.initDemoSystem();

    // Start
    this.animate();
    console.log('ClawScape initialized - World Map System');
  }

  // ==================
  // Demo System
  // ==================

  private initDemoSystem(): void {
    // Create demo controls interface
    const controls: DemoGameControls = {
      setPlayerTarget: (x, z) => this.setPlayerTarget(x, z),
      getPlayerTilePosition: () => this.getPlayerTilePosition(),
      isPlayerMoving: () => this.isPlayerMoving(),
      setCameraAngle: (angle) => { this.targetCameraAngle = angle; },
      setCameraZoom: (zoom) => { this.targetCameraZoom = zoom; },
      createFakePlayer: (id, x, z, name) => this.createFakePlayer(id, x, z, name),
      moveFakePlayer: (id, x, z) => this.moveFakePlayer(id, x, z),
      removeFakePlayer: (id) => this.removeFakePlayer(id),
      showBlockedFeedback: (x, z) => this.showBlockedFeedback(x, z),
      setRunning: (running) => { this.isRunning = running; },
    };

    this.demoRunner = new DemoRunner(controls);
    this.demoRecorder = new DemoRecorder();

    // Check URL for demo parameter
    this.checkDemoUrl();
  }

  private checkDemoUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const demoName = params.get('demo');
    const shouldRecord = params.has('record');

    if (demoName) {
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        this.runDemo(demoName, shouldRecord);
      }, 500);
    }
  }

  runDemo(name: string, record: boolean = false): void {
    const script = getDemoScript(name);
    if (!script) {
      console.error(`Demo not found: ${name}`);
      console.log('Available demos:', ['movement', 'multiplayer', 'camera', 'pathfinding']);
      return;
    }

    console.log(`Running demo: ${name}${record ? ' (recording)' : ''}`);

    if (record && this.demoRecorder) {
      // Create recording canvas for compositing game + captions + logo
      this.recordingCanvas = document.createElement('canvas');
      this.recordingCanvas.width = this.renderer.domElement.width;
      this.recordingCanvas.height = this.renderer.domElement.height;
      this.recordingCtx = this.recordingCanvas.getContext('2d');

      // Load logo for recording
      this.recordingLogo = new Image();
      this.recordingLogo.src = '/assets/logo.png';

      this.demoRecorder.startRecording(this.recordingCanvas);
    }

    this.demoRunner?.start(script, () => {
      // On complete
      if (record && this.demoRecorder) {
        this.demoRecorder.stopAndDownload(name);
        this.recordingCanvas = null;
        this.recordingCtx = null;
        this.recordingLogo = null;
      }
      console.log('Demo complete');
    });
  }

  private setPlayerTarget(x: number, z: number): void {
    const currentTile = this.getPlayerTilePosition();
    this.path = this.calculatePath(currentTile, { x, z });
    if (this.path.length > 0) {
      this.clickMarker.position.x = x * TILE_SIZE;
      this.clickMarker.position.z = z * TILE_SIZE;
      this.clickMarker.visible = true;
    }
  }

  private getPlayerTilePosition(): { x: number; z: number } {
    return {
      x: Math.round(this.player.position.x / TILE_SIZE),
      z: Math.round(this.player.position.z / TILE_SIZE)
    };
  }

  private isPlayerMoving(): boolean {
    return this.currentTarget !== null || this.path.length > 0;
  }

  private createFakePlayer(id: number, x: number, z: number, name: string): THREE.Mesh {
    const mesh = this.createPlayer(0x6b9fff);
    mesh.position.set(x * TILE_SIZE, 60, z * TILE_SIZE);

    const label = this.createPlayerLabel(name);
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
      this.scene.remove(player.mesh);
      this.fakePlayers.delete(id);
    }
  }

  private showBlockedFeedback(x: number, z: number): void {
    this.blockedMarker.position.x = x * TILE_SIZE;
    this.blockedMarker.position.z = z * TILE_SIZE;
    this.blockedMarker.visible = true;
    setTimeout(() => { this.blockedMarker.visible = false; }, 500);
  }

  isInDemoMode(): boolean {
    return this.demoRunner?.isRunning() ?? false;
  }

  private getTileKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  private updateLoadedTiles(): void {
    const playerTileX = Math.floor(this.player.position.x / TILE_SIZE);
    const playerTileZ = Math.floor(this.player.position.z / TILE_SIZE);
    const radius = RENDER_DISTANCE * CHUNK_SIZE;

    // Load tiles around player
    for (let z = playerTileZ - radius; z <= playerTileZ + radius; z++) {
      for (let x = playerTileX - radius; x <= playerTileX + radius; x++) {
        const key = this.getTileKey(x, z);
        if (!this.loadedTiles.has(key)) {
          this.loadTile(x, z);
        }
      }
    }

    // Unload distant tiles
    for (const [key, tileMesh] of this.loadedTiles) {
      const [tx, tz] = key.split(',').map(Number);
      if (
        Math.abs(tx - playerTileX) > radius + CHUNK_SIZE ||
        Math.abs(tz - playerTileZ) > radius + CHUNK_SIZE
      ) {
        this.scene.remove(tileMesh.mesh);
        if (tileMesh.obstacle) this.scene.remove(tileMesh.obstacle);
        this.loadedTiles.delete(key);
      }
    }
  }

  private loadTile(tileX: number, tileZ: number): void {
    const tile = this.worldMap.getTile(tileX, tileZ);
    if (!tile) return;

    const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    const color = TILE_COLORS[tile.texture] ?? 0xff00ff;
    const material = new THREE.MeshStandardMaterial({ color });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(tileX * TILE_SIZE, tile.height, tileZ * TILE_SIZE);
    this.scene.add(mesh);

    const tileMesh: TileMesh = { mesh };

    // Add obstacle visual for blocked tiles
    if (tile.flags & TILE_BLOCKED) {
      if (tile.texture === TileTexture.STONE) {
        // Rock obstacle
        const rockGeo = new THREE.DodecahedronGeometry(40);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(tileX * TILE_SIZE, tile.height + 40, tileZ * TILE_SIZE);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        this.scene.add(rock);
        tileMesh.obstacle = rock;
      }
    }

    this.loadedTiles.set(this.getTileKey(tileX, tileZ), tileMesh);
  }

  private createStatusUI(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 10px;
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
    const tileX = Math.round(this.player.position.x / TILE_SIZE);
    const tileZ = Math.round(this.player.position.z / TILE_SIZE);
    this.statusText.innerHTML = `
      ${this.connected ? '🟢 Connected' : '🔴 Disconnected'}<br>
      Player ID: ${this.playerId}<br>
      Players online: ${playerCount}<br>
      Position: ${tileX}, ${tileZ}<br>
      <br>
      <small>Q/E: Rotate | Scroll: Zoom</small><br>
      <small>SHIFT: Run | Click: Move</small>
    `;
  }

  private connect(): void {
    this.socket = new WebSocket(SERVER_URL);

    this.socket.onopen = () => {
      console.log('Connected to server');
      this.connected = true;
      this.updateStatus();
    };

    this.socket.onmessage = (event) => {
      const message: NetworkMessage = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.socket.onclose = () => {
      console.log('Disconnected from server');
      this.connected = false;
      this.updateStatus();
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private send(type: string, payload: unknown): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: NetworkMessage = {
        type: type as any,
        payload,
        timestamp: Date.now()
      };
      this.socket.send(JSON.stringify(message));
    }
  }

  private handleServerMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'auth':
        const authData = message.payload as { playerId: number };
        this.playerId = authData.playerId;
        console.log('Assigned player ID:', this.playerId);
        this.updateStatus();
        break;

      case 'player_update':
        const update = message.payload as PlayerUpdate;
        if (update.id !== this.playerId) {
          this.updateOtherPlayer(update);
        }
        break;

      case 'player_join':
        const joinData = message.payload as { id: number; position: { x: number; y: number } };
        if (joinData.id !== this.playerId) {
          this.addOtherPlayer(joinData.id, joinData.position);
        }
        break;

      case 'player_leave':
        const leaveData = message.payload as { id: number };
        this.removeOtherPlayer(leaveData.id);
        break;

      case 'players_list':
        const players = message.payload as Array<{ id: number; position: { x: number; y: number } }>;
        for (const p of players) {
          if (p.id !== this.playerId) {
            this.addOtherPlayer(p.id, p.position);
          }
        }
        break;
    }
  }

  private addOtherPlayer(id: number, position: { x: number; y: number }): void {
    if (this.otherPlayers.has(id)) return;

    const mesh = this.createPlayer(0x6b9fff);
    mesh.position.set(position.x * TILE_SIZE, 60, position.y * TILE_SIZE);

    const label = this.createPlayerLabel(`Player ${id}`);
    mesh.add(label);

    this.otherPlayers.set(id, {
      id,
      mesh,
      targetPosition: mesh.position.clone(),
      username: `Player ${id}`
    });

    console.log(`Player ${id} joined`);
    this.updateStatus();
  }

  private createPlayerLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 100;
    sprite.scale.set(100, 25, 1);
    return sprite;
  }

  private removeOtherPlayer(id: number): void {
    const player = this.otherPlayers.get(id);
    if (player) {
      this.scene.remove(player.mesh);
      this.otherPlayers.delete(id);
      console.log(`Player ${id} left`);
      this.updateStatus();
    }
  }

  private updateOtherPlayer(update: PlayerUpdate): void {
    let player = this.otherPlayers.get(update.id);

    if (!player) {
      this.addOtherPlayer(update.id, update.position);
      player = this.otherPlayers.get(update.id);
    }

    if (player) {
      player.targetPosition.set(
        update.position.x * TILE_SIZE,
        60,
        update.position.y * TILE_SIZE
      );
    }
  }

  private createPlayer(color: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(60, 120, 60);
    const material = new THREE.MeshStandardMaterial({ color });
    const player = new THREE.Mesh(geometry, material);
    player.position.set(0, 60, 0);
    this.scene.add(player);
    return player;
  }

  private createClickMarker(color: number): THREE.Mesh {
    const geometry = new THREE.RingGeometry(20, 35, 4);
    const material = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.rotation.z = Math.PI / 4;
    marker.position.y = 2;
    marker.visible = false;
    this.scene.add(marker);
    return marker;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(500, 1000, 500);
    this.scene.add(sun);
  }

  private onClick(event: MouseEvent): void {
    // Block input during demo
    if (this.isInDemoMode()) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, target);

    if (target) {
      const targetTile: TilePosition = {
        x: Math.round(target.x / TILE_SIZE),
        z: Math.round(target.z / TILE_SIZE)
      };

      // Check if target is walkable
      if (!this.worldMap.isWalkable(targetTile.x, targetTile.z)) {
        // Show red X marker briefly
        this.blockedMarker.position.x = targetTile.x * TILE_SIZE;
        this.blockedMarker.position.z = targetTile.z * TILE_SIZE;
        this.blockedMarker.visible = true;
        this.clickMarker.visible = false;
        setTimeout(() => { this.blockedMarker.visible = false; }, 500);
        return;
      }

      const currentTile: TilePosition = {
        x: Math.round(this.player.position.x / TILE_SIZE),
        z: Math.round(this.player.position.z / TILE_SIZE)
      };

      this.path = this.calculatePath(currentTile, targetTile);

      if (this.path.length > 0) {
        this.clickMarker.position.x = targetTile.x * TILE_SIZE;
        this.clickMarker.position.z = targetTile.z * TILE_SIZE;
        this.clickMarker.visible = true;
        this.blockedMarker.visible = false;
      }
    }
  }

  private calculatePath(from: TilePosition, to: TilePosition): TilePosition[] {
    // Simple A* pathfinding
    const openSet: TilePosition[] = [from];
    const cameFrom = new Map<string, TilePosition>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const key = (p: TilePosition) => `${p.x},${p.z}`;
    const heuristic = (a: TilePosition, b: TilePosition) =>
      Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

    gScore.set(key(from), 0);
    fScore.set(key(from), heuristic(from, to));

    while (openSet.length > 0) {
      // Get node with lowest fScore
      openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = openSet.shift()!;

      if (current.x === to.x && current.z === to.z) {
        // Reconstruct path
        const path: TilePosition[] = [];
        let node: TilePosition | undefined = current;
        while (node && !(node.x === from.x && node.z === from.z)) {
          path.unshift(node);
          node = cameFrom.get(key(node));
        }
        return path;
      }

      // Check neighbors (8 directions)
      const neighbors: TilePosition[] = [
        { x: current.x - 1, z: current.z },
        { x: current.x + 1, z: current.z },
        { x: current.x, z: current.z - 1 },
        { x: current.x, z: current.z + 1 },
        { x: current.x - 1, z: current.z - 1 },
        { x: current.x + 1, z: current.z - 1 },
        { x: current.x - 1, z: current.z + 1 },
        { x: current.x + 1, z: current.z + 1 },
      ];

      for (const neighbor of neighbors) {
        if (!this.worldMap.isWalkable(neighbor.x, neighbor.z)) continue;

        // Diagonal movement cost is higher
        const isDiagonal = neighbor.x !== current.x && neighbor.z !== current.z;
        const moveCost = isDiagonal ? 1.414 : 1;

        const tentativeG = (gScore.get(key(current)) ?? Infinity) + moveCost;

        if (tentativeG < (gScore.get(key(neighbor)) ?? Infinity)) {
          cameFrom.set(key(neighbor), current);
          gScore.set(key(neighbor), tentativeG);
          fScore.set(key(neighbor), tentativeG + heuristic(neighbor, to));

          if (!openSet.some(p => p.x === neighbor.x && p.z === neighbor.z)) {
            openSet.push(neighbor);
          }
        }
      }

      // Limit search to prevent freezing
      if (gScore.size > 1000) break;
    }

    return []; // No path found
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Block input during demo
    if (this.isInDemoMode()) return;

    if (event.key === 'Shift') {
      this.isRunning = true;
    }
    if (event.key === 'ArrowLeft' || event.key === 'q' || event.key === 'Q') {
      this.targetCameraAngle += 90;
    }
    if (event.key === 'ArrowRight' || event.key === 'e' || event.key === 'E') {
      this.targetCameraAngle -= 90;
    }
    if (event.key === 'ArrowUp' || event.key === '=' || event.key === '+') {
      this.targetCameraZoom = Math.max(this.MIN_ZOOM, this.targetCameraZoom - 100);
    }
    if (event.key === 'ArrowDown' || event.key === '-' || event.key === '_') {
      this.targetCameraZoom = Math.min(this.MAX_ZOOM, this.targetCameraZoom + 100);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isRunning = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    // Block input during demo
    if (this.isInDemoMode()) return;

    const zoomDelta = event.deltaY > 0 ? 100 : -100;
    this.targetCameraZoom = Math.max(
      this.MIN_ZOOM,
      Math.min(this.MAX_ZOOM, this.targetCameraZoom + zoomDelta)
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMovement(delta: number): void {
    if (!this.currentTarget && this.path.length > 0) {
      this.currentTarget = this.path.shift()!;
    }

    if (this.currentTarget) {
      const targetX = this.currentTarget.x * TILE_SIZE;
      const targetZ = this.currentTarget.z * TILE_SIZE;

      const dx = targetX - this.player.position.x;
      const dz = targetZ - this.player.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const speed = (this.isRunning ? RUN_SPEED : WALK_SPEED) * TILE_SIZE;
      const moveDistance = speed * delta;

      if (distance <= moveDistance) {
        this.player.position.x = targetX;
        this.player.position.z = targetZ;
        this.currentTarget = null;

        this.send('player_move', {
          target: {
            x: Math.round(this.player.position.x / TILE_SIZE),
            y: Math.round(this.player.position.z / TILE_SIZE),
            level: 0
          }
        });

        if (this.path.length === 0) {
          this.clickMarker.visible = false;
        }
      } else {
        const moveX = (dx / distance) * moveDistance;
        const moveZ = (dz / distance) * moveDistance;
        this.player.position.x += moveX;
        this.player.position.z += moveZ;
        this.player.rotation.y = Math.atan2(dx, dz);
      }
    }
  }

  private updateOtherPlayers(delta: number): void {
    for (const [, player] of this.otherPlayers) {
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

  private updateFakePlayers(delta: number): void {
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

    this.updateMovement(delta);
    this.updateOtherPlayers(delta);
    this.updateFakePlayers(delta);
    this.updateLoadedTiles();
    this.updateStatus();

    if (this.clickMarker.visible) {
      this.clickMarker.rotation.z += delta * 2;
    }
    if (this.blockedMarker.visible) {
      this.blockedMarker.rotation.z -= delta * 4;
    }

    // Smooth camera
    const angleDiff = this.targetCameraAngle - this.cameraAngle;
    this.cameraAngle += angleDiff * delta * 8;

    const zoomDiff = this.targetCameraZoom - this.cameraZoom;
    this.cameraZoom += zoomDiff * delta * 8;

    const angleRad = (this.cameraAngle * Math.PI) / 180;
    const cameraOffset = new THREE.Vector3(
      Math.sin(angleRad) * this.cameraZoom,
      this.cameraZoom,
      Math.cos(angleRad) * this.cameraZoom
    );
    this.camera.position.copy(this.player.position).add(cameraOffset);
    this.camera.lookAt(this.player.position);

    this.renderer.render(this.scene, this.camera);

    // Composite to recording canvas if recording
    if (this.recordingCtx && this.recordingCanvas && this.demoRunner) {
      const ctx = this.recordingCtx;
      const width = this.recordingCanvas.width;
      const height = this.recordingCanvas.height;

      // Draw game frame
      ctx.drawImage(this.renderer.domElement, 0, 0);

      // Draw caption - Future Buddy palette
      const caption = this.demoRunner.getCaption();
      if (caption) {
        const fontSize = Math.round(height * 0.04);
        ctx.font = `bold ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const centerX = width / 2;
        const centerY = Math.round(height * 0.08);
        const padding = fontSize * 0.8;
        const textMetrics = ctx.measureText(caption);
        const boxWidth = textMetrics.width + padding * 3;
        const boxHeight = fontSize + padding * 1.2;
        const boxX = centerX - boxWidth / 2;
        const boxY = centerY - boxHeight / 2;

        // Outer glow (cyan + purple)
        ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
        ctx.shadowBlur = 25;
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        ctx.fill();

        // Background with violet gradient
        const gradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
        gradient.addColorStop(0, 'rgba(34, 0, 102, 0.9)');
        gradient.addColorStop(0.5, 'rgba(16, 8, 32, 0.95)');
        gradient.addColorStop(1, 'rgba(34, 0, 102, 0.9)');
        ctx.shadowBlur = 0;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        ctx.fill();

        // Border (gold)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
        ctx.stroke();

        // Inner highlight line at top
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(boxX + 10, boxY + 1);
        ctx.lineTo(boxX + boxWidth - 10, boxY + 1);
        ctx.stroke();

        // Text glow (purple/cyan)
        ctx.shadowColor = 'rgba(136, 0, 255, 0.8)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Magenta text with gradient
        const textGradient = ctx.createLinearGradient(centerX, centerY - fontSize/2, centerX, centerY + fontSize/2);
        textGradient.addColorStop(0, '#CC00FF');
        textGradient.addColorStop(0.5, '#AA00DD');
        textGradient.addColorStop(1, '#8800FF');
        ctx.fillStyle = textGradient;
        ctx.fillText(caption, centerX, centerY);

        // Reset shadow
        ctx.shadowBlur = 0;
      }

      // Draw logo in center
      if (this.recordingLogo && this.recordingLogo.complete) {
        const logoSize = Math.round(height * 0.15);
        const logoX = (width - logoSize) / 2;
        const logoY = (height - logoSize) / 2;

        // Logo glow
        ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
        ctx.shadowBlur = 20;
        ctx.drawImage(this.recordingLogo, logoX, logoY, logoSize, logoSize);
        ctx.shadowBlur = 0;
      }
    }
  }
}

// Create game instance and expose for console access
const game = new Game();
(window as any).game = game;
