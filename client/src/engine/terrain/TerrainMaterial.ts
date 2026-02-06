// ClawScape RLHD Terrain Shader Material
// Custom ShaderMaterial for RLHD-quality terrain rendering.
// Features: per-vertex colors, dynamic sun lighting, fog, specular highlights.

import * as THREE from 'three';

const terrainVertexShader = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vFogDepth;

  void main() {
    vColor = color;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 mvPosition = viewMatrix * worldPos;
    vFogDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const terrainFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform vec3 uAmbientColor;
  uniform float uAmbientIntensity;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uCameraPosition;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vFogDepth;

  void main() {
    vec3 normal = normalize(vNormal);

    // Ambient lighting
    vec3 ambient = uAmbientColor * uAmbientIntensity;

    // Directional (sun) lighting
    float NdotL = max(dot(normal, -uSunDirection), 0.0);
    vec3 diffuse = uSunColor * uSunIntensity * NdotL;

    // Specular (subtle for RLHD look)
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    vec3 halfDir = normalize(viewDir - uSunDirection);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    vec3 specular = uSunColor * spec * 0.15;

    // Combine lighting with vertex color
    vec3 lit = vColor * (ambient + diffuse) + specular;

    // Fog (exponential squared)
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec3 finalColor = mix(lit, uFogColor, fogFactor);

    // Tone mapping (simple Reinhard)
    finalColor = finalColor / (finalColor + vec3(1.0));

    // Gamma correction
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export interface TerrainMaterialOptions {
  sunDirection?: THREE.Vector3;
  sunColor?: THREE.Color;
  sunIntensity?: number;
  ambientColor?: THREE.Color;
  ambientIntensity?: number;
  fogColor?: THREE.Color;
  fogDensity?: number;
}

export function createTerrainMaterial(options: TerrainMaterialOptions = {}): THREE.ShaderMaterial {
  const sunDir = options.sunDirection ?? new THREE.Vector3(-0.5, -0.8, -0.3).normalize();
  const sunColor = options.sunColor ?? new THREE.Color(0xFFEEDD);
  const sunIntensity = options.sunIntensity ?? 1.2;
  const ambientColor = options.ambientColor ?? new THREE.Color(0x6688AA);
  const ambientIntensity = options.ambientIntensity ?? 0.4;
  const fogColor = options.fogColor ?? new THREE.Color(0xC8D8E8);
  const fogDensity = options.fogDensity ?? 0.0003;

  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDirection: { value: sunDir },
      uSunColor: { value: sunColor },
      uSunIntensity: { value: sunIntensity },
      uAmbientColor: { value: ambientColor },
      uAmbientIntensity: { value: ambientIntensity },
      uFogColor: { value: fogColor },
      uFogDensity: { value: fogDensity },
      uFogNear: { value: 100 },
      uFogFar: { value: 5000 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    vertexColors: true,
    side: THREE.FrontSide,
  });
}
