// ClawScape Model Loading System
// Loads glTF models with LOD, instancing, and loc placement.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MapSquare, MapLoc, LocConfig } from '@clawscape/shared';

const TILE_SIZE = 128;

interface LoadedModel {
  scene: THREE.Group;
  config: LocConfig;
}

export class ModelSystem {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private modelCache: Map<string, THREE.Group> = new Map();
  private locConfigs: Map<number, LocConfig> = new Map();
  private placedObjects: THREE.Object3D[] = [];
  private placeholderMaterials: Map<string, THREE.Material> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
  }

  /** Set loc configs from JSON */
  setLocConfigs(configs: LocConfig[]): void {
    this.locConfigs.clear();
    for (const config of configs) {
      this.locConfigs.set(config.id, config);
    }
  }

  /** Load a glTF model (cached) */
  async loadModel(path: string): Promise<THREE.Group | null> {
    if (this.modelCache.has(path)) {
      return this.modelCache.get(path)!.clone();
    }

    try {
      const gltf = await this.loader.loadAsync(path);
      const model = gltf.scene;

      // Enable shadows
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.modelCache.set(path, model);
      return model.clone();
    } catch {
      return null;
    }
  }

  /** Place locs from a map square */
  async placeLocsFromMap(mapSquare: MapSquare): Promise<void> {
    const offsetX = mapSquare.regionX * 64 * TILE_SIZE;
    const offsetZ = mapSquare.regionY * 64 * TILE_SIZE;

    for (const loc of mapSquare.locs) {
      const config = this.locConfigs.get(loc.id);
      if (!config) continue;

      // Try to load glTF model
      let object: THREE.Object3D;
      if (config.model) {
        const model = await this.loadModel(config.model);
        if (model) {
          object = model;
        } else {
          // Fallback to placeholder
          object = this.createPlaceholder(config);
        }
      } else {
        object = this.createPlaceholder(config);
      }

      // Position on the map
      const worldX = offsetX + loc.x * TILE_SIZE + TILE_SIZE / 2;
      const worldZ = offsetZ + loc.y * TILE_SIZE + TILE_SIZE / 2;

      // Get terrain height at this position (approximate from map data)
      const tileData = mapSquare.tiles[loc.level]?.[loc.y]?.[loc.x];
      const worldY = tileData
        ? (tileData.heights.sw + tileData.heights.se + tileData.heights.ne + tileData.heights.nw) / 4
        : 0;

      object.position.set(worldX, worldY, worldZ);
      object.rotation.y = (loc.rotation * Math.PI) / 2;

      // Enable shadows
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.scene.add(object);
      this.placedObjects.push(object);
    }
  }

  /** Create a placeholder mesh when no glTF model is available */
  private createPlaceholder(config: LocConfig): THREE.Object3D {
    const name = config.name.toLowerCase();
    let geometry: THREE.BufferGeometry;
    let color: number;
    let scaleY = 1;

    if (name.includes('tree')) {
      // Tree: cylinder trunk + cone foliage
      const group = new THREE.Group();

      const trunkGeo = new THREE.CylinderGeometry(8, 12, 80, 8);
      const trunkMat = this.getPlaceholderMaterial(0x5A3A1A);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 40;
      group.add(trunk);

      const foliageGeo = new THREE.ConeGeometry(40, 80, 8);
      const foliageMat = this.getPlaceholderMaterial(name.includes('oak') ? 0x2A6A1A : 0x3A8A2A);
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 100;
      group.add(foliage);

      return group;
    } else if (name.includes('rock')) {
      geometry = new THREE.DodecahedronGeometry(25, 0);
      color = 0x808080;
    } else if (name.includes('bush')) {
      geometry = new THREE.SphereGeometry(20, 8, 6);
      color = 0x2A7A1A;
    } else if (name.includes('torch')) {
      const group = new THREE.Group();

      const poleGeo = new THREE.CylinderGeometry(4, 6, 80, 6);
      const poleMat = this.getPlaceholderMaterial(0x4A3020);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 40;
      group.add(pole);

      const flameGeo = new THREE.SphereGeometry(10, 8, 8);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xFFAA00,
        emissive: 0xFF6600,
        emissiveIntensity: 2,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 85;
      group.add(flame);

      return group;
    } else if (name.includes('crate') || name.includes('booth')) {
      geometry = new THREE.BoxGeometry(40, 40, 40);
      color = name.includes('bank') ? 0x8B6914 : 0x6A4A2A;
      scaleY = 1;
    } else if (name.includes('anvil')) {
      geometry = new THREE.BoxGeometry(30, 20, 20);
      color = 0x404040;
    } else if (name.includes('sign')) {
      const group = new THREE.Group();
      const poleGeo = new THREE.CylinderGeometry(3, 3, 80, 6);
      const poleMat = this.getPlaceholderMaterial(0x5A3A1A);
      group.add(new THREE.Mesh(poleGeo, poleMat));
      group.children[0].position.y = 40;

      const boardGeo = new THREE.BoxGeometry(40, 25, 3);
      const boardMat = this.getPlaceholderMaterial(0x8B6914);
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.y = 70;
      group.add(board);

      return group;
    } else if (name.includes('fence')) {
      geometry = new THREE.BoxGeometry(TILE_SIZE, 60, 8);
      color = 0x5A3A1A;
      scaleY = 1;
    } else {
      // Generic placeholder
      geometry = new THREE.BoxGeometry(30, 30, 30);
      color = 0xCC00FF; // Purple = unknown
    }

    const material = this.getPlaceholderMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = geometry.boundingBox
      ? (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2
      : 20;
    mesh.scale.y = scaleY;

    return mesh;
  }

  private getPlaceholderMaterial(color: number): THREE.Material {
    const key = color.toString(16);
    if (!this.placeholderMaterials.has(key)) {
      this.placeholderMaterials.set(key, new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.1,
      }));
    }
    return this.placeholderMaterials.get(key)!;
  }

  /** Clear all placed objects */
  clearPlacedObjects(): void {
    for (const obj of this.placedObjects) {
      this.scene.remove(obj);
    }
    this.placedObjects = [];
  }

  dispose(): void {
    this.clearPlacedObjects();
    this.modelCache.clear();
    for (const [, mat] of this.placeholderMaterials) {
      mat.dispose();
    }
    this.placeholderMaterials.clear();
  }
}
