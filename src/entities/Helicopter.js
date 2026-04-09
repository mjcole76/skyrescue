import * as THREE from 'three';
import { HELICOPTER, WORLD } from '../utils/constants.js';

export class Helicopter {
  constructor(scene) {
    this.scene = scene;
    this.velocity = new THREE.Vector3();
    this.rotationSpeed = 0;
    this.integrity = HELICOPTER.START_INTEGRITY;
    this.passengersOnboard = 0;
    this.isRescuing = false; // for door open state

    // Collision state for camera shake
    this.lastCollisionTime = 0;
    this.collisionIntensity = 0;

    this.group = new THREE.Group();
    this.body = new THREE.Group();

    // Sub-parts for animation
    this._navRedMat = null;
    this._navGreenMat = null;
    this._navWhiteMat = null;
    this._door = null;
    this._doorOpen = 0; // 0 = closed, 1 = fully open
    this._rotorDisc = null;

    this._buildModel();
    this.group.position.set(75, 12, -60);
    scene.add(this.group);
  }

  _buildModel() {
    // ── Materials ──
    const bodyColor = 0xcc2200;
    const fuselageMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.2 });
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.4 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.5 });

    // ── Fuselage (rounded shape using merged boxes) ──
    // Main body
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 5), fuselageMat);
    fuselage.castShadow = true;
    this.body.add(fuselage);

    // Rounded nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), fuselageMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.1, 2.5);
    nose.scale.set(1, 0.82, 0.8);
    this.body.add(nose);

    // Belly panel (slightly darker)
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.3 });
    const belly = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 4.5), bellyMat);
    belly.position.set(0, -0.9, 0.2);
    this.body.add(belly);

    // ── Cockpit (larger, bluer) ──
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55
    });
    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      cockpitMat
    );
    cockpit.rotation.x = Math.PI;
    cockpit.position.set(0, -0.1, 2.1);
    this.body.add(cockpit);

    // Cockpit frame bars
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4 });
    [-0.5, 0, 0.5].forEach(xOff => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), frameMat);
      bar.position.set(xOff, -0.5, 2.7);
      bar.rotation.x = 0.5;
      this.body.add(bar);
    });

    // ── Side door (animated open during rescue) ──
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xaa1800, roughness: 0.4, metalness: 0.3 });
    this._door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.6), doorMat);
    this._door.position.set(1.14, -0.1, 0.3);
    this.body.add(this._door);

    // Door frame
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 1.8), darkMat);
    doorFrame.position.set(1.12, -0.1, 0.3);
    this.body.add(doorFrame);

    // ── Tail boom (tapered) ──
    const tailGeo = new THREE.CylinderGeometry(0.25, 0.4, 4.2, 8);
    tailGeo.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, fuselageMat);
    tail.position.set(0, 0.2, -4.3);
    this.body.add(tail);

    // Tail fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.4), fuselageMat);
    fin.position.set(0, 1.3, -5.9);
    this.body.add(fin);

    // Tail stabilizer
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.9), fuselageMat);
    stab.position.set(0, 0.5, -5.9);
    this.body.add(stab);

    // ── Skids (with cross-bars) ──
    [-1.05, 1.05].forEach(x => {
      // Main skid rail
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.8), skidMat);
      skid.position.set(x, -1.4, 0.1);
      this.body.add(skid);

      // Front curve (angled up)
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), skidMat);
      front.position.set(x, -1.28, 2.1);
      front.rotation.x = -0.5;
      this.body.add(front);

      // Struts
      [-0.6, 0.9].forEach(zOff => {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), skidMat);
        strut.position.set(x, -1.12, zOff);
        this.body.add(strut);
      });
    });

    // Cross-bars between skids
    [-0.6, 0.9].forEach(zOff => {
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), skidMat);
      crossbar.position.set(0, -0.85, zOff);
      this.body.add(crossbar);
    });

    // ── White stripe + "RESCUE" accent ──
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.35, 5.05), stripeMat);
    stripe.position.y = 0.35;
    this.body.add(stripe);

    // Thin orange accent line
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.3, emissive: 0xff6600, emissiveIntensity: 0.1 });
    const accent = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.08, 5.06), accentMat);
    accent.position.y = 0.14;
    this.body.add(accent);

    // ── Searchlight ──
    const searchMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.6 });
    const searchLight = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 8), searchMat);
    searchLight.position.set(0, -0.95, 1.5);
    this.body.add(searchLight);

    const spotLight = new THREE.SpotLight(0xffffdd, 3, 80, Math.PI / 7, 0.5, 1);
    spotLight.position.set(0, -1, 1.5);
    spotLight.target.position.set(0, -40, 3);
    this.body.add(spotLight);
    this.body.add(spotLight.target);

    // ── Navigation lights (blinking) ──
    this._navRedMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const redNav = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), this._navRedMat);
    redNav.position.set(-1.15, 0, 0);
    this.body.add(redNav);

    this._navGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const greenNav = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), this._navGreenMat);
    greenNav.position.set(1.15, 0, 0);
    this.body.add(greenNav);

    // White tail strobe
    this._navWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const whiteNav = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), this._navWhiteMat);
    whiteNav.position.set(0, 0.8, -6.2);
    this.body.add(whiteNav);

    // ── Winch point under belly ──
    const winchMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6), winchMat);
    winch.position.set(0.5, -0.9, 0);
    this.body.add(winch);

    this.group.add(this.body);

    // ── Main rotor (blades + semi-transparent disc at speed) ──
    this.mainRotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 5.8), bladeMat);
      blade.rotation.y = (i / 4) * Math.PI * 2;
      blade.position.set(
        Math.sin((i / 4) * Math.PI * 2) * 2.9, 0,
        Math.cos((i / 4) * Math.PI * 2) * 2.9
      );
      this.mainRotor.add(blade);
    }

    // Rotor hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 8), darkMat);
    this.mainRotor.add(hub);

    // Rotor mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), darkMat);
    mast.position.y = -0.2;
    this.mainRotor.add(mast);

    // Semi-transparent rotor disc (visible at speed)
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xaaccee,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._rotorDisc = new THREE.Mesh(new THREE.CircleGeometry(6, 32), discMat);
    this._rotorDisc.rotation.x = -Math.PI / 2;
    this._rotorDisc.position.y = 0.05;
    this.mainRotor.add(this._rotorDisc);

    this.mainRotor.position.y = 1.2;
    this.group.add(this.mainRotor);

    // ── Tail rotor ──
    this.tailRotor = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const tblade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.12), bladeMat);
      tblade.rotation.z = (i / 3) * Math.PI * 2;
      this.tailRotor.add(tblade);
    }
    const tailHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 6), darkMat);
    tailHub.rotation.z = Math.PI / 2;
    this.tailRotor.add(tailHub);
    this.tailRotor.position.set(0.3, 1.5, -5.9);
    this.group.add(this.tailRotor);
  }

  get position() { return this.group.position; }
  get quaternion() { return this.group.quaternion; }
  get rotation() { return this.group.rotation; }

  getForward() {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
  }

  getRight() {
    return new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
  }

  getSpeed() {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
  }

  update(dt, keys, gamepadInput) {
    const { SPEED, VERT_SPEED, ROT_SPEED, DRAG, ACCEL, TILT_AMOUNT, MAX_ALTITUDE, MIN_ALTITUDE } = HELICOPTER;
    const elapsedTime = performance.now() / 1000;

    // ── Merge keyboard + gamepad input ──
    let moveX = 0, moveZ = 0, vertInput = 0, rotInput = 0;

    // Keyboard
    if (keys['KeyW']) moveZ += 1;
    if (keys['KeyS']) moveZ -= 1;
    if (keys['KeyA']) moveX -= 1;
    if (keys['KeyD']) moveX += 1;
    if (keys['KeyQ']) rotInput += 1;
    if (keys['KeyE']) rotInput -= 1;
    if (keys['Space']) vertInput += 1;
    if (keys['ShiftLeft'] || keys['ShiftRight']) vertInput -= 1;

    // Gamepad overlay
    if (gamepadInput) {
      moveX += gamepadInput.moveX;
      moveZ += gamepadInput.moveZ;
      rotInput += gamepadInput.rotate;
      vertInput += gamepadInput.vertical;
    }

    // Clamp combined
    moveX = THREE.MathUtils.clamp(moveX, -1, 1);
    moveZ = THREE.MathUtils.clamp(moveZ, -1, 1);
    rotInput = THREE.MathUtils.clamp(rotInput, -1, 1);
    vertInput = THREE.MathUtils.clamp(vertInput, -1, 1);

    // ── Rotation ──
    if (Math.abs(rotInput) > 0.1) this.rotationSpeed = ROT_SPEED * rotInput;
    else this.rotationSpeed *= 0.88;
    this.group.rotation.y += this.rotationSpeed * dt;

    // ── Direction vectors ──
    const forward = this.getForward();
    const right = this.getRight();

    // ── Input forces ──
    const force = new THREE.Vector3();
    if (Math.abs(moveZ) > 0.05) force.add(forward.clone().multiplyScalar(ACCEL * moveZ));
    if (Math.abs(moveX) > 0.05) force.add(right.clone().multiplyScalar(ACCEL * moveX));

    // ── Vertical with auto-hover ──
    if (Math.abs(vertInput) > 0.05) {
      this.velocity.y += VERT_SPEED * vertInput * dt;
    } else {
      // Gentle auto-hover: slowly settle toward stable altitude
      this.velocity.y *= (1 - 2.5 * dt);
    }

    // ── Ground effect ──
    // Slight upward push when very close to ground or surfaces
    if (this.group.position.y < MIN_ALTITUDE + 5) {
      const groundProximity = 1 - (this.group.position.y - MIN_ALTITUDE) / 5;
      if (groundProximity > 0) {
        this.velocity.y += groundProximity * 4 * dt;
      }
    }

    // Apply forces
    this.velocity.x += force.x * dt;
    this.velocity.z += force.z * dt;

    // Drag
    this.velocity.x *= (1 - DRAG * dt);
    this.velocity.z *= (1 - DRAG * dt);
    this.velocity.y *= (1 - DRAG * 0.6 * dt);

    // Speed cap
    const hSpeed = this.getSpeed();
    if (hSpeed > SPEED) {
      this.velocity.x *= SPEED / hSpeed;
      this.velocity.z *= SPEED / hSpeed;
    }
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -VERT_SPEED, VERT_SPEED);

    // Apply velocity
    this.group.position.add(this.velocity.clone().multiplyScalar(dt));

    // Ground clamp
    if (this.group.position.y < MIN_ALTITUDE) {
      this.group.position.y = MIN_ALTITUDE;
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    // Ceiling
    if (this.group.position.y > MAX_ALTITUDE) {
      this.group.position.y = MAX_ALTITUDE;
      this.velocity.y = Math.min(0, this.velocity.y);
    }

    // Boundaries
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -WORLD.BOUNDARY, WORLD.BOUNDARY);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -WORLD.BOUNDARY, WORLD.BOUNDARY);

    // ── Tilt (more responsive, deeper tilt) ──
    const localVelX = right.dot(this.velocity);
    const localVelZ = forward.dot(this.velocity);
    const tiltMul = TILT_AMOUNT / SPEED;
    const targetTiltX = -localVelZ * tiltMul * 1.0;
    const targetTiltZ = localVelX * tiltMul * 1.0;

    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, targetTiltX, 6 * dt);
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, targetTiltZ, 6 * dt);

    // ── Rotors ──
    this.mainRotor.rotation.y += 28 * dt;
    this.tailRotor.rotation.x += 40 * dt;

    // Rotor disc transparency — more visible at higher rotor speed (always spinning in gameplay)
    if (this._rotorDisc) {
      this._rotorDisc.material.opacity = 0.06;
    }

    // ── Nav light blinking ──
    const blinkFast = Math.sin(elapsedTime * 6) > 0;
    const strobeBurst = Math.sin(elapsedTime * 12) > 0.85;
    if (this._navRedMat) this._navRedMat.color.setHex(blinkFast ? 0xff0000 : 0x330000);
    if (this._navGreenMat) this._navGreenMat.color.setHex(blinkFast ? 0x00ff00 : 0x003300);
    if (this._navWhiteMat) this._navWhiteMat.color.setHex(strobeBurst ? 0xffffff : 0x222222);

    // ── Door animation (opens when rescuing) ──
    const doorTarget = this.isRescuing ? 1 : 0;
    this._doorOpen = THREE.MathUtils.lerp(this._doorOpen, doorTarget, 4 * dt);
    if (this._door) {
      // Slide door back along z-axis
      this._door.position.z = 0.3 + this._doorOpen * 1.4;
    }

    // ── Collision intensity decay ──
    this.collisionIntensity *= (1 - 3 * dt);
  }

  triggerCollision() {
    this.collisionIntensity = 1;
    this.lastCollisionTime = performance.now();
  }

  reset() {
    this.group.position.set(75, 12, -60);
    this.group.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.integrity = HELICOPTER.START_INTEGRITY;
    this.passengersOnboard = 0;
    this.rotationSpeed = 0;
    this.isRescuing = false;
    this.collisionIntensity = 0;
    this._doorOpen = 0;
  }

  takeDamage(amount, dt) {
    this.integrity -= amount * dt;
  }
}
