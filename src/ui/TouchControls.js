export class TouchControls {
  constructor() {
    this.active = false;
    this.moveX = 0;
    this.moveZ = 0;
    this.vertical = 0;
    this.rotate = 0;

    this._leftStick = null;
    this._leftKnob = null;
    this._leftTouch = null;
    this._leftOrigin = { x: 0, y: 0 };

    this._container = null;
    this._ascendBtn = null;
    this._descendBtn = null;
    this._rotLeftBtn = null;
    this._rotRightBtn = null;

    // Only show on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.active = true;
      this._build();
      this._bind();
    }
  }

  _build() {
    this._container = document.createElement('div');
    this._container.id = 'touch-controls';
    this._container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;pointer-events:none;display:none;';

    // Left joystick area
    const leftArea = document.createElement('div');
    leftArea.style.cssText = 'position:absolute;bottom:30px;left:30px;width:130px;height:130px;pointer-events:all;';

    this._leftStick = document.createElement('div');
    this._leftStick.style.cssText = 'width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,0.08);border:2px solid rgba(255,160,60,0.3);position:relative;';

    this._leftKnob = document.createElement('div');
    this._leftKnob.style.cssText = 'width:50px;height:50px;border-radius:50%;background:rgba(255,160,60,0.4);border:2px solid rgba(255,160,60,0.6);position:absolute;top:40px;left:40px;transition:none;';

    this._leftStick.appendChild(this._leftKnob);
    leftArea.appendChild(this._leftStick);
    this._container.appendChild(leftArea);

    // Right side buttons
    const rightArea = document.createElement('div');
    rightArea.style.cssText = 'position:absolute;bottom:30px;right:20px;display:flex;flex-direction:column;gap:10px;pointer-events:all;';

    const btnStyle = 'width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,160,60,0.4);background:rgba(0,0,0,0.4);color:rgba(255,160,60,0.8);font-family:Orbitron,sans-serif;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:1px;-webkit-user-select:none;user-select:none;';

    const row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;gap:10px;justify-content:center;';

    this._ascendBtn = document.createElement('div');
    this._ascendBtn.style.cssText = btnStyle;
    this._ascendBtn.textContent = 'UP';

    this._descendBtn = document.createElement('div');
    this._descendBtn.style.cssText = btnStyle;
    this._descendBtn.textContent = 'DN';

    row1.appendChild(this._ascendBtn);
    row1.appendChild(this._descendBtn);

    const row2 = document.createElement('div');
    row2.style.cssText = 'display:flex;gap:10px;justify-content:center;';

    this._rotLeftBtn = document.createElement('div');
    this._rotLeftBtn.style.cssText = btnStyle + 'font-size:16px;';
    this._rotLeftBtn.textContent = '\u21B6';

    this._rotRightBtn = document.createElement('div');
    this._rotRightBtn.style.cssText = btnStyle + 'font-size:16px;';
    this._rotRightBtn.textContent = '\u21B7';

    row2.appendChild(this._rotLeftBtn);
    row2.appendChild(this._rotRightBtn);

    rightArea.appendChild(row1);
    rightArea.appendChild(row2);
    this._container.appendChild(rightArea);

    document.body.appendChild(this._container);
  }

  _bind() {
    const stickArea = this._leftStick.parentElement;
    const stickRadius = 65;
    const knobMax = 40;

    stickArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this._leftTouch = t.identifier;
      const rect = this._leftStick.getBoundingClientRect();
      this._leftOrigin.x = rect.left + rect.width / 2;
      this._leftOrigin.y = rect.top + rect.height / 2;
    }, { passive: false });

    stickArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this._leftTouch) {
          let dx = t.clientX - this._leftOrigin.x;
          let dy = t.clientY - this._leftOrigin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > knobMax) {
            dx = dx / dist * knobMax;
            dy = dy / dist * knobMax;
          }
          this._leftKnob.style.left = (40 + dx) + 'px';
          this._leftKnob.style.top = (40 + dy) + 'px';
          this.moveX = dx / knobMax;
          this.moveZ = -dy / knobMax;
        }
      }
    }, { passive: false });

    const resetStick = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._leftTouch) {
          this._leftTouch = null;
          this._leftKnob.style.left = '40px';
          this._leftKnob.style.top = '40px';
          this.moveX = 0;
          this.moveZ = 0;
        }
      }
    };
    stickArea.addEventListener('touchend', resetStick);
    stickArea.addEventListener('touchcancel', resetStick);

    // Button touches
    const bindBtn = (btn, onDown, onUp) => {
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); btn.style.background = 'rgba(255,160,60,0.3)'; }, { passive: false });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); btn.style.background = 'rgba(0,0,0,0.4)'; }, { passive: false });
      btn.addEventListener('touchcancel', (e) => { onUp(); btn.style.background = 'rgba(0,0,0,0.4)'; });
    };

    bindBtn(this._ascendBtn, () => this.vertical = 1, () => this.vertical = 0);
    bindBtn(this._descendBtn, () => this.vertical = -1, () => this.vertical = 0);
    bindBtn(this._rotLeftBtn, () => this.rotate = 1, () => this.rotate = 0);
    bindBtn(this._rotRightBtn, () => this.rotate = -1, () => this.rotate = 0);
  }

  show() {
    if (this._container) this._container.style.display = 'block';
  }

  hide() {
    if (this._container) this._container.style.display = 'none';
  }

  getInput() {
    if (!this.active) return null;
    return {
      moveX: this.moveX,
      moveZ: this.moveZ,
      vertical: this.vertical,
      rotate: this.rotate,
    };
  }
}
