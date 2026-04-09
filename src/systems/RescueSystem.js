import * as THREE from 'three';
import { RESCUE, HELICOPTER, SCORING } from '../utils/constants.js';

export class RescueSystem {
  constructor(survivors, hospitalPad) {
    this.survivors = survivors;
    this.hospitalPad = hospitalPad;
    this.rescueProgress = 0;
    this.currentRescueTarget = null;
  }

  update(helicopter, dt, callbacks) {
    const heliPos = helicopter.position;
    let nearSurvivor = null;
    let nearDist = Infinity;

    // Check survivors
    this.survivors.forEach(s => {
      if (s.userData.rescued) return;
      const dist = new THREE.Vector2(
        heliPos.x - s.position.x, heliPos.z - s.position.z
      ).length();
      const altDiff = Math.abs(heliPos.y - s.position.y);

      if (dist < RESCUE.HOVER_RADIUS && altDiff < RESCUE.MAX_ALT_DIFF && dist < nearDist) {
        nearSurvivor = s;
        nearDist = dist;
      }
    });

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

    // Check drop-off
    if (helicopter.passengersOnboard > 0) {
      const distToPad = new THREE.Vector2(
        heliPos.x - this.hospitalPad.position.x,
        heliPos.z - this.hospitalPad.position.z
      ).length();
      const altToPad = Math.abs(heliPos.y - this.hospitalPad.position.y);

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
