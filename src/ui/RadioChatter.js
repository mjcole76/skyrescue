export class RadioChatter {
  constructor(audioManager) {
    this.audio = audioManager;
    this._el = null;
    this._textEl = null;
    this._callsignEl = null;
    this._queue = [];
    this._showing = false;
    this._hideTimer = null;
    this._typeTimer = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.style.cssText = `
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      z-index: 20; pointer-events: none; opacity: 0; transition: opacity 0.3s;
      max-width: 500px; width: 90%;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
      background: rgba(0,0,0,0.75); border: 1px solid rgba(100,200,100,0.4);
      border-radius: 4px; padding: 10px 16px; backdrop-filter: blur(4px);
      display: flex; align-items: flex-start; gap: 10px;
    `;

    // Radio icon
    const icon = document.createElement('div');
    icon.style.cssText = `
      font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 700;
      color: rgba(100,220,100,0.8); letter-spacing: 1px; white-space: nowrap;
      border: 1px solid rgba(100,200,100,0.3); border-radius: 2px;
      padding: 2px 6px; margin-top: 2px; flex-shrink: 0;
    `;
    this._callsignEl = icon;
    inner.appendChild(icon);

    this._textEl = document.createElement('div');
    this._textEl.style.cssText = `
      font-family: 'Share Tech Mono', monospace; font-size: 12px;
      color: rgba(200,255,200,0.9); line-height: 1.5; letter-spacing: 0.5px;
    `;
    inner.appendChild(this._textEl);

    this._el.appendChild(inner);
    document.body.appendChild(this._el);
  }

  _playStaticBurst() {
    if (!this.audio || !this.audio.started || this.audio.muted) return;
    const ctx = this.audio.ctx;
    if (!ctx) return;

    // Short radio static burst
    const duration = 0.15;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = i < bufferSize * 0.1 ? i / (bufferSize * 0.1) :
                  i > bufferSize * 0.7 ? (bufferSize - i) / (bufferSize * 0.3) : 1;
      data[i] = (Math.random() * 2 - 1) * 0.12 * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000;
    bp.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.value = 0.3;

    source.connect(bp);
    bp.connect(gain);
    gain.connect(this.audio.master);
    source.start();
  }

  show(callsign, text, duration = 4000) {
    this._queue.push({ callsign, text, duration });
    if (!this._showing) this._next();
  }

  _next() {
    if (this._queue.length === 0) {
      this._showing = false;
      return;
    }
    this._showing = true;
    const msg = this._queue.shift();

    this._callsignEl.textContent = msg.callsign;
    this._textEl.textContent = '';
    this._el.style.opacity = '1';

    // Radio static on open
    this._playStaticBurst();

    // Typewriter effect
    let charIndex = 0;
    clearInterval(this._typeTimer);
    this._typeTimer = setInterval(() => {
      if (charIndex < msg.text.length) {
        this._textEl.textContent += msg.text[charIndex];
        charIndex++;
      } else {
        clearInterval(this._typeTimer);
      }
    }, 25);

    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this._el.style.opacity = '0';
      setTimeout(() => this._next(), 400);
    }, msg.duration);
  }

  // ── Pre-built messages for game events ──

  missionStart(missionName) {
    this.show('DISPATCH', `All units, be advised: ${missionName} operation is GO. Rescue One, you are cleared for approach.`, 4500);
    setTimeout(() => {
      this.show('RESCUE-1', 'Copy dispatch. Rescue One en route. Eyes on target.', 3000);
    }, 5000);
  }

  survivorSpotted() {
    const msgs = [
      'Visual on survivor. Moving to hover position.',
      'Survivor spotted. Beginning approach.',
      'Contact. I see them. Holding steady.',
    ];
    this.show('RESCUE-1', msgs[Math.floor(Math.random() * msgs.length)], 2500);
  }

  survivorPickup(count, max) {
    if (count === max) {
      this.show('RESCUE-1', `That's ${count} aboard, we're at capacity. Heading to the pad.`, 3000);
    } else {
      const msgs = [
        `Survivor secure. ${count} of ${max} aboard.`,
        `Got 'em. ${count} onboard, room for ${max - count} more.`,
        `Pickup confirmed. Carrying ${count}.`,
      ];
      this.show('RESCUE-1', msgs[Math.floor(Math.random() * msgs.length)], 2500);
    }
  }

  delivery(saved, total) {
    if (saved >= total) {
      this.show('DISPATCH', 'All survivors accounted for. Outstanding work, Rescue One.', 4000);
    } else {
      const remaining = total - saved;
      this.show('HOSPITAL', `Receiving casualties. ${remaining} still in the field.`, 3000);
    }
  }

  timeWarning(seconds) {
    if (seconds === 30) {
      this.show('DISPATCH', 'Rescue One, you have 30 seconds. Get them out NOW.', 3500);
    } else if (seconds === 60) {
      this.show('DISPATCH', 'One minute remaining. Expedite all operations.', 3000);
    }
  }

  damageWarning() {
    const msgs = [
      'Taking damage! Watch your clearance!',
      'Hull integrity dropping. Be careful out there.',
      'We\'re hit! Pull back from the hazard zone.',
    ];
    this.show('RESCUE-1', msgs[Math.floor(Math.random() * msgs.length)], 2500);
  }

  missionSuccess() {
    this.show('DISPATCH', 'Mission complete. All survivors delivered. RTB, Rescue One. Well done.', 5000);
  }

  missionFail(reason) {
    const msgs = {
      time: 'Time\'s up. Recall all units. We lost this one.',
      destroyed: 'Rescue One is down! Dispatch emergency recovery.',
      default: 'Mission aborted. Stand down.',
    };
    this.show('DISPATCH', msgs[reason] || msgs.default, 4000);
  }
}
