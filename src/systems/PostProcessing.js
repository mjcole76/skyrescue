import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Vignette + film grain shader
const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignetteAmount: { value: 0.35 },
    grainAmount: { value: 0.03 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float vignetteAmount;
    uniform float grainAmount;
    varying vec2 vUv;

    float random(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Vignette
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = 1.0 - smoothstep(0.3, 0.85, dist) * vignetteAmount;
      color.rgb *= vignette;

      // Film grain
      float grain = random(vUv + fract(time)) * grainAmount;
      color.rgb += grain - grainAmount * 0.5;

      gl_FragColor = color;
    }
  `,
};

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom — fire glow, embers, lights
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.7,   // strength
      0.5,   // radius
      0.75   // threshold
    );
    this.composer.addPass(this.bloomPass);

    // Vignette + grain
    this.vignettePass = new ShaderPass(VignetteGrainShader);
    this.composer.addPass(this.vignettePass);

    this._renderer = renderer;
  }

  update(elapsedTime) {
    this.vignettePass.uniforms.time.value = elapsedTime;
  }

  render() {
    this.composer.render();
  }

  resize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }
}
