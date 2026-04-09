import * as THREE from 'three';
import { HELICOPTER } from '../utils/constants.js';

export class CollisionSystem {
  constructor(buildings) {
    this.buildings = buildings;
    this.audio = null;
    this._lastCollisionTime = 0;
  }

  setAudio(audio) {
    this.audio = audio;
  }

  update(helicopter, dt) {
    const pos = helicopter.position;
    const heliRadius = 3;
    const now = performance.now();

    this.buildings.forEach(b => {
      const bounds = b.bounds;
      const dx = Math.max(0, Math.abs(pos.x - bounds.x) - bounds.w / 2);
      const dz = Math.max(0, Math.abs(pos.z - bounds.z) - bounds.d / 2);
      const dist2D = Math.sqrt(dx * dx + dz * dz);

      if (dist2D < heliRadius && pos.y < bounds.h && pos.y > 0) {
        const pushDir = new THREE.Vector2(pos.x - bounds.x, pos.z - bounds.z).normalize();
        helicopter.position.x += pushDir.x * 0.5;
        helicopter.position.z += pushDir.y * 0.5;
        helicopter.velocity.multiplyScalar(0.3);
        helicopter.takeDamage(HELICOPTER.COLLISION_DAMAGE, dt);

        // Play collision sound + camera shake (throttled to once per 500ms)
        if (now - this._lastCollisionTime > 500) {
          if (this.audio) this.audio.playCollision();
          helicopter.triggerCollision();
          this._lastCollisionTime = now;
        }
      }
    });

    // Fire damage near burning building
    const distToFire = new THREE.Vector2(pos.x, pos.z).length();
    if (distToFire < 12 && pos.y < 35 && pos.y > 20) {
      helicopter.takeDamage(HELICOPTER.FIRE_DAMAGE, dt);
    }
  }
}
