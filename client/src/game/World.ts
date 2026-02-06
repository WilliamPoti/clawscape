import * as THREE from 'three';
import { TILE_SIZE, CHUNK_SIZE, WorldMap } from '@clawscape/shared';
import { TilePosition } from './Player.js';

interface TileMesh {
  mesh: THREE.Mesh;
  obstacle?: THREE.Mesh;
}

const RENDER_DISTANCE = 2; // chunks

export class World {
  private worldMap: WorldMap;
  private loadedTiles: Map<string, TileMesh> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.worldMap = new WorldMap();
  }

  updateLoadedTiles(playerX: number, playerZ: number): void {
    const playerTileX = Math.floor(playerX / TILE_SIZE);
    const playerTileZ = Math.floor(playerZ / TILE_SIZE);
    const radius = RENDER_DISTANCE * CHUNK_SIZE;

    // Load tiles around player
    for (let z = playerTileZ - radius; z <= playerTileZ + radius; z++) {
      for (let x = playerTileX - radius; x <= playerTileX + radius; x++) {
        const key = `${x},${z}`;
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

  isWalkable(tileX: number, tileY: number): boolean {
    return this.worldMap.isWalkable(tileX, tileY);
  }

  private loadTile(tileX: number, tileZ: number): void {
    const tile = this.worldMap.getTile(tileX, tileZ);
    if (!tile) return;

    const geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);

    // Simple checker pattern
    const isLight = (tileX + tileZ) % 2 === 0;
    const color = isLight ? 0x2A5A4A : 0x1F4A3A;

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.05,
      metalness: 0.3,
      roughness: 0.7
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(tileX * TILE_SIZE, 0, tileZ * TILE_SIZE);
    this.scene.add(mesh);

    this.loadedTiles.set(`${tileX},${tileZ}`, { mesh });
  }
}

export class Pathfinder {
  static calculatePath(from: TilePosition, to: TilePosition): TilePosition[] {
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
      openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
      const current = openSet.shift()!;

      if (current.x === to.x && current.z === to.z) {
        const path: TilePosition[] = [];
        let node: TilePosition | undefined = current;
        while (node && !(node.x === from.x && node.z === from.z)) {
          path.unshift(node);
          node = cameFrom.get(key(node));
        }
        return path;
      }

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

      if (gScore.size > 1000) break;
    }

    return [];
  }
}
