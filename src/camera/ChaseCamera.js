import * as THREE from 'three';
import { CAMERA, HELICOPTER } from '../utils/constants.js';

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this._shakeOffset = new THREE.Vector3();
    this._shakeIntensity = 0;
  }

  update(dt, helicopter) {
    const speed = helicopter.getSpeed();
    const speedRatio = speed / HELICOPTER.SPEED;

    // Camera pulls back at high speed
    const pullback = speedRatio * 4;
    const offset = new THREE.Vector3(
      CAMERA.OFFSET.x,
      CAMERA.OFFSET.y + speedRatio * 1.5,
      CAMERA.OFFSET.z - pullback
    );
    offset.applyQuaternion(helicopter.quaternion);
    const targetPos = helicopter.position.clone().add(offset);

    // Slight lag for cinematic feel (slower lerp than before)
    const lerpSpeed = CAMERA.LERP_SPEED * (0.7 + speedRatio * 0.3);
    this.camera.position.lerp(targetPos, lerpSpeed * dt);

    // Look target: slightly ahead of helicopter
    const lookAhead = CAMERA.LOOK_AHEAD + speedRatio * 3;
    const lookTarget = helicopter.position.clone().add(
      new THREE.Vector3(0, 0, lookAhead).applyQuaternion(helicopter.quaternion)
    );
    this.camera.lookAt(lookTarget);

    // ── Camera shake ──
    // Collision shake
    if (helicopter.collisionIntensity > 0.01) {
      this._shakeIntensity = Math.max(this._shakeIntensity, helicopter.collisionIntensity * 0.5);
    }

    // Fire proximity shake (subtle)
    const distToFire = Math.sqrt(
      helicopter.position.x * helicopter.position.x +
      helicopter.position.z * helicopter.position.z
    );
    if (distToFire < 20 && helicopter.position.y < 40) {
      const fireProximity = (1 - distToFire / 20) * 0.03;
      this._shakeIntensity = Math.max(this._shakeIntensity, fireProximity);
    }

    // Apply shake
    if (this._shakeIntensity > 0.001) {
      const t = performance.now() / 1000;
      this._shakeOffset.set(
        (Math.sin(t * 47) + Math.sin(t * 73)) * this._shakeIntensity,
        (Math.sin(t * 59) + Math.sin(t * 83)) * this._shakeIntensity,
        (Math.sin(t * 67) + Math.sin(t * 97)) * this._shakeIntensity * 0.5
      );
      this.camera.position.add(this._shakeOffset);
      this._shakeIntensity *= (1 - 5 * dt);
    }
  }

  updateMenuOrbit(elapsedTime) {
    this.camera.position.set(
      Math.sin(elapsedTime * 0.15) * 60,
      40 + Math.sin(elapsedTime * 0.1) * 5,
      Math.cos(elapsedTime * 0.15) * 60
    );
    this.camera.lookAt(0, 20, 0);
  }
}
