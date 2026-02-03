// ClawScape Demo System - Video Recorder
// Uses MediaRecorder API to capture canvas to video

export class DemoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecording: boolean = false;

  startRecording(canvas: HTMLCanvasElement, fps: number = 60): void {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    // Get canvas stream
    const stream = canvas.captureStream(fps);

    // Try to use MP4 if available, fall back to WebM
    const mimeType = this.getSupportedMimeType();
    if (!mimeType) {
      console.error('No supported video format found');
      return;
    }

    console.log(`Starting recording with ${mimeType}`);

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps for good quality
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    this.isRecording = true;
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Not recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        this.chunks = [];
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async stopAndDownload(filename: string): Promise<void> {
    try {
      const blob = await this.stopRecording();
      await this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const timestamp = this.getTimestamp();
    const fullFilename = `clawscape-${filename}-${timestamp}.${extension}`;

    // Try File System Access API first (lets user pick folder, remembers location)
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
        // User cancelled or API failed, fall back to download
        if (err.name !== 'AbortError') {
          console.warn('File System Access API failed, falling back to download:', err);
        }
      }
    }

    // Fallback: standard download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${fullFilename}`);
  }

  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  private getSupportedMimeType(): string | null {
    // Prefer MP4, fall back to WebM
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
