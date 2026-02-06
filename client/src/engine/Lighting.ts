// ClawScape Lighting System
// Dynamic sun + point lights with shadow mapping.

import * as THREE from 'three';
import { EnvironmentConfig } from '@clawscape/shared';

export interface LightingOptions {
  shadowMapSize?: number;   // Shadow resolution (512-8192, default 2048)
  shadowDistance?: number;   // How far shadows render (world units)
  maxPointLights?: number;   // Max simultaneous point lights
}

export class LightingSystem {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private pointLights: Map<string, THREE.PointLight> = new Map();
  private options: Required<LightingOptions>;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, options: LightingOptions = {}) {
    this.scene = scene;
    this.options = {
      shadowMapSize: options.shadowMapSize ?? 2048,
      shadowDistance: options.shadowDistance ?? 4000,
      maxPointLights: options.maxPointLights ?? 50,
    };

    // Enable shadows on renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Sun (directional) light with shadows
    this.sunLight = new THREE.DirectionalLight(0xFFEEDD, 1.2);
    this.sunLight.position.set(-500, 1000, -300);
    this.sunLight.castShadow = true;

    // Shadow camera setup
    const d = this.options.shadowDistance / 2;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = this.options.shadowDistance * 2;
    this.sunLight.shadow.mapSize.width = this.options.shadowMapSize;
    this.sunLight.shadow.mapSize.height = this.options.shadowMapSize;
    this.sunLight.shadow.bias = -0.001;
    this.sunLight.shadow.normalBias = 0.02;

    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x6688AA, 0.4);
    scene.add(this.ambientLight);
  }

  /** Apply environment config to the lighting system */
  setEnvironment(env: EnvironmentConfig): void {
    // Sun direction -> light position (light points in negative direction)
    const dir = new THREE.Vector3(...env.sunDirection).normalize();
    this.sunLight.position.set(-dir.x * 1000, -dir.y * 1000, -dir.z * 1000);
    this.sunLight.color.set(env.sunColor);
    this.sunLight.intensity = env.sunIntensity;

    this.ambientLight.color.set(env.ambientColor);
    this.ambientLight.intensity = env.ambientIntensity;

    // Update shadow distance
    if (env.shadowDistance) {
      const d = env.shadowDistance / 2;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.camera.updateProjectionMatrix();
    }

    // Update shadow resolution
    if (env.shadowResolution) {
      this.sunLight.shadow.mapSize.width = env.shadowResolution;
      this.sunLight.shadow.mapSize.height = env.shadowResolution;
    }
  }

  /** Follow a target (e.g. player) so shadows are always visible */
  updateShadowTarget(target: THREE.Vector3): void {
    this.sunLight.target.position.copy(target);
    this.sunLight.position.copy(target).add(
      new THREE.Vector3(-500, 1000, -300) // offset from target
    );
  }

  /** Add a point light (torch, spell, etc) */
  addPointLight(id: string, position: THREE.Vector3, color: number = 0xFF6600, intensity: number = 1, distance: number = 400): THREE.PointLight {
    if (this.pointLights.size >= this.options.maxPointLights) {
      console.warn('Max point lights reached');
      // Remove oldest
      const firstKey = this.pointLights.keys().next().value;
      if (firstKey) this.removePointLight(firstKey);
    }

    const light = new THREE.PointLight(color, intensity, distance);
    light.position.copy(position);
    this.scene.add(light);
    this.pointLights.set(id, light);
    return light;
  }

  /** Remove a point light */
  removePointLight(id: string): void {
    const light = this.pointLights.get(id);
    if (light) {
      this.scene.remove(light);
      this.pointLights.delete(id);
    }
  }

  /** Get the sun direction vector (for terrain shader) */
  getSunDirection(): THREE.Vector3 {
    return this.sunLight.position.clone().normalize().negate();
  }

  /** Set shadow quality (resolution) */
  setShadowQuality(resolution: number): void {
    this.sunLight.shadow.mapSize.width = resolution;
    this.sunLight.shadow.mapSize.height = resolution;
    // Force shadow map recreation
    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      (this.sunLight.shadow as any).map = null;
    }
  }

  dispose(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.ambientLight);
    for (const [, light] of this.pointLights) {
      this.scene.remove(light);
    }
    this.pointLights.clear();
  }
}
