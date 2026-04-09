import * as THREE from 'three';
import { RESCUE } from '../utils/constants.js';

const SURVIVOR_COLORS = [0xff8800, 0x44aaff, 0xff4488, 0x88ff44, 0xffff44];

const SURVIVOR_POSITIONS = [
  { x: -3, z: -3 },
  { x: 4, z: 2 },
  { x: -2, z: 5 },
  { x: 6, z: -4 },
  { x: -5, z: 0 },
];

export function createSurvivors(scene) {
  const survivors = [];

  SURVIVOR_POSITIONS.forEach((pos, i) => {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: SURVIVOR_COLORS[i], roughness: 0.6
    });

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1, 8), bodyMat);
    body.position.y = 0.7;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffcc99 })
    );
    head.position.y = 1.45;
    group.add(head);

    // Arms
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), bodyMat);
    arm1.position.set(-0.4, 1.2, 0);
    arm1.rotation.z = -0.5;
    group.add(arm1);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), bodyMat);
    arm2.position.set(0.4, 1.2, 0);
    arm2.rotation.z = 0.5;
    group.add(arm2);

    // Rescue zone ring — pulsing
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(RESCUE.HOVER_RADIUS - 0.3, RESCUE.HOVER_RADIUS, 32),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);

    // Inner ring pulse
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.2;
    group.add(innerRing);

    // Glow beacon — brighter
    const beacon = new THREE.PointLight(0xffaa00, 2, 20);
    beacon.position.y = 2;
    group.add(beacon);

    // Distress flare — tall vertical beam
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const flareGeo = new THREE.PlaneGeometry(0.4, 15);
    const flare1 = new THREE.Mesh(flareGeo, flareMat.clone());
    flare1.position.y = 9;
    group.add(flare1);
    const flare2 = new THREE.Mesh(flareGeo, flareMat.clone());
    flare2.position.y = 9;
    flare2.rotation.y = Math.PI / 2;
    group.add(flare2);

    // Flare glow light
    const flareLight = new THREE.PointLight(0xff4400, 1.5, 25);
    flareLight.position.y = 5;
    group.add(flareLight);

    group.position.set(pos.x, 30.5, pos.z);
    group.userData = {
      rescued: false,
      index: i,
      arms: [arm1, arm2],
      beacon,
      ring,
      innerRing,
      flare1,
      flare2,
      flareLight,
    };
    scene.add(group);
    survivors.push(group);
  });

  return survivors;
}

export function updateSurvivorAnimations(survivors, elapsedTime) {
  survivors.forEach(s => {
    if (s.userData.rescued) return;
    const idx = s.userData.index;

    // Arm waving
    const arms = s.userData.arms;
    arms[0].rotation.z = -0.5 + Math.sin(elapsedTime * 4 + idx) * 0.8;
    arms[1].rotation.z = 0.5 + Math.sin(elapsedTime * 4 + idx + Math.PI) * 0.8;

    // Rescue ring pulse
    s.userData.ring.material.opacity = 0.25 + Math.sin(elapsedTime * 2) * 0.2;

    // Inner ring expanding pulse
    const pulse = (Math.sin(elapsedTime * 3 + idx) + 1) * 0.5;
    const innerScale = 1 + pulse * 4;
    s.userData.innerRing.scale.setScalar(innerScale);
    s.userData.innerRing.material.opacity = 0.5 * (1 - pulse);

    // Beacon intensity
    s.userData.beacon.intensity = 1.5 + Math.sin(elapsedTime * 3 + idx) * 1;

    // Distress flare — flickers and sways
    const flareOpacity = 0.15 + Math.sin(elapsedTime * 2 + idx * 2) * 0.1 +
                          Math.sin(elapsedTime * 5 + idx) * 0.05;
    s.userData.flare1.material.opacity = flareOpacity;
    s.userData.flare2.material.opacity = flareOpacity;
    s.userData.flare1.rotation.y = Math.sin(elapsedTime * 0.5 + idx) * 0.1;
    s.userData.flare2.rotation.y = Math.PI / 2 + Math.cos(elapsedTime * 0.5 + idx) * 0.1;

    // Flare light pulses
    s.userData.flareLight.intensity = 1 + Math.sin(elapsedTime * 2.5 + idx * 1.5) * 0.8;
  });
}
