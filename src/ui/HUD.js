import { HELICOPTER } from '../utils/constants.js';

export class HUD {
  constructor() {
    this.promptTimeout = null;
    this.els = {
      hud: document.getElementById('hud'),
      timer: document.getElementById('hud-timer'),
      survivors: document.getElementById('hud-survivors'),
      integrityFill: document.getElementById('integrity-fill'),
      passengersIcons: document.getElementById('passengers-icons'),
      rescueBar: document.getElementById('rescue-bar'),
      rescueBarFill: document.getElementById('rescue-bar-fill'),
      prompt: document.getElementById('hud-prompt'),
    };
  }

  show() { this.els.hud.style.display = 'block'; }
  hide() { this.els.hud.style.display = 'none'; }

  updateTimer(timeRemaining) {
    this.els.timer.textContent = Math.max(0, Math.ceil(timeRemaining));
    this.els.timer.className = timeRemaining < 30 ? 'hud-value warning' : 'hud-value';
  }

  updateSurvivors(saved, total) {
    this.els.survivors.textContent = saved + ' / ' + total;
  }

  updateIntegrity(integrity) {
    const val = Math.max(0, integrity);
    this.els.integrityFill.style.width = val + '%';
    if (val > 50) {
      this.els.integrityFill.style.background = 'linear-gradient(90deg, #44ff44, #88ff44)';
    } else if (val > 25) {
      this.els.integrityFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff6600)';
    } else {
      this.els.integrityFill.style.background = 'linear-gradient(90deg, #ff4444, #ff0000)';
    }
  }

  updatePassengers(onboard) {
    this.els.passengersIcons.innerHTML = '';
    for (let i = 0; i < HELICOPTER.MAX_PASSENGERS; i++) {
      const slot = document.createElement('div');
      slot.className = 'passenger-slot' + (i < onboard ? ' filled' : '');
      this.els.passengersIcons.appendChild(slot);
    }
  }

  showRescueProgress(progress) {
    this.els.rescueBar.style.display = 'block';
    this.els.rescueBarFill.style.width = (progress * 100) + '%';
  }

  hideRescueBar() {
    this.els.rescueBar.style.display = 'none';
  }

  showPrompt(text, duration) {
    this.els.prompt.textContent = text;
    this.els.prompt.style.display = 'block';
    clearTimeout(this.promptTimeout);
    this.promptTimeout = setTimeout(() => {
      this.els.prompt.style.display = 'none';
      this.promptTimeout = null;
    }, duration);
  }

  setContextPrompt(context) {
    if (this.promptTimeout) return;
    const messages = {
      rescue: 'HOVER TO RESCUE \u2014 HOLD STEADY',
      deliver: 'DELIVER TO HOSPITAL PAD \u25b8',
      full: 'CAPACITY FULL \u2014 DELIVER TO PAD',
    };
    if (messages[context]) {
      this.els.prompt.textContent = messages[context];
      this.els.prompt.style.display = 'block';
    } else {
      this.els.prompt.style.display = 'none';
    }
  }
}
