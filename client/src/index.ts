import * as THREE from 'three';
import { TILE_SIZE, PlayerUpdate, NetworkMessage } from '@clawscape/shared';

// ============================================
// ClawScape Client - Phase 1: Multiplayer
// ============================================

const WALK_SPEED = 2.5;
const RUN_SPEED = 5;
const SERVER_URL = 'ws://localhost:3000';

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

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

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
  private statusText: HTMLDivElement;

  // Camera
  private cameraAngle: number = 0; // 0, 90, 180, 270 degrees
  private cameraZoom: number = 800;
  private targetCameraAngle: number = 0;
  private targetCameraZoom: number = 800;
  private readonly MIN_ZOOM = 400;
  private readonly MAX_ZOOM = 1500;

  constructor() {
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
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Clock
    this.clock = new THREE.Clock();

    // Create world
    this.createGround();
    this.player = this.createPlayer(0xff6b6b); // Red for local player
    this.clickMarker = this.createClickMarker();
    this.setupLighting();
    this.statusText = this.createStatusUI();

    // Events
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Connect to server
    this.connect();

    // Start
    this.animate();
    console.log('ClawScape initialized');
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
    this.statusText.innerHTML = `
      ${this.connected ? '🟢 Connected' : '🔴 Disconnected'}<br>
      Player ID: ${this.playerId}<br>
      Players online: ${playerCount}<br>
      <br>
      <small>Q/E or ←→: Rotate camera</small><br>
      <small>Scroll or ↑↓: Zoom</small><br>
      <small>SHIFT: Run</small>
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
      // Try to reconnect after 3 seconds
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

    const mesh = this.createPlayer(0x6b9fff); // Blue for other players
    mesh.position.set(position.x * TILE_SIZE, 60, position.y * TILE_SIZE);

    // Add name label
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

  private createGround(): void {
    const gridSize = 20;
    const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);

    for (let x = -gridSize / 2; x < gridSize / 2; x++) {
      for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        const isLight = (x + z) % 2 === 0;
        const material = new THREE.MeshStandardMaterial({
          color: isLight ? 0x4a7c4e : 0x3d6b40,
        });

        const tile = new THREE.Mesh(geometry, material);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x * TILE_SIZE, 0, z * TILE_SIZE);
        this.scene.add(tile);
      }
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

  private createClickMarker(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(20, 35, 4);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
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

      const currentTile: TilePosition = {
        x: Math.round(this.player.position.x / TILE_SIZE),
        z: Math.round(this.player.position.z / TILE_SIZE)
      };

      this.path = this.calculatePath(currentTile, targetTile);

      this.clickMarker.position.x = targetTile.x * TILE_SIZE;
      this.clickMarker.position.z = targetTile.z * TILE_SIZE;
      this.clickMarker.visible = true;
    }
  }

  private calculatePath(from: TilePosition, to: TilePosition): TilePosition[] {
    const path: TilePosition[] = [];
    let x = from.x;
    let z = from.z;

    while (x !== to.x || z !== to.z) {
      if (x < to.x) x++;
      else if (x > to.x) x--;

      if (z < to.z) z++;
      else if (z > to.z) z--;

      path.push({ x, z });
    }

    return path;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isRunning = true;
    }
    // Camera rotation - arrow keys or Q/E
    if (event.key === 'ArrowLeft' || event.key === 'q' || event.key === 'Q') {
      this.targetCameraAngle += 90;
    }
    if (event.key === 'ArrowRight' || event.key === 'e' || event.key === 'E') {
      this.targetCameraAngle -= 90;
    }
    // Camera zoom - arrow up/down or +/-
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

        // Send position to server
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

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.updateMovement(delta);
    this.updateOtherPlayers(delta);

    if (this.clickMarker.visible) {
      this.clickMarker.rotation.z += delta * 2;
    }

    // Smooth camera rotation
    const angleDiff = this.targetCameraAngle - this.cameraAngle;
    this.cameraAngle += angleDiff * delta * 8;

    // Smooth camera zoom
    const zoomDiff = this.targetCameraZoom - this.cameraZoom;
    this.cameraZoom += zoomDiff * delta * 8;

    // Calculate camera position based on angle and zoom
    const angleRad = (this.cameraAngle * Math.PI) / 180;
    const cameraOffset = new THREE.Vector3(
      Math.sin(angleRad) * this.cameraZoom,
      this.cameraZoom,
      Math.cos(angleRad) * this.cameraZoom
    );
    this.camera.position.copy(this.player.position).add(cameraOffset);
    this.camera.lookAt(this.player.position);

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
