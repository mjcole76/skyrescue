export class InputManager {
  constructor() {
    this.keys = {};
    this._arrowMap = {
      ArrowUp: 'KeyW',
      ArrowDown: 'KeyS',
      ArrowLeft: 'KeyA',
      ArrowRight: 'KeyD'
    };

    // Gamepad state
    this.gamepadInput = null;
    this._gamepadIndex = null;
    this._deadzone = 0.15;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('gamepadconnected', (e) => {
      this._gamepadIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this._gamepadIndex = null;
      this.gamepadInput = null;
    });
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    if (this._arrowMap[e.code]) this.keys[this._arrowMap[e.code]] = true;
    e.preventDefault();
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
    if (this._arrowMap[e.code]) this.keys[this._arrowMap[e.code]] = false;
  }

  _applyDeadzone(value) {
    if (Math.abs(value) < this._deadzone) return 0;
    const sign = Math.sign(value);
    return sign * (Math.abs(value) - this._deadzone) / (1 - this._deadzone);
  }

  pollGamepad() {
    if (this._gamepadIndex === null) {
      this.gamepadInput = null;
      return;
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this._gamepadIndex];
    if (!gp) {
      this.gamepadInput = null;
      return;
    }

    // Standard gamepad mapping:
    // Left stick: axes[0] (X), axes[1] (Y) — movement
    // Right stick: axes[2] (X), axes[3] (Y) — rotation / look
    // Left trigger: buttons[6] — descend
    // Right trigger: buttons[7] — ascend
    // A button: buttons[0] — interact (not used yet)

    const lx = this._applyDeadzone(gp.axes[0] || 0);
    const ly = this._applyDeadzone(gp.axes[1] || 0);
    const rx = this._applyDeadzone(gp.axes[2] || 0);
    const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0;

    this.gamepadInput = {
      moveX: lx,
      moveZ: -ly,        // Stick forward = positive Z
      rotate: -rx,        // Right stick X = yaw
      vertical: rt - lt,  // RT = up, LT = down
    };
  }

  reset() {
    this.keys = {};
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
