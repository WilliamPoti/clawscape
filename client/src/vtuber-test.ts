// Import from cubism4 specifically for .moc3 models
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import * as PIXI from 'pixi.js';

// Expose PIXI to window for Live2D Cubism framework
(window as any).PIXI = PIXI;

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

    // Create expression buttons
    const expressionNames = [
      { name: 'ase', label: 'Sweat' },
      { name: 'asetakusann', label: 'Heavy Sweat' },
      { name: 'tere', label: 'Embarrassed' },
      { name: 'aozame', label: 'Pale' },
      { name: 'akazame', label: 'Red Face' },
      { name: 'bousi off', label: 'Hat Off' }
    ];

    for (const exp of expressionNames) {
      const btn = document.createElement('button');
      btn.textContent = exp.label;
      btn.onclick = () => {
        console.log(`Triggering expression: ${exp.name}`);
        model.expression(exp.name);
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

  } catch (error) {
    console.error('Failed to load model:', error);
    status.textContent = `Error: ${error}`;
  }
}

init();
