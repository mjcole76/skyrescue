export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.started = false;

    // Persistent sound nodes
    this._rotor = null;
    this._rotorGain = null;
    this._wind = null;
    this._windGain = null;
    this._fire = null;
    this._fireGain = null;
    this._timerBeep = null;
    this._timerGain = null;
    this._timerInterval = null;
    this._tensionDrone = null;
    this._tensionGain = null;
  }

  // Must be called from a user gesture (click)
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

  // ── Rotor Loop ──────────────────────────────────────────
  _initRotor() {
    const ctx = this.ctx;

    // Rotor is shaped noise with rhythmic modulation
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Create choppy rotor pattern
    const chopRate = 16; // blade passes per second (4 blades × ~4 rev/s)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const chop = 0.4 + 0.6 * Math.abs(Math.sin(Math.PI * chopRate * t));
      const noise = (Math.random() * 2 - 1);
      data[i] = noise * chop * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass for that characteristic thwap
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 180;
    bp.Q.value = 0.8;

    // Low-frequency thump
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

  // ── Wind ────────────────────────────────────────────────
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

  // ── Fire Crackle ────────────────────────────────────────
  _initFire() {
    const ctx = this.ctx;

    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Crackling: bursts of noise with random gaps
    let envelope = 0;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      // Random crackle bursts
      if (Math.random() < 0.003) envelope = 0.6 + Math.random() * 0.4;
      envelope *= 0.997;
      // Mix hiss and pops
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

  // ── Tension Drone ───────────────────────────────────────
  _initTensionDrone() {
    const ctx = this.ctx;

    // Low ominous drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 82.5; // perfect fifth above

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

  // ── Per-frame update ────────────────────────────────────
  update(helicopter, gameState) {
    if (!this.started || this.muted) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const vel = helicopter.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const isPlaying = gameState.isPlaying;

    // Rotor: always on during gameplay, pitch varies with speed
    const rotorTarget = isPlaying ? 0.35 : 0;
    this._rotorGain.gain.linearRampToValueAtTime(rotorTarget, now + 0.1);
    if (this._rotor) {
      this._rotor.bp.frequency.linearRampToValueAtTime(140 + speed * 4, now + 0.1);
    }

    // Wind: louder at higher speeds
    const windTarget = isPlaying ? Math.min(speed / 22, 1) * 0.2 : 0;
    this._windGain.gain.linearRampToValueAtTime(windTarget, now + 0.1);
    if (this._wind) {
      this._wind.bp.frequency.linearRampToValueAtTime(300 + speed * 30, now + 0.1);
    }

    // Fire: louder when near burning building (origin)
    const distToFire = Math.sqrt(
      helicopter.position.x * helicopter.position.x +
      helicopter.position.z * helicopter.position.z
    );
    const fireVolume = isPlaying ? Math.max(0, 1 - distToFire / 60) * 0.4 : 0;
    this._fireGain.gain.linearRampToValueAtTime(fireVolume, now + 0.1);

    // Tension drone: fades in during last 60s, intensifies last 30s
    if (isPlaying) {
      const timeLeft = gameState.missionTimer;
      let droneVol = 0;
      if (timeLeft < 60) {
        droneVol = Math.min((60 - timeLeft) / 60, 1) * 0.08;
      }
      if (timeLeft < 30) {
        droneVol = 0.08 + (30 - timeLeft) / 30 * 0.07;
        // Raise filter for more urgency
        this._tensionDrone.lp.frequency.linearRampToValueAtTime(
          200 + (30 - timeLeft) / 30 * 400, now + 0.2
        );
      }
      this._tensionGain.gain.linearRampToValueAtTime(droneVol, now + 0.3);
    } else {
      this._tensionGain.gain.linearRampToValueAtTime(0, now + 0.5);
    }
  }

  // ── One-shot sounds ─────────────────────────────────────

  playRescueBeep(progress) {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Ascending pitch as rescue progresses
    osc.frequency.value = 600 + progress * 800;
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playPickup() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    // Satisfying rising chime
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.25);
    });
  }

  playDropoff() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    // Radio-style confirmation: two-tone beep
    [1000, 1400].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.12);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.12);
    });
  }

  playCollision() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;

    // Low thud
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
    osc.stop(ctx.currentTime + 0.3);

    // Impact noise burst
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.2;
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start();
  }

  playTimerWarning() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  playMissionSuccess() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    // Triumphant ascending arpeggio
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
  }

  playMissionFail() {
    if (!this.started || this.muted) return;
    const ctx = this.ctx;
    // Descending somber tone
    [400, 350, 300, 200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.2 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.6);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.6);
    });
  }

  // ── Timer beep management ───────────────────────────────
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

  // ── Mute toggle ─────────────────────────────────────────
  toggleMute() {
    if (!this.started) return;
    this.muted = !this.muted;
    this.master.gain.linearRampToValueAtTime(
      this.muted ? 0 : 0.6, this.ctx.currentTime + 0.1
    );
    if (this.muted) this.stopTimerWarning();
    return this.muted;
  }

  // ── Cleanup on mission end ──────────────────────────────
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
