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
    this._pendingTimeouts = [];
    this._ambientTimer = 0;
    this._nextAmbientIn = 38;
    this._halfwayTimeDone = false;
    this._halfwaySavedDone = false;
  }

  resetForMission() {
    this.cancelSpeech();
    this._pendingTimeouts.forEach(clearTimeout);
    this._pendingTimeouts.length = 0;
    this._ambientTimer = 0;
    this._nextAmbientIn = 32 + Math.random() * 28;
    this._halfwayTimeDone = false;
    this._halfwaySavedDone = false;
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

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const t0 = ctx.currentTime;
    const duration = 0.32;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = i < bufferSize * 0.08 ? i / (bufferSize * 0.08) :
                  i > bufferSize * 0.72 ? (bufferSize - i) / (bufferSize * 0.28) : 1;
      data[i] = (Math.random() * 2 - 1) * 0.26 * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.65;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, t0);

    source.connect(bp);
    bp.connect(gain);
    gain.connect(this.audio.master);
    source.start(t0);
    source.onended = () => { source.disconnect(); bp.disconnect(); gain.disconnect(); };

    // Short "squelch" tone so the open is audible over the rotor
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.12);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, t0);
    og.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
    osc.connect(og);
    og.connect(this.audio.master);
    osc.start(t0);
    osc.stop(t0 + 0.16);
    osc.onended = () => { osc.disconnect(); og.disconnect(); };
  }

  cancelSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  _speakMessage(callsign, text) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!this.audio || this.audio.muted || !this.audio.started) return;

    window.speechSynthesis.cancel();

    const line = `${callsign}. ${text}`.replace(/—/g, ', ');
    const u = new SpeechSynthesisUtterance(line);
    u.rate = 0.9;
    u.pitch = 0.88;
    u.volume = 0.92;

    const runSpeak = () => {
      const v2 = speechSynthesis.getVoices();
      const pick = v2.find((v) => v.lang === 'en-US')
        || v2.find((v) => v.lang && v.lang.startsWith('en'));
      if (pick) u.voice = pick;
      speechSynthesis.speak(u);
    };

    if (speechSynthesis.getVoices().length) {
      runSpeak();
    } else {
      let done = false;
      const once = () => {
        if (done) return;
        done = true;
        speechSynthesis.removeEventListener('voiceschanged', once);
        runSpeak();
      };
      speechSynthesis.addEventListener('voiceschanged', once, { once: true });
      setTimeout(once, 400);
    }
  }

  show(callsign, text, duration = 4000, { speak = true } = {}) {
    this._ensureBuilt();
    this._queue.push({ callsign, text, duration, speak });
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
    if (msg.speak !== false) {
      this._speakMessage(msg.callsign, msg.text);
    }

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

  missionStart(missionName, missionId = '') {
    const dispatchOpeners = [
      `All units — ${missionName} operation is GO. Rescue One, you are cleared hot.`,
      `${missionName} is live. Rescue One, priority traffic — you're cleared direct to the AO.`,
      `Command net — ${missionName}. All ground hold. Rescue One, you're primary on scene.`,
    ];
    const themed = RadioChatter._missionDispatchFlavor(missionId, missionName);
    const line1 = themed || dispatchOpeners[Math.floor(Math.random() * dispatchOpeners.length)];
    this.show('DISPATCH', line1, 4800);

    const r1Replies = [
      'Copy dispatch. Rescue One inbound. Eyes on target.',
      'Rescue One, wilco. Moving to contact — stand by for sitrep.',
      'Loud and clear. Rescue One descending on the AO now.',
    ];
    const t1 = setTimeout(() => {
      const i = this._pendingTimeouts.indexOf(t1);
      if (i >= 0) this._pendingTimeouts.splice(i, 1);
      this.show('RESCUE-1', r1Replies[Math.floor(Math.random() * r1Replies.length)], 3600);
    }, 5200);
    this._pendingTimeouts.push(t1);

    const towerLines = [
      'Tower — wind check is good. Call the pad when ready.',
      'Medevac channel is open. Hospital standing by for inbound.',
    ];
    const t2 = setTimeout(() => {
      const i = this._pendingTimeouts.indexOf(t2);
      if (i >= 0) this._pendingTimeouts.splice(i, 1);
      if (Math.random() < 0.55) {
        this.show('TOWER', towerLines[Math.floor(Math.random() * towerLines.length)], 3200);
      }
    }, 9200);
    this._pendingTimeouts.push(t2);
  }

  static _missionDispatchFlavor(missionId, missionName) {
    const byId = {
      burning_building: `DISPATCH — structure fire at the AO. ${missionName}: rooftop evac, smoke advisory. Rescue One, you're cleared hot.`,
      mountain_rescue: `Mountain net — ${missionName}. Cliffside evac, gusty air. Rescue One, use caution on final.`,
      flood_rescue: `Flood ops — ${missionName}. Rooftop contacts, rising water. Rescue One, clock is tight — go.`,
      highway_pileup: `Night ops — ${missionName}. Highway scene, low vis. Rescue One, searchlight authorized — stay high until contact.`,
      arctic_rescue: `Arctic command — ${missionName}. Ice floe contacts, whiteout risk. Rescue One, keep moving — icing on station.`,
    };
    return byId[missionId] || null;
  }

  /**
   * Occasional ambient lines + one-shot milestones. Call each frame while playing.
   */
  tick(dt, { timeLeft, missionDuration, survivorsSaved, totalSurvivors, passengersOnboard, missionId }) {
    if (!missionDuration || missionDuration <= 0) return;

    const halfTime = timeLeft <= missionDuration * 0.5;
    if (halfTime && !this._halfwayTimeDone && timeLeft > 35) {
      this._halfwayTimeDone = true;
      const lines = [
        'DISPATCH',
        'Half the clock gone — stay aggressive, Rescue One.',
        'Rescue One still has time — work the pattern, confirm contacts on the net.',
        'Command — fuel state nominal. Keep the runs coming.',
      ];
      this.show(lines[0], lines[1 + Math.floor(Math.random() * 3)], 3800);
    }

    const halfSaved =
      totalSurvivors > 1 &&
      survivorsSaved >= Math.ceil(totalSurvivors / 2) &&
      survivorsSaved < totalSurvivors;
    if (halfSaved && !this._halfwaySavedDone) {
      this._halfwaySavedDone = true;
      const msgs = [
        ['COORD', 'Majority of contacts off the X — outstanding. Finish the sweep.'],
        ['MED-1', 'Receiving steady inbounds. Keep them coming, Rescue One.'],
        ['DISPATCH', 'More than half accounted for. Clear the rest — we need everyone.'],
      ];
      const pick = msgs[Math.floor(Math.random() * msgs.length)];
      this.show(pick[0], pick[1], 3800);
    }

    this._ambientTimer += dt;
    if (this._ambientTimer < this._nextAmbientIn) return;
    if (this._queue.length > 2) return;
    this._ambientTimer = 0;
    this._nextAmbientIn = 40 + Math.random() * 50;

    if (timeLeft < 45) return;

    const ambient = RadioChatter._pickAmbient(passengersOnboard, survivorsSaved, totalSurvivors, missionId);
    if (ambient) {
      this.show(ambient[0], ambient[1], 3200 + Math.floor(Math.random() * 800), { speak: false });
    }
  }

  static _pickAmbient(passengersOnboard, saved, total, missionId) {
    const pool = [];

    if (passengersOnboard > 0) {
      pool.push(
        ['DISPATCH', 'Rescue One — you have souls on board. Pad is hot, no delay on final.'],
        ['TOWER', 'Hospital pad is clear. Call short final when ready.'],
        ['RESCUE-1', 'Passengers secure in cabin — smooth ride to the pad.'],
      );
    } else if (saved < total) {
      pool.push(
        ['GROUND', 'Dispatch, be advised — we still have visual on distressed personnel.'],
        ['DISPATCH', 'All stations — maintain radio discipline. Rescue One has the con.'],
        ['COORD', 'Net check. Weather holding — continue search pattern.'],
        ['DISPATCH', 'Civilian traffic is clear of your sector. Work fast.'],
      );
    }

    const missionAmbient = {
      burning_building: [
        ['FIRE CMD', `Ladder teams can't reach the roof — you're their only way down.`],
        ['DISPATCH', 'Heat signature strong on the upper floors. Stay clear of the plume.'],
        ['FIRE CMD', 'Scene still active — watch rotor wash near the structure.'],
      ],
      flood_rescue: [
        ['GROUND', 'Water line still rising — anyone on a roof is priority one.'],
        ['DISPATCH', `Boats are stuck in debris. You're the extraction asset.`],
      ],
      mountain_rescue: [
        ['MOUNTAIN NET', 'Hikers are cold-stressed — time on target matters.'],
        ['DISPATCH', 'Gusts reported on the ridgeline. Small corrections only.'],
      ],
      highway_pileup: [
        ['STATE PD', 'Traffic is blocked eastbound — you have the corridor.'],
        ['DISPATCH', 'Flare-ups on the deck — watch for sudden smoke pockets.'],
      ],
      arctic_rescue: [
        ['ARCTIC CMD', `Drift is increasing between floes — don't loiter low.`],
        ['DISPATCH', 'Blizzard band moving in from the north. Use your clock.'],
      ],
    };
    const extra = missionAmbient[missionId];
    if (extra) pool.push(...extra);

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  survivorPickup(count, max) {
    if (count >= max) {
      const full = [
        `That's ${count} aboard — at capacity. Heading to the pad.`,
        `Cab is full — ${count} souls. RTB for offload, now.`,
        `Max pax — ${count} on board. Dispatch, requesting direct to hospital.`,
      ];
      this.show('RESCUE-1', full[Math.floor(Math.random() * full.length)], 3200);
    } else {
      const msgs = [
        `Survivor secure. ${count} of ${max} onboard.`,
        `Got 'em. Carrying ${count}, room for ${max - count} more.`,
        `Pickup confirmed. ${count} aboard.`,
        `Contact is in the cabin — ${count} saved, still got room.`,
        `Winch complete — ${count} pax secure. Who's next?`,
      ];
      this.show('RESCUE-1', msgs[Math.floor(Math.random() * msgs.length)], 3000);
    }
  }

  delivery(saved, total) {
    if (saved >= total) {
      const win = [
        'All survivors accounted for. Outstanding work, Rescue One.',
        'Final headcount matches manifest — everyone is clear. Hell of a job.',
        'MED-1 to Rescue One — that was clean flying. RTB when ready.',
      ];
      this.show('DISPATCH', win[Math.floor(Math.random() * win.length)], 4200);
    } else {
      const remaining = total - saved;
      const partial = [
        `Casualties received. ${remaining} still out there.`,
        `Trauma bay has them — ${remaining} civilian contacts remain. Keep pushing.`,
        `Offload complete. ${remaining} not on the board yet — stay in the search.`,
      ];
      this.show('HOSPITAL', partial[Math.floor(Math.random() * partial.length)], 3200);
    }
  }

  timeWarning(seconds) {
    if (seconds === 30) {
      const t30 = [
        'Rescue One — 30 seconds! Get them out NOW!',
        'Thirty seconds — break off or commit, but MOVE!',
        'Half a minute on the clock — dispatch needs miracles, Rescue One!',
      ];
      this.show('DISPATCH', t30[Math.floor(Math.random() * t30.length)], 3600);
    } else if (seconds === 60) {
      const t60 = [
        'One minute remaining. Expedite all operations.',
        'Sixty seconds to bingo — stack your runs, Rescue One.',
        'Clock is critical — all stations, clear the channel for Rescue One.',
      ];
      this.show('DISPATCH', t60[Math.floor(Math.random() * t60.length)], 3600);
    }
  }

  damageWarning() {
    if (Math.random() < 0.35) {
      const dispatch = [
        'Rescue One, your airframe is taking damage. Break off and reset!',
        'Command — Rescue One is trading paint with the AO. Give them room!',
      ];
      this.show('DISPATCH', dispatch[Math.floor(Math.random() * dispatch.length)], 3400);
      return;
    }
    const r1 = [
      'Taking hits! Watch your clearance, Rescue One!',
      'Hull integrity dropping — pull back from the hazard!',
      `Damage report — we can't take much more of this!`,
      'Warning tone — ease back, you are chewing the scenery!',
    ];
    this.show('RESCUE-1', r1[Math.floor(Math.random() * r1.length)], 3000);
  }

  missionSuccess() {
    const lines = [
      'Mission complete. All survivors safe. RTB Rescue One — well done.',
      'Rescue One — chalk this one up as a save. Command is impressed. RTB.',
      'All contacts recovered. Weather and traffic on your frequency — great flying out there.',
    ];
    this.show('DISPATCH', lines[Math.floor(Math.random() * lines.length)], 5000);
  }

  missionFail(reason) {
    const time = [
      `Time's up. All units stand down. We lost this one.`,
      'Clock is zero — Rescue One, break off. We did not get everyone.',
      'Mission window closed. Dispatch — standing down rescue ops.',
    ];
    const destroyed = [
      'Rescue One is down! Dispatch emergency recovery team!',
      'Mayday traffic — Rescue One lost the ship! All units, search and rescue!',
      'We lost Rescue One on the net — roll crash fire rescue NOW!',
    ];
    const def = [
      'Mission aborted. All units RTB.',
      'Abort code — all stations, secure the scene and RTB.',
    ];
    let msg;
    if (reason === 'time') msg = time[Math.floor(Math.random() * time.length)];
    else if (reason === 'destroyed') msg = destroyed[Math.floor(Math.random() * destroyed.length)];
    else msg = def[Math.floor(Math.random() * def.length)];
    this.show('DISPATCH', msg, 4500);
  }
}
