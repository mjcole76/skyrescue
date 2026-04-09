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
    const px = helicopter.position.x;
    const py = helicopter.position.y;
    const pz = helicopter.position.z;
    const heliRadius = 3;
    const now = performance.now();

    for (let i = 0; i < this.buildings.length; i++) {
      const bounds = this.buildings[i].bounds;
      const dx = Math.max(0, Math.abs(px - bounds.x) - bounds.w / 2);
      const dz = Math.max(0, Math.abs(pz - bounds.z) - bounds.d / 2);
      const dist2D = Math.sqrt(dx * dx + dz * dz);

      if (dist2D < heliRadius && py < bounds.h && py > 0) {
        // Push out — inline normalize
        const pdx = px - bounds.x;
        const pdz = pz - bounds.z;
        const pLen = Math.sqrt(pdx * pdx + pdz * pdz) || 1;
        helicopter.position.x += (pdx / pLen) * 0.5;
        helicopter.position.z += (pdz / pLen) * 0.5;
        helicopter.velocity.multiplyScalar(0.3);
        helicopter.takeDamage(HELICOPTER.COLLISION_DAMAGE, dt);

        if (now - this._lastCollisionTime > 500) {
          if (this.audio) this.audio.playCollision();
          helicopter.triggerCollision();
          this._lastCollisionTime = now;
        }
      }
    }

    // Fire damage near burning building (origin)
    const distToFire = Math.sqrt(px * px + pz * pz);
    if (distToFire < 12 && py < 35 && py > 20) {
      helicopter.takeDamage(HELICOPTER.FIRE_DAMAGE, dt);
    }
  }
}
