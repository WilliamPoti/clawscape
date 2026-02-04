/**
 * AudioAnalyzer - Detects audio amplitude for lipsync
 *
 * Uses Web Audio API to analyze audio in real-time and
 * return amplitude values (0-1) for mouth movement.
 */
export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  /**
   * Connect to an audio element and start analyzing
   */
  connect(audioElement: HTMLAudioElement): void {
    // Create audio context on first use
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.3;

    // Create buffer for frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    // Connect audio element to analyser
    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  /**
   * Get current amplitude (0-1)
   * Call this every frame to get mouth openness
   */
  getAmplitude(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average amplitude from lower frequencies (voice range)
    // Human voice is typically 85-255 Hz, which maps to lower bins
    const voiceBins = this.dataArray.slice(0, 20);
    let sum = 0;
    for (let i = 0; i < voiceBins.length; i++) {
      sum += voiceBins[i];
    }
    const average = sum / voiceBins.length;

    // Normalize to 0-1 range
    return Math.min(average / 128, 1);
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }
}
