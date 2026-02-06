import * as THREE from 'three';

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;

  private angle: number = 0;
  private zoom: number = 800;
  private targetAngle: number = 0;
  private targetZoom: number = 800;
  readonly MIN_ZOOM = 400;
  readonly MAX_ZOOM = 1500;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 800, 800);
    this.camera.lookAt(0, 0, 0);
  }

  setTargetAngle(angle: number): void {
    this.targetAngle = angle;
  }

  getTargetAngle(): number {
    return this.targetAngle;
  }

  setTargetZoom(zoom: number): void {
    this.targetZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, zoom));
  }

  getTargetZoom(): number {
    return this.targetZoom;
  }

  update(delta: number, target: THREE.Vector3): void {
    const angleDiff = this.targetAngle - this.angle;
    this.angle += angleDiff * delta * 8;

    const zoomDiff = this.targetZoom - this.zoom;
    this.zoom += zoomDiff * delta * 8;

    const angleRad = (this.angle * Math.PI) / 180;
    const cameraOffset = new THREE.Vector3(
      Math.sin(angleRad) * this.zoom,
      this.zoom,
      Math.cos(angleRad) * this.zoom
    );
    this.camera.position.copy(target).add(cameraOffset);
    this.camera.lookAt(target);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
