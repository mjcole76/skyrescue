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
    this._built = false;
  }

  _ensureBuilt() {
    if (this._built) return;
    this._built = true;

    this._el = document.createElement('div');
    this._el.id = 'radio-chatter';
    this._el.innerHTML = `
      <div style="
        background: rgba(0,10,0,0.8);
        border: 1px solid rgba(80,200,80,0.5);
        border-radius: 4px;
        padding: 10px 16px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        box-shadow: 0 0 15px rgba(0,200,0,0.1);
      ">
        <div id="radio-callsign" style="
          font-family: 'Orbitron', monospace;
          font-size: 9px;
          font-weight: 700;
          color: rgba(80,220,80,0.9);
          letter-spacing: 1px;
          white-space: nowrap;
          border: 1px solid rgba(80,200,80,0.4);
          border-radius: 2px;
          padding: 3px 7px;
          margin-top: 1px;
          flex-shrink: 0;
        "></div>
        <div id="radio-text" style="
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px;
          color: rgba(180,255,180,0.95);
          line-height: 1.5;
          letter-spacing: 0.5px;
        "></div>
      </div>
    `;

    Object.assign(this._el.style, {
      position: 'fixed',
      top: '75px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '60',
      pointerEvents: 'none',
      maxWidth: '520px',
      width: '90%',
      display: 'none',
    });

    document.body.appendChild(this._el);
    this._callsignEl = document.getElementById('radio-callsign');
    this._textEl = document.getElementById('radio-text');
  }

  _playStaticBurst() {
    if (!this.audio || !this.audio.started || this.audio.muted) return;
    const ctx = this.audio.ctx;
    if (!ctx) return;

    const duration = 0.18;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = i < bufferSize * 0.1 ? i / (bufferSize * 0.1) :
                  i > bufferSize * 0.7 ? (bufferSize - i) / (bufferSize * 0.3) : 1;
      data[i] = (Math.random() * 2 - 1) * 0.15 * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0.35;

    source.connect(bp);
    bp.connect(gain);
    gain.connect(this.audio.master);
    source.start();
    source.onended = () => { source.disconnect(); bp.disconnect(); gain.disconnect(); };
  }

  show(callsign, text, duration = 4000) {
    this._ensureBuilt();
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
    this._el.style.display = 'block';

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
    }, 22);

    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this._el.style.display = 'none';
      setTimeout(() => this._next(), 300);
    }, msg.duration);
  }

  // ── Pre-built messages ──

  missionStart(missionName) {
    this.show('DISPATCH', `All units — ${missionName} operation is GO. Rescue One, you are cleared hot.`, 4500);
    setTimeout(() => {
      this.show('RESCUE-1', 'Copy dispatch. Rescue One inbound. Eyes on target.', 3500);
    }, 5200);
  }

  survivorPickup(count, max) {
    if (count >= max) {
      this.show('RESCUE-1', `That's ${count} aboard — at capacity. Heading to the pad.`, 3000);
    } else {
      const msgs = [
        `Survivor secure. ${count} of ${max} onboard.`,
        `Got 'em. Carrying ${count}, room for ${max - count} more.`,
        `Pickup confirmed. ${count} aboard.`,
      ];
      this.show('RESCUE-1', msgs[Math.floor(Math.random() * msgs.length)], 3000);
    }
  }

  delivery(saved, total) {
    if (saved >= total) {
      this.show('DISPATCH', 'All survivors accounted for. Outstanding work, Rescue One.', 4000);
    } else {
      const remaining = total - saved;
      this.show('HOSPITAL', `Casualties received. ${remaining} still out there.`, 3000);
    }
  }

  timeWarning(seconds) {
    if (seconds === 30) {
      this.show('DISPATCH', 'Rescue One — 30 seconds! Get them out NOW!', 3500);
    } else if (seconds === 60) {
      this.show('DISPATCH', 'One minute remaining. Expedite all operations.', 3500);
    }
  }

  damageWarning() {
    const msgs = [
      'Taking hits! Watch your clearance, Rescue One!',
      'Hull integrity dropping — pull back from the hazard!',
      'Damage report — we can\'t take much more of this!',
    ];
    this.show('RESCUE-1', msgs[Math.floor(Math.random() * msgs.length)], 3000);
  }

  missionSuccess() {
    this.show('DISPATCH', 'Mission complete. All survivors safe. RTB Rescue One — well done.', 5000);
  }

  missionFail(reason) {
    const msgs = {
      time: 'Time\'s up. All units stand down. We lost this one.',
      destroyed: 'Rescue One is down! Dispatch emergency recovery team!',
      default: 'Mission aborted. All units RTB.',
    };
    this.show('DISPATCH', msgs[reason] || msgs.default, 4500);
  }
}
