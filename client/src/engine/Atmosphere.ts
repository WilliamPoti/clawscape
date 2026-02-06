// ClawScape Atmosphere System
// Distance fog, sky, and ground fog.

import * as THREE from 'three';
import { EnvironmentConfig } from '@clawscape/shared';

export class AtmosphereSystem {
  private scene: THREE.Scene;
  private skyMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Apply environment atmosphere settings */
  setEnvironment(env: EnvironmentConfig): void {
    // Update scene fog (exponential squared)
    this.scene.fog = new THREE.FogExp2(env.fogColor, env.fogDensity);

    // Update sky
    this.setSky(env.sky);

    // Update background color to match fog
    this.scene.background = new THREE.Color(env.fogColor);
  }

  /** Set sky color or gradient */
  setSky(skyColor: string): void {
    // Remove existing sky mesh
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      (this.skyMesh.material as THREE.Material).dispose();
      this.skyMesh = null;
    }

    // Create a sky hemisphere (gradient from zenith to horizon)
    const skyGeo = new THREE.SphereGeometry(8000, 32, 16);
    const zenithColor = new THREE.Color(skyColor);
    const horizonColor = new THREE.Color(skyColor).lerp(new THREE.Color(0xFFFFFF), 0.3);

    // Per-vertex gradient
    const positions = skyGeo.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = Math.max(0, y / 8000); // 0 at horizon, 1 at zenith
      const color = zenithColor.clone().lerp(horizonColor, 1 - t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);
  }

  /** Follow camera position so sky is always centered */
  update(cameraPosition: THREE.Vector3): void {
    if (this.skyMesh) {
      this.skyMesh.position.copy(cameraPosition);
    }
  }

  dispose(): void {
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      (this.skyMesh.material as THREE.Material).dispose();
    }
  }
}
