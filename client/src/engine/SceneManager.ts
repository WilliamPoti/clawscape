import * as THREE from 'three';

export class SceneManager {
  readonly scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0033);
    this.scene.fog = new THREE.FogExp2(0x1a0033, 0.0004);
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  setupLighting(): void {
    // Ambient light with slight cyan tint
    const ambient = new THREE.AmbientLight(0xAADDFF, 0.5);
    this.scene.add(ambient);

    // Main light with warm pink/yellow tint
    const sun = new THREE.DirectionalLight(0xFFEEDD, 0.9);
    sun.position.set(500, 1000, 500);
    this.scene.add(sun);

    // Accent light with magenta tint from below
    const accent = new THREE.DirectionalLight(0xFF6EC7, 0.2);
    accent.position.set(-300, -200, 300);
    this.scene.add(accent);
  }

  createTikiTorch(x: number, z: number): void {
    // Pole
    const poleGeo = new THREE.CylinderGeometry(8, 12, 150, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x4A3020,
      roughness: 0.9,
      metalness: 0.1
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 75, z);
    this.scene.add(pole);

    // Torch head
    const headGeo = new THREE.CylinderGeometry(15, 10, 25, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x2A2020,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(x, 160, z);
    this.scene.add(head);

    // Flame (glowing sphere)
    const flameGeo = new THREE.SphereGeometry(20, 16, 16);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xFFAA00,
      emissive: 0xFF6600,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(x, 185, z);
    flame.scale.set(1, 1.3, 1);
    this.scene.add(flame);

    // Point light for the torch
    const light = new THREE.PointLight(0xFF6600, 1, 400);
    light.position.set(x, 185, z);
    this.scene.add(light);
  }

  setupTikiTorches(): void {
    const torchPositions = [
      { x: -3, z: -3 }, { x: 3, z: -3 },
      { x: -3, z: 3 }, { x: 3, z: 3 },
      { x: -6, z: 0 }, { x: 6, z: 0 },
      { x: 0, z: -6 }, { x: 0, z: 6 },
    ];

    const TILE_SIZE = 128; // from shared
    for (const pos of torchPositions) {
      this.createTikiTorch(pos.x * TILE_SIZE, pos.z * TILE_SIZE);
    }
  }
}
