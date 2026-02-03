// ClawScape Demo System - Dual Format Video Recorder
// Records both 16:9 (horizontal) and 9:16 (Shorts) with format-specific overlays

interface RecorderInstance {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  recorder: MediaRecorder;
  chunks: Blob[];
  format: 'horizontal' | 'shorts';
}

interface OverlayConfig {
  logo: HTMLImageElement | null;
  getCaption: () => string;
}

export class DemoRecorder {
  private recorders: RecorderInstance[] = [];
  private isRecording: boolean = false;
  private sourceCanvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private overlay: OverlayConfig | null = null;

  // Output dimensions
  private readonly HORIZONTAL_WIDTH = 1920;
  private readonly HORIZONTAL_HEIGHT = 1080;
  private readonly SHORTS_WIDTH = 1080;
  private readonly SHORTS_HEIGHT = 1920;

  startRecording(
    sourceCanvas: HTMLCanvasElement,
    fps: number = 60,
    overlay?: OverlayConfig
  ): void {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.sourceCanvas = sourceCanvas;
    this.overlay = overlay || null;

    const mimeType = this.getSupportedMimeType();
    if (!mimeType) {
      console.error('No supported video format found');
      return;
    }

    console.log(`Starting dual recording with ${mimeType}`);

    // Create horizontal (16:9) recorder
    const horizontal = this.createRecorder(
      this.HORIZONTAL_WIDTH,
      this.HORIZONTAL_HEIGHT,
      'horizontal',
      mimeType,
      fps
    );

    // Create shorts (9:16) recorder
    const shorts = this.createRecorder(
      this.SHORTS_WIDTH,
      this.SHORTS_HEIGHT,
      'shorts',
      mimeType,
      fps
    );

    this.recorders = [horizontal, shorts];
    this.isRecording = true;

    // Start all recorders
    this.recorders.forEach(r => r.recorder.start(100));

    // Start the render loop
    this.startRenderLoop();
  }

  private createRecorder(
    width: number,
    height: number,
    format: 'horizontal' | 'shorts',
    mimeType: string,
    fps: number
  ): RecorderInstance {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    return { canvas, ctx, recorder, chunks, format };
  }

  private startRenderLoop(): void {
    const render = () => {
      if (!this.isRecording || !this.sourceCanvas) return;

      this.recorders.forEach(r => {
        this.drawFrame(r);
      });

      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private drawFrame(recorder: RecorderInstance): void {
    const source = this.sourceCanvas!;
    const { ctx, canvas, format } = recorder;
    const sw = source.width;
    const sh = source.height;
    const dw = canvas.width;
    const dh = canvas.height;

    // Calculate source crop
    const sourceAspect = sw / sh;
    const destAspect = dw / dh;

    let sx = 0, sy = 0, sWidth = sw, sHeight = sh;

    if (sourceAspect > destAspect) {
      // Source is wider - crop sides
      sWidth = sh * destAspect;
      sx = (sw - sWidth) / 2;
    } else {
      // Source is taller - crop top/bottom
      sHeight = sw / destAspect;
      sy = (sh - sHeight) / 2;
    }

    // Draw cropped game frame
    ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, dw, dh);

    // Draw format-specific overlays
    this.drawOverlays(ctx, dw, dh, format);
  }

  private drawOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    format: 'horizontal' | 'shorts'
  ): void {
    if (!this.overlay) return;

    const { logo, getCaption } = this.overlay;
    const caption = getCaption();

    // Format-specific positioning
    if (format === 'horizontal') {
      // Horizontal: logo bottom-right corner
      if (logo && logo.complete) {
        const logoSize = 80;
        const margin = 30;
        const logoX = width - logoSize - margin;
        const logoY = height - logoSize - margin;

        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

        // Draw text near logo
        this.drawLogoText(ctx, logoX + logoSize / 2, logoY, logoSize, 'horizontal');
      }

      // Caption at top center
      if (caption) {
        this.drawCaption(ctx, width / 2, height * 0.08, caption, 32);
      }
    } else {
      // Shorts: logo upper-right, safe from UI
      if (logo && logo.complete) {
        const logoSize = 67;
        const logoX = width - logoSize - 50;
        const logoY = 120;

        ctx.drawImage(logo, logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);

        // Draw text with slant composition
        this.drawLogoText(ctx, logoX, logoY, logoSize, 'shorts');
      }

      // Caption at top center (below safe area)
      if (caption) {
        this.drawCaption(ctx, width / 2, height * 0.06, caption, 36);
      }
    }
  }

