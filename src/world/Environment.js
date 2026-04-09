import * as THREE from 'three';
import { WORLD } from '../utils/constants.js';

export function setupEnvironment(scene) {
  // Dusk sky gradient — brighter, more golden hour feel
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#141428');      // Deep blue at zenith
  grad.addColorStop(0.25, '#2a2248');   // Blue-purple
  grad.addColorStop(0.45, '#4a2850');   // Dusky purple
  grad.addColorStop(0.6, '#7a3548');    // Warm twilight
  grad.addColorStop(0.75, '#cc5530');   // Rich orange
  grad.addColorStop(0.88, '#ee7735');   // Bright orange horizon
  grad.addColorStop(0.95, '#ffaa55');   // Golden horizon
  grad.addColorStop(1.0, '#ffcc77');    // Glowing warm
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 2, 512);

  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.magFilter = THREE.LinearFilter;

  // Sky sphere
  const skyGeo = new THREE.SphereGeometry(300, 16, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  scene.background = new THREE.Color(0x141428);
  scene.fog = new THREE.FogExp2(0x201825, 0.004); // Lighter fog, less dense

  // Brighter ambient — blue-white fill light
  const ambient = new THREE.AmbientLight(0x556688, 0.7);
  scene.add(ambient);

  // Strong warm directional — golden hour sun
  const directional = new THREE.DirectionalLight(0xffbb77, 0.8);
  directional.position.set(-60, 25, 50);
  directional.castShadow = true;
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.camera.near = 1;
  directional.shadow.camera.far = 250;
  directional.shadow.camera.left = -100;
  directional.shadow.camera.right = 100;
  directional.shadow.camera.top = 100;
  directional.shadow.camera.bottom = -100;
  directional.shadow.bias = -0.001;
  scene.add(directional);

  // Hemisphere light — brighter, warm ground bounce
  const hemi = new THREE.HemisphereLight(0x5566aa, 0x664433, 0.5);
  scene.add(hemi);

  return { ambient, directional, hemi, sky };
}
