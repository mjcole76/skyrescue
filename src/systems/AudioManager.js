export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.started = false;

    this._rotor = null;
    this._rotorGain = null;
    this._wind = null;
    this._windGain = null;
    this._fire = null;
    this._fireGain = null;
    this._tensionDrone = null;
    this._tensionGain = null;
    this._timerInterval = null;
  }

  init() {
    if (this.started) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
    this.started = true;

    this._initRotor();
    this._initWind();
    this._initFire();
    this._initTensionDrone();
  }

  // Helper: play a one-shot oscillator with auto-cleanup
  _oneShot(type, freq, volume, duration, delay = 0) {
    const ctx = this.ctx;
    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    // Auto-cleanup on end
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // ── Rotor Loop ──
  _initRotor() {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const chopRate = 16;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const chop = 0.4 + 0.6 * Math.abs(Math.sin(Math.PI * chopRate * t));
      data[i] = (Math.random() * 2 - 1) * chop * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 180;
    bp.Q.value = 0.8;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;

    this._rotorGain = ctx.createGain();
    this._rotorGain.gain.value = 0;

    source.connect(bp);
    bp.connect(lp);
    lp.connect(this._rotorGain);
    this._rotorGain.connect(this.master);
    source.start();
    this._rotor = { source, bp, lp };
  }

  // ── Wind ──
  _initWind() {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 0.5;

    this._windGain = ctx.createGain();
    this._windGain.gain.value = 0;

    source.connect(bp);
    bp.connect(this._windGain);
    this._windGain.connect(this.master);
    source.start();
    this._wind = { source, bp };
  }

  // ── Fire Crackle ──
  _initFire() {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let envelope = 0;
    for (let i = 0; i < bufferSize; i++) {
      if (Math.random() < 0.003) envelope = 0.6 + Math.random() * 0.4;
      envelope *= 0.997;
      const pop = Math.random() < 0.0008 ? (Math.random() - 0.5) * 2 : 0;
      data[i] = ((Math.random() * 2 - 1) * envelope * 0.15) + pop * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6000;

    this._fireGain = ctx.createGain();
    this._fireGain.gain.value = 0;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(this._fireGain);
    this._fireGain.connect(this.master);
    source.start();
    this._fire = { source };
  }

  // ── Tension Drone ──
  _initTensionDrone() {
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 82.5;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;

    this._tensionGain = ctx.createGain();
    this._tensionGain.gain.value = 0;

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(this._tensionGain);
    this._tensionGain.connect(this.master);
    osc1.start();
    osc2.start();
    this._tensionDrone = { osc1, osc2, lp };
  }

  // ── Per-frame update ──
  update(helicopter, gameState) {
    if (!this.started || this.muted) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vel = helicopter.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const isPlaying = gameState.isPlaying;

    const rotorTarget = isPlaying ? 0.35 : 0;
    this._rotorGain.gain.linearRampToValueAtTime(rotorTarget, now + 0.1);
    if (this._rotor) {
      this._rotor.bp.frequency.linearRampToValueAtTime(140 + speed * 4, now + 0.1);
    }

    const windTarget = isPlaying ? Math.min(speed / 22, 1) * 0.2 : 0;
    this._windGain.gain.linearRampToValueAtTime(windTarget, now + 0.1);
    if (this._wind) {
      this._wind.bp.frequency.linearRampToValueAtTime(300 + speed * 30, now + 0.1);
    }

    const distToFire = Math.sqrt(
      helicopter.position.x * helicopter.position.x +
      helicopter.position.z * helicopter.position.z
    );
    const fireVolume = isPlaying ? Math.max(0, 1 - distToFire / 60) * 0.4 : 0;
    this._fireGain.gain.linearRampToValueAtTime(fireVolume, now + 0.1);

    if (isPlaying) {
      const timeLeft = gameState.missionTimer;
      let droneVol = 0;
      if (timeLeft < 60) {
        droneVol = Math.min((60 - timeLeft) / 60, 1) * 0.08;
      }
      if (timeLeft < 30) {
        droneVol = 0.08 + (30 - timeLeft) / 30 * 0.07;
        this._tensionDrone.lp.frequency.linearRampToValueAtTime(
          200 + (30 - timeLeft) / 30 * 400, now + 0.2
        );
      }
      this._tensionGain.gain.linearRampToValueAtTime(droneVol, now + 0.3);
    } else {
      this._tensionGain.gain.linearRampToValueAtTime(0, now + 0.5);
    }
  }

  // ── One-shot sounds (all auto-cleanup via _oneShot) ──

  playRescueBeep(progress) {
    if (!this.started || this.muted) return;
    this._oneShot('sine', 600 + progress * 800, 0.12, 0.1);
  }

  playPickup() {
    if (!this.started || this.muted) return;
    this._oneShot('sine', 800, 0.15, 0.2, 0);
    this._oneShot('sine', 1000, 0.15, 0.2, 0.08);
    this._oneShot('sine', 1200, 0.15, 0.2, 0.16);
  }

  playDropoff() {
    if (!this.started || this.muted) return;
    this._oneShot('square', 1000, 0.08, 0.12, 0);
    this._oneShot('square', 1400, 0.08, 0.12, 0.12);
  }

  playCollision() {
    if (!this.started || this.muted) return;
    // Low thud
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 60;
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
    gain.gain.value = 0.4;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  playTimerWarning() {
    if (!this.started || this.muted) return;
    this._oneShot('square', 880, 0.1, 0.08);
  }

  playMissionSuccess() {
    if (!this.started || this.muted) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this._oneShot('sine', freq, 0.15, 0.45, i * 0.12);
    });
  }

  playMissionFail() {
    if (!this.started || this.muted) return;
    [400, 350, 300, 200].forEach((freq, i) => {
      this._oneShot('sine', freq, 0.12, 0.55, i * 0.2);
    });
  }

  startTimerWarning() {
    if (this._timerInterval) return;
    this._timerInterval = setInterval(() => this.playTimerWarning(), 1000);
  }

  stopTimerWarning() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  toggleMute() {
    if (!this.started) return;
    this.muted = !this.muted;
    this.master.gain.linearRampToValueAtTime(
      this.muted ? 0 : 0.6, this.ctx.currentTime + 0.1
    );
    if (this.muted) this.stopTimerWarning();
    return this.muted;
  }

  stopAll() {
    this.stopTimerWarning();
    if (!this.started) return;
    const now = this.ctx.currentTime;
    this._rotorGain.gain.linearRampToValueAtTime(0, now + 0.3);
    this._windGain.gain.linearRampToValueAtTime(0, now + 0.3);
    this._fireGain.gain.linearRampToValueAtTime(0, now + 0.3);
    this._tensionGain.gain.linearRampToValueAtTime(0, now + 0.3);
  }
}
