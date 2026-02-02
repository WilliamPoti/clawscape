import * as THREE from 'three';
import { TILE_SIZE } from '@clawscape/shared';

// ============================================
// ClawScape Client - Phase 0 Foundation
// ============================================

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Temporary player cube (will be replaced with model)
  private player: THREE.Mesh;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Camera - isometric-ish angle like RS
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

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Create ground
    this.createGround();

    // Create player placeholder
    this.player = this.createPlayer();

    // Lighting
    this.setupLighting();

    // Events
    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('click', (e) => this.onClick(e));

    // Start game loop
    this.animate();

    console.log('ClawScape initialized');
  }

  private createGround(): void {
    // Simple grid of tiles
    const gridSize = 20;
    const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);

    for (let x = -gridSize / 2; x < gridSize / 2; x++) {
      for (let z = -gridSize / 2; z < gridSize / 2; z++) {
        // Checkerboard pattern
        const isLight = (x + z) % 2 === 0;
        const material = new THREE.MeshStandardMaterial({
          color: isLight ? 0x4a7c4e : 0x3d6b40, // Grass greens
        });

        const tile = new THREE.Mesh(geometry, material);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x * TILE_SIZE, 0, z * TILE_SIZE);
        this.scene.add(tile);
      }
    }
  }

  private createPlayer(): THREE.Mesh {
    // Placeholder cube for player
    const geometry = new THREE.BoxGeometry(60, 120, 60);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    const player = new THREE.Mesh(geometry, material);
    player.position.set(0, 60, 0); // Half height above ground
    this.scene.add(player);
    return player;
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(500, 1000, 500);
    sun.castShadow = true;
    this.scene.add(sun);
  }

  private onClick(event: MouseEvent): void {
    // Convert click to world position
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Raycast to ground
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Create ground plane for intersection
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, target);

    if (target) {
      // Snap to tile grid
      const tileX = Math.round(target.x / TILE_SIZE) * TILE_SIZE;
      const tileZ = Math.round(target.z / TILE_SIZE) * TILE_SIZE;

      // Move player (instant for now, will add pathfinding later)
      this.player.position.x = tileX;
      this.player.position.z = tileZ;

      console.log(`Moved to tile: ${tileX / TILE_SIZE}, ${tileZ / TILE_SIZE}`);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Update camera to follow player
    const cameraOffset = new THREE.Vector3(0, 800, 800);
    this.camera.position.copy(this.player.position).add(cameraOffset);
    this.camera.lookAt(this.player.position);

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game
new Game();
