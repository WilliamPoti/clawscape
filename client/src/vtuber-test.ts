// Import from cubism4 specifically for .moc3 models
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import * as PIXI from 'pixi.js';
import { AudioAnalyzer } from './vtuber/AudioAnalyzer';

// Expose PIXI to window for Live2D Cubism framework
(window as any).PIXI = PIXI;

// Create audio analyzer instance
const audioAnalyzer = new AudioAnalyzer();

const status = document.getElementById('status')!;
const controls = document.getElementById('controls')!;
const container = document.getElementById('canvas-container')!;

async function init() {
  status.textContent = 'Creating PIXI app...';

  // Register Live2D with PIXI ticker
  Live2DModel.registerTicker(PIXI.Ticker);

  // Create PIXI application (v7 API)
  const app = new PIXI.Application({
    width: 800,
    height: 600,
    backgroundColor: 0x1a1a2e,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });

  container.insertBefore(app.view as HTMLCanvasElement, status);

  status.textContent = 'Loading wizard model...';

  try {
    // Load the Live2D model
    const model = await Live2DModel.from('/vtuber/wizard/wizard.model3.json', {
      autoInteract: false  // Disable auto interaction to avoid compatibility issues
    });

    // Add to stage
    app.stage.addChild(model);

    // Position and scale the model
    model.x = app.screen.width / 2;
    model.y = app.screen.height;
    model.anchor.set(0.5, 1); // Anchor at bottom center

    // Scale to fit nicely
    const targetHeight = app.screen.height * 0.9;
    const scale = targetHeight / model.height;
    model.scale.set(scale);

    status.textContent = 'Wizard loaded! Click buttons to test:';

    console.log('Model loaded successfully!');
    console.log('Model size:', model.width, 'x', model.height);

    // Debug: list available expressions
    const expManager = model.internalModel.motionManager.expressionManager;
    console.log('Expression manager:', expManager);
    if (expManager) {
      console.log('Available expressions:', expManager.definitions);
    }

    // Create expression buttons (using index since names are in Japanese)
    const expressionLabels = [
      'Sweat',        // 0: 汗
      'Heavy Sweat',  // 1: 汗　沢山
      'Embarrassed',  // 2: 照れ
      'Pale',         // 3: 青ざめ
      'Red Face',     // 4: 赤ざめ
      'Hat Off'       // 5: 帽子オフ
    ];

    for (let i = 0; i < expressionLabels.length; i++) {
      const btn = document.createElement('button');
      btn.textContent = expressionLabels[i];
      btn.onclick = () => {
        console.log(`Triggering expression index: ${i}`);
        model.expression(i);
      };
      controls.appendChild(btn);
    }

    // Add motion button
    const motionBtn = document.createElement('button');
    motionBtn.textContent = 'Cry';
    motionBtn.onclick = () => {
      console.log('Playing tear motion');
      model.motion('namida');
    };
    controls.appendChild(motionBtn);

    // Log all model parameters to find mouth control
    const coreModel = model.internalModel.coreModel;
    console.log('=== MODEL PARAMETERS ===');
    for (let i = 0; i < coreModel.getParameterCount(); i++) {
      const id = coreModel.getParameterId(i);
      console.log(`  ${i}: ${id}`);
    }

    // Add speak button with lipsync
    const speakBtn = document.createElement('button');
    speakBtn.textContent = '🎤 Speak';
    speakBtn.style.background = '#6a4a8a';
    speakBtn.onclick = async () => {
      const audio = new Audio('/vtuber/audio/intro.mp3');

      // Connect audio analyzer
      audioAnalyzer.connect(audio);

      // Start lipsync loop
      let isPlaying = true;
      audio.onended = () => {
        isPlaying = false;
        audioAnalyzer.disconnect();
      };

      audio.play();
      console.log('Playing with lipsync...');

      // Update mouth every frame
      const updateMouth = () => {
        if (!isPlaying) return;

        const amplitude = audioAnalyzer.getAmplitude();

        // Try common mouth parameter names
        // ParamMouthOpenY is common in Live2D models
        try {
          coreModel.setParameterValueById('ParamMouthOpenY', amplitude);
        } catch (e) {
          // Try alternative names
          try {
            coreModel.setParameterValueById('PARAM_MOUTH_OPEN_Y', amplitude);
          } catch (e2) {
            // Silent fail - we'll find the right param from logs
          }
        }

        requestAnimationFrame(updateMouth);
      };
      updateMouth();
    };
    controls.appendChild(speakBtn);

  } catch (error) {
    console.error('Failed to load model:', error);
    status.textContent = `Error: ${error}`;
  }
}

init();
