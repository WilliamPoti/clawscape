// ClawScape Water Rendering System
// Reflective, animated water surfaces with caustics.

import * as THREE from 'three';

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveFrequency;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vFogDepth;

  void main() {
    vUv = uv;

    // Wave displacement
    vec3 pos = position;
    float wave1 = sin(pos.x * uWaveFrequency + uTime * 1.5) * uWaveHeight;
    float wave2 = sin(pos.z * uWaveFrequency * 0.7 + uTime * 1.2) * uWaveHeight * 0.6;
    float wave3 = cos((pos.x + pos.z) * uWaveFrequency * 0.5 + uTime * 0.8) * uWaveHeight * 0.3;
    pos.y += wave1 + wave2 + wave3;

    // Compute wave normal
    float dx = cos(pos.x * uWaveFrequency + uTime * 1.5) * uWaveHeight * uWaveFrequency;
    float dz = cos(pos.z * uWaveFrequency * 0.7 + uTime * 1.2) * uWaveHeight * 0.6 * uWaveFrequency * 0.7;
    vNormal = normalize(vec3(-dx, 1.0, -dz));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 mvPosition = viewMatrix * worldPos;
    vFogDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWaterColor;
  uniform vec3 uWaterDeepColor;
  uniform float uOpacity;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uCameraPosition;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vFogDepth;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

    // Fresnel effect (more reflective at grazing angles)
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    fresnel = mix(0.2, 0.8, fresnel);

    // Animated caustic pattern
    float caustic1 = sin(vWorldPosition.x * 0.03 + uTime) * sin(vWorldPosition.z * 0.03 + uTime * 0.7);
    float caustic2 = sin(vWorldPosition.x * 0.05 - uTime * 0.8) * sin(vWorldPosition.z * 0.04 + uTime * 0.5);
    float caustics = (caustic1 + caustic2) * 0.15 + 0.85;

    // Water base color with depth variation
    vec3 waterBase = mix(uWaterDeepColor, uWaterColor, 0.5 + caustics * 0.5);

    // Sun specular on water
    vec3 halfDir = normalize(viewDir - uSunDirection);
    float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
    vec3 specular = uSunColor * spec * 0.6;

    // Subtle sky reflection
    vec3 reflectDir = reflect(-viewDir, normal);
    float skyReflect = max(reflectDir.y, 0.0);
    vec3 skyColor = mix(uFogColor, vec3(0.6, 0.7, 0.9), skyReflect);

    // Combine: water color + fresnel reflection + specular
    vec3 color = mix(waterBase * caustics, skyColor, fresnel) + specular;

    // Fog
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

export class WaterSystem {
  private scene: THREE.Scene;
  private waterMeshes: THREE.Mesh[] = [];
  private material: THREE.ShaderMaterial;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: 2.0 },
        uWaveFrequency: { value: 0.02 },
        uWaterColor: { value: new THREE.Color(0x2060A0) },
        uWaterDeepColor: { value: new THREE.Color(0x103060) },
        uOpacity: { value: 0.85 },
        uSunDirection: { value: new THREE.Vector3(-0.5, -0.8, -0.3).normalize() },
        uSunColor: { value: new THREE.Color(0xFFEEDD) },
        uCameraPosition: { value: new THREE.Vector3() },
        uFogColor: { value: new THREE.Color(0xC8D8E8) },
        uFogDensity: { value: 0.0003 },
      },
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  /** Create a water surface at the given world position and size */
  addWaterPlane(x: number, z: number, width: number, height: number, waterLevel: number = -5): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height, 32, 32);
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.set(x + width / 2, waterLevel, z + height / 2);
    mesh.renderOrder = 1; // Render after terrain

    this.scene.add(mesh);
    this.waterMeshes.push(mesh);
    return mesh;
  }

  /** Update water animation */
  update(delta: number, cameraPosition: THREE.Vector3): void {
    this.time += delta;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uCameraPosition.value.copy(cameraPosition);
  }

  /** Set water visual parameters */
  setWaterColor(color: number, deepColor: number): void {
    this.material.uniforms.uWaterColor.value.set(color);
    this.material.uniforms.uWaterDeepColor.value.set(deepColor);
  }

  /** Set sun direction for water specular */
  setSunDirection(dir: THREE.Vector3): void {
    this.material.uniforms.uSunDirection.value.copy(dir);
  }

  /** Set fog parameters to match environment */
  setFog(color: THREE.Color, density: number): void {
    this.material.uniforms.uFogColor.value.copy(color);
    this.material.uniforms.uFogDensity.value = density;
  }

  dispose(): void {
    for (const mesh of this.waterMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.waterMeshes = [];
    this.material.dispose();
  }
}
