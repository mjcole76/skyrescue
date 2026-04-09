import * as THREE from 'three';
import { RESCUE } from '../utils/constants.js';

export class HospitalPad {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(75, 8.3, -60);
    this.radius = RESCUE.DROPOFF_RADIUS;
    this.bounds = { x: 75, z: -60, w: 22, d: 18, h: 10 };

    this._build();
    this.group.position.set(75, 0, -60);
    scene.add(this.group);
  }

  _build() {
    // Hospital building
    const hospitalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
    const hospitalMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 16), hospitalMat);
    hospitalMesh.position.y = 4;
    hospitalMesh.castShadow = true;
    this.group.add(hospitalMesh);

    // Red cross
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x880000, emissiveIntensity: 0.3 });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.2), crossMat);
    crossH.position.set(0, 6, 8.1);
    this.group.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 0.2), crossMat);
    crossV.position.set(0, 6, 8.1);
    this.group.add(crossV);

    // Helipad
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 })
    );
    pad.position.set(0, 8.15, 0);
    pad.receiveShadow = true;
    this.group.add(pad);

    // H marking
    const hMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const hLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 5), hMat);
    hLeft.rotation.x = -Math.PI / 2;
    hLeft.position.set(-1.5, 8.35, 0);
    this.group.add(hLeft);
    const hRight = hLeft.clone();
    hRight.position.x = 1.5;
    this.group.add(hRight);
    const hMid = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.8), hMat);
    hMid.rotation.x = -Math.PI / 2;
    hMid.position.set(0, 8.35, 0);
    this.group.add(hMid);

    // Circle marking
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(5.5, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(0, 8.35, 0);
    this.group.add(circle);

    // Pad lights
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff44 })
      );
      light.position.set(Math.cos(angle) * 6.2, 8.4, Math.sin(angle) * 6.2);
      this.group.add(light);
    }
  }
}
