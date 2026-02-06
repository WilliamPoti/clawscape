// ClawScape Terrain Renderer
// Manages terrain meshes for loaded map squares.

import * as THREE from 'three';
import {
  MapSquare,
  UnderlayConfig,
  OverlayConfig,
  EnvironmentConfig,
} from '@clawscape/shared';
import { buildTerrainGeometry } from './TerrainBuilder.js';
import { createTerrainMaterial } from './TerrainMaterial.js';

const TILE_SIZE = 128;

export class TerrainRenderer {
  private scene: THREE.Scene;
  private terrainMeshes: Map<string, THREE.Mesh> = new Map();
  private material: THREE.ShaderMaterial;
  private underlays: UnderlayConfig[] = [];
  private overlays: OverlayConfig[] = [];

  constructor(scene: THREE.Scene, environment?: EnvironmentConfig) {
    this.scene = scene;

    if (environment) {
      const sunDir = new THREE.Vector3(...environment.sunDirection).normalize();
      this.material = createTerrainMaterial({
        sunDirection: sunDir,
        sunColor: new THREE.Color(environment.sunColor),
        sunIntensity: environment.sunIntensity,
        ambientColor: new THREE.Color(environment.ambientColor),
        ambientIntensity: environment.ambientIntensity,
        fogColor: new THREE.Color(environment.fogColor),
        fogDensity: environment.fogDensity,
      });
    } else {
      this.material = createTerrainMaterial();
    }
  }

  /** Set floor type configs for rendering */
  setFloorTypes(underlays: UnderlayConfig[], overlays: OverlayConfig[]): void {
    this.underlays = underlays;
    this.overlays = overlays;
  }

  /** Load and render a map square */
  loadMapSquare(mapSquare: MapSquare): void {
    const key = `${mapSquare.regionX},${mapSquare.regionY}`;

    // Remove existing mesh if any
    this.unloadMapSquare(mapSquare.regionX, mapSquare.regionY);

    // Build geometry for level 0 (ground)
    const result = buildTerrainGeometry(
      mapSquare,
      0, // level
      this.underlays,
      this.overlays,
    );

    if (result.geometry.getAttribute('position')?.count === 0) {
      return; // Empty geometry, skip
    }

    const mesh = new THREE.Mesh(result.geometry, this.material);

    // Position the mesh at the correct world position
    mesh.position.set(
      mapSquare.regionX * 64 * TILE_SIZE,
      0,
      mapSquare.regionY * 64 * TILE_SIZE
    );

    this.scene.add(mesh);
    this.terrainMeshes.set(key, mesh);
  }

  /** Remove a map square's terrain mesh */
  unloadMapSquare(regionX: number, regionY: number): void {
    const key = `${regionX},${regionY}`;
    const mesh = this.terrainMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.terrainMeshes.delete(key);
    }
  }

  /** Update camera position uniform for specular calculation */
  updateCamera(cameraPosition: THREE.Vector3): void {
    this.material.uniforms.uCameraPosition.value.copy(cameraPosition);
  }

  /** Update environment settings */
  setEnvironment(env: EnvironmentConfig): void {
    const uniforms = this.material.uniforms;
    uniforms.uSunDirection.value.set(...env.sunDirection).normalize();
    uniforms.uSunColor.value.set(env.sunColor);
    uniforms.uSunIntensity.value = env.sunIntensity;
    uniforms.uAmbientColor.value.set(env.ambientColor);
    uniforms.uAmbientIntensity.value = env.ambientIntensity;
    uniforms.uFogColor.value.set(env.fogColor);
    uniforms.uFogDensity.value = env.fogDensity;
  }

  /** Dispose of all terrain resources */
  dispose(): void {
    for (const [, mesh] of this.terrainMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.terrainMeshes.clear();
    this.material.dispose();
  }
}
