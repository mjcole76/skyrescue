import * as THREE from 'three';
import { WORLD } from '../utils/constants.js';

export function setupEnvironment(scene) {
  // Bright golden-hour sky
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1e2040');
  grad.addColorStop(0.2, '#3a3060');
  grad.addColorStop(0.4, '#5a3858');
  grad.addColorStop(0.55, '#8a4448');
  grad.addColorStop(0.7, '#dd6633');
  grad.addColorStop(0.82, '#ee8840');
  grad.addColorStop(0.92, '#ffbb66');
  grad.addColorStop(1.0, '#ffdd88');
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 2, 512);

  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.magFilter = THREE.LinearFilter;

  const skyGeo = new THREE.SphereGeometry(300, 16, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  scene.background = new THREE.Color(0x1e2040);
  scene.fog = new THREE.FogExp2(0x2a2030, 0.003);

  // Strong ambient fill
  const ambient = new THREE.AmbientLight(0x7788aa, 0.9);
  scene.add(ambient);

  // Bright warm directional — golden hour
  const directional = new THREE.DirectionalLight(0xffcc88, 1.0);
  directional.position.set(-60, 30, 50);
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

  // Secondary fill light from opposite side
  const fill = new THREE.DirectionalLight(0x6688bb, 0.4);
  fill.position.set(40, 20, -40);
  scene.add(fill);

  // Hemisphere — warm ground, blue sky
  const hemi = new THREE.HemisphereLight(0x7799cc, 0x886644, 0.6);
  scene.add(hemi);

  return { ambient, directional, fill, hemi, sky };
}