  private drawLogoText(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    logoSize: number,
    format: 'horizontal' | 'shorts'
  ): void {
    const scale = logoSize / 67;
    const fontSize = Math.round(13 * scale);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px Bungee, sans-serif`;

    if (format === 'shorts') {
      // Slanted text composition for Shorts
      // FUTURE - above, shifted left, -6deg
      ctx.save();
      ctx.translate(centerX - 10 * scale, centerY - 18 * scale);
      ctx.rotate(-6 * Math.PI / 180);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeText('FUTURE', 0, 0);
      ctx.fillStyle = '#71FF00';
      ctx.fillText('FUTURE', 0, 0);
      ctx.restore();

      // BUDDY - below, shifted right, +6deg
      ctx.save();
      ctx.translate(centerX + 10 * scale, centerY + 18 * scale);
      ctx.rotate(6 * Math.PI / 180);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeText('BUDDY', 0, 0);
      ctx.fillStyle = '#71FF00';
      ctx.fillText('BUDDY', 0, 0);
      ctx.restore();
    } else {
      // Horizontal: compact text below logo
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2 * scale;
      ctx.strokeText('FUTURE BUDDY', centerX, centerY + logoSize / 2 + fontSize);
      ctx.fillStyle = '#71FF00';
      ctx.fillText('FUTURE BUDDY', centerX, centerY + logoSize / 2 + fontSize);
    }
  }

  private drawCaption(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    fontSize: number
  ): void {
    ctx.save();

    // Background
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    const metrics = ctx.measureText(text);
    const padding = 14;
    const bgWidth = metrics.width + padding * 4;
    const bgHeight = fontSize + padding * 2;

    const gradient = ctx.createLinearGradient(x - bgWidth / 2, y, x - bgWidth / 2, y + bgHeight);
    gradient.addColorStop(0, 'rgba(34, 0, 102, 0.9)');
    gradient.addColorStop(0.5, 'rgba(16, 8, 32, 0.95)');
    gradient.addColorStop(1, 'rgba(34, 0, 102, 0.9)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#00FF4A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#CC00FF';
    ctx.shadowColor = 'rgba(136, 0, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  stopRecording(): Promise<{ horizontal: Blob; shorts: Blob }> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || this.recorders.length === 0) {
        reject(new Error('Not recording'));
        return;
      }

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      let stoppedCount = 0;
      const blobs: { horizontal?: Blob; shorts?: Blob } = {};

      this.recorders.forEach(r => {
        r.recorder.onstop = () => {
          const mimeType = r.recorder.mimeType || 'video/webm';
          const blob = new Blob(r.chunks, { type: mimeType });
          blobs[r.format] = blob;
          stoppedCount++;

          if (stoppedCount === this.recorders.length) {
            this.recorders = [];
            this.isRecording = false;
            this.overlay = null;
            resolve(blobs as { horizontal: Blob; shorts: Blob });
          }
        };
        r.recorder.stop();
      });
    });
  }

  async stopAndDownload(filename: string): Promise<void> {
    try {
      const { horizontal, shorts } = await this.stopRecording();

      // Download both files
      await this.downloadBlob(horizontal, `${filename}-horizontal`);
      await this.downloadBlob(shorts, `${filename}-shorts`);

      console.log('Both formats saved!');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const timestamp = this.getTimestamp();
    const fullFilename = `futurebuddy-${filename}-${timestamp}.${extension}`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fullFilename,
          types: [{
            description: 'Video file',
            accept: { [blob.type]: [`.${extension}`] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log(`Saved: ${fullFilename}`);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('File System Access API failed:', err);
        }
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  }

  private getSupportedMimeType(): string | null {
    const types = [
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}
