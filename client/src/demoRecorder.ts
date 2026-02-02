// ClawScape Demo Recorder
// Records automated demo sequences as video files

export interface DemoAction {
  time: number;        // seconds from start
  action: 'move' | 'camera_rotate' | 'camera_zoom' | 'wait' | 'spawn_player' | 'remove_player' | 'message';
  params?: any;
}

export interface DemoScript {
  name: string;        // Feature name (becomes filename)
  duration: number;    // Total duration in seconds
  actions: DemoAction[];
}

export class DemoRecorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private currentScript: DemoScript | null = null;
  private startTime: number = 0;
  private actionIndex: number = 0;
  private onAction: ((action: DemoAction) => void) | null = null;
  private overlay: HTMLDivElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  setActionHandler(handler: (action: DemoAction) => void): void {
    this.onAction = handler;
  }

  async playAndRecord(script: DemoScript): Promise<void> {
    if (this.isPlaying) return;

    this.currentScript = script;
    this.actionIndex = 0;
    this.recordedChunks = [];
    this.isPlaying = true;

    // Show overlay
    this.showOverlay(`Recording: ${script.name}`);

    // Start recording
    const stream = this.canvas.captureStream(60);
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.saveRecording();
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    this.startTime = performance.now();

    console.log(`[Demo] Started recording: ${script.name}`);
  }

  update(): void {
    if (!this.isPlaying || !this.currentScript) return;

    const elapsed = (performance.now() - this.startTime) / 1000;

    // Execute actions that should happen by now
    while (
      this.actionIndex < this.currentScript.actions.length &&
      this.currentScript.actions[this.actionIndex].time <= elapsed
    ) {
      const action = this.currentScript.actions[this.actionIndex];
      if (this.onAction) {
        this.onAction(action);
      }
      console.log(`[Demo] Action: ${action.action}`, action.params);
      this.actionIndex++;
    }

    // Check if demo is complete
    if (elapsed >= this.currentScript.duration) {
      this.stop();
    }
  }

  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    this.hideOverlay();
    console.log(`[Demo] Recording stopped`);
  }

  private saveRecording(): void {
    if (this.recordedChunks.length === 0 || !this.currentScript) return;

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentScript.name.replace(/\s+/g, '-').toLowerCase()}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`[Demo] Saved: ${a.download}`);
  }

  private showOverlay(text: string): void {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 16px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    this.overlay.innerHTML = `<span style="width:12px;height:12px;background:white;border-radius:50%;animation:pulse 1s infinite"></span>${text}`;

    const style = document.createElement('style');
    style.textContent = `@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`;
    document.head.appendChild(style);

    document.body.appendChild(this.overlay);
  }

  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}

// Pre-built demo scripts for each feature
export const DEMO_SCRIPTS: Record<string, DemoScript> = {
  'phase1-world-map': {
    name: 'Phase 1 - World Map System',
    duration: 20,
    actions: [
      { time: 0, action: 'message', params: { text: 'ClawScape - World Map System' } },
      { time: 1, action: 'move', params: { x: 5, z: 5 } },
      { time: 3, action: 'camera_rotate', params: { angle: 90 } },
      { time: 5, action: 'move', params: { x: 8, z: 8 } },  // Walk to dirt crossroads
      { time: 7, action: 'camera_zoom', params: { zoom: 500 } },
      { time: 9, action: 'move', params: { x: 12, z: 8 } },  // Try to walk toward pond
      { time: 11, action: 'camera_rotate', params: { angle: 180 } },
      { time: 13, action: 'move', params: { x: 3, z: 3 } },  // Walk near rocks (pathfind around)
      { time: 15, action: 'camera_zoom', params: { zoom: 800 } },
      { time: 17, action: 'camera_rotate', params: { angle: 0 } },
      { time: 19, action: 'move', params: { x: 0, z: 0 } },  // Return to start
    ]
  },

  'phase1-multiplayer': {
    name: 'Phase 1 - Multiplayer Sync',
    duration: 15,
    actions: [
      { time: 0, action: 'message', params: { text: 'ClawScape - Multiplayer' } },
      { time: 1, action: 'spawn_player', params: { id: 99, x: 3, z: 0 } },
      { time: 3, action: 'move', params: { x: -3, z: 0 } },
      { time: 5, action: 'camera_rotate', params: { angle: 90 } },
      { time: 7, action: 'move', params: { x: 0, z: 3 } },
      { time: 9, action: 'camera_rotate', params: { angle: -90 } },
      { time: 11, action: 'move', params: { x: 0, z: 0 } },
      { time: 13, action: 'remove_player', params: { id: 99 } },
    ]
  },

  'phase1-camera': {
    name: 'Phase 1 - Camera Controls',
    duration: 12,
    actions: [
      { time: 0, action: 'message', params: { text: 'ClawScape - Camera Controls' } },
      { time: 1, action: 'camera_rotate', params: { angle: 90 } },
      { time: 3, action: 'camera_rotate', params: { angle: 180 } },
      { time: 5, action: 'camera_rotate', params: { angle: 270 } },
      { time: 7, action: 'camera_zoom', params: { zoom: 400 } },
      { time: 9, action: 'camera_zoom', params: { zoom: 1200 } },
      { time: 11, action: 'camera_zoom', params: { zoom: 800 } },
    ]
  }
};
