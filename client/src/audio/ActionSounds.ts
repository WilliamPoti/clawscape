// Satisfying action sound effects using Web Audio API
// Gentle, musical tones that don't cause audio fatigue
// All sounds are procedurally generated - no files needed

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

// Soft pentatonic notes for pleasant, non-fatiguing sounds
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99
};

function playTone(
  freq: number,
  duration: number,
  volume: number = 0.08,
  type: OscillatorType = 'sine',
  detune: number = 0
): void {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  // Soft attack, gentle release - no harsh transients
  const now = ac.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// Cycle through pentatonic notes for variety
let moveNoteIndex = 0;
const movePentScale = [NOTES.C5, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.A4];

// Fire crackle state
let fireInterval: number | null = null;

function startFireCrackle(): void {
  if (fireInterval) return;
  const scheduleNext = () => {
    const ac = getCtx();
    const now = ac.currentTime;
    // Random short burst of filtered noise to simulate a crackle/pop
    const bufSize = ac.sampleRate * (0.01 + Math.random() * 0.03);
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize); // decay envelope
    }
    const src = ac.createBufferSource();
    src.buffer = buf;

    // Bandpass to sound like fire (warm crackle, not white noise)
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800 + Math.random() * 1200;
    bp.Q.value = 1 + Math.random() * 3;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.015 + Math.random() * 0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(ac.destination);
    src.start(now);

    // Schedule next crackle at random interval (40-150ms)
    fireInterval = window.setTimeout(scheduleNext, 40 + Math.random() * 110);
  };
  scheduleNext();
}

function stopFireCrackle(): void {
  if (fireInterval) {
    clearTimeout(fireInterval);
    fireInterval = null;
  }
}

export const ActionSounds = {
  // Soft tap when player clicks to move - pentatonic cycling
  moveStart(): void {
    const note = movePentScale[moveNoteIndex % movePentScale.length];
    moveNoteIndex++;
    playTone(note, 0.15, 0.079, 'sine');
    // Subtle harmonic
    playTone(note * 2, 0.1, 0.026, 'sine');
  },

  // Gentle arrival chime - two-note resolution
  moveComplete(): void {
    playTone(NOTES.E5, 0.2, 0.053, 'sine');
    setTimeout(() => playTone(NOTES.G5, 0.3, 0.04, 'sine'), 60);
  },

  // Soft whoosh for camera rotation
  cameraRotate(): void {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();

    // Filtered noise-like sweep
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.15);

    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 2;

    const now = ac.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.053, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  },

  // Speed shift sound - ascending or descending
  runToggle(running: boolean): void {
    if (running) {
      playTone(NOTES.C4, 0.12, 0.066, 'triangle');
      setTimeout(() => playTone(NOTES.E4, 0.12, 0.066, 'triangle'), 50);
      setTimeout(() => playTone(NOTES.G4, 0.15, 0.053, 'triangle'), 100);
    } else {
      playTone(NOTES.G4, 0.12, 0.066, 'triangle');
      setTimeout(() => playTone(NOTES.E4, 0.12, 0.066, 'triangle'), 50);
      setTimeout(() => playTone(NOTES.C4, 0.15, 0.053, 'triangle'), 100);
    }
  },

  // Blocked tile - soft negative feedback
  blocked(): void {
    playTone(NOTES.E4, 0.15, 0.066, 'triangle');
    setTimeout(() => playTone(NOTES.D4, 0.2, 0.053, 'triangle'), 80);
  },

  // Camera zoom - subtle pitch bend
  cameraZoom(): void {
    playTone(NOTES.A4, 0.15, 0.04, 'sine', 10);
  },

  // Torch placement - warm ascending flicker
  torchPlace(index: number): void {
    // Rise in pitch with each torch for a satisfying build
    const scale = [NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5];
    const note = scale[index % scale.length];
    playTone(note, 0.25, 0.066, 'triangle');
    // Warm harmonic shimmer
    playTone(note * 1.5, 0.15, 0.03, 'sine');
  },

  // Player reveal - triumphant two-note chord
  playerReveal(): void {
    playTone(NOTES.C5, 0.4, 0.072, 'sine');
    playTone(NOTES.E5, 0.4, 0.048, 'sine');
    playTone(NOTES.G5, 0.35, 0.036, 'sine');
  },

  // Ambient fire crackle - subtle background texture
  startFire(): void {
    startFireCrackle();
  },

  stopFire(): void {
    stopFireCrackle();
  }
};
