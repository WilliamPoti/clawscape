import * as THREE from 'three';
import { TILE_SIZE } from '@clawscape/shared';

export interface TilePosition {
  x: number;
  z: number;
}

export interface OtherPlayer {
  id: number;
  mesh: THREE.Mesh;
  targetPosition: THREE.Vector3;
  username: string;
}

const WALK_SPEED = 2.5;
const RUN_SPEED = 5;

export class PlayerController {
  readonly mesh: THREE.Mesh;
  private path: TilePosition[] = [];
  private currentTarget: TilePosition | null = null;
  isRunning: boolean = false;

  constructor(scene: THREE.Scene) {
    this.mesh = this.createPlayerMesh(0xFF6EC7); // Sunset Pink
    this.mesh.position.set(0, 60, 0);
    scene.add(this.mesh);
  }

  setTarget(x: number, z: number, path: TilePosition[]): void {
    this.path = path;
  }

  setPath(path: TilePosition[]): void {
    this.path = path;
  }

  getTilePosition(): TilePosition {
    return {
      x: Math.round(this.mesh.position.x / TILE_SIZE),
      z: Math.round(this.mesh.position.z / TILE_SIZE)
    };
  }

  isMoving(): boolean {
    return this.currentTarget !== null || this.path.length > 0;
  }

  update(delta: number): boolean {
    if (!this.currentTarget && this.path.length > 0) {
      this.currentTarget = this.path.shift()!;
    }

    if (this.currentTarget) {
      const targetX = this.currentTarget.x * TILE_SIZE;
      const targetZ = this.currentTarget.z * TILE_SIZE;

      const dx = targetX - this.mesh.position.x;
      const dz = targetZ - this.mesh.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const speed = (this.isRunning ? RUN_SPEED : WALK_SPEED) * TILE_SIZE;
      const moveDistance = speed * delta;

      if (distance <= moveDistance) {
        this.mesh.position.x = targetX;
        this.mesh.position.z = targetZ;
        this.currentTarget = null;

        if (this.path.length === 0) {
          return true; // Reached final destination
        }
      } else {
        const moveX = (dx / distance) * moveDistance;
        const moveZ = (dz / distance) * moveDistance;
        this.mesh.position.x += moveX;
        this.mesh.position.z += moveZ;
        this.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }

    return false;
  }

  private createPlayerMesh(color: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(60, 120, 60);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2
    });
    return new THREE.Mesh(geometry, material);
  }

  static createOtherPlayerMesh(scene: THREE.Scene, color: number = 0x00F0FF): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(60, 120, 60);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    return mesh;
  }

  static createPlayerLabel(text: string): THREE.Sprite {
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
}

export class OtherPlayersManager {
  private players: Map<number, OtherPlayer> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  add(id: number, position: { x: number; y: number }): void {
    if (this.players.has(id)) return;

    const mesh = PlayerController.createOtherPlayerMesh(this.scene);
    mesh.position.set(position.x * TILE_SIZE, 60, position.y * TILE_SIZE);

    const label = PlayerController.createPlayerLabel(`Player ${id}`);
    mesh.add(label);

    this.players.set(id, {
      id,
      mesh,
      targetPosition: mesh.position.clone(),
      username: `Player ${id}`
    });
  }

  remove(id: number): void {
    const player = this.players.get(id);
    if (player) {
      this.scene.remove(player.mesh);
      this.players.delete(id);
    }
  }

  updateTarget(id: number, position: { x: number; y: number }): void {
    let player = this.players.get(id);
    if (!player) {
      this.add(id, position);
      player = this.players.get(id);
    }
    if (player) {
      player.targetPosition.set(position.x * TILE_SIZE, 60, position.y * TILE_SIZE);
    }
  }

  update(delta: number): void {
    for (const [, player] of this.players) {
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

  get size(): number {
    return this.players.size;
  }

  has(id: number): boolean {
    return this.players.has(id);
  }
}
