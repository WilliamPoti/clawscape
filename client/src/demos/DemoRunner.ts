// ClawScape Demo System - Script Runner
// Executes demo scripts by controlling game elements

import { DemoScript, DemoAction, DemoState, FakePlayer } from './types.js';

// Interface for game controls the runner needs access to
export interface DemoGameControls {
  // Player movement
  setPlayerTarget(x: number, z: number): void;
  getPlayerTilePosition(): { x: number; z: number };
  isPlayerMoving(): boolean;

  // Camera
  setCameraAngle(angle: number): void;
  setCameraZoom(zoom: number): void;

  // Fake players
  createFakePlayer(id: number, x: number, z: number, name: string): any;
  moveFakePlayer(id: number, x: number, z: number): void;
  removeFakePlayer(id: number): void;

  // Blocked tile feedback
  showBlockedFeedback(x: number, z: number): void;

  // Running toggle
  setRunning(running: boolean): void;
}

export class DemoRunner {
  private script: DemoScript | null = null;
  private controls: DemoGameControls;
  private state: DemoState = 'idle';

  private currentActionIndex: number = 0;
  private actionStartTime: number = 0;
  private actionCompleted: boolean = false;

  private fakePlayers: Map<number, FakePlayer> = new Map();
  private captionElement: HTMLDivElement | null = null;
  private logoElement: HTMLImageElement | null = null;
  private titleElement: HTMLDivElement | null = null;
  private currentCaption: string = '';

  private onComplete: (() => void) | null = null;

  constructor(controls: DemoGameControls) {
    this.controls = controls;
    this.createCaptionElement();
    this.createLogoElement();
    this.createTitleElement();
  }

  start(script: DemoScript, onComplete?: () => void): void {
    if (this.state === 'running') {
      console.warn('Demo already running');
      return;
    }

    console.log(`Starting demo: ${script.name}`);
    this.script = script;
    this.state = 'running';
    this.currentActionIndex = 0;
    this.actionStartTime = performance.now();
    this.actionCompleted = false;
    this.onComplete = onComplete || null;

    // Show logo
    this.showLogo();

    // Start first action
    this.startCurrentAction();
  }

  stop(): void {
    this.state = 'idle';
    this.script = null;
    this.hideCaption();
    this.hideLogo();
    this.cleanupFakePlayers();
    console.log('Demo stopped');
  }

  update(delta: number): void {
    if (this.state !== 'running' || !this.script) return;

    const currentAction = this.script.actions[this.currentActionIndex];
    if (!currentAction) {
      this.complete();
      return;
    }

    // Check if current action is complete
    if (!this.actionCompleted && this.isActionComplete(currentAction)) {
      this.actionCompleted = true;
    }

    // If action is complete, move to next
    if (this.actionCompleted) {
      this.currentActionIndex++;

      if (this.currentActionIndex >= this.script.actions.length) {
        this.complete();
        return;
      }

      this.actionStartTime = performance.now();
      this.actionCompleted = false;
      this.startCurrentAction();
    }
  }

  private startCurrentAction(): void {
    if (!this.script) return;

    const action = this.script.actions[this.currentActionIndex];
    if (!action) return;

    // Show caption if present
    if (action.caption) {
      this.showCaption(action.caption);
    } else {
      this.hideCaption();
    }

    // Execute action
    switch (action.type) {
      case 'move':
        this.controls.setPlayerTarget(action.params.x, action.params.z);
        break;

      case 'camera_rotate':
        this.controls.setCameraAngle(action.params.angle);
        break;

      case 'camera_zoom':
        this.controls.setCameraZoom(action.params.zoom);
        break;

      case 'wait':
        // Nothing to do - just wait for duration
        break;

      case 'spawn_player':
        const mesh = this.controls.createFakePlayer(
          action.params.id,
          action.params.x,
          action.params.z,
          action.params.name
        );
        this.fakePlayers.set(action.params.id, {
          id: action.params.id,
          name: action.params.name,
          mesh,
          targetX: action.params.x,
          targetZ: action.params.z
        });
        break;

      case 'move_other':
        this.controls.moveFakePlayer(action.params.id, action.params.x, action.params.z);
        const fakePlayer = this.fakePlayers.get(action.params.id);
        if (fakePlayer) {
          fakePlayer.targetX = action.params.x;
          fakePlayer.targetZ = action.params.z;
        }
        break;

      case 'remove_player':
        this.controls.removeFakePlayer(action.params.id);
        this.fakePlayers.delete(action.params.id);
        break;

      case 'click_blocked':
        this.controls.showBlockedFeedback(action.params.x, action.params.z);
        break;

      case 'set_running':
        this.controls.setRunning(action.params.running);
        break;
    }
  }

  private isActionComplete(action: DemoAction): boolean {
    const elapsed = performance.now() - this.actionStartTime;

    switch (action.type) {
      case 'move':
        // Complete when player reaches destination
        const pos = this.controls.getPlayerTilePosition();
        const atDestination = pos.x === action.params.x && pos.z === action.params.z;
        const notMoving = !this.controls.isPlayerMoving();
        return atDestination && notMoving;

      case 'camera_rotate':
      case 'camera_zoom':
        // Complete after a short transition time
        return elapsed >= (action.duration || 500);

      case 'wait':
        return elapsed >= (action.duration || 1000);

      case 'spawn_player':
      case 'remove_player':
      case 'click_blocked':
      case 'set_running':
        // Instant actions - complete after brief delay
        return elapsed >= (action.duration || 300);

      case 'move_other':
        // Give fake player time to reach destination
        return elapsed >= (action.duration || 1500);

      default:
        return elapsed >= (action.duration || 1000);
    }
  }

