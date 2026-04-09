import { RESCUE, HELICOPTER, SCORING } from '../utils/constants.js';

export class RescueSystem {
  constructor(survivors, hospitalPad) {
    this.survivors = survivors;
    this.hospitalPad = hospitalPad;
    this.rescueProgress = 0;
    this.currentRescueTarget = null;
  }

  update(helicopter, dt, callbacks) {
    const hx = helicopter.position.x;
    const hy = helicopter.position.y;
    const hz = helicopter.position.z;
    let nearSurvivor = null;
    let nearDist = Infinity;

    // Check survivors — no allocations
    for (let i = 0; i < this.survivors.length; i++) {
      const s = this.survivors[i];
      if (s.userData.rescued) continue;
      const dx = hx - s.position.x;
      const dz = hz - s.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const altDiff = Math.abs(hy - s.position.y);

      if (dist < RESCUE.HOVER_RADIUS && altDiff < RESCUE.MAX_ALT_DIFF && dist < nearDist) {
        nearSurvivor = s;
        nearDist = dist;
      }
    }

    // Rescue progress
    if (nearSurvivor && helicopter.passengersOnboard < HELICOPTER.MAX_PASSENGERS) {
      if (this.currentRescueTarget !== nearSurvivor) {
        this.currentRescueTarget = nearSurvivor;
        this.rescueProgress = 0;
      }
      this.rescueProgress += dt;

      callbacks.onRescueProgress(this.rescueProgress / RESCUE.RESCUE_TIME);

      if (this.rescueProgress >= RESCUE.RESCUE_TIME) {
        nearSurvivor.userData.rescued = true;
        nearSurvivor.visible = false;
        helicopter.passengersOnboard++;
        this.rescueProgress = 0;
        this.currentRescueTarget = null;
        callbacks.onRescueComplete(helicopter.passengersOnboard);
      }
    } else {
      if (this.currentRescueTarget) {
        this.rescueProgress = Math.max(0, this.rescueProgress - dt * RESCUE.PROGRESS_DECAY);
        if (this.rescueProgress <= 0) {
          this.currentRescueTarget = null;
          callbacks.onRescueCancel();
        } else {
          callbacks.onRescueProgress(this.rescueProgress / RESCUE.RESCUE_TIME);
        }
      }
    }

    // Check drop-off — no allocations
    if (helicopter.passengersOnboard > 0) {
      const pdx = hx - this.hospitalPad.position.x;
      const pdz = hz - this.hospitalPad.position.z;
      const distToPad = Math.sqrt(pdx * pdx + pdz * pdz);
      const altToPad = Math.abs(hy - this.hospitalPad.position.y);

      if (distToPad < RESCUE.DROPOFF_RADIUS && altToPad < 6) {
        const delivered = helicopter.passengersOnboard;
        const scoreGained = delivered * SCORING.PER_SURVIVOR;
        helicopter.passengersOnboard = 0;
        callbacks.onDelivery(delivered, scoreGained);
      }
    }

    // Return context hint
    if (nearSurvivor && helicopter.passengersOnboard < HELICOPTER.MAX_PASSENGERS) {
      return 'rescue';
    } else if (helicopter.passengersOnboard >= HELICOPTER.MAX_PASSENGERS) {
      return 'full';
    } else if (helicopter.passengersOnboard > 0) {
      return 'deliver';
    }
    return 'none';
  }

  reset() {
    this.rescueProgress = 0;
    this.currentRescueTarget = null;
    this.survivors.forEach(s => {
      s.userData.rescued = false;
      s.visible = true;
    });
  }
}
