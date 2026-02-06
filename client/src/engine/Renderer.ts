import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/**
 * Color grading shader — brightness, contrast, saturation.
 * Also supports colorblind simulation modes.
 */
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
    colorblindMode: { value: 0 }, // 0=none, 1=protanopia, 2=deuteranopia, 3=tritanopia
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform int colorblindMode;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 c = color.rgb;

      // Brightness
      c += brightness;

      // Contrast
      c = (c - 0.5) * contrast + 0.5;

      // Saturation
      float luma = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(luma), c, saturation);

      // Colorblind simulation
      if (colorblindMode == 1) { // Protanopia (no red)
        c = vec3(
          0.567 * c.r + 0.433 * c.g,
          0.558 * c.r + 0.442 * c.g,
          0.242 * c.g + 0.758 * c.b
        );
      } else if (colorblindMode == 2) { // Deuteranopia (no green)
        c = vec3(
          0.625 * c.r + 0.375 * c.g,
          0.700 * c.r + 0.300 * c.g,
          0.300 * c.g + 0.700 * c.b
        );
      } else if (colorblindMode == 3) { // Tritanopia (no blue)
        c = vec3(
          0.950 * c.r + 0.050 * c.g,
          0.433 * c.g + 0.567 * c.b,
          0.475 * c.g + 0.525 * c.b
        );
      }

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), color.a);
    }
  `,
};

export interface GraphicsSettings {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  fxaaEnabled?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  colorblindMode?: number; // 0=none, 1=protanopia, 2=deuteranopia, 3=tritanopia
  anisotropy?: number;
}

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private bloomPass: UnrealBloomPass;
  private fxaaPass: ShaderPass;
  private colorGradingPass: ShaderPass;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Set max anisotropy for textures
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    THREE.Texture.DEFAULT_ANISOTROPY = Math.min(maxAniso, 8);

    // Post-processing pipeline
    this.composer = new EffectComposer(this.renderer);

    // 1. Render pass
    this.composer.addPass(new RenderPass(scene, camera));

    // 2. Bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,   // bloom strength
      0.4,   // radius
      0.2    // threshold
    );
    this.composer.addPass(this.bloomPass);

    // 3. FXAA anti-aliasing
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.fxaaPass.uniforms['resolution'].value.set(
      1 / (window.innerWidth * this.renderer.getPixelRatio()),
      1 / (window.innerHeight * this.renderer.getPixelRatio())
    );
    this.composer.addPass(this.fxaaPass);

    // 4. Color grading (brightness, contrast, saturation, colorblind)
    this.colorGradingPass = new ShaderPass(ColorGradingShader);
    this.composer.addPass(this.colorGradingPass);
  }

  render(): void {
    this.composer.render();
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.fxaaPass.uniforms['resolution'].value.set(
      1 / (width * this.renderer.getPixelRatio()),
      1 / (height * this.renderer.getPixelRatio())
    );
  }

  /** Update graphics settings */
  setSettings(settings: GraphicsSettings): void {
    if (settings.bloomStrength !== undefined) this.bloomPass.strength = settings.bloomStrength;
    if (settings.bloomRadius !== undefined) this.bloomPass.radius = settings.bloomRadius;
    if (settings.bloomThreshold !== undefined) this.bloomPass.threshold = settings.bloomThreshold;
    if (settings.fxaaEnabled !== undefined) this.fxaaPass.enabled = settings.fxaaEnabled;
    if (settings.brightness !== undefined) this.colorGradingPass.uniforms.brightness.value = settings.brightness;
    if (settings.contrast !== undefined) this.colorGradingPass.uniforms.contrast.value = settings.contrast;
    if (settings.saturation !== undefined) this.colorGradingPass.uniforms.saturation.value = settings.saturation;
    if (settings.colorblindMode !== undefined) this.colorGradingPass.uniforms.colorblindMode.value = settings.colorblindMode;
    if (settings.anisotropy !== undefined) {
      const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
      THREE.Texture.DEFAULT_ANISOTROPY = Math.min(maxAniso, settings.anisotropy);
    }
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
}