  private complete(): void {
    console.log('Demo complete');
    this.state = 'complete';
    this.hideCaption();
    this.hideLogo();
    this.cleanupFakePlayers();

    if (this.onComplete) {
      this.onComplete();
    }
  }

  private cleanupFakePlayers(): void {
    for (const [id] of this.fakePlayers) {
      this.controls.removeFakePlayer(id);
    }
    this.fakePlayers.clear();
  }

  // Caption UI - Future Buddy palette
  private createCaptionElement(): void {
    this.captionElement = document.createElement('div');
    this.captionElement.id = 'demo-caption';
    this.captionElement.style.cssText = `
      position: fixed;
      top: 6%;
      left: 50%;
      transform: translateX(-50%);
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: clamp(20px, 3vw, 32px);
      font-weight: bold;
      color: #CC00FF;
      text-shadow:
        0 0 10px rgba(136, 0, 255, 0.8),
        0 0 20px rgba(0, 240, 255, 0.5),
        2px 2px 4px rgba(0, 0, 0, 0.8);
      background: linear-gradient(
        180deg,
        rgba(34, 0, 102, 0.9) 0%,
        rgba(16, 8, 32, 0.95) 50%,
        rgba(34, 0, 102, 0.9) 100%
      );
      padding: 14px 32px;
      border-radius: 6px;
      border: 2px solid #00FF4A;
      box-shadow:
        0 0 20px rgba(0, 240, 255, 0.4),
        0 0 40px rgba(136, 0, 255, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(this.captionElement);
  }

  private showCaption(text: string): void {
    this.currentCaption = text;
    if (this.captionElement) {
      this.captionElement.textContent = text;
      this.captionElement.style.opacity = '1';
    }
  }

  private hideCaption(): void {
    this.currentCaption = '';
    if (this.captionElement) {
      this.captionElement.style.opacity = '0';
    }
  }

  // Logo UI - positioned for YouTube Shorts safe zone (upper right)
  private createLogoElement(): void {
    this.logoElement = document.createElement('img');
    this.logoElement.id = 'demo-logo';
    this.logoElement.src = '/assets/logo.png';
    this.logoElement.style.cssText = `
      position: fixed;
      top: calc(50% - 350px);
      left: calc(50% + 350px);
      transform: translate(-50%, -50%);
      width: 67px;
      height: auto;
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
      z-index: 999;
      filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.6))
              drop-shadow(0 0 40px rgba(136, 0, 255, 0.4));
    `;
    document.body.appendChild(this.logoElement);
  }

  // Title text - FUTURE and BUDDY positioned for YouTube Shorts safe zone
  private createTitleElement(): void {
    // FUTURE text - above logo
    const futureEl = document.createElement('div');
    futureEl.className = 'demo-title-part';
    futureEl.innerHTML = 'FUTURE';
    futureEl.style.cssText = `
      position: fixed;
      top: calc(50% - 368px);
      left: calc(50% + 340px);
      transform: translate(-50%, -50%) rotate(-6deg);
      font-family: 'Bungee', sans-serif;
      font-size: 13px;
      text-align: center;
      color: #71FF00;
      -webkit-text-stroke: 1px #000000;
      paint-order: stroke fill;
      text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 10px rgba(113, 255, 0, 0.8);
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
      z-index: 999;
    `;
    document.body.appendChild(futureEl);

    // BUDDY text - below logo
    this.titleElement = document.createElement('div');
    this.titleElement.id = 'demo-title';
    this.titleElement.innerHTML = 'BUDDY';
    this.titleElement.style.cssText = `
      position: fixed;
      top: calc(50% - 332px);
      left: calc(50% + 360px);
      transform: translate(-50%, -50%) rotate(6deg);
      font-family: 'Bungee', sans-serif;
      font-size: 13px;
      text-align: center;
      color: #71FF00;
      -webkit-text-stroke: 1px #000000;
      paint-order: stroke fill;
      text-shadow: 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 0 10px rgba(113, 255, 0, 0.8);
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
      z-index: 999;
    `;
    document.body.appendChild(this.titleElement);

    // Store reference to future element for show/hide
    (this as any).futureElement = futureEl;
  }

  showLogo(): void {
    if (this.logoElement) {
      this.logoElement.style.opacity = '1';
    }
    if (this.titleElement) {
      this.titleElement.style.opacity = '1';
    }
    if ((this as any).futureElement) {
      (this as any).futureElement.style.opacity = '1';
    }
  }

  hideLogo(): void {
    if (this.logoElement) {
      this.logoElement.style.opacity = '0';
    }
    if (this.titleElement) {
      this.titleElement.style.opacity = '0';
    }
    if ((this as any).futureElement) {
      (this as any).futureElement.style.opacity = '0';
    }
  }

  // State getters
  isRunning(): boolean {
    return this.state === 'running';
  }

  getState(): DemoState {
    return this.state;
  }

  getCaption(): string {
    return this.currentCaption;
  }
}
