import * as THREE from 'three';
import { TILE_SIZE } from '@clawscape/shared';

// ============================================
// ClawScape Client - Phase 1: Smooth Movement
// ============================================

// Movement speed (tiles per second)
const WALK_SPEED = 2.5;
const RUN_SPEED = 5;

interface TilePosition {
  x: number;
  z: number;
}

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Player
  private player: THREE.Mesh;
  private path: TilePosition[] = [];
  private currentTarget: TilePosition | null = null;
  private isRunning: boolean = false;

  // Click marker
  private clickMarker: THREE.Mesh;

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
    this.player = this.createPlayer();
    this.clickMarker = this.createClickMarker();
    this.setupLighting();

    // Events
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Start
    this.animate();
    console.log('ClawScape initialized - Click to move, hold SHIFT to run');
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

  private createPlayer(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(60, 120, 60);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    const player = new THREE.Mesh(geometry, material);
    player.position.set(0, 60, 0);
    this.scene.add(player);
    return player;
  }

  private createClickMarker(): THREE.Mesh {
    // Yellow X marker where you clicked
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
      // Get target tile
      const targetTile: TilePosition = {
        x: Math.round(target.x / TILE_SIZE),
        z: Math.round(target.z / TILE_SIZE)
      };

      // Get current tile
      const currentTile: TilePosition = {
        x: Math.round(this.player.position.x / TILE_SIZE),
        z: Math.round(this.player.position.z / TILE_SIZE)
      };

      // Calculate path (simple straight line for now)
      this.path = this.calculatePath(currentTile, targetTile);

      // Show click marker
      this.clickMarker.position.x = targetTile.x * TILE_SIZE;
      this.clickMarker.position.z = targetTile.z * TILE_SIZE;
      this.clickMarker.visible = true;

      console.log(`Walking to tile: ${targetTile.x}, ${targetTile.z}`);
    }
  }

  private calculatePath(from: TilePosition, to: TilePosition): TilePosition[] {
    // Simple line path (will replace with A* later)
    const path: TilePosition[] = [];

    let x = from.x;
    let z = from.z;

    while (x !== to.x || z !== to.z) {
      // Move one step closer
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
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.isRunning = false;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMovement(delta: number): void {
    // Get next target from path
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
        // Reached target tile
        this.player.position.x = targetX;
        this.player.position.z = targetZ;
        this.currentTarget = null;

        // Hide marker when reached final destination
        if (this.path.length === 0) {
          this.clickMarker.visible = false;
        }
      } else {
        // Move toward target
        const moveX = (dx / distance) * moveDistance;
        const moveZ = (dz / distance) * moveDistance;
        this.player.position.x += moveX;
        this.player.position.z += moveZ;

        // Face movement direction
        this.player.rotation.y = Math.atan2(dx, dz);
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Update player movement
    this.updateMovement(delta);

    // Rotate click marker
    if (this.clickMarker.visible) {
      this.clickMarker.rotation.z += delta * 2;
    }

    // Camera follow
    const cameraOffset = new THREE.Vector3(0, 800, 800);
    this.camera.position.copy(this.player.position).add(cameraOffset);
    this.camera.lookAt(this.player.position);

    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
